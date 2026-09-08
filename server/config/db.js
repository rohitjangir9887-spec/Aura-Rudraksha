import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Enable command buffering so database requests wait for connection rather than failing instantly
mongoose.set("bufferCommands", true);

// Global cache for serverless environments (Vercel, AWS Lambda, Cloud Run)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, lastConnected: null };
}

// Ensure state listeners are attached once
if (!global.__mongoose_listeners_attached) {
  global.__mongoose_listeners_attached = true;
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ [MongoDB] Disconnected from database. Auto-reconnecting...");
    if (cached) {
      cached.conn = null;
      cached.promise = null;
    }
    setTimeout(() => {
      connectDB().catch(() => {});
    }, 1500);
  });
  mongoose.connection.on("error", (err) => {
    console.error("⚠️ [MongoDB] Connection error:", err.message);
    if (cached) {
      cached.conn = null;
      cached.promise = null;
    }
  });
  mongoose.connection.on("reconnectFailed", () => {
    console.error("⚠️ [MongoDB] Reconnect failed. Retrying...");
    if (cached) {
      cached.conn = null;
      cached.promise = null;
    }
    setTimeout(() => {
      connectDB().catch(() => {});
    }, 3000);
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

export async function connectDB() {
  const uri = getMongoUri();
  if (!uri) {
    if (!global.__mongo_warned_unconfigured) {
      global.__mongo_warned_unconfigured = true;
      const raw = (process.env.MONGODB_URI || "").trim();
      if (raw && raw !== ".") {
        console.warn("⚠️ [MongoDB] MONGODB_URI is provided but invalid (must start with 'mongodb://' or 'mongodb+srv://'). Database is disconnected.");
      } else {
        console.warn("⚠️ [MongoDB] MONGODB_URI environment variable is not defined or unconfigured. Database is disconnected.");
      }
    }
    return false;
  }
  
  // 1. If already active and ready, return true immediately
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return true;
  }

  // 2. If disconnected or disconnecting, clear any stale promise and cached connection
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cached.conn = null;
    cached.promise = null;
  }

  // 3. If in-flight connection promise exists, await it (prevents connection storms)
  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 60000,
      maxIdleTimeMS: 300000, // 5 mins idle timeout prevents premature socket drops
      maxPoolSize: 10,
      minPoolSize: 1, // Keep at least 1 warm socket
      autoIndex: process.env.NODE_ENV !== "production"
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log(`✅ [MongoDB] Connected successfully: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`);
      cached.conn = mongooseInstance;
      cached.lastConnected = new Date().toISOString();
      return mongooseInstance;
    }).catch((error) => {
      cached.promise = null;
      cached.conn = null;
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
    console.warn("⚠️ [MongoDB] Database not connected:", error.message);
    return false;
  }
}

export function isDbConnected() {
  return Boolean(mongoose && mongoose.connection && mongoose.connection.readyState === 1);
}

export function getLastDbSync() {
  return cached?.lastConnected || null;
}



