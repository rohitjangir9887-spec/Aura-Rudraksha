import express from "express";
import {
  getPromotions,
  savePromotion,
  deletePromotion,
  getActiveOffer,
  saveActiveOffer,
  getOffers,
  saveOffer,
  deleteOffer
} from "../controllers/promotionController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Promotions API
router.route("/")
  .get(getPromotions)
  .post(requireAdmin, savePromotion);

router.route("/:id")
  .put(requireAdmin, savePromotion)
  .delete(requireAdmin, deletePromotion);

export default router;
