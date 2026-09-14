import express from "express";
import {
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  voteReview,
  getReviewSettings,
  saveReviewSettings,
  generateReviewDrafts,
  bulkSaveReviews,
  importExternalReviews,
  polishReviewWithAI
} from "../controllers/reviewController.js";
import { requireAdmin, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(optionalAuth, getReviews)
  .post(createReview);

router.route("/import-external")
  .post(requireAdmin, importExternalReviews);

router.route("/polish")
  .post(requireAdmin, polishReviewWithAI);

router.route("/generate-drafts")
  .post(requireAdmin, generateReviewDrafts);

router.route("/bulk-save")
  .post(requireAdmin, bulkSaveReviews);

router.route("/settings")
  .get(getReviewSettings)
  .put(requireAdmin, saveReviewSettings);

router.route("/:id")
  .put(requireAdmin, updateReview)
  .delete(requireAdmin, deleteReview);

router.route("/:id/vote")
  .post(voteReview);

export default router;
