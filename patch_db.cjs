const fs = require('fs');
let content = fs.readFileSync('src/lib/db.js', 'utf-8');

if (!content.includes('syncPayuOrder:')) {
  content = content.replace(
    /retryPayment:\s*async\s*\(orderId,\s*txnid\s*=\s*""\)\s*=>\s*\{[\s\S]*?\},/m,
    `$&
  syncPayuOrder: async (orderId) => {
    const res = await apiRequest(\`/payment/sync-payu/\${orderId}\`, { method: "POST" });
    if (!res?.success) throw new Error(res?.message || "Failed to sync PayU status.");
    return res;
  },`
  );
  fs.writeFileSync('src/lib/db.js', content);
}
