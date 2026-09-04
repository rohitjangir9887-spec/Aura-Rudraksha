import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    id: { type: String, default: "STORE_SETTINGS", unique: true },
    storeName: { type: String, default: "Aura Rudraksha" },
    supportEmail: { type: String, default: "aurarudrakshaofficial@gmail.com" },
    supportPhone: { type: String, default: "+91 9672996531" },
    currency: { type: String, default: "INR" },
    instagramUrl: { type: String, default: "https://instagram.com/aurarudraksha" },
    facebookUrl: { type: String, default: "https://facebook.com/aurarudraksha" },
    youtubeUrl: { type: String, default: "https://youtube.com/@aurarudraksha" },
    shippingPolicy: { type: String, default: "" },
    returnPolicy: { type: String, default: "" },
    privacyPolicy: { type: String, default: "" },
    termsPolicy: { type: String, default: "" },
    contactSupport: { type: String, default: "" },
    storageProvider: { type: String, default: "puter", enum: ["puter", "pcloud"] },
    zodiacs: { type: Array, default: [] }, // Admin-managed zodiac guide content
    shopCategories: { type: Array, default: [] } // Admin-managed shop categories
  },
  { timestamps: true }
);

export const Setting = mongoose.models.Setting || mongoose.model("Setting", settingSchema);

const ticketSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    subject: { type: String, default: "" },
    message: { type: String, default: "" },
    status: { type: String, default: "Open" },
    priority: { type: String, default: "Normal" },
    adminResponse: { type: String, default: "" },
    orderId: { type: String, default: "" },
    date: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);

const wishlistSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    productName: { type: String, default: "" },
    addedAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

wishlistSchema.index({ customerId: 1, productId: 1 }, { unique: true });

export const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);

const analyticsSchema = new mongoose.Schema(
  {
    id: { type: String, default: "GLOBAL_ANALYTICS", unique: true },
    visits: { type: Number, default: 0 },
    productViews: { type: Number, default: 0 },
    lastUpdated: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const Analytics = mongoose.models.Analytics || mongoose.model("Analytics", analyticsSchema);
