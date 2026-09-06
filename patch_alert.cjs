const fs = require('fs');
let code = fs.readFileSync('server/controllers/orderController.js', 'utf8');

const newEndpoint = `
export async function getPaymentFailureAlert(req, res, next) {
  try {
    const authUserId = req.user.authUserId;
    if (!isDbConnected()) {
      return res.json({ success: true, hasNotification: false });
    }

    // Find the latest order by createdAt
    const latestOrder = await Order.findOne({ authUserId }).sort({ createdAt: -1 }).lean();
    if (!latestOrder) {
      return res.json({ success: true, hasNotification: false });
    }

    if (latestOrder.paymentStatus !== "Failed" && latestOrder.paymentStatus !== "Cancelled") {
      // If the latest order is Paid or Pending, no failure alert
      return res.json({ success: true, hasNotification: false });
    }

    // Get the timestamp of the latest failed attempt, or order updatedAt
    let failedAtStr = latestOrder.updatedAt;
    if (latestOrder.paymentAttempts && latestOrder.paymentAttempts.length > 0) {
      const latestAttempt = latestOrder.paymentAttempts[latestOrder.paymentAttempts.length - 1];
      if (latestAttempt && latestAttempt.updatedAt) {
        failedAtStr = latestAttempt.updatedAt;
      }
    }
    const failedAt = new Date(failedAtStr);
    const expiresAt = new Date(failedAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    if (new Date() > expiresAt) {
      return res.json({ success: true, hasNotification: false });
    }

    const firstItem = (latestOrder.items || latestOrder.snapshotItems || [])[0];

    return res.json({
      success: true,
      hasNotification: true,
      data: {
        orderId: latestOrder._id,
        orderNumber: latestOrder.orderNumber || latestOrder.id,
        amount: latestOrder.finalAmount || latestOrder.total || latestOrder.amount || 0,
        productName: firstItem ? firstItem.name : "Products",
        transactionId: latestOrder.txnid,
        payuPaymentId: latestOrder.mihpayid || "",
        paymentStatus: latestOrder.paymentStatus,
        failedAt: failedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }
    });

  } catch (err) {
    next(err);
  }
}
`;

code += newEndpoint;
fs.writeFileSync('server/controllers/orderController.js', code);
