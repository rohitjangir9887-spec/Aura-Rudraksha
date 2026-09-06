const fs = require('fs');
const file = 'src/lib/db.js';
let content = fs.readFileSync(file, 'utf8');

const insertionPoint = `const API_BASE = (((typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env.VITE_API_BASE_URL : undefined) || "/api").replace(/\\/$/, "");`;

const newLogic = `
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "aura_cross_tab_signal" && e.newValue) {
      try {
        const detail = JSON.parse(e.newValue);
        const { type, payload } = detail;

        // Synchronously update local cache if possible
        if (type === "product:saved" && payload) {
          const idx = storeCache.products.findIndex(x => String(x.id) === String(payload.id));
          if (idx >= 0) storeCache.products[idx] = payload;
          else storeCache.products.unshift(payload);
        } else if (type === "product:deleted" && payload) {
          storeCache.products = storeCache.products.filter(p => String(p.id) !== String(payload));
        } else if (type === "active-offer:saved" && payload) {
          storeCache.activeOffer = payload;
        } else if (type === "offer:saved" && payload) {
          const idx = storeCache.offers.findIndex(x => String(x.id) === String(payload.id));
          if (idx >= 0) storeCache.offers[idx] = payload;
          else storeCache.offers.unshift(payload);
        } else if (type === "offer:deleted" && payload) {
          storeCache.offers = storeCache.offers.filter(x => String(x.id) !== String(payload));
        } else if (type === "settings:saved" && payload) {
          storeCache.settings = payload;
        }

        // Trigger React updates
        window.dispatchEvent(new CustomEvent("aura:store-updated", { detail }));

        // Trigger background revalidation if tab is visible
        if (document.visibilityState === "visible") {
          if (type.startsWith("product")) {
            revalidateProducts(true).catch(()=>{});
          } else if (type.startsWith("active-offer") || type.startsWith("offer") || type.startsWith("banners") || type.startsWith("settings")) {
            fetchHomeData(true).catch(()=>{});
          }
        } else {
          // Invalidate freshness to force fetch on next visibility
          if (type.startsWith("product")) {
            lastProductFetchTime = 0;
            localStorage.setItem("aura_last_product_fetch_time", "0");
          } else {
            localStorage.setItem("aura_last_fetch_time", "0");
          }
        }
      } catch (err) {}
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const pFetch = Number(localStorage.getItem("aura_last_product_fetch_time") || 0);
      if (pFetch === 0 || Date.now() - pFetch > 300000) { // arbitrary freshness for visibility
        revalidateProducts(true).catch(()=>{});
      }
      const hFetch = Number(localStorage.getItem("aura_last_fetch_time") || 0);
      if (hFetch === 0 || Date.now() - hFetch > 300000) {
        fetchHomeData(true).catch(()=>{});
      }
    }
  });
}

`;

content = content.replace(insertionPoint, insertionPoint + '\\n' + newLogic);
fs.writeFileSync(file, content);
console.log('Done inserting cross-tab logic');
