import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["product", "store"], default: "product" },
    productId: { type: String, default: "all", index: true },
    productName: { type: String, default: "Rudraksha Bead" },
    customerId: { type: String, default: "" },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    city: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    title: { type: String, default: "" },
    text: { type: String, required: true },
    date: { type: String, default: "Recently" },
    createdAt: { type: Number, default: () => Date.now() },
    verified: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    source: { type: String, enum: ["customer", "google_reviews", "imported", "public_site", "external", "ai_draft", "ai_generated", "admin"], default: "customer", index: true },
    sourceReviewId: { type: String, default: "", index: true },
    authorDisplayName: { type: String, default: "" },
    importedAt: { type: Date, default: null },
    editedByAI: { type: Boolean, default: false },
    aiProcessed: { type: Boolean, default: false },
    aiModel: { type: String, default: "" },
    language: { type: String, default: "English" },
    originalText: { type: String, default: "" },
    processedText: { type: String, default: "" },
    originalTextHash: { type: String, default: "", index: true },
    exactTextHash: { type: String, default: "", index: true },
    normalizedTextHash: { type: String, default: "", index: true },
    status: { type: String, enum: ["Pending", "Approved", "Published", "Rejected", "Hidden", "draft", "deleted"], default: "Approved", index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    publishedAt: { type: Date, default: null },
    publicDisplay: { type: Boolean, default: true },
    images: { type: [String], default: [] },
    img: { type: String, default: null },
    helpfulUp: { type: Number, default: 0 },
    helpfulDown: { type: Number, default: 0 },
    adminReply: { type: Object, default: null },
    isAiGenerated: { type: Boolean, default: false },
    isSample: { type: Boolean, default: false },
    sampleLabel: { type: String, default: "" }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Legacy/imported reviews use a stable string `id`, while MongoDB's native
// `_id` remains an ObjectId. Some older controller queries include both in an
// `$or`; remove only invalid ObjectId branches so those requests never fail
// Mongoose casting while the string `id` branch remains fully functional.
function stripInvalidReviewObjectIdBranches(query) {
  const conditions = query.getQuery();
  if (!conditions || typeof conditions !== "object") return;

  if (Object.prototype.hasOwnProperty.call(conditions, "_id") && typeof conditions._id === "string" && !mongoose.isValidObjectId(conditions._id)) {
    conditions._id = { $in: [] };
  }

  if (Array.isArray(conditions.$or)) {
    conditions.$or = conditions.$or.filter((branch) => {
      if (!branch || typeof branch !== "object" || !Object.prototype.hasOwnProperty.call(branch, "_id")) return true;
      const value = branch._id;
      return !(typeof value === "string" && !mongoose.isValidObjectId(value));
    });
    if (conditions.$or.length === 0) conditions._id = { $in: [] };
  }
}

for (const operation of ["find", "findOne", "findOneAndUpdate", "findOneAndDelete", "findOneAndReplace", "deleteOne", "deleteMany", "countDocuments"]) {
  reviewSchema.pre(operation, function(next) {
    stripInvalidReviewObjectIdBranches(this);
    next();
  });
}

// Virtual aliases for strict schema compatibility
reviewSchema.virtual("reviewId").get(function() { return this.id; });
reviewSchema.virtual("customerName").get(function() { return this.name; });
reviewSchema.virtual("content").get(function() { return this.text; });
reviewSchema.virtual("photos").get(function() { return this.images; });
reviewSchema.virtual("verifiedPurchase").get(function() { return this.verified; });
reviewSchema.index({ productId: 1, status: 1 });

reviewSchema.pre("save", function() {
  if (this.images && this.images.length > 0 && !this.img) {
    this.img = this.images[0];
  }
});

export const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

const reviewSettingSchema = new mongoose.Schema(
  {
    id: { type: String, default: "DEFAULT_REVIEW_SETTINGS", unique: true },
    enabled: { type: Boolean, default: true },
    photoGalleryEnabled: { type: Boolean, default: true },
    writeReviewEnabled: { type: Boolean, default: true },
    verifiedBadgeEnabled: { type: Boolean, default: true },
    helpfulVotingEnabled: { type: Boolean, default: true },
    perPage: { type: Number, default: 6 },
    defaultSort: { type: String, default: "recent" },
    cardStyle: {
      type: Object,
      default: {
        borderRadius: "18px",
        bgColor: "#fffdf9",
        borderColor: "#eadecd",
        textColor: "#2b1810",
        accentColor: "#b45309"
      }
    }
  },
  { timestamps: true }
);

export const ReviewSetting = mongoose.models.ReviewSetting || mongoose.model("ReviewSetting", reviewSettingSchema);
