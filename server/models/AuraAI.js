import mongoose from "mongoose";

const auraAISettingSchema = new mongoose.Schema(
  {
    id: { type: String, default: "AURA_AI_SETTINGS", unique: true },
    enabled: { type: Boolean, default: true },
    showFloatingButton: { type: Boolean, default: true },
    showHeaderButton: { type: Boolean, default: true },
    language: { type: String, default: "auto" }, // 'auto', 'hi', 'en', 'hinglish'
    tone: { type: String, default: "polite_spiritual" }, // 'polite_spiritual', 'concise', 'friendly'
    greeting: { 
      type: String, 
      default: "Namaste 🙏 Main Aura AI hoon — Aura Rudraksha ka personal shopping aur support assistant. Aaj main aapki kis cheez mein help karun?" 
    },
    recommendProducts: { type: Boolean, default: true },
    recommendOffers: { type: Boolean, default: true },
    cartActions: { type: Boolean, default: true },
    orderSupport: { type: Boolean, default: true },
    humanSupport: { type: Boolean, default: true },
    personalization: { type: Boolean, default: true },
    nvidiaApiKey: { type: String, default: "" },
    nemotronApiKey: { type: String, default: "" },
    nemotronModel: { type: String, default: "nvidia/nemotron-3-super-120b-a12b" }
  },
  { timestamps: true }
);

export const AuraAISetting = mongoose.models.AuraAISetting || mongoose.model("AuraAISetting", auraAISettingSchema);

const auraAIMessageSchema = new mongoose.Schema({
  id: { type: String, default: () => "msg_" + Math.random().toString(36).substring(2, 9) },
  sender: { type: String, enum: ["user", "ai", "system"], required: true },
  text: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  products: { type: Array, default: [] },
  coupons: { type: Array, default: [] },
  cartAction: { type: Object, default: null },
  orderInfo: { type: Object, default: null },
  requiresHuman: { type: Boolean, default: false },
  quickReplies: { type: Array, default: [] },
  kundali: { type: Object, default: null }
});

const auraAIConversationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    conversationId: { type: String, index: true },
    userId: { type: String, default: "guest", index: true },
    guestSessionId: { type: String, default: "", index: true },
    ipHash: { type: String, default: "" },
    hashedIp: { type: String, default: "" },
    userIp: { type: String, default: "", index: true },
    ipAddress: { type: String, default: "", index: true },
    userAgent: { type: String, default: "" },
    deviceInfo: { type: String, default: "" },
    platform: { type: String, default: "" },
    country: { type: String, default: "" },
    city: { type: String, default: "" },
    source: { type: String, default: "floating_bot" }, // 'floating_bot' | 'panditji_floating' | 'aura_ai_page' | 'kundli_analyzer'
    userEmail: { type: String, default: "", index: true },
    userName: { type: String, default: "Devotee" },
    userPhone: { type: String, default: "" },
    title: { type: String, default: "Rudraksha Consultation" },
    mode: { type: String, default: "standard", index: true }, // 'standard' | 'panditji'
    messages: [auraAIMessageSchema],
    productsDiscussed: { type: [String], default: [] },
    productsRecommended: { type: [String], default: [] },
    productsClicked: { type: [String], default: [] },
    addedToCart: { type: [String], default: [] },
    ordersDiscussed: { type: [String], default: [] },
    requiresHumanSupport: { type: Boolean, default: false },
    status: { type: String, default: "Active" }, // 'Active', 'Resolved', 'Escalated'
    sentiment: { type: String, default: "Positive" },
    verifiedBirthDetails: { type: Object, default: null },
    authoritativeKundali: { type: Object, default: null },
    lastMessageText: { type: String, default: "" },
    lastMessageAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

auraAIConversationSchema.index({ userId: 1, id: 1 });
export const AuraAIConversation = mongoose.models.AuraAIConversation || mongoose.model("AuraAIConversation", auraAIConversationSchema);

// Long-Term Memory Schema (Mem0-Style Context Memory)
const auraAIMemorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true }, // AuthUserId or GuestSessionId
    memoryKey: { type: String, required: true }, // e.g. 'budget_preference', 'rashi_zodiac', 'preferred_language', 'primary_concern'
    memoryValue: { type: String, required: true },
    category: { type: String, default: "preference" }, // 'preference' | 'astrology' | 'product_interest' | 'order_context'
    confidence: { type: Number, default: 0.9 },
    sourceConversationId: { type: String, default: "" },
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

auraAIMemorySchema.index({ userId: 1, memoryKey: 1 }, { unique: true });

export const AuraAIMemory = mongoose.models.AuraAIMemory || mongoose.model("AuraAIMemory", auraAIMemorySchema);

// RAG Document Index Schema
const auraAIRagDocumentSchema = new mongoose.Schema(
  {
    docId: { type: String, required: true, unique: true, index: true },
    docType: { type: String, required: true, index: true }, // 'product' | 'faq' | 'policy' | 'coupon' | 'review' | 'knowledge'
    title: { type: String, required: true },
    content: { type: String, required: true },
    metadata: { type: Object, default: {} },
    embedding: { type: [Number], default: [] }, // Vector embedding for Atlas/cosine search
    lastIndexedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const AuraAIRagDocument = mongoose.models.AuraAIRagDocument || mongoose.model("AuraAIRagDocument", auraAIRagDocumentSchema);

// ---------------------------------------------------------------------------
// Admin AI Agent Persistent Chat Session (Saves immediately to MongoDB & completes in background)
// ---------------------------------------------------------------------------
const adminAIChatMessageSchema = new mongoose.Schema({
  id: { type: String, default: () => "amsg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7) },
  sender: { type: String, enum: ["user", "ai", "system"], required: true },
  text: { type: String, required: true },
  status: { type: String, default: "completed" }, // 'queued' | 'processing' | 'completed' | 'error'
  modelUsed: { type: String, default: "nvidia/nemotron-3-super-120b-a12b" },
  actionsExecuted: { type: Array, default: [] },
  previewRoute: { type: String, default: "" },
  previewTitle: { type: String, default: "" },
  timestamp: { type: String, default: () => new Date().toISOString() }
});

const adminAIChatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: "Admin Command Session" },
    status: { type: String, default: "idle" }, // 'idle' | 'processing' | 'completed' | 'error'
    activeJobId: { type: String, default: "" },
    lastPrompt: { type: String, default: "" },
    messages: [adminAIChatMessageSchema],
    lastUpdatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const AdminAIChatSession = mongoose.models.AdminAIChatSession || mongoose.model("AdminAIChatSession", adminAIChatSessionSchema);

// ---------------------------------------------------------------------------
// Admin AI Action Log (Tracks every mutation made by AI with full Undo/Rollback snapshot)
// ---------------------------------------------------------------------------
const adminAIActionLogSchema = new mongoose.Schema(
  {
    actionId: { type: String, required: true, unique: true, index: true },
    actionType: { type: String, required: true, index: true }, // 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT' | 'CREATE_COUPON' | 'DELETE_COUPON' | 'UPDATE_ORDER' | 'ADD_WEBSITE_FEATURE' | 'UPDATE_SETTINGS' | 'AUTO_FIX_BUG'
    title: { type: String, required: true },
    description: { type: String, default: "" },
    targetCollection: { type: String, required: true }, // 'Product' | 'Coupon' | 'Order' | 'Setting' | 'Banner'
    targetId: { type: String, required: true },
    previousData: { type: mongoose.Schema.Types.Mixed, default: null },
    newData: { type: mongoose.Schema.Types.Mixed, default: null },
    previewRoute: { type: String, default: "/" },
    reverted: { type: Boolean, default: false },
    revertedAt: { type: String, default: "" },
    source: { type: String, default: "admin_chat" }, // 'admin_chat' | 'background_task'
    sessionId: { type: String, default: "" },
    taskId: { type: String, default: "" },
    timestamp: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const AdminAIActionLog = mongoose.models.AdminAIActionLog || mongoose.model("AdminAIActionLog", adminAIActionLogSchema);

// ---------------------------------------------------------------------------
// Admin AI Autonomous Background Task (Runs on server even when website is closed)
// ---------------------------------------------------------------------------
const adminAITaskRunLogSchema = new mongoose.Schema({
  runId: { type: String, default: () => "run_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6) },
  timestamp: { type: String, default: () => new Date().toISOString() },
  status: { type: String, default: "success" }, // 'running' | 'success' | 'error'
  summary: { type: String, default: "" },
  aiOutput: { type: String, default: "" },
  actionsTaken: { type: Array, default: [] },
  modelUsed: { type: String, default: "nvidia/nemotron-3-super-120b-a12b" }
});

const adminAITaskSchema = new mongoose.Schema(
  {
    taskId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    prompt: { type: String, required: true },
    taskType: { type: String, default: "custom" }, // 'seo_optimizer' | 'bug_scanner' | 'inventory_guardian' | 'product_generator' | 'custom'
    status: { type: String, default: "running", index: true }, // 'running' | 'paused' | 'completed' | 'stopped' | 'error'
    durationMinutes: { type: Number, default: 60 }, // Total time to keep task active (e.g., 15, 60, 360, 1440)
    intervalMinutes: { type: Number, default: 5 }, // Interval between autonomous cycles
    startedAt: { type: String, default: () => new Date().toISOString() },
    expiresAt: { type: String, required: true },
    lastRunAt: { type: String, default: "" },
    nextRunAt: { type: String, default: () => new Date().toISOString() },
    runsCount: { type: Number, default: 0 },
    maxRuns: { type: Number, default: 100 },
    logs: [adminAITaskRunLogSchema]
  },
  { timestamps: true }
);

export const AdminAITask = mongoose.models.AdminAITask || mongoose.model("AdminAITask", adminAITaskSchema);

// ---------------------------------------------------------------------------
// Admin AI Private Live Work Log (Real-time telemetry of everything AI is doing)
// ---------------------------------------------------------------------------
const adminAIWorkLogSchema = new mongoose.Schema(
  {
    logId: { type: String, required: true, unique: true, index: true },
    category: { type: String, default: "agent" }, // 'chat' | 'task' | 'action' | 'undo' | 'bug_scan' | 'db_sync'
    status: { type: String, default: "active" }, // 'active' | 'completed' | 'warning' | 'error'
    title: { type: String, required: true },
    detail: { type: String, default: "" },
    modelUsed: { type: String, default: "nvidia/nemotron-3-super-120b-a12b" },
    metadata: { type: Object, default: {} },
    timestamp: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const AdminAIWorkLog = mongoose.models.AdminAIWorkLog || mongoose.model("AdminAIWorkLog", adminAIWorkLogSchema);

