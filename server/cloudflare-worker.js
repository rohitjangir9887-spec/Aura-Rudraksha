/**
 * Cloudflare Worker Entrypoint for Aura Rudraksha
 * 
 * Functions:
 * 1. Serves static assets from Vite production build (`dist/`) via Cloudflare Workers Static Assets (`env.ASSETS`).
 * 2. Provides Single Page Application (SPA) routing with auto-trailing-slash and fallback to `index.html`.
 * 3. Reverse proxies `/api/*` requests to the external Node.js backend if `BACKEND_URL` or `API_BASE_URL` is set.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy `/api/*` requests to the backend server if BACKEND_URL is configured
    if (url.pathname.startsWith("/api/")) {
      const backendOrigin = env.BACKEND_URL || env.API_BASE_URL || env.VITE_API_BASE_URL;
      if (backendOrigin) {
        try {
          const targetUrl = new URL(url.pathname + url.search, backendOrigin);
          const headers = new Headers(request.headers);
          headers.set("Host", new URL(backendOrigin).host);

          return await fetch(targetUrl.toString(), {
            method: request.method,
            headers,
            body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
            redirect: "follow",
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: "Backend proxy error",
              message: "Failed to connect to backend server.",
              details: err?.message || String(err),
            }),
            {
              status: 502,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // Serve static assets from dist with automatic SPA fallback
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
