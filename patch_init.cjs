const fs = require('fs');
let content = fs.readFileSync('server/controllers/paymentController.js', 'utf-8');

content = content.replace(
  /PaymentTransaction\.create\(\{\n\s*transactionId: txnid,[\s\S]*?\}\)\.catch\(txnErr => console\.warn\("Could not save PaymentTransaction record:", txnErr\.message\)\);/m,
  `try {
      await PaymentTransaction.create({
        transactionId: txnid,
        orderId,
        orderNumber: orderId,
        authUserId: authUserId || "guest",
        provider: "payu",
        amount: totals.finalTotal,
        currency: "INR",
        status: "PENDING",
        initiatedAt: new Date(),
        metadata: {
          customerEmail: email,
          customerName: firstname
        }
      });
    } catch (txnErr) {
      console.warn("Could not save PaymentTransaction record:", txnErr.message);
    }`
);

fs.writeFileSync('server/controllers/paymentController.js', content);
