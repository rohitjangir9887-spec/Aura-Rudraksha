import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    readURL: { type: String, required: true, trim: true },
    url: { type: String, trim: true },
    puterFileId: { type: String, default: "", trim: true },
    fileId: { type: String, default: "", trim: true },
    path: { type: String, default: "", trim: true },
    filename: { type: String, default: "" },
    type: { type: String, default: "image/jpeg" },
    sizeBytes: { type: Number, default: 0 },
    size: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    provider: { type: String, required: true, default: "puter" }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Performance & Idempotency indexes
mediaSchema.index({ readURL: 1 });
mediaSchema.index({ path: 1 }, { sparse: true });
mediaSchema.index({ puterFileId: 1 }, { sparse: true });
mediaSchema.index({ createdAt: -1 });

export const Media = mongoose.models.Media || mongoose.model("Media", mediaSchema);
