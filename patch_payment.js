import fs from 'fs';

let content = fs.readFileSync('server/controllers/paymentController.js', 'utf8');

// Imports
if (!content.includes('sendPaymentSuccessfulEmail')) {
    content = content.replace(
        'import { verifyPayuPaymentServerSide',
        'import { sendPaymentSuccessfulEmail, sendPaymentFailedEmail } from "../services/emailService.js";\nimport { verifyPayuPaymentServerSide'
    );
}

// Payment failed hook inside handlePayuCallback
const failedHookStr = `      await order.save();`;
const failedHookReplace = `      await order.save();
      try {
        const email = order.customerEmail || order.email || order.shippingAddress?.email;
        const name = order.customerName || order.firstName || 'Customer';
        if (email) {
          await sendPaymentFailedEmail({ to: email, name, order, reason: errorMsg });
        }
      } catch (err) {
        console.error("[Email] Payment failed email error:", err.message);
      }
`;
if (!content.includes('sendPaymentFailedEmail({ to: email')) {
    content = content.replace(failedHookStr, failedHookReplace);
}

// Payment success hook inside handlePayuCallback
// Look for `// First time state transition - execute side effects strictly ONCE`
const successHookStr = `// First time state transition - execute side effects strictly ONCE`;
const successHookReplace = `// First time state transition - execute side effects strictly ONCE
      try {
        const email = updatedOrder.customerEmail || updatedOrder.email || updatedOrder.shippingAddress?.email;
        const name = updatedOrder.customerName || updatedOrder.firstName || 'Customer';
        if (email) {
          await sendPaymentSuccessfulEmail({ to: email, name, order: updatedOrder });
        }
      } catch (err) {
        console.error("[Email] Payment success email error:", err.message);
      }
`;
if (!content.includes('sendPaymentSuccessfulEmail({ to: email')) {
    content = content.replace(successHookStr, successHookReplace);
}

// Refund status email -> processPayuRefund
// We can find where order.refundStatus is set to REFUNDED or PARTIALLY_REFUNDED
// and hook there.
fs.writeFileSync('server/controllers/paymentController.js', content);
console.log("Patched handlePayuCallback in paymentController.js");
