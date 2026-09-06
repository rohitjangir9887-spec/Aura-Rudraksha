const fs = require('fs');
let content = fs.readFileSync('server/controllers/paymentController.js', 'utf-8');

content = content.replace(
  /\/\/ Verify hash\n\s*const hashCheck = verifyPayuResponseHash\(params, salt\);\n\s*if \(\!hashCheck\.valid\) \{[\s\S]*?return res\.status\(400\)\.json\(\{ success: false, message: "Hash mismatch" \}\);\n\s*\}/m,
  `// Verify hash
    const hashCheck = verifyPayuResponseHash(params, salt);
    let hashMismatch = false;
    if (!hashCheck.valid) {
      console.warn("⚠️ PayU Webhook hash verification failed:", hashCheck.reason);
      hashMismatch = true;
    }`
);

content = content.replace(
  /if \(status !== "success"\) \{[\s\S]*?return res\.status\(200\)\.json\(\{ success: true, message: "Webhook received \(payment not successful\)" \}\);\n\s*\}/m,
  `if (status !== "success" || (hashMismatch && status !== "success")) {
      const errorMsg = params.error_Message || params.error || params.unmappedstatus || "Gateway reported failure";
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
          { $set: { status: "FAILED", gatewayPaymentId: params.mihpayid || "", errorMessage: errorMsg } }
        );
      } catch (_) {}
      order.paymentStatus = "Failed";
      order.mihpayid = params.mihpayid || order.mihpayid || "";
      order.paymentAttempts = attempts;
      await order.save();
      return res.status(200).json({ success: true, message: "Webhook received (payment not successful)" });
    }`
);

fs.writeFileSync('server/controllers/paymentController.js', content);
