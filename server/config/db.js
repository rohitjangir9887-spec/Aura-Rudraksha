import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let isConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === "" || uri.includes("USERNAME:PASSWORD")) {
    isConnected = false;
    if (process.env.NODE_ENV === "production") {
      console.error("===============================================================");
      console.error("❌ [MongoDB Production Error] MONGODB_URI is required and not set.");
      console.error("👉 Please provide a valid MongoDB connection string in environment.");
      console.error("===============================================================");
    } else {
      console.warn("===============================================================");
      console.warn("⚠️  [MongoDB] MONGODB_URI is not set or contains placeholders.");
      console.warn("👉  Set MONGODB_URI in your environment or .env file to enable persistence.");
      console.warn("🔒  Database is currently disconnected. Mutations will be rejected.");
      console.warn("===============================================================");
    }
    return false;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    isConnected = true;
    console.log(`✅ [MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.error("❌ [MongoDB Connection Error]:", error.message);
    if (process.env.NODE_ENV === "production") {
      console.error("❌ [MongoDB] Database is required in production mode.");
    } else {
      console.warn("⚠️ [MongoDB] Running in disconnected mode. Permanent data writes will be rejected.");
    }
    return false;
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

