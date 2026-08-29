import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
async function test() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`Connected to: ${conn.connection.host}`);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
test();
