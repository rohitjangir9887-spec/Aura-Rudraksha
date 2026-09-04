import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: String, required: true, index: true }, // authUserId or email or "system"
    actorRole: { type: String, default: "admin" },
    action: { type: String, required: true, index: true }, // e.g. "ORDER_STATUS_CHANGE", "REFUND_PROCESSED", "SETTINGS_UPDATED"
    entityType: { type: String, required: true, index: true }, // "Order", "Product", "Coupon", "Setting", "Customer"
    entityId: { type: String, required: true, index: true },
    oldState: { type: mongoose.Schema.Types.Mixed },
    newState: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String, default: "" },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
