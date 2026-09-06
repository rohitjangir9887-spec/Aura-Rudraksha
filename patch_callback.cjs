const fs = require('fs');
let content = fs.readFileSync('server/controllers/paymentController.js', 'utf-8');

content = content.replace(
  /\/\/ 2\. Verify Hash Integrity with Salt[\s\S]*?\/\/ 3\. Verify Transaction ID/m,
  `// 2. Verify Hash Integrity with Salt
    const hashCheck = verifyPayuResponseHash(params, salt);
    let hashMismatch = false;
    if (!hashCheck.valid) {
      console.warn(\`⚠️ PayU Callback Hash Mismatch for Order \${orderId}:\`, hashCheck.reason);
      hashMismatch = true;
    }

    // 3. Verify Transaction ID`
);

content = content.replace(
  /\/\/ 6\. If status is NOT success, record failure and redirect cleanly[\s\S]*?\/\/ 7\. Perform Server-to-Server Verification/m,
  `// 6. If status is NOT success, record failure and redirect cleanly
    if (status !== "success" || (hashMismatch && status !== "success")) {
      const errorMsg = params.error_Message || params.error || params.unmappedstatus || "Payment was not completed";
      const attempts = order.paymentAttempts || [];
      const attemptIdx = attempts.findIndex(a => a.txnid === txnid);
      if (attemptIdx >= 0) {
        attempts[attemptIdx].status = "failure";
        attempts[attemptIdx].error = errorMsg;
        attempts[attemptIdx].mihpayid = params.mihpayid || attempts[attemptIdx].mihpayid || "";
        attempts[attemptIdx].updatedAt = new Date().toISOString();
      }
      try {
        await PaymentTransaction.findOneAndUpdate(
          { transactionId: txnid },
          { $set: { status: "FAILED", errorMessage: errorMsg, gatewayPaymentId: params.mihpayid || "" } }
        );
      } catch (_) {}
      order.paymentStatus = "Failed";
      order.mihpayid = params.mihpayid || order.mihpayid || "";
      order.paymentAttempts = attempts;
      await order.save();
      return res.redirect(303, \`\${clientBaseUrl}/payment-result?status=failed&orderId=\${orderId}&txnid=\${txnid}&reason=\${encodeURIComponent(hashMismatch ? "Payment hash verification failed" : errorMsg)}\`);
    }

    // 7. Perform Server-to-Server Verification`
);

fs.writeFileSync('server/controllers/paymentController.js', content);
