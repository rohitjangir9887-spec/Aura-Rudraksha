import nodemailer from "nodemailer";
import { checkOrAcquireIdempotency, commitIdempotency } from "./idempotencyService.js";
import { isBrevoConfigured, sendBrevoEmail, sendBrevoSms } from "./brevoService.js";


/**
 * Helper to mask email address for security display (e.g. rohitjangir9887@gmail.com -> r***7@gmail.com)
 */
export function maskEmail(email) {
  if (!email || typeof email !== "string") return "admin@***.com";
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  const maskedName = `${name[0]}${"*".repeat(Math.min(name.length - 2, 5))}${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}

let cachedTransporter = null;

function getMailTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const smtpUser = process.env.NODEMAILER_USER || process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.NODEMAILER_PASS || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;

  if (smtpUser && smtpPass) {
    if (smtpHost) {
      cachedTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
    } else {
      // Default to Gmail service if user/pass provided without explicit host
      cachedTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
    }
  }

  return cachedTransporter;
}

/**
 * Sends a 6-digit OTP verification email to the Admin Gmail address for PayU Refund authorization
 */
export async function sendRefundOtpEmail({ to, otp, orderId, amount, reason, customerName }) {
  const adminEmail = to || process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "rohitjangir9887@gmail.com";
  const masked = maskEmail(adminEmail);
  const formattedAmount = Number(amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" });
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayU Refund Authorization OTP</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fdf8f4; margin: 0; padding: 24px; color: #2b170d;">
    <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #ebdccb; overflow: hidden; box-shadow: 0 4px 20px rgba(43,23,13,0.06);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #a54d2b 0%, #7a3217 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">AURA RUDRAKSHA</h1>
        <p style="margin: 0; font-size: 13px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">Admin Security Authorization</p>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px;">
        <div style="background: #fdf2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 16px; margin-bottom: 22px; display: flex; align-items: center;">
          <span style="font-size: 18px; margin-right: 10px;">🔒</span>
          <span style="font-size: 13px; color: #991b1b; font-weight: 600;">
            A live PayU refund action has been requested on the Admin Dashboard.
          </span>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #5c483b; margin: 0 0 20px;">
          Please use the following 6-digit One-Time Password (OTP) to authorize and execute the PayU refund:
        </p>

        <!-- OTP Display Box -->
        <div style="background: #fdf8f4; border: 2px dashed #a54d2b; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; color: #806f62; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            Your Refund Security Code
          </div>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #a54d2b; font-family: monospace; user-select: all;">
            ${otp}
          </div>
          <div style="font-size: 12px; color: #991b1b; font-weight: 600; margin-top: 8px;">
            ⏱ Valid for 5 minutes only (Single-use)
          </div>
        </div>

        <!-- Refund Details Table -->
        <div style="background: #faf6f0; border-radius: 8px; padding: 16px; margin-bottom: 22px; font-size: 13px;">
          <div style="font-weight: 700; color: #2b170d; margin-bottom: 10px; border-bottom: 1px solid #ebdccb; padding-bottom: 6px;">
            Transaction Details:
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #806f62;">Order ID:</td>
              <td style="padding: 4px 0; font-weight: 700; text-align: right; color: #2b170d;">#${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #806f62;">Refund Amount:</td>
              <td style="padding: 4px 0; font-weight: 700; text-align: right; color: #991b1b; font-size: 15px;">${formattedAmount}</td>
            </tr>
            ${customerName ? `
            <tr>
              <td style="padding: 4px 0; color: #806f62;">Customer:</td>
              <td style="padding: 4px 0; font-weight: 600; text-align: right; color: #2b170d;">${customerName}</td>
            </tr>` : ""}
            ${reason ? `
            <tr>
              <td style="padding: 4px 0; color: #806f62;">Reason:</td>
              <td style="padding: 4px 0; text-align: right; color: #5c483b;">${reason}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 4px 0; color: #806f62;">Time (IST):</td>
              <td style="padding: 4px 0; text-align: right; color: #806f62;">${timestamp}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 12px; color: #806f62; line-height: 1.5; margin: 0;">
          ⚠️ <strong>Security Notice:</strong> If you did NOT initiate this refund request, do not share this OTP and immediately secure your admin credentials.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f4ece4; padding: 16px 24px; text-align: center; font-size: 11px; color: #806f62; border-top: 1px solid #ebdccb;">
        Aura Rudraksha Admin Portal • Automated Security Delivery System
      </div>
    </div>
  </body>
  </html>
  `;

  const textContent = `[AURA ADMIN SECURITY] PayU Refund OTP Verification
Order ID: #${orderId}
Refund Amount: ${formattedAmount}
Security OTP Code: ${otp}
Valid for 5 minutes.
Reason: ${reason || "Admin Refund"}
Time: ${timestamp}
Do NOT share this code with anyone.`;

  const transporter = getMailTransporter();
  let emailSent = false;
  let errorDetail = null;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Aura Rudraksha Security" <${process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "support@aurarudraksha.com"}>`,
        to: adminEmail,
        subject: `🔒 [Aura Admin] OTP ${otp} to Authorize PayU Refund for Order #${orderId}`,
        text: textContent,
        html: htmlContent
      });
      emailSent = true;
      console.log(`[EmailService] Refund OTP email delivered successfully to ${adminEmail}`);
    } catch (err) {
      errorDetail = err?.message || String(err);
      console.error(`[EmailService] Failed to send email via SMTP to ${adminEmail}:`, errorDetail);
    }
  }

  // Authoritative fallback log to server console
  console.log(`\n=============================================================`);
  console.log(`🔒 [AURA ADMIN SECURITY] PAYU REFUND OTP CODE GENERATED`);
  console.log(`  Target Admin Gmail : ${adminEmail}`);
  console.log(`  Order ID           : #${orderId}`);
  console.log(`  Refund Amount      : ${formattedAmount}`);
  console.log(`  6-Digit OTP Code   : >>> ${otp} <<<`);
  console.log(`  Expires At         : ${new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString()}`);
  console.log(`  Email Sent Via SMTP: ${emailSent ? "YES (Delivered to Inbox)" : "NO (SMTP not configured or error: " + (errorDetail || "No SMTP credentials") + ")"}`);
  console.log(`=============================================================\n`);

  return {
    success: true,
    emailSent,
    targetEmail: masked,
    fullEmail: adminEmail
  };
}


/**
 * Utility to send basic emails
 */
async function sendTransactionalEmail(to, subject, textContent, htmlContent) {
  if (!to) return { success: false, message: "No recipient email provided" };
  const transporter = getMailTransporter();
  if (!transporter) {
    console.log(`[EmailService] SMTP not configured. Would have sent email to ${to}: ${subject}`);
    return { success: false, message: "SMTP not configured" };
  }
  try {
    const info = await transporter.sendMail({
      from: `"Aura Rudraksha" <${process.env.NODEMAILER_USER || "support@aurarudraksha.com"}>`,
      to,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`[EmailService] Email '${subject}' sent to ${to}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
    return { success: false, message: error.message };
  }
}


async function sendNotificationIdempotent({ key, toEmail, toPhone, subject, text, html, smsMessage }) {
  const action = "NOTIFICATION";
  
  if (key) {
    const lock = await checkOrAcquireIdempotency({ key, action, payload: { toEmail, toPhone } });
    if (lock.status !== "NEW") {
      console.log(`[Notification] Skipped duplicate notification: ${key}`);
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

export async function sendWelcomeEmail({ to, name, phone }) {
  const subject = "Welcome to Aura Rudraksha!";
  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #a54d2b;">Namaste ${name},</h2><p>Welcome to Aura Rudraksha. We are delighted to have you join our spiritual family.</p><p>Explore our authentic, lab-certified Nepali and Indonesian Rudraksha.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>`;
  const text = `Namaste ${name},\nWelcome to Aura Rudraksha. We are delighted to have you join our spiritual family.\nBlessings,\nAura Rudraksha Team`;
  
  return sendNotificationIdempotent({
    key: `WELCOME_${to}`,
    toEmail: to,
    subject, text, html
  });
}

export async function sendOrderConfirmationEmail({ to, name, order }) {
  const subject = `Order Confirmation - Aura Rudraksha (Order #${order.orderNumber})`;
  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #a54d2b;">Order Confirmed!</h2><p>Namaste ${name},</p><p>Thank you for your order. We have successfully received it and are processing it.</p><h3>Order Details:</h3><p><strong>Order Number:</strong> ${order.orderNumber}</p><p><strong>Total Amount:</strong> ₹${order.finalAmount || order.total || order.amount}</p><p><strong>Status:</strong> ${order.orderStatus || 'Confirmed'}</p><p>You will receive another update when your order is shipped.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>`;
  const text = `Order Confirmed!\nNamaste ${name},\nThank you for your order.\nOrder Number: ${order.orderNumber}\nTotal Amount: ₹${order.finalAmount || order.total || order.amount}\nBlessings, Aura Rudraksha Team`;
  
  const phone = order.customerPhone || order.phone || order.shippingAddress?.phone || null;
  const smsMessage = `Aura Rudraksha: Your order #${order.orderNumber} has been placed successfully. Thank you for shopping with us.`;

  return sendNotificationIdempotent({
    key: `ORDER_CONFIRM_${order.orderNumber}`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}

export async function sendPaymentSuccessfulEmail({ to, name, order }) {
  const subject = `Payment Successful - Aura Rudraksha (Order #${order.orderNumber})`;
  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #2e7d32;">Payment Successful</h2><p>Namaste ${name},</p><p>We have successfully received your payment for Order #${order.orderNumber}.</p><p><strong>Amount Paid:</strong> ₹${order.finalAmount || order.total || order.amount}</p><p><strong>Transaction ID:</strong> ${order.txnid || 'N/A'}</p><p>Your order is now being prepared for shipping.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>`;
  const text = `Payment Successful\nNamaste ${name},\nWe have successfully received your payment for Order #${order.orderNumber}.\nAmount Paid: ₹${order.finalAmount || order.total || order.amount}\nBlessings, Aura Rudraksha Team`;

  const phone = order.customerPhone || order.phone || order.shippingAddress?.phone || null;
  const smsMessage = `Aura Rudraksha: Payment received for order #${order.orderNumber}. Amount ₹${order.finalAmount || order.total || order.amount}. Thank you.`;

  return sendNotificationIdempotent({
    key: `PAYMENT_SUCCESS_${order.orderNumber}`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}

export async function sendPaymentFailedEmail({ to, name, order, reason }) {
  const subject = `Payment Failed - Aura Rudraksha (Order #${order.orderNumber})`;
  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #c62828;">Payment Failed</h2><p>Namaste ${name},</p><p>Unfortunately, your payment attempt for Order #${order.orderNumber} failed.</p>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}<p>Please try again using a different payment method.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>`;
  const text = `Payment Failed\nNamaste ${name},\nUnfortunately, your payment attempt for Order #${order.orderNumber} failed.\nPlease try again.\nBlessings, Aura Rudraksha Team`;

  const phone = order.customerPhone || order.phone || order.shippingAddress?.phone || null;
  const smsMessage = `Aura Rudraksha: Payment for order #${order.orderNumber} failed. Please retry from your order page.`;

  return sendNotificationIdempotent({
    key: `PAYMENT_FAIL_${order.orderNumber}_${Date.now()}`, // Use timestamp for multiple failure retries
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}

export async function sendOrderCancelledEmail({ to, name, order }) {
  const subject = `Order Cancelled - Aura Rudraksha (Order #${order.orderNumber})`;
  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #c62828;">Order Cancelled</h2><p>Namaste ${name},</p><p>Your Order #${order.orderNumber} has been cancelled.</p>${order.cancelReason ? `<p><strong>Reason:</strong> ${order.cancelReason}</p>` : ''}<p>If you have any questions, please contact our support.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>`;
  const text = `Order Cancelled\nNamaste ${name},\nYour Order #${order.orderNumber} has been cancelled.\nBlessings, Aura Rudraksha Team`;

  const phone = order.customerPhone || order.phone || order.shippingAddress?.phone || null;
  const smsMessage = `Aura Rudraksha: Order #${order.orderNumber} has been cancelled. Contact support if you need help.`;

  return sendNotificationIdempotent({
    key: `ORDER_CANCEL_${order.orderNumber}`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}

export async function sendRefundStatusEmail({ to, name, order, amount, status }) {
  const subject = `Refund Update - Aura Rudraksha (Order #${order.orderNumber})`;
  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #a54d2b;">Refund ${status}</h2><p>Namaste ${name},</p><p>There is an update regarding your refund for Order #${order.orderNumber}.</p><p><strong>Refund Amount:</strong> ₹${amount}</p><p><strong>Status:</strong> ${status}</p><p>It may take a few business days for the amount to reflect in your account.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>`;
  const text = `Refund ${status}\nNamaste ${name},\nUpdate regarding your refund for Order #${order.orderNumber}.\nRefund Amount: ₹${amount}\nStatus: ${status}\nBlessings, Aura Rudraksha Team`;

  const phone = order.customerPhone || order.phone || order.shippingAddress?.phone || null;
  const smsMessage = `Aura Rudraksha: Refund for order #${order.orderNumber} has been ${status}. Amount ₹${amount}.`;

  return sendNotificationIdempotent({
    key: `REFUND_${status.toUpperCase()}_${order.orderNumber}`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}

export async function sendOrderShippedEmail({ to, name, order }) {
  const subject = `Order Shipped - Aura Rudraksha (Order #${order.orderNumber})`;
  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #2e7d32;">Your Order is Shipped!</h2><p>Namaste ${name},</p><p>Great news! Your Order #${order.orderNumber} has been shipped.</p>${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}${order.courierName || order.carrier ? `<p><strong>Courier:</strong> ${order.courierName || order.carrier}</p>` : ''}${order.trackingUrl || order.shippingLink ? `<p><strong>Track Here:</strong> <a href="${order.trackingUrl || order.shippingLink}">Track Order</a></p>` : ''}<p>Blessings,<br/>Aura Rudraksha Team</p></div>`;
  const text = `Your Order is Shipped!\nNamaste ${name},\nYour Order #${order.orderNumber} has been shipped.\nBlessings, Aura Rudraksha Team`;

  const phone = order.customerPhone || order.phone || order.shippingAddress?.phone || null;
  const trackLink = order.trackingUrl || order.shippingLink || "your order dashboard";
  const smsMessage = `Aura Rudraksha: Order #${order.orderNumber} has shipped. Track: ${trackLink}`;

  return sendNotificationIdempotent({
    key: `ORDER_SHIPPED_${order.orderNumber}`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}

export async function sendOrderDeliveredEmail({ to, name, order }) {
  const subject = `Order Delivered - Aura Rudraksha (Order #${order.orderNumber})`;
  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #2e7d32;">Your Order is Delivered!</h2><p>Namaste ${name},</p><p>Your Order #${order.orderNumber} has been successfully delivered.</p><p>We hope you experience the divine blessings of your authentic Rudraksha.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>`;
  const text = `Your Order is Delivered!\nNamaste ${name},\nYour Order #${order.orderNumber} has been successfully delivered.\nBlessings, Aura Rudraksha Team`;

  const phone = order.customerPhone || order.phone || order.shippingAddress?.phone || null;
  const smsMessage = `Aura Rudraksha: Order #${order.orderNumber} has been delivered. Thank you for shopping with Aura Rudraksha.`;

  return sendNotificationIdempotent({
    key: `ORDER_DELIVERED_${order.orderNumber}`,
    toEmail: to,
    toPhone: phone,
    subject, text, html, smsMessage
  });
}

export async function sendBulkEmail({ toList, subject, htmlContent, textContent }) {
  if (await isBrevoConfigured()) {
    return sendBrevoEmail({ to: toList, subject, htmlContent, textContent });
  }
  let recipients = Array.isArray(toList) ? toList.join(', ') : toList;
  return sendTransactionalEmail(recipients, subject, textContent, htmlContent);
}

export async function sendSupportTicketCreatedEmail({ to, name, ticket }) {
  const subject = `Support Ticket Created - Aura Rudraksha (#${ticket.ticketId})`;
  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #a54d2b;">Ticket Received</h2><p>Namaste ${name},</p><p>We have received your support request.</p><p><strong>Ticket ID:</strong> ${ticket.ticketId}</p><p><strong>Subject:</strong> ${ticket.subject || 'General Inquiry'}</p><p>Our team will get back to you shortly.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>`;
  const text = `Ticket Received\nNamaste ${name},\nWe have received your support request. Ticket ID: ${ticket.ticketId}\nBlessings, Aura Rudraksha Team`;

  return sendNotificationIdempotent({
    key: `TICKET_CREATED_${ticket.ticketId}`,
    toEmail: to,
    subject, text, html
  });
}

export async function sendSupportTicketReplyEmail({ to, name, ticket, reply }) {
  const subject = `Re: Support Ticket #${ticket.ticketId} - Aura Rudraksha`;
  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #a54d2b;">Ticket Update</h2><p>Namaste ${name},</p><p>Our support team has replied to your ticket #${ticket.ticketId}.</p><div style="padding: 15px; background: #f9f9f9; border-left: 4px solid #a54d2b; margin: 15px 0;">${reply}</div><p>Blessings,<br/>Aura Rudraksha Team</p></div>`;
  const text = `Ticket Update\nNamaste ${name},\nOur support team has replied to your ticket #${ticket.ticketId}.\n\n${reply}\n\nBlessings, Aura Rudraksha Team`;

  return sendNotificationIdempotent({
    key: `TICKET_REPLY_${ticket.ticketId}_${Date.now()}`,
    toEmail: to,
    subject, text, html
  });
}
