import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Enable command buffering so temporary reconnects do not throw fatal query exceptions
mongoose.set("bufferCommands", true);

// Global cache for serverless environments (Vercel, AWS Lambda, Cloud Run)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
    lastConnected: null,
    lastAttempt: null,
    errorLogs: []
  };
}

if (!Array.isArray(cached.errorLogs)) {
  cached.errorLogs = [];
}

const MAX_ERROR_LOGS = 20;

export function recordConnectionError(err, context = "connection") {
  const errorObj = {
    id: "err_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    message: err?.message || String(err || "Unknown connection error"),
    type: err?.name || "MongoConnectionError",
    code: err?.code || (err?.reason ? "ServerSelectionFailed" : "ECONN_ERROR"),
    context,
    details: err?.stack ? err.stack.split("\n").slice(0, 3).join("\n") : null,
    readyState: mongoose?.connection?.readyState ?? 0
  };

  if (!Array.isArray(cached.errorLogs)) {
    cached.errorLogs = [];
  }

  // Prepend so latest is always at index 0
  cached.errorLogs.unshift(errorObj);
  if (cached.errorLogs.length > MAX_ERROR_LOGS) {
    cached.errorLogs.pop();
  }

  return errorObj;
}

export function getDbErrorLogs(limit = 5) {
  const logs = Array.isArray(cached.errorLogs) ? cached.errorLogs : [];
  return logs.slice(0, limit);
}

export function clearDbErrorLogs() {
  if (cached) {
    cached.errorLogs = [];
  }
  return true;
}

// Ensure state listeners are attached once with auto-reconnect capability
if (!global.__mongoose_listeners_attached) {
  global.__mongoose_listeners_attached = true;
  mongoose.connection.on("connected", () => {
    cached.lastConnected = new Date().toISOString();
    console.log("⚡ [MongoDB] Connection established / restored.");
  });
  mongoose.connection.on("disconnected", () => {
    cached.conn = null;
    recordConnectionError(new Error("MongoDB connection was dropped or disconnected."), "event:disconnected");
    // Proactively attempt reconnection if URI exists and not already connecting
    const uri = getMongoUri();
    if (uri && mongoose.connection.readyState === 0 && !global.__mongo_reconnecting) {
      global.__mongo_reconnecting = true;
      setTimeout(() => {
        global.__mongo_reconnecting = false;
        if (mongoose.connection.readyState === 0) {
          connectDB().catch(e => console.warn("⚠️ [MongoDB Auto-Reconnect]:", e.message));
        }
      }, 3000);
    }
  });
  mongoose.connection.on("error", (err) => {
    console.warn("⚠️ [MongoDB] Connection error:", err.message);
    recordConnectionError(err, "event:error");
    cached.conn = null;
    cached.promise = null;
  });
}

export function isValidMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== "string") return false;
  const trimmed = rawUri.trim();
  return (
    trimmed.startsWith("mongodb://") ||
    trimmed.startsWith("mongodb+srv://")
  );
}

let memoryServerInstance = null;

export async function getOrStartMemoryMongo() {
  const isVercelServerless = Boolean(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  );
  if (isVercelServerless) {
    return null;
  }
  if (!memoryServerInstance) {
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      memoryServerInstance = await MongoMemoryServer.create({
        instance: {
          dbName: "aurarudraksha"
        }
      });
      const memUri = memoryServerInstance.getUri();
      console.log("⚡ [MongoDB] Resilient Local MongoDB Engine initialized:", memUri);
      return memUri;
    } catch (err) {
      console.warn("⚠️ [MongoDB] Could not start MongoMemoryServer fallback:", err?.message);
      return null;
    }
  }
  return memoryServerInstance.getUri();
}

export function getMongoUri() {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (isValidMongoUri(uri)) {
    return uri;
  }
  return null;
}

export function getMaskedMongoUri() {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) {
    if (memoryServerInstance) return "mongodb://127.0.0.1:[MEMORY_SERVER]/aurarudraksha";
    return null;
  }
  try {
    // Mask password in connection string: mongodb+srv://user:pass@host/db
    return uri.replace(/:\/\/([^:]+):([^@]+)@/, (match, user, pass) => {
      const maskedUser = user.length > 2 ? user.slice(0, 2) + "***" : "***";
      return `://${maskedUser}:********@`;
    });
  } catch (_) {
    return "mongodb://[MASKED_URI]";
  }
}

export async function connectDB() {
  let uri = getMongoUri();
  cached.lastAttempt = new Date().toISOString();

  // If no external MONGODB_URI is provided, seamlessly initialize local MongoDB memory engine
  if (!uri) {
    uri = await getOrStartMemoryMongo();
  }

  if (!uri) {
    const raw = (process.env.MONGODB_URI || "").trim();
    const errMsg = raw && raw !== "."
      ? "MONGODB_URI is provided but invalid (must start with 'mongodb://' or 'mongodb+srv://')."
      : "MONGODB_URI environment variable is not defined and local fallback could not be started.";

    if (!global.__mongo_warned_unconfigured) {
      global.__mongo_warned_unconfigured = true;
      console.warn(`⚠️ [MongoDB] ${errMsg} Database is disconnected.`);
    }

    recordConnectionError(new Error(errMsg), "config:missing_or_invalid_uri");
    return false;
  }
  
  // 1. If already active and connected (readyState === 1), return true immediately
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    cached.lastFailedAttempt = null;
    return true;
  }

  // 2. Cooldown check: If recently failed within 3s and disconnected, fail fast without spinning duplicate connections
  if (mongoose.connection.readyState === 0 && cached.lastFailedAttempt && (Date.now() - cached.lastFailedAttempt < 3000)) {
    return false;
  }

  // 3. If in-flight connection promise is currently connecting (readyState === 2), await it
  if (mongoose.connection.readyState === 2 && cached.promise) {
    try {
      cached.conn = await cached.promise;
      if (mongoose.connection.readyState === 1) {
        cached.lastFailedAttempt = null;
        return true;
      }
      return false;
    } catch (err) {
      recordConnectionError(err, "promise:await_inflight");
      return false;
    }
  }

  // 4. Initiate connection promise if disconnected
  if (!cached.promise || mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    const isVercelServerless = Boolean(
      process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME
    );
    const opts = {
      serverSelectionTimeoutMS: 10000, // 10s timeout to allow TLS handshake & server selection on Atlas/Vercel
      connectTimeoutMS: 10000,         // 10s socket connection timeout
      socketTimeoutMS: 45000,          // 45s socket inactivity timeout
      maxIdleTimeMS: 10000,
      maxPoolSize: isVercelServerless ? 10 : 25,
      minPoolSize: 0,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
      autoIndex: process.env.NODE_ENV !== "production"
    };

    const doConnect = async () => {
      let activeUri = uri;
      const maxAttempts = isVercelServerless ? 1 : 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const mongooseInstance = await mongoose.connect(activeUri, opts);
          console.log(`✅ [MongoDB] Connected successfully: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`);
          cached.conn = mongooseInstance;
          cached.lastConnected = new Date().toISOString();
          cached.lastFailedAttempt = null;

          // Deduplicate DB seeding per process execution
          if (!global.__db_init_triggered) {
            global.__db_init_triggered = true;
            import("../services/dbInitService.js").then(({ ensureDatabaseInitialized }) => {
              ensureDatabaseInitialized().catch(err => console.warn("⚠️ [DB Init Error]:", err?.message));
            }).catch(() => {});
          }

          return mongooseInstance;
        } catch (err) {
          cached.lastFailedAttempt = Date.now();
          if (attempt < maxAttempts && !isVercelServerless) {
            console.warn(`⚠️ [MongoDB] Initial connection attempt failed (${err.message}). Retrying...`);
            const memUri = await getOrStartMemoryMongo();
            if (memUri && activeUri !== memUri) {
              console.log("⚡ [MongoDB] Switching to local resilient MongoDB fallback...");
              activeUri = memUri;
            }
            await new Promise(r => setTimeout(r, 1000));
          } else {
            throw err;
          }
        }
      }
    };

    cached.promise = doConnect().catch((error) => {
      cached.promise = null;
      cached.conn = null;
      cached.lastFailedAttempt = Date.now();
      recordConnectionError(error, "connect:handshake_failed");
      console.warn("⚠️ [MongoDB] Connection failed:", error.message);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
    return mongoose.connection.readyState === 1;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    recordConnectionError(error, "connect:failed");
    return false;
  }
}

export function isDbConnected() {
  return Boolean(mongoose && mongoose.connection && mongoose.connection.readyState === 1);
}

export function getLastDbSync() {
  return cached?.lastConnected || null;
}

export async function getDbDiagnostics() {
  const readyStateNum = mongoose?.connection?.readyState ?? 0;
  const readyStateNames = ["Disconnected", "Connected", "Connecting", "Disconnecting"];
  const readyStateText = readyStateNames[readyStateNum] || "Unknown";
  const isConnected = readyStateNum === 1;

  let pingMs = null;
  let collectionNames = [];
  let serverVersion = null;

  if (isConnected && mongoose.connection?.db) {
    try {
      const start = Date.now();
      const adminDb = mongoose.connection.db.admin();
      const pingResult = await adminDb.ping();
      pingMs = Date.now() - start;

      const serverInfo = await adminDb.serverInfo().catch(() => null);
      if (serverInfo?.version) {
        serverVersion = serverInfo.version;
      }

      const cols = await mongoose.connection.db.listCollections().toArray().catch(() => []);
      collectionNames = cols.map(c => c.name);
    } catch (err) {
      recordConnectionError(err, "ping:error");
    }
  }

  const rawUri = (process.env.MONGODB_URI || "").trim();
  const uriConfigured = isValidMongoUri(rawUri);

  let uriScheme = "none";
  if (rawUri.startsWith("mongodb+srv://")) uriScheme = "mongodb+srv";
  else if (rawUri.startsWith("mongodb://")) uriScheme = "mongodb";

  return {
    status: isConnected ? "connected" : (readyStateNum === 2 ? "connecting" : (!uriConfigured ? "unconfigured" : "disconnected")),
    isConnected,
    readyState: {
      code: readyStateNum,
      label: readyStateText
    },
    host: mongoose.connection?.host || null,
    port: mongoose.connection?.port || null,
    databaseName: mongoose.connection?.name || null,
    lastConnected: cached?.lastConnected || null,
    lastAttempt: cached?.lastAttempt || null,
    lastSync: cached?.lastConnected || null,
    pingMs,
    serverVersion,
    collectionsCount: collectionNames.length,
    collections: collectionNames,
    uriConfigured,
    uriScheme,
    maskedUri: getMaskedMongoUri(),
    lastErrors: getDbErrorLogs(5),
    totalErrorsLogged: (cached?.errorLogs || []).length,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  };
}

export async function testDbConnection() {
  const start = Date.now();
  try {
    const success = await connectDB();
    const durationMs = Date.now() - start;
    const diagnostics = await getDbDiagnostics();

    return {
      success,
      durationMs,
      diagnostics,
      message: success
        ? `Successfully connected to MongoDB (${diagnostics.host}/${diagnostics.databaseName}) in ${durationMs}ms.`
        : `Connection test failed after ${durationMs}ms.`
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    recordConnectionError(err, "test_connection:catch");
    return {
      success: false,
      durationMs,
      error: err.message,
      diagnostics: await getDbDiagnostics(),
      message: `Connection test error: ${err.message}`
    };
  }
}




