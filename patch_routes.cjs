const fs = require('fs');
let content = fs.readFileSync('server/routes/payment.js', 'utf-8');

if (!content.includes('syncPayuOrder')) {
  content = content.replace(
    /processPayuRefund,\n\s*cancelUnpaidOrder/,
    `processPayuRefund,
  cancelUnpaidOrder,
  syncPayuOrder`
  );

  content = content.replace(
    /router\.all\("\/refund\/:orderId", requireAdmin, paymentRefundLimit, processPayuRefund\);/,
    `router.all("/refund/:orderId", requireAdmin, paymentRefundLimit, processPayuRefund);
router.all("/sync-payu/:orderId", requireAdmin, syncPayuOrder);`
  );
  
  fs.writeFileSync('server/routes/payment.js', content);
}
