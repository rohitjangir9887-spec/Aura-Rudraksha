import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let isConnected = false;
mongoose.set('bufferCommands', false);

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost/mock';
  
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      autoIndex: true
    });
    isConnected = true;
    console.log(`✅ [MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.warn("⚠️ [MongoDB] Database not connected — some features may not work", error.message);
    return false;
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

