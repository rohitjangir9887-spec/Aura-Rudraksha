import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Global cache for serverless environments (Vercel, AWS Lambda, Cloud Run)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️ [MongoDB] MONGODB_URI environment variable is not defined. Running in mock/cache mode.");
    return false;
  }
  
  if (cached.conn && mongoose.connection.readyState === 1) {
    return true;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      autoIndex: process.env.NODE_ENV !== "production"
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log(`✅ [MongoDB] Connected successfully: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`);
      return mongooseInstance;
    }).catch((error) => {
      cached.promise = null;
      console.warn("⚠️ [MongoDB] Connection failed:", error.message);
      return null;
    });
  }

  try {
    cached.conn = await cached.promise;
    return !!cached.conn && mongoose.connection.readyState === 1;
  } catch (error) {
    cached.promise = null;
    console.warn("⚠️ [MongoDB] Database not connected — some features may not work", error.message);
    return false;
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}


