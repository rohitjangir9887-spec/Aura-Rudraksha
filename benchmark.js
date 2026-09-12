import mongoose from "mongoose";
import { MongoMemoryServer } from 'mongodb-memory-server';
import { calculateOrderTotals } from "./server/services/pricingService.js";
import { Setting } from "./server/models/Setting.js";
import { connectDB, isDbConnected } from "./server/config/db.js";

async function run() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  process.env.MONGODB_URI = uri;

  await connectDB();
  console.log("DB connected:", isDbConnected());

  // Add dummy settings
  await Setting.create({
    id: "STORE_SETTINGS",
    standardShippingFee: 50,
    freeShippingThreshold: 500,
    enableProductShipping: true,
  });

  const lines = [{ id: "1", qty: 2 }];

  // Warm up
  for (let i = 0; i < 50; i++) {
    await calculateOrderTotals({ lines });
  }

  const start = performance.now();
  const iterations = 500;
  for (let i = 0; i < iterations; i++) {
    await calculateOrderTotals({ lines });
  }
  const end = performance.now();

  console.log(`Baseline: ${iterations} iterations took ${end - start} ms`);
  console.log(`Average: ${(end - start) / iterations} ms per iteration`);

  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
}

run();
