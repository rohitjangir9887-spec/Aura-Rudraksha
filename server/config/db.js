import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Keep buffering queries during reconnects with a generous 30s window so temporary
// network blips or Atlas replica set handshakes do not drop user requests.
mongoose.set("bufferCommands", true);
mongoose.set("bufferTimeoutMS", 30000);

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

if (!Array.isArray(cached.errorLogs)) cached.errorLogs = [];
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
  if (!Array.isArray(cached.errorLogs)) cached.errorLogs = [];
  cached.errorLogs.unshift(errorObj);
  if (cached.errorLogs.length > MAX_ERROR_LOGS) cached.errorLogs.pop();
  return errorObj;
}

export function getDbErrorLogs(limit = 5) {
  return (Array.isArray(cached.errorLogs) ? cached.errorLogs : []).slice(0, limit);
}

export function clearDbErrorLogs() {
  if (cached) cached.errorLogs = [];
  return true;
}

let reconnectTimer = null;
function scheduleBackgroundReconnect(delayMs = 3000) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (mongoose?.connection?.readyState === 0) {
      connectDB().catch(err => {
        console.warn("⚠️ [MongoDB] Background reconnect retry notice:", err?.message);
        scheduleBackgroundReconnect(Math.min(delayMs * 1.5, 15000));
      });
    }
  }, delayMs);
}

if (!global.__mongoose_listeners_attached) {
  global.__mongoose_listeners_attached = true;
  mongoose.connection.on("connected", () => {
    cached.lastConnected = new Date().toISOString();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    console.log("⚡ [MongoDB] Connection established / restored.");
  });
  mongoose.connection.on("reconnected", () => {
    cached.lastConnected = new Date().toISOString();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    console.log("⚡ [MongoDB] Connection successfully reconnected to cluster.");
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ [MongoDB] Connection socket idle / disconnected. Initiating resilient auto-reconnect...");
    cached.conn = null;
    cached.promise = null;
    connectDB().catch(err => console.warn("⚠️ [MongoDB] Auto-reconnect immediate notice:", err?.message));
    scheduleBackgroundReconnect(2000);
  });
  mongoose.connection.on("error", (err) => {
    console.warn("⚠️ [MongoDB] Connection error:", err.message);
    recordConnectionError(err, "event:error");
    cached.conn = null;
    cached.promise = null;
    scheduleBackgroundReconnect(3000);
  });

  // Background keep-alive & watchdog: pings every 12s on the active database using standard wire ping
  // which prevents cloud firewalls, NAT routers, and Atlas idle timeouts from dropping sockets.
  setInterval(() => {
    if (mongoose?.connection?.readyState === 1 && mongoose?.connection?.db) {
      mongoose.connection.db.command({ ping: 1 }).catch((err) => {
        console.warn("⚠️ [MongoDB] Keep-alive ping notice:", err?.message);
        if (mongoose.connection.readyState === 0) {
          connectDB().catch(() => {});
        }
      });
    } else if (mongoose?.connection?.readyState === 0) {
      // Proactively recover disconnected socket before user requests arrive
      connectDB().catch(() => {});
    }
  }, 12000);
}

export function isValidMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== "string") return false;
  const trimmed = rawUri.trim();
  return trimmed.startsWith("mongodb://") || trimmed.startsWith("mongodb+srv://");
}

let memoryServerInstance = null;

export async function getOrStartMemoryMongo() {
  const isVercelServerless = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isVercelServerless) return null;
  if (!memoryServerInstance) {
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      memoryServerInstance = await MongoMemoryServer.create({ instance: { dbName: "aurarudraksha" } });
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
  const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim();
  return isValidMongoUri(uri) ? uri : null;
}

export function getMaskedMongoUri() {
  const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || "").trim();
  if (!uri) {
    if (memoryServerInstance) return "mongodb://127.0.0.1:[MEMORY_SERVER]/aurarudraksha";
    return null;
  }
  try {
    return uri.replace(/:\/\/([^:]+):([^@]+)@/, (match, user) => {
      const maskedUser = user.length > 2 ? user.slice(0, 2) + "***" : "***";
      return `://${maskedUser}:********@`;
    });
  } catch (_) {
    return "mongodb://[MASKED_URI]";
  }
}

let lastConnectionAttemptTime = 0;

export async function connectDB() {
  const configuredUri = getMongoUri();
  cached.lastAttempt = new Date().toISOString();

  let targetUri = configuredUri;
  if (!targetUri) {
    targetUri = await getOrStartMemoryMongo();
  }

  if (!targetUri) {
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

  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    cached.lastFailedAttempt = null;
    return true;
  }

  // If a connection attempt is already in flight, reuse it
  if (cached.promise) {
    try {
      cached.conn = await cached.promise;
      return mongoose.connection.readyState === 1;
    } catch (_) {
      return false;
    }
  }

  // Throttle rapid failed bursts to 1s without locking out requests for 10s
  const now = Date.now();
  if (mongoose.connection.readyState === 0 && cached.lastFailedAttempt && (now - cached.lastFailedAttempt < 1200)) {
    return false;
  }

  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    const isVercelServerless = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const timeoutVal = Number(process.env.MONGO_TIMEOUT_MS) || (isVercelServerless ? 8000 : 20000);
    
    // High-resilience options: generous timeouts, large pool, continuous keep-alive
    const opts = {
      serverSelectionTimeoutMS: timeoutVal,
      connectTimeoutMS: timeoutVal,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 120000, // 2 minutes idle socket retention
      maxPoolSize: isVercelServerless ? 5 : 25,
      minPoolSize: isVercelServerless ? 0 : 2,
      heartbeatFrequencyMS: 10000,
      family: 4, // IPv4 preference prevents DNS resolution delays on cloud networks
      retryWrites: true,
      retryReads: true,
      autoIndex: false,
      noDelay: true
    };

    const doConnect = async () => {
      const maxAttempts = isVercelServerless ? 1 : (configuredUri ? 3 : 2);
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const mongooseInstance = await mongoose.connect(targetUri, opts);
          console.log(`✅ [MongoDB] Connected successfully: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`);
          cached.conn = mongooseInstance;
          cached.lastConnected = new Date().toISOString();
          cached.lastFailedAttempt = null;

          if (!global.__db_init_triggered) {
            global.__db_init_triggered = true;
            import("../services/dbInitService.js").then(({ ensureDatabaseInitialized }) => {
              ensureDatabaseInitialized().catch(err => console.warn("⚠️ [DB Init Error]:", err?.message));
            }).catch(() => {});
          }
          return mongooseInstance;
        } catch (err) {
          cached.lastFailedAttempt = Date.now();
          const isLastAttempt = attempt >= maxAttempts;
          if (!isLastAttempt) {
            console.warn(`⚠️ [MongoDB] Connection attempt ${attempt}/${maxAttempts} notice: ${err?.message || err}. Retrying in ${attempt * 800}ms...`);
            await new Promise(r => setTimeout(r, attempt * 800));
          } else {
            // Only fall back to memory server if NO user-configured MONGODB_URI was provided
            if (!configuredUri && !isVercelServerless) {
              const memUri = await getOrStartMemoryMongo();
              if (memUri && targetUri !== memUri) {
                console.log("⚡ [MongoDB] Activated local resilient MongoDB engine fallback.");
                targetUri = memUri;
                try {
                  const memInstance = await mongoose.connect(targetUri, opts);
                  cached.conn = memInstance;
                  cached.lastConnected = new Date().toISOString();
                  cached.lastFailedAttempt = null;
                  return memInstance;
                } catch (_) {}
              }
            }
            throw err;
          }
        }
      }
    };

    lastConnectionAttemptTime = Date.now();
    cached.promise = doConnect()
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;
        cached.lastFailedAttempt = Date.now();
        recordConnectionError(error, "connect:handshake_failed");
        console.warn("⚠️ [MongoDB] Connection handshake notice:", error.message);
        scheduleBackgroundReconnect(3000);
        throw error;
      })
      .finally(() => {
        cached.promise = null;
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
  return Boolean(mongoose && mongoose.connection && (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2));
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
      await mongoose.connection.db.command({ ping: 1 });
      pingMs = Date.now() - start;
      const adminDb = mongoose.connection.db.admin();
      const serverInfo = await adminDb.serverInfo().catch(() => null);
      if (serverInfo?.version) serverVersion = serverInfo.version;
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
    readyState: { code: readyStateNum, label: readyStateText },
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
