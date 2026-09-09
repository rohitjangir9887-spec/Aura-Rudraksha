import fs from 'fs';

let content = fs.readFileSync('server/services/emailService.js', 'utf8');

// Insert new imports at the top
const imports = `import { checkOrAcquireIdempotency, commitIdempotency } from "./idempotencyService.js";
import { isBrevoConfigured, sendBrevoEmail, sendBrevoSms } from "./brevoService.js";
`;
content = content.replace('import nodemailer from "nodemailer";', `import nodemailer from "nodemailer";\n${imports}`);

// Add sendNotificationIdempotent
const idempotentFn = `
async function sendNotificationIdempotent({ key, toEmail, toPhone, subject, text, html, smsMessage }) {
  const action = "NOTIFICATION";
  
  if (key) {
    const lock = await checkOrAcquireIdempotency({ key, action, payload: { toEmail, toPhone } });
    if (lock.status !== "NEW") {
      console.log(\`[Notification] Skipped duplicate notification: \${key}\`);
      return lock.responseBody || { success: true, skipped: true };
    }
  }

  const results = { email: null, sms: null };

  if (toEmail) {
    try {
      if (await isBrevoConfigured()) {
        results.email = await sendBrevoEmail({ to: toEmail, subject, htmlContent: html, textContent: text });
      } else {
        results.email = await sendTransactionalEmail(toEmail, subject, text, html);
      }
    } catch (err) {
      console.error("[Email Error]", err.message);
      results.email = { success: false, error: err.message };
    }
  }

  if (toPhone && await isBrevoConfigured() && smsMessage) {
    try {
      results.sms = await sendBrevoSms({ to: toPhone, message: smsMessage });
    } catch (err) {
      console.error("[SMS Error]", err.message);
      results.sms = { success: false, error: err.message };
    }
  }

  if (key) {
    await commitIdempotency({ key, action, responseStatus: 200, responseBody: results });
  }

  return results;
}
`;
content = content.replace('export async function sendWelcomeEmail', `${idempotentFn}\nexport async function sendWelcomeEmail`);

// Now modify the individual functions to call sendNotificationIdempotent instead of sendTransactionalEmail
// and add the phone/SMS parts where applicable.

// Helper to get phone from order
const orderPhoneLogic = `const phone = order.customerPhone || order.phone || order.shippingAddress?.phone || null;`;

content = content.replace(
  /export async function sendWelcomeEmail\(\{ to, name \}\) \{([\s\S]*?)return sendTransactionalEmail\(to, subject, text, html\);\n\}/m,
  `export async function sendWelcomeEmail({ to, name, phone }) {
  const subject = "Welcome to Aura Rudraksha!";
  const html = \`<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #a54d2b;">Namaste \${name},</h2><p>Welcome to Aura Rudraksha. We are delighted to have you join our spiritual family.</p><p>Explore our authentic, lab-certified Nepali and Indonesian Rudraksha.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>\`;
  const text = \`Namaste \${name},\\nWelcome to Aura Rudraksha. We are delighted to have you join our spiritual family.\\nBlessings,\\nAura Rudraksha Team\`;
  
  return sendNotificationIdempotent({
    key: \`WELCOME_\${to}\`,
    toEmail: to,
    subject, text, html
  });
}`
);

content = content.replace(
  /export async function sendOrderConfirmationEmail\(\{ to, name, order \}\) \{([\s\S]*?)return sendTransactionalEmail\(to, subject, text, html\);\n\}/m,
  `export async function sendOrderConfirmationEmail({ to, name, order }) {
  const subject = \`Order Confirmation - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #a54d2b;">Order Confirmed!</h2><p>Namaste \${name},</p><p>Thank you for your order. We have successfully received it and are processing it.</p><h3>Order Details:</h3><p><strong>Order Number:</strong> \${order.orderNumber}</p><p><strong>Total Amount:</strong> ₹\${order.finalAmount || order.total || order.amount}</p><p><strong>Status:</strong> \${order.orderStatus || 'Confirmed'}</p><p>You will receive another update when your order is shipped.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>\`;
  const text = \`Order Confirmed!\\nNamaste \${name},\\nThank you for your order.\\nOrder Number: \${order.orderNumber}\\nTotal Amount: ₹\${order.finalAmount || order.total || order.amount}\\nBlessings, Aura Rudraksha Team\`;
  
  ${orderPhoneLogic}
  const smsMessage = \`Aura Rudraksha: Your order #\${order.orderNumber} has been placed successfully. Thank you for shopping with us.\`;

  return sendNotificationIdempotent({
    key: \`ORDER_CONFIRM_\${order.orderNumber}\`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}`
);

content = content.replace(
  /export async function sendPaymentSuccessfulEmail\(\{ to, name, order \}\) \{([\s\S]*?)return sendTransactionalEmail\(to, subject, text, html\);\n\}/m,
  `export async function sendPaymentSuccessfulEmail({ to, name, order }) {
  const subject = \`Payment Successful - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #2e7d32;">Payment Successful</h2><p>Namaste \${name},</p><p>We have successfully received your payment for Order #\${order.orderNumber}.</p><p><strong>Amount Paid:</strong> ₹\${order.finalAmount || order.total || order.amount}</p><p><strong>Transaction ID:</strong> \${order.txnid || 'N/A'}</p><p>Your order is now being prepared for shipping.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>\`;
  const text = \`Payment Successful\\nNamaste \${name},\\nWe have successfully received your payment for Order #\${order.orderNumber}.\\nAmount Paid: ₹\${order.finalAmount || order.total || order.amount}\\nBlessings, Aura Rudraksha Team\`;

  ${orderPhoneLogic}
  const smsMessage = \`Aura Rudraksha: Payment received for order #\${order.orderNumber}. Amount ₹\${order.finalAmount || order.total || order.amount}. Thank you.\`;

  return sendNotificationIdempotent({
    key: \`PAYMENT_SUCCESS_\${order.orderNumber}\`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}`
);

content = content.replace(
  /export async function sendPaymentFailedEmail\(\{ to, name, order, reason \}\) \{([\s\S]*?)return sendTransactionalEmail\(to, subject, text, html\);\n\}/m,
  `export async function sendPaymentFailedEmail({ to, name, order, reason }) {
  const subject = \`Payment Failed - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #c62828;">Payment Failed</h2><p>Namaste \${name},</p><p>Unfortunately, your payment attempt for Order #\${order.orderNumber} failed.</p>\${reason ? \`<p><strong>Reason:</strong> \${reason}</p>\` : ''}<p>Please try again using a different payment method.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>\`;
  const text = \`Payment Failed\\nNamaste \${name},\\nUnfortunately, your payment attempt for Order #\${order.orderNumber} failed.\\nPlease try again.\\nBlessings, Aura Rudraksha Team\`;

  ${orderPhoneLogic}
  const smsMessage = \`Aura Rudraksha: Payment for order #\${order.orderNumber} failed. Please retry from your order page.\`;

  return sendNotificationIdempotent({
    key: \`PAYMENT_FAIL_\${order.orderNumber}_\${Date.now()}\`, // Use timestamp for multiple failure retries
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}`
);

content = content.replace(
  /export async function sendOrderCancelledEmail\(\{ to, name, order \}\) \{([\s\S]*?)return sendTransactionalEmail\(to, subject, text, html\);\n\}/m,
  `export async function sendOrderCancelledEmail({ to, name, order }) {
  const subject = \`Order Cancelled - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #c62828;">Order Cancelled</h2><p>Namaste \${name},</p><p>Your Order #\${order.orderNumber} has been cancelled.</p>\${order.cancelReason ? \`<p><strong>Reason:</strong> \${order.cancelReason}</p>\` : ''}<p>If you have any questions, please contact our support.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>\`;
  const text = \`Order Cancelled\\nNamaste \${name},\\nYour Order #\${order.orderNumber} has been cancelled.\\nBlessings, Aura Rudraksha Team\`;

  ${orderPhoneLogic}
  const smsMessage = \`Aura Rudraksha: Order #\${order.orderNumber} has been cancelled. Contact support if you need help.\`;

  return sendNotificationIdempotent({
    key: \`ORDER_CANCEL_\${order.orderNumber}\`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}`
);

content = content.replace(
  /export async function sendRefundStatusEmail\(\{ to, name, order, amount, status \}\) \{([\s\S]*?)return sendTransactionalEmail\(to, subject, text, html\);\n\}/m,
  `export async function sendRefundStatusEmail({ to, name, order, amount, status }) {
  const subject = \`Refund Update - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #a54d2b;">Refund \${status}</h2><p>Namaste \${name},</p><p>There is an update regarding your refund for Order #\${order.orderNumber}.</p><p><strong>Refund Amount:</strong> ₹\${amount}</p><p><strong>Status:</strong> \${status}</p><p>It may take a few business days for the amount to reflect in your account.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>\`;
  const text = \`Refund \${status}\\nNamaste \${name},\\nUpdate regarding your refund for Order #\${order.orderNumber}.\\nRefund Amount: ₹\${amount}\\nStatus: \${status}\\nBlessings, Aura Rudraksha Team\`;

  ${orderPhoneLogic}
  const smsMessage = \`Aura Rudraksha: Refund for order #\${order.orderNumber} has been \${status}. Amount ₹\${amount}.\`;

  return sendNotificationIdempotent({
    key: \`REFUND_\${status.toUpperCase()}_\${order.orderNumber}\`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}`
);

content = content.replace(
  /export async function sendOrderShippedEmail\(\{ to, name, order \}\) \{([\s\S]*?)return sendTransactionalEmail\(to, subject, text, html\);\n\}/m,
  `export async function sendOrderShippedEmail({ to, name, order }) {
  const subject = \`Order Shipped - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #2e7d32;">Your Order is Shipped!</h2><p>Namaste \${name},</p><p>Great news! Your Order #\${order.orderNumber} has been shipped.</p>\${order.trackingNumber ? \`<p><strong>Tracking Number:</strong> \${order.trackingNumber}</p>\` : ''}\${order.courierName || order.carrier ? \`<p><strong>Courier:</strong> \${order.courierName || order.carrier}</p>\` : ''}\${order.trackingUrl || order.shippingLink ? \`<p><strong>Track Here:</strong> <a href="\${order.trackingUrl || order.shippingLink}">Track Order</a></p>\` : ''}<p>Blessings,<br/>Aura Rudraksha Team</p></div>\`;
  const text = \`Your Order is Shipped!\\nNamaste \${name},\\nYour Order #\${order.orderNumber} has been shipped.\\nBlessings, Aura Rudraksha Team\`;

  ${orderPhoneLogic}
  const trackLink = order.trackingUrl || order.shippingLink || "your order dashboard";
  const smsMessage = \`Aura Rudraksha: Order #\${order.orderNumber} has shipped. Track: \${trackLink}\`;

  return sendNotificationIdempotent({
    key: \`ORDER_SHIPPED_\${order.orderNumber}\`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}`
);

content = content.replace(
  /export async function sendOrderDeliveredEmail\(\{ to, name, order \}\) \{([\s\S]*?)return sendTransactionalEmail\(to, subject, text, html\);\n\}/m,
  `export async function sendOrderDeliveredEmail({ to, name, order }) {
  const subject = \`Order Delivered - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #2e7d32;">Your Order is Delivered!</h2><p>Namaste \${name},</p><p>Your Order #\${order.orderNumber} has been successfully delivered.</p><p>We hope you experience the divine blessings of your authentic Rudraksha.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>\`;
  const text = \`Your Order is Delivered!\\nNamaste \${name},\\nYour Order #\${order.orderNumber} has been successfully delivered.\\nBlessings, Aura Rudraksha Team\`;

  ${orderPhoneLogic}
  const smsMessage = \`Aura Rudraksha: Order #\${order.orderNumber} has been delivered. Thank you for shopping with Aura Rudraksha.\`;

  return sendNotificationIdempotent({
    key: \`ORDER_DELIVERED_\${order.orderNumber}\`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}`
);

// We need to modify sendBulkEmail as well to use Brevo directly if possible
content = content.replace(
  /export async function sendBulkEmail\(\{ toList, subject, htmlContent, textContent \}\) \{([\s\S]*?)return sendTransactionalEmail\(recipients, subject, textContent, htmlContent\);\n\}/m,
  `export async function sendBulkEmail({ toList, subject, htmlContent, textContent }) {
  if (await isBrevoConfigured()) {
    return sendBrevoEmail({ to: toList, subject, htmlContent, textContent });
  }
  let recipients = Array.isArray(toList) ? toList.join(', ') : toList;
  return sendTransactionalEmail(recipients, subject, textContent, htmlContent);
}`
);

fs.writeFileSync('server/services/emailService.js', content);
console.log("Patched emailService.js");
