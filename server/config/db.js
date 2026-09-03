import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Global cache for serverless environments (Vercel, AWS Lambda, Cloud Run)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, lastConnected: null };
}

// Ensure state listeners are attached once
if (!global.__mongoose_listeners_attached) {
  global.__mongoose_listeners_attached = true;
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ [MongoDB] Disconnected from database.");
    if (cached) {
      cached.conn = null;
      cached.promise = null;
    }
  });
  mongoose.connection.on("error", (err) => {
    console.error("⚠️ [MongoDB] Connection error:", err.message);
    if (cached) {
      cached.conn = null;
      cached.promise = null;
    }
  });
  mongoose.connection.on("reconnectFailed", () => {
    console.error("⚠️ [MongoDB] Reconnect failed.");
    if (cached) {
      cached.conn = null;
      cached.promise = null;
    }
  });
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️ [MongoDB] MONGODB_URI environment variable is not defined.");
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
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 0, // Serverless execution must not keep minPoolSize > 0
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
  return mongoose.connection.readyState === 1;
}

export function getLastDbSync() {
  return cached?.lastConnected || null;
}



