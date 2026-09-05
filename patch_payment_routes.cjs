const fs = require('fs');

let controllerCode = fs.readFileSync('server/controllers/paymentController.js', 'utf8');

// Add handlePayuCancel function before handlePayuWebhook
const cancelFunc = `

/**
 * Handle PayU Cancel Callback (curl)
 * POST /api/payment/payu-cancel
 */
export async function handlePayuCancel(req, res) {
  const clientBaseUrl = resolveAppBaseUrl(req);
  try {
    const params = extractPayuParams(req);
    const orderId = String(params.udf1 || params.orderId || "").trim();
    const txnid = String(params.txnid || "").trim();
    
    if (orderId && isDbConnected()) {
      const { Order } = require("../models/Order.js");
      const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
      if (order && order.paymentStatus !== "Paid") {
        const attempts = order.paymentAttempts || [];
        const attemptIdx = attempts.findIndex(a => a.txnid === txnid);
        if (attemptIdx >= 0) {
          attempts[attemptIdx].status = "cancelled";
          attempts[attemptIdx].error = "User cancelled payment";
          attempts[attemptIdx].updatedAt = new Date().toISOString();
        }
        order.paymentStatus = "Cancelled";
        order.paymentAttempts = attempts;
        await order.save();
      }
    }
    
    return res.redirect(303, \`\${clientBaseUrl}/checkout?cancelled=\${orderId}&txnid=\${txnid}\`);
  } catch (err) {
    console.error("Error in handlePayuCancel:", err);
    return res.redirect(303, \`\${clientBaseUrl}/checkout?cancelled=unknown\`);
  }
}

`;

controllerCode = controllerCode.replace('export async function handlePayuWebhook', cancelFunc + 'export async function handlePayuWebhook');

// Add curl to initiatePayuPayment
controllerCode = controllerCode.replace(/const furl = \`\${appBaseUrl}\/api\/payment\/payu-callback\`;/g, 
  "const furl = `${appBaseUrl}/api/payment/payu-callback`;\n    const curl = `${appBaseUrl}/api/payment/payu-cancel`;");

controllerCode = controllerCode.replace(/surl,\n\s*furl,\n/g, "surl,\n          furl,\n          curl,\n");

fs.writeFileSync('server/controllers/paymentController.js', controllerCode);

// Add to routes
let routesCode = fs.readFileSync('server/routes/payment.js', 'utf8');
routesCode = routesCode.replace('handlePayuCallback,', 'handlePayuCallback,\n  handlePayuCancel,');
routesCode = routesCode.replace('router.post("/payu-callback", express.urlencoded({ extended: true }), handlePayuCallback);', 
  'router.post("/payu-callback", express.urlencoded({ extended: true }), handlePayuCallback);\nrouter.post("/payu-cancel", express.urlencoded({ extended: true }), handlePayuCancel);');

fs.writeFileSync('server/routes/payment.js', routesCode);

console.log("Patched payment controller and routes.");
