import express from "express";
import { getAnalytics, logVisit, logProductView } from "../controllers/settingController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(requireAdmin, getAnalytics);

router.route("/visit")
  .post(logVisit);

router.route("/product-view")
  .post(logProductView);

export default router;

