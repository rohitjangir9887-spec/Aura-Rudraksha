import express from "express";
import {
  getSettings,
  getAdminSettings,
  saveSettings,
  getPolicies,
  savePolicies
} from "../controllers/settingController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(getSettings)
  .put(requireAdmin, saveSettings);

router.get("/admin", requireAdmin, getAdminSettings);

router.route("/policies")
  .get(getPolicies)
  .put(requireAdmin, savePolicies);

export default router;
