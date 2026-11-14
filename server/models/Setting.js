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
    storageProvider: { type: String, default: "puter", enum: ["puter", "pcloud", "imagekit"] },
    pcloudAccessToken: { type: String, default: "", trim: true },
    pcloudFolderId: { type: String, default: "", trim: true },
    imagekitPublicKey: { type: String, default: "", trim: true },
    imagekitPrivateKey: { type: String, default: "", trim: true },
    imagekitUrlEndpoint: { type: String, default: "", trim: true },
    zodiacs: { type: Array, default: [] }, // Admin-managed zodiac guide content
    shopCategories: { type: Array, default: [] }, // Admin-managed shop categories
    standardShippingFee: { type: Number, default: 0 }, // Default FREE shipping (₹0), admin can update from dashboard
    freeShippingThreshold: { type: Number, default: 0 }, // Default FREE shipping threshold (₹0)
    enableProductShipping: { type: Boolean, default: true }, // Product-specific shipping rules toggle
    enableCod: { type: Boolean, default: true }, // Cash on Delivery enabled by default
    enableOnlinePayment: { type: Boolean, default: true }, // Online Payment enabled by default
    codFee: { type: Number, default: 0 }, // Optional COD handling charge (₹0 default)
    metaPixelId: { type: String, default: "1485640013424198", trim: true }, // Meta / Facebook Ads Pixel ID
    metaPixelEnabled: { type: Boolean, default: true }, // Meta Pixel active toggle
    metaDomainVerification: { type: String, default: "", trim: true }, // Meta Business Manager domain-verification meta tag code
    metaCapiAccessToken: { type: String, default: "", trim: true }, // Optional Meta Conversions API token for server-side event deduplication
    featuredProductId: { type: String, default: "14" }, // Single featured product id on customer Home
    featuredProductEnabled: { type: Boolean, default: true },
    homeProductLayout: { type: Object, default: { draft: [], live: [] } },
    announcementText: { type: String, default: "" },
    aiCustomFeatures: { type: Array, default: [] }, // Dynamically added storefront features controlled by Admin AI Agent
  },
  { timestamps: true }
);

export const Setting = mongoose.models.Setting || mongoose.model("Setting", settingSchema);

const ticketSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    authUserId: { type: String, default: "guest", index: true },
    userId: { type: String, default: "guest", index: true },
    userEmail: { type: String, default: "", index: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    subject: { type: String, default: "" },
    message: { type: String, default: "" },
    category: { type: String, default: "General Support" },
    status: { type: String, default: "Pending Admin Review" },
    priority: { type: String, default: "Normal" },
    adminResponse: { type: String, default: "" },
    attachments: { type: Array, default: [] },
    replies: { type: Array, default: [] },
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

const analyticsDailySchema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true, unique: true, index: true }, // IST YYYY-MM-DD
    pageViews: { type: Number, default: 0 },
    productViews: { type: Number, default: 0 },
    visitorKeys: { type: [String], default: [] }, // Unique hashed (deviceId + IP) or (IP + UA) per day
    ipKeys: { type: [String], default: [] },      // Unique hashed IP addresses per day
    hourlyBuckets: { type: mongoose.Schema.Types.Mixed, default: {} }, // Keyed "0".."23"
    recentVisits: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Bounded latest 60 events
    lastUpdated: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export const AnalyticsDaily = mongoose.models.AnalyticsDaily || mongoose.model("AnalyticsDaily", analyticsDailySchema);

