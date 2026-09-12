import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Disable command buffering so queries fail fast and allow graceful fallbacks when offline
mongoose.set("bufferCommands", false);

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

// Ensure state listeners are attached once without manual recursive reconnect loops (Mongoose driver manages reconnection internally)
if (!global.__mongoose_listeners_attached) {
  global.__mongoose_listeners_attached = true;
  mongoose.connection.on("connected", () => {
    cached.lastConnected = new Date().toISOString();
  });
  mongoose.connection.on("disconnected", () => {
    cached.conn = null;
    recordConnectionError(new Error("MongoDB connection was dropped or disconnected."), "event:disconnected");
  });
  mongoose.connection.on("error", (err) => {
    console.warn("⚠️ [MongoDB] Connection error:", err.message);
    recordConnectionError(err, "event:error");
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

export function getMongoUri() {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (isValidMongoUri(uri)) {
    return uri;
  }
  return null;
}

export function getMaskedMongoUri() {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) return null;
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
  const uri = getMongoUri();
  cached.lastAttempt = new Date().toISOString();

  if (!uri) {
    const raw = (process.env.MONGODB_URI || "").trim();
    const errMsg = raw && raw !== "."
      ? "MONGODB_URI is provided but invalid (must start with 'mongodb://' or 'mongodb+srv://')."
      : "MONGODB_URI environment variable is not defined or unconfigured.";

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
    return true;
  }

  // 2. If in-flight connection promise is currently connecting (readyState === 2), await it
  if (mongoose.connection.readyState === 2 && cached.promise) {
    try {
      cached.conn = await cached.promise;
      return mongoose.connection.readyState === 1;
    } catch (err) {
      recordConnectionError(err, "promise:await_inflight");
      return false;
    }
  }

  // 3. If disconnected or disconnecting (readyState === 0 or 3), initiate a single connection promise
  if (!cached.promise || mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    const opts = {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 60000,
      maxPoolSize: 20,
      minPoolSize: 1,
      retryWrites: true,
      autoIndex: process.env.NODE_ENV !== "production"
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log(`✅ [MongoDB] Connected successfully: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`);
      cached.conn = mongooseInstance;
      cached.lastConnected = new Date().toISOString();
      import("../services/dbInitService.js").then(({ ensureDatabaseInitialized }) => {
        ensureDatabaseInitialized().catch(err => console.warn("⚠️ [DB Init Error]:", err?.message));
      }).catch(() => {});
      return mongooseInstance;
    }).catch((error) => {
      cached.promise = null;
      cached.conn = null;
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




