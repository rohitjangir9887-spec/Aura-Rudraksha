import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
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
    keywords: { type: [String], default: [] },
    searchKeywords: { type: [String], default: [] },
    subCategory: { type: String, default: "", trim: true },
    origin: { type: String, default: "Nepal", trim: true },
    hasIndonesianVariant: { type: Boolean, default: false },
    indonesianTitle: { type: String, default: "", trim: true },
    indonesianPrice: { type: Number, default: 0, min: 0 },
    indonesianMrp: { type: Number, default: 0, min: 0 },
    indonesianStock: { type: Number, default: 50, min: 0 },
    indonesianImages: { type: [String], default: [] },
    indonesianImg: { type: String, default: "" },
    indonesianSize: { type: String, default: "", trim: true },
    indonesianHighlight: { type: String, default: "", trim: true },
    mukhi: { type: String, default: "", trim: true },
    rulingPlanet: { type: String, default: "", trim: true },
    deity: { type: String, default: "", trim: true },
    zodiac: { type: [String], default: [] },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    highlight: { type: String, default: "" },
    badge: { type: String, default: "" },
    homeBadge: { type: String, default: "" },
    showOnHome: { type: Boolean, default: true },
    homeOrder: { type: Number, default: 0 },
    displayOrder: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
    productType: { type: String, default: "rudraksha", trim: true },
    isRudraksha: { type: Boolean, default: true },
    material: { type: String, default: "", trim: true },
    netWeight: { type: String, default: "", trim: true },
    purity: { type: String, default: "", trim: true },
    sanctification: { type: String, default: "", trim: true },
    usageGuide: { type: String, default: "", trim: true },
    hasCertificate: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    rating: { type: Number, default: 4.9, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    reviewCount: { type: Number, default: 0, min: 0 },
    totalSold: { type: String, default: "" },
    salesCount: { type: Number, default: 0, min: 0 },
    autoIncrementSales: { type: Boolean, default: true },
    lastSalesUpdateDate: { type: String, default: "" },
    dailySalesMin: { type: Number, default: 1 },
    dailySalesMax: { type: Number, default: 10 },
    customOffer: { type: Object, default: null },
    freeShipping: { type: Boolean, default: true },
    shippingFee: { type: Number, default: 0, min: 0 },
    variants: { type: [mongoose.Schema.Types.Mixed], default: [] },
    sizes: { type: [mongoose.Schema.Types.Mixed], default: [] }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Database indexes for fast querying and sorting
productSchema.index({ status: 1, sortOrder: 1, homeOrder: 1, createdAt: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ category: 1, status: 1 });

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
