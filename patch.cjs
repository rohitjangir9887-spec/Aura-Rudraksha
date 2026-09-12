const fs = require('fs');
let code = fs.readFileSync('server/controllers/paymentController.js', 'utf8');

const target = `    if (status !== "success") {
      const errorMsg = params.error_Message || params.error || params.unmappedstatus || "Payment was not completed";
      const attempts = order.paymentAttempts || [];
      const attemptIdx = attempts.findIndex(a => a.txnid === txnid);
      if (attemptIdx >= 0) {
        attempts[attemptIdx].status = "failure";
        attempts[attemptIdx].error = errorMsg;
        attempts[attemptIdx].updatedAt = new Date().toISOString();
      }
      order.paymentStatus = "Failed";
      order.paymentAttempts = attempts;
      await order.save();
      return res.redirect(303, \`\${clientBaseUrl}/checkout?failed=\${orderId}&txnid=\${txnid}&reason=\${encodeURIComponent(errorMsg)}\`);
    }`;

const replacement = `    if (status !== "success") {
      const errorMsg = params.error_Message || params.error || params.unmappedstatus || "Payment was not completed";
      const attempts = order.paymentAttempts || [];
      const attemptIdx = attempts.findIndex(a => a.txnid === txnid);
      if (attemptIdx >= 0) {
        attempts[attemptIdx].status = "failure";
        attempts[attemptIdx].error = errorMsg;
        attempts[attemptIdx].mihpayid = params.mihpayid || "";
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
      return res.redirect(303, \`\${clientBaseUrl}/checkout?failed=\${orderId}&txnid=\${txnid}&reason=\${encodeURIComponent(errorMsg)}\`);
    }`;

code = code.replace(target, replacement);

const target2 = `    if (status !== "success") {
      try {
        await PaymentTransaction.findOneAndUpdate(
          { transactionId: txnid },
          { $set: { status: "FAILED", errorMessage: params.error_Message || params.unmappedstatus || "Gateway reported failure" } }
        );
      } catch (_) {}`;

const replacement2 = `    if (status !== "success") {
      try {
        await PaymentTransaction.findOneAndUpdate(
          { transactionId: txnid },
          { $set: { status: "FAILED", gatewayPaymentId: params.mihpayid || "", errorMessage: params.error_Message || params.unmappedstatus || "Gateway reported failure" } }
        );
      } catch (_) {}`;

code = code.replace(target2, replacement2);

fs.writeFileSync('server/controllers/paymentController.js', code);
