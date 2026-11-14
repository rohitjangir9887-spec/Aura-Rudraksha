import { ADMIN_BASE_PATH } from "./routes";

const ADMIN_ROUTE_LOADERS = {
  [ADMIN_BASE_PATH]: () => import("../pages/admin/Admin"),
  [`${ADMIN_BASE_PATH}/ai`]: () => import("../pages/admin/AdminAI"),
  [`${ADMIN_BASE_PATH}/ai-chats`]: () => import("../pages/admin/AdminAIChats"),
  [`${ADMIN_BASE_PATH}/products`]: () => import("../pages/admin/AdminProducts"),
  [`${ADMIN_BASE_PATH}/orders`]: () => import("../pages/admin/AdminOrders"),
  [`${ADMIN_BASE_PATH}/customers`]: () => import("../pages/admin/AdminCustomers"),
  [`${ADMIN_BASE_PATH}/reviews`]: () => import("../pages/admin/AdminReviews"),
  [`${ADMIN_BASE_PATH}/banners`]: () => import("../pages/admin/AdminBanners"),
  [`${ADMIN_BASE_PATH}/home-products`]: () => import("../pages/admin/AdminHomeProductManager"),
  [`${ADMIN_BASE_PATH}/banners/home-products`]: () => import("../pages/admin/AdminHomeProductManager"),
  [`${ADMIN_BASE_PATH}/banners/hero`]: () => import("../pages/admin/HeroImages"),
  [`${ADMIN_BASE_PATH}/banners/promotions`]: () => import("../pages/admin/AdminPromotions"),
  [`${ADMIN_BASE_PATH}/categories`]: () => import("../pages/admin/AdminCategories"),
  [`${ADMIN_BASE_PATH}/offers`]: () => import("../pages/admin/AdminOffers"),
  [`${ADMIN_BASE_PATH}/coupons`]: () => import("../pages/admin/AdminCoupons"),
  [`${ADMIN_BASE_PATH}/analytics`]: () => import("../pages/admin/AdminAnalytics"),
  [`${ADMIN_BASE_PATH}/support`]: () => import("../pages/admin/AdminSupport"),
  [`${ADMIN_BASE_PATH}/settings`]: () => import("../pages/admin/AdminSettings"),
  [`${ADMIN_BASE_PATH}/zodiac`]: () => import("../pages/admin/AdminZodiac"),
};

const prefetchedSet = new Set();
let bulkPrefetched = false;

export function preloadAdminRoute(path) {
  if (!path || prefetchedSet.has(path)) return;
  const loader = ADMIN_ROUTE_LOADERS[path];
  if (typeof loader !== "function") return;
  prefetchedSet.add(path);
  loader().catch(() => {
    prefetchedSet.delete(path);
  });
}

export function preloadAllAdminRoutes() {
  if (bulkPrefetched) return;
  bulkPrefetched = true;

  // Priority quick routes first (often accessed from 3-dot drawer)
  const priorityPaths = [
    ADMIN_BASE_PATH,
    `${ADMIN_BASE_PATH}/analytics`,
    `${ADMIN_BASE_PATH}/orders`,
    `${ADMIN_BASE_PATH}/ai-chats`,
    `${ADMIN_BASE_PATH}/ai`,
    `${ADMIN_BASE_PATH}/coupons`,
    `${ADMIN_BASE_PATH}/offers`,
    `${ADMIN_BASE_PATH}/categories`,
    `${ADMIN_BASE_PATH}/banners`,
    `${ADMIN_BASE_PATH}/home-products`,
    `${ADMIN_BASE_PATH}/support`,
    `${ADMIN_BASE_PATH}/settings`,
    `${ADMIN_BASE_PATH}/zodiac`,
    `${ADMIN_BASE_PATH}/customers`,
    `${ADMIN_BASE_PATH}/products`,
    `${ADMIN_BASE_PATH}/reviews`,
  ];

  const runBatch = () => {
    priorityPaths.forEach((p, idx) => {
      setTimeout(() => preloadAdminRoute(p), idx * 45);
    });
  };

  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(runBatch, { timeout: 600 });
  } else {
    setTimeout(runBatch, 120);
  }
}
