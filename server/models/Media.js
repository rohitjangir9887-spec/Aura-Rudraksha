import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    readURL: { type: String, required: true },
    url: { type: String },
    puterFileId: { type: String, default: "" },
    fileId: { type: String, default: "" },
    path: { type: String, default: "" },
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

export const Media = mongoose.models.Media || mongoose.model("Media", mediaSchema);
