import fs from 'fs';

let content = fs.readFileSync('server/services/emailService.js', 'utf8');

// Replace the environment variables for getting transporter
content = content.replace(
  `const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;`,
  `const smtpUser = process.env.NODEMAILER_USER || process.env.SMTP_USER || process.env.GMAIL_USER;`
);

content = content.replace(
  `const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;`,
  `const smtpPass = process.env.NODEMAILER_PASS || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;`
);

content = content.replace(
  `"security@aura-rudraksha.vercel.app"`,
  `"support@aurarudraksha.com"`
);

// We need to add the new email functions
const newFunctions = `
/**
 * Utility to send basic emails
 */
async function sendTransactionalEmail(to, subject, textContent, htmlContent) {
  if (!to) return { success: false, message: "No recipient email provided" };
  const transporter = getMailTransporter();
  if (!transporter) {
    console.log(\`[EmailService] SMTP not configured. Would have sent email to \${to}: \${subject}\`);
    return { success: false, message: "SMTP not configured" };
  }
  try {
    const info = await transporter.sendMail({
      from: \`"Aura Rudraksha" <\${process.env.NODEMAILER_USER || "support@aurarudraksha.com"}>\`,
      to,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log(\`[EmailService] Email '\${subject}' sent to \${to}. Message ID: \${info.messageId}\`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(\`[EmailService] Failed to send email to \${to}:\`, error.message);
    return { success: false, message: error.message };
  }
}

export async function sendWelcomeEmail({ to, name }) {
  const subject = "Welcome to Aura Rudraksha!";
  const html = \`
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #a54d2b;">Namaste \${name},</h2>
      <p>Welcome to Aura Rudraksha. We are delighted to have you join our spiritual family.</p>
      <p>Explore our authentic, lab-certified Nepali and Indonesian Rudraksha.</p>
      <p>Blessings,<br/>Aura Rudraksha Team</p>
    </div>
  \`;
  const text = \`Namaste \${name},\n\nWelcome to Aura Rudraksha. We are delighted to have you join our spiritual family.\n\nBlessings,\nAura Rudraksha Team\`;
  return sendTransactionalEmail(to, subject, text, html);
}

export async function sendOrderConfirmationEmail({ to, name, order }) {
  const subject = \`Order Confirmation - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #a54d2b;">Order Confirmed!</h2>
      <p>Namaste \${name},</p>
      <p>Thank you for your order. We have successfully received it and are processing it.</p>
      <h3>Order Details:</h3>
      <p><strong>Order Number:</strong> \${order.orderNumber}</p>
      <p><strong>Total Amount:</strong> ₹\${order.finalAmount || order.total || order.amount}</p>
      <p><strong>Status:</strong> \${order.orderStatus || 'Confirmed'}</p>
      <p>You will receive another update when your order is shipped.</p>
      <p>Blessings,<br/>Aura Rudraksha Team</p>
    </div>
  \`;
  const text = \`Order Confirmed!\nNamaste \${name},\nThank you for your order. We have successfully received it and are processing it.\nOrder Number: \${order.orderNumber}\nTotal Amount: ₹\${order.finalAmount || order.total || order.amount}\n\nBlessings,\nAura Rudraksha Team\`;
  return sendTransactionalEmail(to, subject, text, html);
}

export async function sendPaymentSuccessfulEmail({ to, name, order }) {
  const subject = \`Payment Successful - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #2e7d32;">Payment Successful</h2>
      <p>Namaste \${name},</p>
      <p>We have successfully received your payment for Order #\${order.orderNumber}.</p>
      <p><strong>Amount Paid:</strong> ₹\${order.finalAmount || order.total || order.amount}</p>
      <p><strong>Transaction ID:</strong> \${order.txnid || 'N/A'}</p>
      <p>Your order is now being prepared for shipping.</p>
      <p>Blessings,<br/>Aura Rudraksha Team</p>
    </div>
  \`;
  const text = \`Payment Successful\nNamaste \${name},\nWe have successfully received your payment for Order #\${order.orderNumber}.\nAmount Paid: ₹\${order.finalAmount || order.total || order.amount}\n\nBlessings,\nAura Rudraksha Team\`;
  return sendTransactionalEmail(to, subject, text, html);
}

export async function sendPaymentFailedEmail({ to, name, order, reason }) {
  const subject = \`Payment Failed - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #c62828;">Payment Failed</h2>
      <p>Namaste \${name},</p>
      <p>Unfortunately, your payment attempt for Order #\${order.orderNumber} failed.</p>
      \${reason ? \`<p><strong>Reason:</strong> \${reason}</p>\` : ''}
      <p>Please try again using a different payment method.</p>
      <p>Blessings,<br/>Aura Rudraksha Team</p>
    </div>
  \`;
  const text = \`Payment Failed\nNamaste \${name},\nUnfortunately, your payment attempt for Order #\${order.orderNumber} failed.\nPlease try again.\n\nBlessings,\nAura Rudraksha Team\`;
  return sendTransactionalEmail(to, subject, text, html);
}

export async function sendOrderCancelledEmail({ to, name, order }) {
  const subject = \`Order Cancelled - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #c62828;">Order Cancelled</h2>
      <p>Namaste \${name},</p>
      <p>Your Order #\${order.orderNumber} has been cancelled.</p>
      \${order.cancelReason ? \`<p><strong>Reason:</strong> \${order.cancelReason}</p>\` : ''}
      <p>If you have any questions, please contact our support.</p>
      <p>Blessings,<br/>Aura Rudraksha Team</p>
    </div>
  \`;
  const text = \`Order Cancelled\nNamaste \${name},\nYour Order #\${order.orderNumber} has been cancelled.\n\nBlessings,\nAura Rudraksha Team\`;
  return sendTransactionalEmail(to, subject, text, html);
}

export async function sendRefundStatusEmail({ to, name, order, amount, status }) {
  const subject = \`Refund Update - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #a54d2b;">Refund \${status}</h2>
      <p>Namaste \${name},</p>
      <p>There is an update regarding your refund for Order #\${order.orderNumber}.</p>
      <p><strong>Refund Amount:</strong> ₹\${amount}</p>
      <p><strong>Status:</strong> \${status}</p>
      <p>It may take a few business days for the amount to reflect in your account.</p>
      <p>Blessings,<br/>Aura Rudraksha Team</p>
    </div>
  \`;
  const text = \`Refund \${status}\nNamaste \${name},\nUpdate regarding your refund for Order #\${order.orderNumber}.\nRefund Amount: ₹\${amount}\nStatus: \${status}\n\nBlessings,\nAura Rudraksha Team\`;
  return sendTransactionalEmail(to, subject, text, html);
}

export async function sendOrderShippedEmail({ to, name, order }) {
  const subject = \`Order Shipped - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #2e7d32;">Your Order is Shipped!</h2>
      <p>Namaste \${name},</p>
      <p>Great news! Your Order #\${order.orderNumber} has been shipped.</p>
      \${order.trackingNumber ? \`<p><strong>Tracking Number:</strong> \${order.trackingNumber}</p>\` : ''}
      \${order.courierName || order.carrier ? \`<p><strong>Courier:</strong> \${order.courierName || order.carrier}</p>\` : ''}
      \${order.trackingUrl || order.shippingLink ? \`<p><strong>Track Here:</strong> <a href="\${order.trackingUrl || order.shippingLink}">Track Order</a></p>\` : ''}
      <p>Blessings,<br/>Aura Rudraksha Team</p>
    </div>
  \`;
  const text = \`Your Order is Shipped!\nNamaste \${name},\nYour Order #\${order.orderNumber} has been shipped.\n\nBlessings,\nAura Rudraksha Team\`;
  return sendTransactionalEmail(to, subject, text, html);
}

export async function sendOrderDeliveredEmail({ to, name, order }) {
  const subject = \`Order Delivered - Aura Rudraksha (Order #\${order.orderNumber})\`;
  const html = \`
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #2e7d32;">Your Order is Delivered!</h2>
      <p>Namaste \${name},</p>
      <p>Your Order #\${order.orderNumber} has been successfully delivered.</p>
      <p>We hope you experience the divine blessings of your authentic Rudraksha.</p>
      <p>Blessings,<br/>Aura Rudraksha Team</p>
    </div>
  \`;
  const text = \`Your Order is Delivered!\nNamaste \${name},\nYour Order #\${order.orderNumber} has been successfully delivered.\n\nBlessings,\nAura Rudraksha Team\`;
  return sendTransactionalEmail(to, subject, text, html);
}

export async function sendBulkEmail({ toList, subject, htmlContent, textContent }) {
  // toList can be a single email or an array or a comma-separated string
  let recipients = Array.isArray(toList) ? toList.join(', ') : toList;
  return sendTransactionalEmail(recipients, subject, textContent, htmlContent);
}
`;

fs.writeFileSync('server/services/emailService.js', content + '\n' + newFunctions);
console.log("Successfully updated server/services/emailService.js");
