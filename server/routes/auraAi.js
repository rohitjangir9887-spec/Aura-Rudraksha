import express from "express";
import {
  chatAuraAI,
  adminChatAuraAI,
  calculateKundaliEndpoint,
  getAdminAiIntelligence,
  getAuraAISettings,
  updateAuraAISettings,
  getAuraAIConversations,
  getAuraAIConversationById,
  deleteAuraAIConversation,
  trackAuraAIAction,
  getAuraAIAnalytics,
  generateProductDescription,
  generateProductKeywords,
  getUserNotesEndpoint,
  setUserNoteEndpoint,
  deleteUserNoteEndpoint,
  getAdminAllAiChats,
  getAdminAiChatTranscript,
  deleteAdminAiChat,
  clearAdminAiChats,
  getAdminMongoDbCheck
} from "../controllers/auraAiController.js";
import { optionalAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// User & Public endpoints
router.post("/chat", optionalAuth, chatAuraAI);
router.post("/kundali", optionalAuth, calculateKundaliEndpoint);
router.get("/notes", optionalAuth, getUserNotesEndpoint);
router.post("/notes", optionalAuth, setUserNoteEndpoint);
router.delete("/notes/:key", optionalAuth, deleteUserNoteEndpoint);
router.post("/generate-description", optionalAuth, generateProductDescription);
router.post("/generate-keywords", optionalAuth, generateProductKeywords);
router.post("/track", optionalAuth, trackAuraAIAction);
router.get("/settings", getAuraAISettings);
router.get("/conversations", optionalAuth, getAuraAIConversations);
router.get("/conversations/:id", optionalAuth, getAuraAIConversationById);
router.delete("/conversations/:id", optionalAuth, deleteAuraAIConversation);

// Admin endpoints
router.post("/admin-chat", optionalAuth, adminChatAuraAI);
router.put("/settings", requireAdmin, updateAuraAISettings);
router.get("/analytics", requireAdmin, getAuraAIAnalytics);
router.get("/admin-intelligence", requireAdmin, getAdminAiIntelligence);
router.post("/admin-intelligence", requireAdmin, getAdminAiIntelligence);

// Admin: Comprehensive AI Bot All Chats & MongoDB Status Endpoints
router.get("/admin/all-chats", requireAdmin, getAdminAllAiChats);
router.get("/admin/chats/:id", requireAdmin, getAdminAiChatTranscript);
router.delete("/admin/chats/:id", requireAdmin, deleteAdminAiChat);
router.delete("/admin/chats-clear", requireAdmin, clearAdminAiChats);
router.get("/admin/db-health", requireAdmin, getAdminMongoDbCheck);

export default router;
