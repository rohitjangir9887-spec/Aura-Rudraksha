/**
 * Aura Rudraksha Service Worker
 * Ultra-Fast High-Performance Media & Catalog Cache Engine
 * Provides instant image and data loading on repeat visits and page refreshes.
 */

const IMAGE_CACHE = "aura-images-v1";
const API_CACHE = "aura-api-v1";
const MAX_IMAGE_ENTRIES = 120;

// Helper: check if a request is for an image
function isImageRequest(request, url) {
  if (request.destination === "image") return true;
  if (/\.(jpg|jpeg|png|webp|gif|svg|ico|avif)($|\?)/i.test(url.pathname)) return true;
  if (url.hostname.includes("ik.imagekit.io") || 
      url.hostname.includes("puter.site") || 
      url.hostname.includes("images.unsplash.com") || 
      url.hostname.includes("i.ibb.co")) {
    return true;
  }
  return false;
}

// Helper: check if request is a cacheable public API endpoint
function isCacheableApiRequest(request, url) {
  if (request.method !== "GET") return false;
  // Never cache admin endpoints, auth, cart, orders, or checkout
  if (url.pathname.startsWith("/api/auth") ||
      url.pathname.startsWith("/api/cart") ||
      url.pathname.startsWith("/api/orders") ||
      url.pathname.startsWith("/api/payment") ||
      url.pathname.startsWith("/api/upload") ||
      url.pathname.startsWith("/api/admin")) {
    return false;
  }
  // Cache products, banners, offers, and settings if not forced with _t
  if (url.searchParams.has("_t") || url.searchParams.has("force")) {
    return false;
  }
  return (
    url.pathname === "/api/products" ||
    url.pathname === "/api/banners" ||
    url.pathname === "/api/offers" ||
    url.pathname === "/api/active-offer" ||
    url.pathname === "/api/settings" ||
    url.pathname.startsWith("/api/products/")
  );
}

// Helper: Trim cache to max entries (LRU)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const deleteCount = keys.length - maxItems;
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (_) {}
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== IMAGE_CACHE && cacheName !== API_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!request || !request.url) return;

  // Never intercept Vite dev HMR, websockets, or internal tools
  if (request.url.includes("/@vite") || 
      request.url.includes("/@fs") || 
      request.url.includes("node_modules") || 
      request.url.includes("/__vite") ||
      request.url.includes("/api/aura-ai")) {
    return;
  }

  const url = new URL(request.url);

  // 1. Image Caching Strategy: Cache-First with Background Revalidation
  if (isImageRequest(request, url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cachedResponse = await cache.match(request);

        // Fetch fresh copy in background to revalidate without forcing mode: cors
        const fetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === "opaque")) {
              try {
                await cache.put(request, networkResponse.clone());
                trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
              } catch (_) {}
            }
            return networkResponse;
          })
          .catch(async () => {
            // Fallback no-cors fetch for opaque cross-origin media
            try {
              return await fetch(request.url, { mode: "no-cors" });
            } catch (_) {
              return null;
            }
          });

        // If cached, return immediately (0ms latency on refresh)
        if (cachedResponse) {
          event.waitUntil(fetchPromise);
          return cachedResponse;
        }

        // If not cached, await network response
        const networkResponse = await fetchPromise;
        if (networkResponse) {
          return networkResponse;
        }

        // If network completely failed and not in cache, fallback
        return new Response("", { status: 404, statusText: "Image Not Found" });
      })()
    );
    return;
  }

  // 2. Public Catalog API Caching Strategy: Stale-While-Revalidate
  if (isCacheableApiRequest(request, url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE);
        const cachedResponse = await cache.match(request);

        const fetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              await cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        // If cached response exists, return immediately for instant UI render
        if (cachedResponse) {
          event.waitUntil(fetchPromise);
          return cachedResponse;
        }

        // Otherwise wait for network
        const networkResponse = await fetchPromise;
        if (networkResponse) {
          return networkResponse;
        }

        return new Response(JSON.stringify({ success: false, message: "Offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      })()
    );
    return;
  }
});
