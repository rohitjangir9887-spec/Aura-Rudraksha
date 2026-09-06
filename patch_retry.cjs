const fs = require('fs');
let content = fs.readFileSync('server/controllers/paymentController.js', 'utf-8');

content = content.replace(
  /order\.txnid = newTxnid;\n\s*order\.paymentStatus = "Pending";\n\s*await order\.save\(\);/m,
  `order.txnid = newTxnid;
    order.paymentStatus = "Pending";
    await order.save();

    try {
      await PaymentTransaction.create({
        transactionId: newTxnid,
        orderId: order.orderNumber || order.id,
        orderNumber: order.orderNumber || order.id,
        authUserId: authUserId || "guest",
        provider: "payu",
        amount,
        currency: "INR",
        status: "PENDING",
        initiatedAt: new Date(),
        metadata: {
          customerEmail: email,
          customerName: firstname
        }
      });
    } catch (txnErr) {
      console.warn("Could not save PaymentTransaction record on retry:", txnErr.message);
    }`
);

fs.writeFileSync('server/controllers/paymentController.js', content);
