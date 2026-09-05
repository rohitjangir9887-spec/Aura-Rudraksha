import mongoose from "mongoose";
import { MongoMemoryServer } from 'mongodb-memory-server';
import { calculateOrderTotals } from "./server/services/pricingService.js";
import { Setting } from "./server/models/Setting.js";
import { Product } from "./server/models/Product.js";
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

  // Add dummy product
  await Product.create({
    id: "1",
    _id: new mongoose.Types.ObjectId(),
    name: "Product 1",
    price: 100,
    mrp: 150,
    status: "Active"
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

  console.log(`With optimization: ${iterations} iterations took ${end - start} ms`);
  console.log(`Average: ${(end - start) / iterations} ms per iteration`);

  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
}

run();
