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

  // Respect data saver mode and slow connections
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && (conn.saveData || conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")) {
    return;
  }

  const preloadPriorityRoutes = () => {
    // Only prefetch the primary shopping route after the main thread is completely quiescent
    prefetchRoute("shop");
  };

  // Wait 4 seconds after page settles before running any idle prefetch
  if ("requestIdleCallback" in window) {
    setTimeout(() => {
      window.requestIdleCallback(preloadPriorityRoutes, { timeout: 3000 });
    }, 4000);
  } else {
    setTimeout(preloadPriorityRoutes, 4500);
  }
}
