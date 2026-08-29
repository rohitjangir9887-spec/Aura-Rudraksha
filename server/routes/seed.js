import express from "express";
import { seedDatabase } from "../controllers/settingController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .post(requireAdmin, seedDatabase)
  .get(requireAdmin, seedDatabase);

export default router;
