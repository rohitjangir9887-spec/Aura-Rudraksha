import fs from 'fs';

let content = fs.readFileSync('server/controllers/paymentController.js', 'utf8');

if (!content.includes('sendRefundStatusEmail')) {
    content = content.replace(
        'import { sendPaymentSuccessfulEmail, sendPaymentFailedEmail } from "../services/emailService.js";',
        'import { sendPaymentSuccessfulEmail, sendPaymentFailedEmail, sendRefundStatusEmail } from "../services/emailService.js";'
    );
}

// Refund status email -> processPayuRefund
const refundHookStr = `    await order.save();
    await Order.updateOne({ _id: order._id }, { $unset: { isRefunding: 1 } });`;
    
const refundHookReplace = `    await order.save();
    await Order.updateOne({ _id: order._id }, { $unset: { isRefunding: 1 } });
    
    try {
      const email = order.customerEmail || order.email || order.shippingAddress?.email;
      const name = order.customerName || order.firstName || 'Customer';
      if (email) {
        await sendRefundStatusEmail({ to: email, name, order, amount: currentRefundAmount, status: order.paymentStatus });
      }
    } catch (err) {
      console.error("[Email] Refund status email error:", err.message);
    }
`;
if (!content.includes('sendRefundStatusEmail({ to: email')) {
    content = content.replace(refundHookStr, refundHookReplace);
}

fs.writeFileSync('server/controllers/paymentController.js', content);
console.log("Patched processPayuRefund in paymentController.js");
