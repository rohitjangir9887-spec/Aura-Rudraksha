import express from "express";
import {
  getOffers,
  saveOffer,
  deleteOffer,
  getActiveOffer,
  saveActiveOffer
} from "../controllers/promotionController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// General Offers (Home Deals, Badges, etc.)
router.route("/")
  .get(getOffers)
  .post(requireAdmin, saveOffer);

router.route("/:id")
  .put(requireAdmin, saveOffer)
  .delete(requireAdmin, deleteOffer);

export default router;
