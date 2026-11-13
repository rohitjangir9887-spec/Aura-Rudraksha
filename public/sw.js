/**
 * Aura Rudraksha Service Worker
 * Ultra-Fast High-Performance Media Cache Engine
 * Provides instant static image loading while letting all API data pass through cleanly.
 */

const IMAGE_CACHE = "aura-images-v3";
const MAX_IMAGE_ENTRIES = 150;

// Helper: check if a URL belongs to third-party analytics, pixels, or payment gateways that must NEVER be intercepted
function isAnalyticsOrExternalService(url) {
  const host = (url.hostname || "").toLowerCase();
  if (
    host.includes("facebook.com") ||
    host.includes("facebook.net") ||
    host.includes("fbcdn.net") ||
    host.includes("instagram.com") ||
    host.includes("googletagmanager.com") ||
    host.includes("google-analytics.com") ||
    host.includes("analytics.google.com") ||
    host.includes("doubleclick.net") ||
    host.includes("google.com") ||
    host.includes("payu.in") ||
    host.includes("razorpay.com") ||
    host.includes("cashfree.com")
  ) {
    return true;
  }
  if (url.pathname === "/tr" || url.pathname.startsWith("/tr/")) {
    return true;
  }
  return false;
}

// Helper: check if a request is for a static catalog/storefront image
function isImageRequest(request, url) {
  if (isAnalyticsOrExternalService(url)) return false;
  if (/\.(jpg|jpeg|png|webp|gif|svg|ico|avif)($|\?)/i.test(url.pathname)) return true;
  if (
    url.hostname.includes("ik.imagekit.io") ||
    url.hostname.includes("puter.site") ||
    url.hostname.includes("images.unsplash.com") ||
    url.hostname.includes("i.ibb.co") ||
    url.hostname.includes("wsrv.nl")
  ) {
    return true;
  }
  return false;
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
          // Delete all old API caches and previous image cache versions
          if (cacheName !== IMAGE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!request || !request.url || request.method !== "GET") return;

  // Never intercept dynamic API endpoints, Vite HMR, or internal tools - let them pass through
  if (request.url.includes("/api/") ||
      request.url.includes("/@vite") || 
      request.url.includes("/@fs") || 
      request.url.includes("node_modules") || 
      request.url.includes("/__vite")) {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  // Never intercept Meta Pixel, Facebook Event Setup Tool, Google Tag, or Payment Gateways
  if (isAnalyticsOrExternalService(url)) {
    return;
  }

  // Image Caching Strategy: Cache-First with Background Revalidation for static images
  if (isImageRequest(request, url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cachedResponse = await cache.match(request);

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
            try {
              return await fetch(request.url, { mode: "no-cors" });
            } catch (_) {
              return null;
            }
          });

        if (cachedResponse) {
          event.waitUntil(fetchPromise);
          return cachedResponse;
        }

        const networkResponse = await fetchPromise;
        if (networkResponse) {
          return networkResponse;
        }

        return new Response("", { status: 404, statusText: "Image Not Found" });
      })()
    );
    return;
  }
});

