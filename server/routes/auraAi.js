import express from "express";
import {
  chatAuraAI,
  getAuraAISettings,
  updateAuraAISettings,
  getAuraAIConversations,
  getAuraAIConversationById,
  deleteAuraAIConversation,
  trackAuraAIAction,
  getAuraAIAnalytics,
  generateProductDescription
} from "../controllers/auraAiController.js";
import { optionalAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// User & Public endpoints
router.post("/chat", optionalAuth, chatAuraAI);
router.post("/generate-description", requireAdmin, generateProductDescription);
router.post("/track", optionalAuth, trackAuraAIAction);
router.get("/settings", getAuraAISettings);
router.get("/conversations", optionalAuth, getAuraAIConversations);
router.get("/conversations/:id", optionalAuth, getAuraAIConversationById);
router.delete("/conversations/:id", optionalAuth, deleteAuraAIConversation);

// Admin endpoints
router.put("/settings", requireAdmin, updateAuraAISettings);
router.get("/analytics", requireAdmin, getAuraAIAnalytics);

export default router;

