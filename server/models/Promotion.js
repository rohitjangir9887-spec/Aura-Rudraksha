import mongoose from "mongoose";

const activeOfferSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, default: "OFFER-CENTRAL-1", unique: true, index: true },
    enabled: { type: Boolean, default: true },
    status: { type: String, enum: ["Active", "Inactive", "Disabled", "Expired"], default: "Active" },
    title: { type: String, default: "₹200 OFF" },
    subtitle: { type: String, default: "Limited Time Festival Offer" },
    couponCode: { type: String, default: "SHRAWAN200" },
    discountType: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
    discountValue: { type: Number, default: 200 },
    startDate: { type: String, default: () => new Date(Date.now() - 3600000).toISOString() },
    startAt: { type: String, default: () => new Date(Date.now() - 3600000).toISOString() },
    expiresAt: { type: String, default: () => new Date(Date.now() + 2 * 24 * 3600000 + 5 * 3600000).toISOString() },
    expiry: { type: String, default: () => new Date(Date.now() + 2 * 24 * 3600000 + 5 * 3600000).toISOString() },
    backgroundColor: { type: String, default: "#2b170d" },
    textColor: { type: String, default: "#fbf5ef" },
    accentColor: { type: String, default: "#c89b3c" },
    badgeColor: { type: String, default: "#7a320c" },
    borderColor: { type: String, default: "#4b2614" },
    buttonColor: { type: String, default: "#c89b3c" },
    heroEnabled: { type: Boolean, default: true },
    topStripEnabled: { type: Boolean, default: true },
    marqueeEnabled: { type: Boolean, default: true },
    productCardEnabled: { type: Boolean, default: true },
    productPageEnabled: { type: Boolean, default: true },
    imageBadgeEnabled: { type: Boolean, default: true },
    floatingEnabled: { type: Boolean, default: true },
    stickyEnabled: { type: Boolean, default: true },
    popupEnabled: { type: Boolean, default: true },
    timerEnabled: { type: Boolean, default: true },
    popupDelay: { type: Number, default: 10 },
    scrollTrigger: { type: Number, default: 400 },
    animationStyle: { type: String, default: "fade" }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

activeOfferSchema.pre("save", function () {
  if (this.expiresAt && !this.expiry) this.expiry = this.expiresAt;
  if (this.expiry && !this.expiresAt) this.expiresAt = this.expiry;
  if (this.startDate && !this.startAt) this.startAt = this.startDate;
  if (this.startAt && !this.startDate) this.startDate = this.startAt;
});

export const ActiveOffer = mongoose.models.ActiveOffer || mongoose.model("ActiveOffer", activeOfferSchema);

const promotionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    code: { type: String, default: "" },
    couponCode: { type: String, default: "" },
    discountType: { type: String, default: "percentage" },
    discountValue: { type: Number, default: 0 },
    startAt: { type: String, default: () => new Date().toISOString() },
    expiresAt: { type: String, default: () => new Date(Date.now() + 7 * 86400000).toISOString() },
    isActive: { type: Boolean, default: true },
    status: { type: String, default: "Active" },
    showOnHome: { type: Boolean, default: true },
    showOnProduct: { type: Boolean, default: true },
    showPopup: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export const Promotion = mongoose.models.Promotion || mongoose.model("Promotion", promotionSchema);

const offerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    label: { type: String, default: "" },
    description: { type: String, default: "" },
    buttonText: { type: String, default: "Shop Now" },
    link: { type: String, default: "/shop" },
    image: { type: String, default: "" },
    type: { type: String, default: "Percentage" },
    discountValue: { type: Number, default: 0 },
    couponCode: { type: String, default: "" },
    shownOn: { type: String, default: "Home Banner" },
    status: { type: String, default: "Active" },
    theme: { type: String, default: "dark" },
    order: { type: Number, default: 1 }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export const Offer = mongoose.models.Offer || mongoose.model("Offer", offerSchema);
