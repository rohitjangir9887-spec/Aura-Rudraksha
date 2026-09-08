import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Disable command buffering so queries fail fast and allow graceful fallbacks when offline
mongoose.set("bufferCommands", false);

// Global cache for serverless environments (Vercel, AWS Lambda, Cloud Run)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, lastConnected: null };
}

// Ensure state listeners are attached once without manual recursive reconnect loops (Mongoose driver manages reconnection internally)
if (!global.__mongoose_listeners_attached) {
  global.__mongoose_listeners_attached = true;
  mongoose.connection.on("connected", () => {
    cached.lastConnected = new Date().toISOString();
  });
  mongoose.connection.on("disconnected", () => {
    cached.conn = null;
  });
  mongoose.connection.on("error", (err) => {
    console.warn("⚠️ [MongoDB] Connection error:", err.message);
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
    } catch (_) {
      return false;
    }
  }

  // 3. If disconnected or disconnecting (readyState === 0 or 3), initiate a single connection promise
  if (!cached.promise || mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    const opts = {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 60000,
      maxPoolSize: 10,
      minPoolSize: 0,
      retryWrites: true,
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
    return false;
  }
}

export function isDbConnected() {
  return Boolean(mongoose && mongoose.connection && mongoose.connection.readyState === 1);
}

export function getLastDbSync() {
  return cached?.lastConnected || null;
}




