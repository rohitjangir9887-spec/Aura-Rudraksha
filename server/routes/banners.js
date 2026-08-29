import express from "express";
import {
  getBanners,
  saveBanners,
  createBanner,
  deleteBanner
} from "../controllers/bannerController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(getBanners)
  .post(requireAdmin, saveBanners);

router.route("/create")
  .post(requireAdmin, createBanner);

router.route("/:id")
  .delete(requireAdmin, deleteBanner);

export default router;
