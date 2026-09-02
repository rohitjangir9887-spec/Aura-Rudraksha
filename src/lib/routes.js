/**
 * Centralized Route Constants & Helper Utilities for Aura Rudraksha
 */

export function getSafeReturnPath(fromPath, defaultFallback = "/account") {
  if (!fromPath || typeof fromPath !== "string") return defaultFallback;
  const trimmed = fromPath.trim();

  // Must start with '/' and NOT with '//' or '/\'
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return defaultFallback;
  }

  // Reject malicious schemes (javascript:, data:, vbscript:)
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return defaultFallback;
  }

  // Prevent returning to login / admin login pages in a loop
  const cleanPath = trimmed.toLowerCase();
  if (cleanPath.startsWith("/login") || cleanPath.startsWith("/admin/login")) {
    return defaultFallback;
  }

  return trimmed;
}

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

  // Admin Routes
  admin: () => "/admin",
  adminLogin: () => "/admin/login",
  adminProducts: () => "/admin/products",
  adminOrders: () => "/admin/orders",
  adminOffers: () => "/admin/offers",
  adminCustomers: () => "/admin/customers",
  adminReviews: () => "/admin/reviews",
  adminBanners: () => "/admin/banners",
  adminCategories: () => "/admin/categories",
  adminCoupons: () => "/admin/coupons",
  adminAnalytics: () => "/admin/analytics",
  adminSupport: () => "/admin/support",
  adminSettings: () => "/admin/settings",
  adminZodiac: () => "/admin/zodiac"
};
