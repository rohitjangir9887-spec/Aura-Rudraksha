/**
 * High-Performance Instant Route Prefetch Engine
 * Pre-warms and preloads core customer routes during browser idle time
 * and on link hover/touch to achieve instant (<10ms) click responses.
 */

export const prefetchLoaders = {
  shop: () => import("../pages/Shop"),
  wishlist: () => import("../pages/Wishlist"),
  cart: () => import("../pages/Cart"),
  checkout: () => import("../pages/Checkout"),
  product: () => import("../pages/Product"),
  account: () => import("../pages/account/Account"),
  profile: () => import("../pages/account/Profile"),
  orders: () => import("../pages/account/Orders"),
  orderDetail: () => import("../pages/account/OrderDetail"),
  auraAi: () => import("../pages/AuraAIPage"),
  about: () => import("../pages/AboutUs"),
  contact: () => import("../pages/ContactUs"),
  policies: () => import("../pages/Policies"),
  categories: () => import("../pages/CategoriesPage"),
  trackOrder: () => import("../pages/TrackOrder"),
  login: () => import("../pages/Login"),
};

const prefetchedSet = new Set();

export function prefetchRoute(routeName) {
  if (typeof window === "undefined" || !routeName) return;
  if (prefetchedSet.has(routeName)) return;
  prefetchedSet.add(routeName);

  const loader = prefetchLoaders[routeName];
  if (typeof loader === "function") {
    try {
      const p = loader();
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
    } catch (_) {}
  }
}

export function prefetchPath(path) {
  if (typeof window === "undefined" || !path) return;
  const clean = path.split("?")[0].replace(/\/$/, "") || "/";
  if (clean === "/shop" || clean.startsWith("/shop")) prefetchRoute("shop");
  else if (clean === "/wishlist") prefetchRoute("wishlist");
  else if (clean === "/cart") prefetchRoute("cart");
  else if (clean === "/checkout") prefetchRoute("checkout");
  else if (clean.startsWith("/product/")) prefetchRoute("product");
  else if (clean === "/account") prefetchRoute("account");
  else if (clean === "/account/profile") prefetchRoute("profile");
  else if (clean === "/account/orders" || clean.startsWith("/orders")) prefetchRoute("orders");
  else if (clean.startsWith("/account/orders/")) prefetchRoute("orderDetail");
  else if (clean === "/aura-ai") prefetchRoute("auraAi");
  else if (clean === "/about") prefetchRoute("about");
  else if (clean === "/contact") prefetchRoute("contact");
  else if (clean === "/categories") prefetchRoute("categories");
  else if (clean === "/track-order") prefetchRoute("trackOrder");
  else if (clean === "/login") prefetchRoute("login");
}

let idlePrefetchScheduled = false;

export function initInstantRoutePrefetch() {
  if (typeof window === "undefined" || idlePrefetchScheduled) return;
  idlePrefetchScheduled = true;

  // Strictly skip automatic bulk prefetching on slow connections or data saver mode
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && (conn.saveData || conn.effectiveType === "2g" || conn.effectiveType === "3g" || conn.effectiveType === "slow-2g")) {
    return;
  }

  // Strictly defer automatic pre-warming until well after initial viewport paint (6000ms idle)
  // so cold start bandwidth remains 100% dedicated to critical LCP and viewport rendering.
  const scheduleIdlePrefetch = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => {
        prefetchRoute("product");
        prefetchRoute("shop");
      }, { timeout: 3000 });
    }
  };

  setTimeout(scheduleIdlePrefetch, 6000);
}
