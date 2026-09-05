import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const productSchema = new mongoose.Schema({
  id: String,
  stock: Number
});
const Product = mongoose.model("Product", productSchema);

async function run() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // create 50 products
  const products = [];
  for (let i = 0; i < 50; i++) {
    products.push({ id: `prod-${i}`, stock: 10 });
  }
  await Product.insertMany(products);

  const snapshotItems = products.map(p => ({ id: p.id, qty: 1 }));

  // Baseline N+1
  const start1 = performance.now();
  for (const item of snapshotItems) {
    if (item.id) {
      const qty = Math.max(1, item.qty || item.quantity || 1);
      await Product.findOneAndUpdate({ id: item.id }, { $inc: { stock: qty } });
    }
  }
  const end1 = performance.now();
  console.log(`Baseline (N+1): ${(end1 - start1).toFixed(2)} ms`);

  // Optimized BulkWrite
  const start2 = performance.now();
  const bulkOps = [];
  for (const item of snapshotItems) {
    if (item.id) {
      const qty = Math.max(1, item.qty || item.quantity || 1);
      bulkOps.push({
        updateOne: {
          filter: { id: item.id },
          update: { $inc: { stock: qty } }
        }
      });
    }
  }
  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }
  const end2 = performance.now();
  console.log(`Optimized (bulkWrite): ${(end2 - start2).toFixed(2)} ms`);

  await mongoose.disconnect();
  await mongod.stop();
}

run().catch(console.error);
