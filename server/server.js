import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;
const app = createApp();

async function start() {
  await connectDB();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ [Aura Rudraksha Backend] Running on http://0.0.0.0:${PORT}`);
  });
}

start();

export default app;
