import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const isVercelServerless = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Disable buffering commands during disconnects to prevent 30-second request hangs
mongoose.set("bufferCommands", false);

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

  // Background keep-alive & watchdog: pings every 15s on long-running instances
  // Disabled on serverless (Vercel/AWS Lambda) to prevent socket freezes and lingering timers
  if (!isVercelServerless) {
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
    }, 15000);
  }
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

  // Throttle rapid failed bursts to prevent hanging consecutive serverless requests
  const now = Date.now();
  const failureCooldown = isVercelServerless ? 15000 : 5000;
  if (mongoose.connection.readyState === 0 && cached.lastFailedAttempt && (now - cached.lastFailedAttempt < failureCooldown)) {
    return false;
  }

  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    // Fast fail on connection: never hang requests for 15s or 150s. Cap to 5000ms.
    const configuredTimeout = Number(process.env.MONGO_TIMEOUT_MS);
    const timeoutVal = configuredTimeout > 0 ? Math.min(configuredTimeout, 6000) : (isVercelServerless ? 3500 : 5000);
    
    // High-resilience options: fast serverSelectionTimeout, large pool, continuous keep-alive
    const opts = {
      serverSelectionTimeoutMS: timeoutVal,
      connectTimeoutMS: timeoutVal,
      socketTimeoutMS: isVercelServerless ? 6000 : 15000,
      maxIdleTimeMS: isVercelServerless ? 10000 : 60000,
      maxPoolSize: isVercelServerless ? 2 : 20,
      minPoolSize: 0,
      heartbeatFrequencyMS: 10000,
      family: 4, // IPv4 preference prevents DNS resolution delays on cloud networks
      retryWrites: true,
      retryReads: true,
      autoIndex: false,
      noDelay: true
    };

    const doConnect = async () => {
      const maxAttempts = isVercelServerless ? 1 : 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const mongooseInstance = await mongoose.connect(targetUri, opts);
          console.log(`✅ [MongoDB] Connected successfully: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`);
          cached.conn = mongooseInstance;
          cached.lastConnected = new Date().toISOString();
          cached.lastFailedAttempt = null;
          cached.isIpWhitelistError = false;

          if (!global.__db_init_triggered) {
            global.__db_init_triggered = true;
            import("../services/dbInitService.js").then(({ ensureDatabaseInitialized }) => {
              ensureDatabaseInitialized().catch(err => console.warn("⚠️ [DB Init Error]:", err?.message));
            }).catch(() => {});
          }
          return mongooseInstance;
        } catch (err) {
          cached.lastFailedAttempt = Date.now();
          const isIpWhitelist = err?.name === "MongooseServerSelectionError" || 
                                err?.name === "MongoNetworkTimeoutError" || 
                                String(err?.message || "").toLowerCase().includes("whitelist") ||
                                String(err?.message || "").toLowerCase().includes("timed out");
          if (isIpWhitelist) {
            cached.isIpWhitelistError = true;
            console.warn("⚠️ [MongoDB Atlas IP Whitelist Warning]: Atlas cluster unreachable. If using MongoDB Atlas, make sure 0.0.0.0/0 is added to IP Whitelist in Atlas Security -> Network Access.");
          }
          const isLastAttempt = attempt >= maxAttempts;
          if (!isLastAttempt) {
            console.warn(`⚠️ [MongoDB] Connection attempt ${attempt}/${maxAttempts} notice: ${err?.message || err}. Retrying in 500ms...`);
            await new Promise(r => setTimeout(r, 500));
          } else {
            // If primary targetUri failed and memory server is supported, fallback to memory mongo
            if (!isVercelServerless) {
              const memUri = await getOrStartMemoryMongo().catch(() => null);
              if (memUri && targetUri !== memUri) {
                console.log("⚡ [MongoDB] Activated local resilient MongoDB engine fallback to keep store online.");
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
        if (error.message?.includes("whitelist") || error.name === "MongooseServerSelectionError" || error.name === "MongoNetworkTimeoutError") {
          console.warn("🔒 [MongoDB Atlas Reminder]: Please whitelist 0.0.0.0/0 (Allow from anywhere) in MongoDB Atlas -> Security -> Network Access -> Add IP Address to allow connections from cloud hosting / Vercel.");
        }
        if (!isVercelServerless) {
          scheduleBackgroundReconnect(5000);
        }
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
    isIpWhitelistError: Boolean(cached?.isIpWhitelistError),
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
