import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    description: { type: String, default: "" },
    category: { type: String, default: "Rudraksha", trim: true },
    images: { type: [String], default: [] },
    img: { type: String, default: "" },
    stock: { type: Number, default: 50, min: 0 },
    status: { 
      type: String, 
      enum: ["Published", "Draft", "Active", "Inactive", "Archived", "Out of Stock", "published", "draft"], 
      default: "Draft" 
    },
    tags: { type: [String], default: [] },
    highlight: { type: String, default: "" },
    badge: { type: String, default: "" },
    homeBadge: { type: String, default: "" },
    showOnHome: { type: Boolean, default: true },
    homeOrder: { type: Number, default: 0 },
    isPopular: { type: Boolean, default: false },
    rating: { type: Number, default: 4.9, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    reviewCount: { type: Number, default: 0, min: 0 },
    customOffer: { type: Object, default: null },
    freeShipping: { type: Boolean, default: true },
    shippingFee: { type: Number, default: 0, min: 0 }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Auto slug generation before save
productSchema.pre("save", function () {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  }
  if (!this.mrp && this.comparePrice) {
    this.mrp = this.comparePrice;
  }
  if (!this.comparePrice && this.mrp) {
    this.comparePrice = this.mrp;
  }
  if (this.images && this.images.length > 0 && !this.img) {
    this.img = this.images[0];
  }
});

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
