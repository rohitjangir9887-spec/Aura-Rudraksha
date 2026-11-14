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
  getAdminMongoDbCheck,
  getPublicTrendsEndpoint
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
  deleteAdminWorkLogEndpoint,
  getAdminDiagnosticsEndpoint,
  getAdminGrowthAuditEndpoint
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
router.get("/public-trends", getPublicTrendsEndpoint);
router.get("/conversations", optionalAuth, getAuraAIConversations);
router.get("/conversations/:id", optionalAuth, getAuraAIConversationById);
router.delete("/conversations/:id", optionalAuth, deleteAuraAIConversation);

// Admin Autonomous Agent & Command Center endpoints (Strictly Protected by requireAdmin)
router.post("/admin-chat", requireAdmin, handleAdminAgentChat);
router.post("/admin-agent/chat", requireAdmin, handleAdminAgentChat);
router.get("/admin-agent/session", requireAdmin, getAdminAgentSession);
router.delete("/admin-agent/session/message/:messageId", requireAdmin, deleteAdminAgentMessage);
router.delete("/admin-agent/session/clear", requireAdmin, clearAdminAgentSession);
router.post("/admin-agent/action", requireAdmin, executeDirectAdminActionEndpoint);
router.get("/admin-agent/actions", requireAdmin, getAdminActionLogsEndpoint);
router.post("/admin-agent/actions/:actionId/undo", requireAdmin, undoAdminActionEndpoint);
router.delete("/admin-agent/actions/:actionId", requireAdmin, deleteAdminActionLogEndpoint);
router.get("/admin-agent/tasks", requireAdmin, getAdminTasksEndpoint);
router.post("/admin-agent/tasks", requireAdmin, createAdminTaskEndpoint);
router.post("/admin-agent/tasks/:taskId/control", requireAdmin, controlAdminTaskEndpoint);
router.delete("/admin-agent/tasks/:taskId", requireAdmin, deleteAdminTaskEndpoint);
router.get("/admin-agent/vault", requireAdmin, getAdminVaultAndWorkLogs);
router.get("/admin-agent/diagnostics", requireAdmin, getAdminDiagnosticsEndpoint);
router.get("/admin-agent/growth-audit", requireAdmin, getAdminGrowthAuditEndpoint);
router.delete("/admin-agent/work-logs/:logId", requireAdmin, deleteAdminWorkLogEndpoint);

// Admin Settings & Analytics (Strictly Protected by requireAdmin)
router.put("/settings", requireAdmin, updateAuraAISettings);
router.get("/analytics", requireAdmin, getAuraAIAnalytics);
router.get("/admin-intelligence", requireAdmin, getAdminAiIntelligence);
router.post("/admin-intelligence", requireAdmin, getAdminAiIntelligence);

// Admin: Comprehensive AI Bot All Chats & MongoDB Status Endpoints (Strictly Protected by requireAdmin)
router.get("/admin/all-chats", requireAdmin, getAdminAllAiChats);
router.get("/admin/chats/:id", requireAdmin, getAdminAiChatTranscript);
router.delete("/admin/chats/:id", requireAdmin, deleteAdminAiChat);
router.delete("/admin/chats-clear", requireAdmin, clearAdminAiChats);
router.get("/admin/db-health", requireAdmin, getAdminMongoDbCheck);

export default router;
