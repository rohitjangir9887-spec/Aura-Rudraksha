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
import {
  handleAdminAgentChat,
  getAdminAgentSession,
  deleteAdminAgentMessage,
  clearAdminAgentSession,
  executeDirectAdminActionEndpoint,
  getAdminActionLogsEndpoint,
  undoAdminActionEndpoint,
  deleteAdminActionLogEndpoint,
  getAdminTasksEndpoint,
  createAdminTaskEndpoint,
  controlAdminTaskEndpoint,
  deleteAdminTaskEndpoint,
  getAdminVaultAndWorkLogs,
  deleteAdminWorkLogEndpoint
} from "../controllers/adminAiAgentController.js";
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

// Admin Autonomous Agent & Command Center endpoints
router.post("/admin-chat", optionalAuth, handleAdminAgentChat);
router.post("/admin-agent/chat", optionalAuth, handleAdminAgentChat);
router.get("/admin-agent/session", optionalAuth, getAdminAgentSession);
router.delete("/admin-agent/session/message/:messageId", optionalAuth, deleteAdminAgentMessage);
router.delete("/admin-agent/session/clear", optionalAuth, clearAdminAgentSession);
router.post("/admin-agent/action", optionalAuth, executeDirectAdminActionEndpoint);
router.get("/admin-agent/actions", optionalAuth, getAdminActionLogsEndpoint);
router.post("/admin-agent/actions/:actionId/undo", optionalAuth, undoAdminActionEndpoint);
router.delete("/admin-agent/actions/:actionId", optionalAuth, deleteAdminActionLogEndpoint);
router.get("/admin-agent/tasks", optionalAuth, getAdminTasksEndpoint);
router.post("/admin-agent/tasks", optionalAuth, createAdminTaskEndpoint);
router.post("/admin-agent/tasks/:taskId/control", optionalAuth, controlAdminTaskEndpoint);
router.delete("/admin-agent/tasks/:taskId", optionalAuth, deleteAdminTaskEndpoint);
router.get("/admin-agent/vault", optionalAuth, getAdminVaultAndWorkLogs);
router.delete("/admin-agent/work-logs/:logId", optionalAuth, deleteAdminWorkLogEndpoint);

// Admin Settings & Analytics
router.put("/settings", optionalAuth, updateAuraAISettings);
router.get("/analytics", optionalAuth, getAuraAIAnalytics);
router.get("/admin-intelligence", optionalAuth, getAdminAiIntelligence);
router.post("/admin-intelligence", optionalAuth, getAdminAiIntelligence);

// Admin: Comprehensive AI Bot All Chats & MongoDB Status Endpoints
router.get("/admin/all-chats", optionalAuth, getAdminAllAiChats);
router.get("/admin/chats/:id", optionalAuth, getAdminAiChatTranscript);
router.delete("/admin/chats/:id", optionalAuth, deleteAdminAiChat);
router.delete("/admin/chats-clear", optionalAuth, clearAdminAiChats);
router.get("/admin/db-health", optionalAuth, getAdminMongoDbCheck);

export default router;
