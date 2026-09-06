const fs = require('fs');
let code = fs.readFileSync('server/routes/orders.js', 'utf8');

// Add import
code = code.replace('getMyOrders,', 'getMyOrders,\n  getPaymentFailureAlert,');

// Add route
code = code.replace(
  'router.route("/my")\n  .get(requireAuth, getMyOrders);',
  'router.route("/my")\n  .get(requireAuth, getMyOrders);\n\nrouter.route("/my/payment-alert")\n  .get(requireAuth, getPaymentFailureAlert);'
);

fs.writeFileSync('server/routes/orders.js', code);
