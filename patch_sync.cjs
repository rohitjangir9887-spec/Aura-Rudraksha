const fs = require('fs');
let content = fs.readFileSync('server/controllers/paymentController.js', 'utf-8');

if (!content.includes('export async function syncPayuOrder')) {
  const syncFunction = `
// ADMIN ONLY: Sync order's payment attempts with Live PayU
export async function syncPayuOrder(req, res) {
  try {
    const { orderId } = req.params;
    if (!orderId || !isDbConnected()) {
      return res.status(503).json({ success: false, message: "Database offline" });
    }

    const order = await Order.findOne({ $or: [{ id: orderId }, { orderId }, { orderNumber: orderId }] });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const attempts = order.paymentAttempts || [];
    let syncedCount = 0;
    let orderBecamePaid = false;
    let successfulMihpayid = null;

    for (const attempt of attempts) {
      if (!attempt.txnid) continue;
      // Skip if already success
      if (attempt.status === "success") continue;
      
      const verifyRes = await verifyPayuPaymentServerSide(attempt.txnid);
      
      if (verifyRes.isPaid && verifyRes.amount > 0 && Math.abs(verifyRes.amount - (order.finalAmount || order.total || order.amount)) <= 0.01) {
        attempt.status = "success";
        attempt.mihpayid = verifyRes.mihpayid || attempt.mihpayid || "";
        attempt.payuStatus = "success";
        attempt.updatedAt = new Date().toISOString();
        orderBecamePaid = true;
        successfulMihpayid = verifyRes.mihpayid;
        
        try {
          await PaymentTransaction.findOneAndUpdate(
            { transactionId: attempt.txnid },
            { $set: { status: "SUCCESS", gatewayPaymentId: verifyRes.mihpayid || "", verifiedAt: new Date() } }
          );
        } catch (_) {}
      } else {
        // Just sync whatever it is
        attempt.status = verifyRes.status || attempt.status;
        attempt.mihpayid = verifyRes.mihpayid || attempt.mihpayid || "";
        attempt.payuStatus = verifyRes.status || attempt.payuStatus;
        attempt.updatedAt = new Date().toISOString();
      }
      syncedCount++;
    }

    if (orderBecamePaid && order.paymentStatus !== "Paid") {
      order.paymentStatus = "Paid";
      order.orderStatus = "Confirmed";
      order.status = "Confirmed";
      if (successfulMihpayid) order.mihpayid = successfulMihpayid;
    }

    order.paymentAttempts = attempts;
    await order.save();

    return res.json({ success: true, message: \`Synced \${syncedCount} attempts\`, order });

  } catch (err) {
    console.error("Sync PayU Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
`;
  content += syncFunction;
  fs.writeFileSync('server/controllers/paymentController.js', content);
}
