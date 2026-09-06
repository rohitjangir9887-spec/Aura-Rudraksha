/**
 * Centralized Route Constants & Helper Utilities for Aura Rudraksha
 */

export const ADMIN_BASE_PATH = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";

export const getSafeReturnPath = (fromPath, defaultFallback = ADMIN_BASE_PATH) => {
  if (!fromPath || typeof fromPath !== "string") {
    return defaultFallback;
  }

  const trimmedPath = fromPath.trim();

  // Must start with '/' and NOT with '//' or '/\'
  if (!trimmedPath.startsWith("/") || trimmedPath.startsWith("//") || trimmedPath.startsWith("/\\")) {
    return defaultFallback;
  }

  // Reject malicious schemes (javascript:, data:, vbscript:)
  if (/^(javascript|data|vbscript):/i.test(trimmedPath)) {
    return defaultFallback;
  }

  // Prevent returning to login / admin login pages in a loop
  const cleanPath = trimmedPath.toLowerCase();
  if (
    cleanPath.startsWith("/login") ||
    cleanPath.startsWith("/admin/login") ||
    cleanPath.startsWith(ADMIN_LOGIN_PATH.toLowerCase()) ||
    cleanPath === "/admin"
  ) {
    return defaultFallback;
  }

  return trimmedPath;
};

export const routes = {
  home: () => "/",
  shop: (query) => (query ? `/shop?q=${encodeURIComponent(query)}` : "/shop"),
  product: (id) => `/product/${id}`,
  categories: () => "/categories",
  cart: () => "/cart",
  checkout: () => "/checkout",
  login: (from) => (from ? `/login` : "/login"),
  account: () => "/account",
  profile: () => "/account/profile",
  orders: () => "/account/orders",
  order: (id) => `/account/orders/${id}`,
  trackOrder: (id) => (id ? `/track-order?id=${encodeURIComponent(id)}` : "/track-order"),
  wishlist: () => "/wishlist",
  auraAi: () => "/aura-ai",
  about: () => "/about",
  contact: () => "/contact",
  wholesale: () => "/wholesale",

  // Policies
  shippingPolicy: () => "/shipping-policy",
  returnPolicy: () => "/return-policy",
  privacyPolicy: () => "/privacy-policy",
  terms: () => "/terms",
  cancellation: () => "/cancellation",
  securePayment: () => "/secure-payment",

  // Admin Routes (New Secure URL)
  admin: () => ADMIN_BASE_PATH,
  adminLogin: () => ADMIN_LOGIN_PATH,
  adminAi: () => `${ADMIN_BASE_PATH}/ai`,
  adminProducts: () => `${ADMIN_BASE_PATH}/products`,
  adminOrders: () => `${ADMIN_BASE_PATH}/orders`,
  adminOffers: () => `${ADMIN_BASE_PATH}/offers`,
  adminCustomers: () => `${ADMIN_BASE_PATH}/customers`,
  adminReviews: () => `${ADMIN_BASE_PATH}/reviews`,
  adminBanners: () => `${ADMIN_BASE_PATH}/banners`,
  adminHero: () => `${ADMIN_BASE_PATH}/banners/hero`,
  adminPromotions: () => `${ADMIN_BASE_PATH}/banners/promotions`,
  adminCategories: () => `${ADMIN_BASE_PATH}/categories`,
  adminCoupons: () => `${ADMIN_BASE_PATH}/coupons`,
  adminAnalytics: () => `${ADMIN_BASE_PATH}/analytics`,
  adminSupport: () => `${ADMIN_BASE_PATH}/support`,
  adminSettings: () => `${ADMIN_BASE_PATH}/settings`,
  adminZodiac: () => `${ADMIN_BASE_PATH}/zodiac`
};
