import {
  defaultBanners,
  defaultCoupons,
  defaultActiveOffer,
  defaultSettings
} from "./defaultData.js";

class InMemoryStore {
  constructor() {
    this.isProductsSyncedFromDb = false;
    this.products = [];
    this.banners = JSON.parse(JSON.stringify(defaultBanners));
    this.coupons = JSON.parse(JSON.stringify(defaultCoupons));
    this.activeOffer = JSON.parse(JSON.stringify(defaultActiveOffer));
    this.offers = [];
    this.reviews = [];
    this.deletedCouponCodes = new Set();
    this.deletedCouponIds = new Set();
    this.orders = [];
    this.customers = [];
    this.settings = JSON.parse(JSON.stringify(defaultSettings));
    this.promotions = [];
    this.tickets = [];
    this.addresses = [];
    this.wishlist = [];
    this.aiSettings = {
      id: "AURA_AI_SETTINGS",
      enabled: true,
      showFloatingButton: true,
      showHeaderButton: true,
      language: "auto",
      tone: "polite_spiritual",
      greeting: "Namaste 🙏 Main Aura AI hoon — Aura Rudraksha ka personal shopping aur support assistant. Aaj main aapki kis cheez mein help karun?",
      recommendProducts: true,
      recommendOffers: true,
      cartActions: true,
      orderSupport: true,
      humanSupport: true,
      personalization: true
    };
    this.aiConversations = [];
  }

  deleteCoupon(identifier) {
    if (!identifier) return;
    const clean = String(identifier).trim();
    const cleanUpper = clean.toUpperCase();
    this.deletedCouponIds.add(clean);
    this.deletedCouponCodes.add(cleanUpper);

    const existing = (this.coupons || []).find(c =>
      String(c.id) === clean || String(c._id) === clean || String(c.code || "").toUpperCase() === cleanUpper
    );
    if (existing) {
      if (existing.id) this.deletedCouponIds.add(String(existing.id));
      if (existing._id) this.deletedCouponIds.add(String(existing._id));
      if (existing.code) this.deletedCouponCodes.add(String(existing.code).toUpperCase());
    }

    this.coupons = (this.coupons || []).filter(c =>
      String(c.id) !== clean &&
      String(c._id) !== clean &&
      String(c.code || "").toUpperCase() !== cleanUpper &&
      (!existing || (String(c.id) !== String(existing.id) && String(c._id) !== String(existing._id) && String(c.code || "").toUpperCase() !== String(existing.code || "").toUpperCase()))
    );

    this.offers = (this.offers || []).filter(o =>
      String(o.couponCode || "").toUpperCase() !== cleanUpper &&
      (!existing || String(o.couponCode || "").toUpperCase() !== String(existing.code || "").toUpperCase())
    );

    if (cleanUpper && this.activeOffer && (String(this.activeOffer.couponCode || "").toUpperCase() === cleanUpper || (existing?.code && String(this.activeOffer.couponCode || "").toUpperCase() === String(existing.code || "").toUpperCase()))) {
      this.activeOffer.couponCode = "";
    }
  }

  saveCoupon(couponData) {
    if (!couponData || !couponData.code) return couponData;
    const codeUpper = String(couponData.code).trim().toUpperCase();
    const id = String(couponData.id || couponData._id || `COUP-${Date.now()}`);
    this.deletedCouponCodes.delete(codeUpper);
    this.deletedCouponIds.delete(id);

    if (!Array.isArray(this.coupons)) this.coupons = [];
    const idx = this.coupons.findIndex(c =>
      String(c.id) === id || String(c._id) === id || String(c.code || "").toUpperCase() === codeUpper
    );

    const item = { ...couponData, id, code: codeUpper };
    if (idx >= 0) {
      this.coupons[idx] = item;
    } else {
      this.coupons.unshift(item);
    }
    return item;
  }
}

export const inMemoryStore = new InMemoryStore();
