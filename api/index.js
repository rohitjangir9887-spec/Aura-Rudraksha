import { createApp } from "../server/app.js";
import { connectDB } from "../server/config/db.js";

const app = createApp();
connectDB().catch(console.warn);

export default app;
