import express from "express";
import {
  getSettings,
  saveSettings,
  getPolicies,
  savePolicies
} from "../controllers/settingController.js";
import { requireAdmin, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(optionalAuth, getSettings)
  .put(requireAdmin, saveSettings);

router.route("/policies")
  .get(getPolicies)
  .put(requireAdmin, savePolicies);

export default router;
