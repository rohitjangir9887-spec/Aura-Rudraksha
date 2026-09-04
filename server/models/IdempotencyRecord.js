import mongoose from "mongoose";

const idempotencyRecordSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: "", index: true },
    action: { type: String, required: true, index: true }, // e.g., "create_order", "initiate_payment", "refund"
    requestHash: { type: String, required: true },
    status: { type: String, enum: ["in_progress", "completed", "failed"], default: "in_progress", index: true },
    responseStatus: { type: Number },
    responseBody: { type: mongoose.Schema.Types.Mixed },
    resourceId: { type: String, default: "" },
    expiresAt: { type: Date, required: true, index: { expires: 0 } } // TTL auto-cleanup
  },
  { timestamps: true }
);

idempotencyRecordSchema.index({ key: 1, action: 1 }, { unique: true });

export const IdempotencyRecord =
  mongoose.models.IdempotencyRecord || mongoose.model("IdempotencyRecord", idempotencyRecordSchema);
