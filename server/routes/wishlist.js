import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getWishlist, addWishlist, deleteWishlist } from "../controllers/customerController.js";

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(getWishlist)
  .post(addWishlist);

router.route("/:productId")
  .delete(deleteWishlist);

export default router;
