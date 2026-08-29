const fs = require('fs');
let content = fs.readFileSync('src/lib/db.js', 'utf8');

content = content.replace(
  /getAnalytics: \(\) => storeCache\.analytics,/,
  `getAnalytics: () => storeCache.analytics,
  fetchAnalytics: async () => {
    const res = await apiRequest("/analytics");
    if (res?.success && res.data) {
      storeCache.analytics = { ...storeCache.analytics, ...res.data };
      emitStoreUpdate("analytics:updated", storeCache.analytics);
    }
    return storeCache.analytics;
  },`
);

fs.writeFileSync('src/lib/db.js', content);
