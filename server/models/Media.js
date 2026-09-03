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
mediaSchema.index({ readURL: 1 }, { unique: true });
mediaSchema.index({ path: 1 }, { unique: true, sparse: true });
mediaSchema.index({ puterFileId: 1 }, { unique: true, sparse: true });
mediaSchema.index({ createdAt: -1 });

export const Media = mongoose.models.Media || mongoose.model("Media", mediaSchema);

/**
 * Safely consolidates duplicate metadata records without deleting actual Puter files
 * and ensures database-level unique indexes are built.
 */
export async function initMediaIndexes() {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) return;

    // Deduplicate existing metadata records by readURL
    const readUrlDuplicates = await Media.aggregate([
      { $group: { _id: "$readURL", ids: { $push: "$_id" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    for (const dup of readUrlDuplicates) {
      const idsToRemove = dup.ids.slice(1);
      if (idsToRemove.length > 0) {
        await Media.deleteMany({ _id: { $in: idsToRemove } });
      }
    }

    // Deduplicate existing metadata records by non-empty puterFileId
    const fileIdDuplicates = await Media.aggregate([
      { $match: { puterFileId: { $ne: "" } } },
      { $group: { _id: "$puterFileId", ids: { $push: "$_id" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    for (const dup of fileIdDuplicates) {
      const idsToRemove = dup.ids.slice(1);
      if (idsToRemove.length > 0) {
        await Media.deleteMany({ _id: { $in: idsToRemove } });
      }
    }

    await Media.createIndexes();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Media Model] Index initialization note:", err.message);
    }
  }
}

