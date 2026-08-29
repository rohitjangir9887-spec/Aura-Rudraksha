import {
  defaultProducts,
  defaultCoupons,
  defaultBanners,
  defaultActiveOffer,
  defaultReviews,
  defaultOrders,
  defaultCustomers,
  defaultSettings
} from "./defaultData.js";

// In-Memory store fallback for sandbox / offline / disconnected mode
class InMemoryStore {
  constructor() {
    this.products = JSON.parse(JSON.stringify(defaultProducts || []));
    this.coupons = JSON.parse(JSON.stringify(defaultCoupons || []));
    this.banners = JSON.parse(JSON.stringify(defaultBanners || []));
    this.offers = [
      {
        id: "OFF-1",
        title: "5 Mukhi Mahashivratri Special",
        label: "Limited Consecration",
        description: "Pure Nepal 5 Mukhi with certified Ganga Jal energization.",
        buttonText: "Shop Special",
        link: "/product/5",
        type: "Percentage",
        discountValue: 33,
        couponCode: "SHIV33",
        shownOn: "Home Banner",
        status: "Active",
        image: "/images/product-5mukhi.jpg",
        order: 1
      },
      {
        id: "OFF-2",
        title: "Sacred 108+1 Japa Mala",
        label: "Bestseller",
        description: "Consecrated Japa Mala with lab identification card.",
        buttonText: "Order Mala",
        link: "/product/mala",
        type: "Flat Amount",
        discountValue: 200,
        couponCode: "MALA200",
        shownOn: "Home Banner",
        status: "Active",
        image: "/images/product-mala.jpg",
        order: 2
      }
    ];
    this.promotions = [];
    this.activeOffer = JSON.parse(JSON.stringify(defaultActiveOffer || {
      enabled: true,
      status: "Active",
      title: "🕉️ Shrawan Consecrated Rudraksha Sale",
      subtitle: "Get Flat ₹200 OFF on all sacred beads + Free Holy Ganga Jal",
      couponCode: "SHRAWAN200",
      discountType: "fixed",
      discountValue: 200,
      heroEnabled: true,
      productCardEnabled: true,
      productPageEnabled: true,
      imageBadgeEnabled: true,
      floatingEnabled: true,
      stickyEnabled: true,
      popupEnabled: true,
      timerEnabled: true
    }));
    this.settings = JSON.parse(JSON.stringify(defaultSettings || {}));
    this.reviews = JSON.parse(JSON.stringify(defaultReviews || []));
    this.orders = JSON.parse(JSON.stringify(defaultOrders || []));
    this.customers = JSON.parse(JSON.stringify(defaultCustomers || []));
    this.tickets = [];
  }

  // PRODUCTS
  getProducts() {
    return this.products;
  }
  getProductById(id) {
    return this.products.find(p => String(p.id) === String(id)) || null;
  }
  saveProduct(data) {
    const id = data.id ? String(data.id) : Date.now().toString();
    const imgs = (Array.isArray(data.images) && data.images.length > 0)
      ? data.images
      : (data.img ? [data.img] : ["/images/product-5mukhi.jpg"]);
    const primaryImg = data.img || imgs[0];

    const finalProduct = {
      ...data,
      id,
      img: primaryImg,
      images: imgs,
      mrp: Number(data.mrp) || Number(data.comparePrice) || Number(data.price) || 0,
      comparePrice: Number(data.comparePrice) || Number(data.mrp) || Number(data.price) || 0,
      price: Number(data.price) || 0,
      stock: Number(data.stock) >= 0 ? Number(data.stock) : 50,
      status: data.status || "Active",
      updatedAt: new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString()
    };

    const index = this.products.findIndex(p => String(p.id) === String(id));
    if (index >= 0) {
      this.products[index] = { ...this.products[index], ...finalProduct };
      return this.products[index];
    } else {
      this.products.unshift(finalProduct);
      return finalProduct;
    }
  }
  deleteProduct(id) {
    const initialLen = this.products.length;
    this.products = this.products.filter(p => String(p.id) !== String(id));
    return this.products.length < initialLen;
  }

  // COUPONS
  getCoupons() {
    return this.coupons;
  }
  getCouponByCode(code) {
    if (!code) return null;
    const clean = String(code).trim().toUpperCase();
    return this.coupons.find(c => String(c.code).trim().toUpperCase() === clean) || null;
  }
  saveCoupon(data) {
    const id = data.id || `COUP-${Date.now()}`;
    const code = String(data.code || "").trim().toUpperCase();
    const payload = {
      ...data,
      id,
      code,
      discount: Number(data.discount) || 0,
      type: data.type || "percentage",
      limit: Number(data.limit) || 1000,
      usage: Number(data.usage) || 0,
      minAmount: Number(data.minAmount || data.minOrder || 0),
      expiry: data.expiry || null,
      status: data.status === "Disabled" ? "Inactive" : (data.status || "Active")
    };

    const idx = this.coupons.findIndex(c => String(c.id) === String(id) || String(c.code).toUpperCase() === code);
    if (idx >= 0) {
      this.coupons[idx] = { ...this.coupons[idx], ...payload };
      return this.coupons[idx];
    } else {
      this.coupons.unshift(payload);
      return payload;
    }
  }
  deleteCoupon(id) {
    const clean = String(id).toUpperCase();
    const initialLen = this.coupons.length;
    this.coupons = this.coupons.filter(c => String(c.id) !== String(id) && String(c.code).toUpperCase() !== clean);
    return this.coupons.length < initialLen;
  }

  // BANNERS
  getBanners() {
    return this.banners.map(b => (typeof b === "string" ? b : (b.image || b.url || "")));
  }
  saveBanners(bannerArray) {
    const list = Array.isArray(bannerArray) ? bannerArray : [];
    this.banners = list;
    return list;
  }
  deleteBanner(id) {
    this.banners = this.banners.filter((b, idx) => {
      if (typeof b === "string") return b !== id && String(idx) !== String(id);
      return b.id !== id && b.image !== id && String(idx) !== String(id);
    });
    return true;
  }

  // OFFERS & ACTIVE OFFER
  getActiveOffer() {
    return this.activeOffer;
  }
  saveActiveOffer(data) {
    this.activeOffer = {
      ...this.activeOffer,
      ...data,
      id: "OFFER-CENTRAL-1"
    };
    return this.activeOffer;
  }
  getOffers() {
    return this.offers;
  }
  saveOffer(data) {
    const id = data.id || `OFF-${Date.now()}`;
    const payload = { ...data, id };
    const idx = this.offers.findIndex(o => String(o.id) === String(id));
    if (idx >= 0) {
      this.offers[idx] = { ...this.offers[idx], ...payload };
      return this.offers[idx];
    } else {
      this.offers.push(payload);
      return payload;
    }
  }
  deleteOffer(id) {
    this.offers = this.offers.filter(o => String(o.id) !== String(id));
    return true;
  }

  // PROMOTIONS
  getPromotions() {
    return this.promotions;
  }
  savePromotion(data) {
    const id = data.id || `PROMO-${Date.now()}`;
    const payload = { ...data, id };
    const idx = this.promotions.findIndex(p => String(p.id) === String(id));
    if (idx >= 0) {
      this.promotions[idx] = { ...this.promotions[idx], ...payload };
      return this.promotions[idx];
    } else {
      this.promotions.push(payload);
      return payload;
    }
  }
  deletePromotion(id) {
    this.promotions = this.promotions.filter(p => String(p.id) !== String(id));
    return true;
  }

  // SETTINGS
  getSettings() {
    return this.settings;
  }
  saveSettings(data) {
    this.settings = { ...this.settings, ...data, id: "STORE_SETTINGS" };
    return this.settings;
  }

  // REVIEWS
  getReviews() {
    return this.reviews;
  }
  saveReview(data) {
    const id = data.id || `REV-${Date.now()}`;
    const payload = { ...data, id, createdAt: data.createdAt || new Date().toISOString() };
    const idx = this.reviews.findIndex(r => String(r.id) === String(id));
    if (idx >= 0) {
      this.reviews[idx] = { ...this.reviews[idx], ...payload };
      return this.reviews[idx];
    } else {
      this.reviews.unshift(payload);
      return payload;
    }
  }
  deleteReview(id) {
    this.reviews = this.reviews.filter(r => String(r.id) !== String(id));
    return true;
  }
}

export const inMemoryStore = new InMemoryStore();
