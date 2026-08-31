import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["product", "store"], default: "product" },
    productId: { type: String, default: "5", index: true },
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
    source: { type: String, enum: ["customer", "ai_draft", "admin"], default: "customer" },
    status: { type: String, enum: ["Approved", "Pending", "Hidden", "Rejected", "draft", "deleted"], default: "Approved" },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    publishedAt: { type: Date, default: null },
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
