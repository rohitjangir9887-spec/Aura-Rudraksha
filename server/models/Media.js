import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    fileId: { type: String, default: "" },
    type: { type: String, default: "image/jpeg" },
    size: { type: Number, default: 0 },
    provider: { type: String, required: true, default: "server" }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export const Media = mongoose.models.Media || mongoose.model("Media", mediaSchema);
