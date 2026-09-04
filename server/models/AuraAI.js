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
    personalization: { type: Boolean, default: true }
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
  quickReplies: { type: Array, default: [] }
});

const auraAIConversationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: "guest", index: true },
    guestSessionId: { type: String, default: "", index: true },
    ipHash: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    userName: { type: String, default: "Devotee" },
    title: { type: String, default: "Rudraksha Consultation" },
    mode: { type: String, default: "standard" }, // 'standard' | 'panditji'
    messages: [auraAIMessageSchema],
    productsDiscussed: { type: [String], default: [] },
    productsRecommended: { type: [String], default: [] },
    productsClicked: { type: [String], default: [] },
    addedToCart: { type: [String], default: [] },
    ordersDiscussed: { type: [String], default: [] },
    requiresHumanSupport: { type: Boolean, default: false },
    status: { type: String, default: "Active" }, // 'Active', 'Resolved', 'Escalated'
    sentiment: { type: String, default: "Positive" },
    lastMessageAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

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

