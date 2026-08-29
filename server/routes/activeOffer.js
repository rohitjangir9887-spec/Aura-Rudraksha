import express from "express";
import {
  getActiveOffer,
  saveActiveOffer
} from "../controllers/promotionController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(getActiveOffer)
  .post(requireAdmin, saveActiveOffer)
  .put(requireAdmin, saveActiveOffer);

export default router;
