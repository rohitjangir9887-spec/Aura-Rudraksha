import nodemailer from "nodemailer";

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

  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
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
        from: `"Aura Rudraksha Security" <${process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "security@aurarudraksha.bond"}>`,
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
