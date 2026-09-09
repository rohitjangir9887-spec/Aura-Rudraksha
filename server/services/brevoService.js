import { BrevoClient } from '@getbrevo/brevo';

const getBrevoKey = () => (process.env.BREVO_API_KEY || "").trim();

export async function isBrevoConfigured() {
  return !!getBrevoKey();
}

let _brevoClient = null;
function getClient() {
  if (!_brevoClient) {
    const apiKey = getBrevoKey();
    if (!apiKey) throw new Error("BREVO_API_KEY is not configured");
    _brevoClient = new BrevoClient({ apiKey });
  }
  return _brevoClient;
}

export async function sendBrevoEmail({ to, subject, htmlContent, textContent, replyTo }) {
  const brevo = getClient();

  let toList = [];
  if (Array.isArray(to)) {
    toList = to.map(t => typeof t === "string" ? { email: t } : t);
  } else if (typeof to === "string") {
    toList = to.split(",").map(e => ({ email: e.trim() }));
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.NODEMAILER_USER || "support@aurarudraksha.com";
  const senderName = process.env.BREVO_SENDER_NAME || "Aura Rudraksha";

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: toList,
    subject,
  };

  if (htmlContent) payload.htmlContent = htmlContent;
  if (textContent) payload.textContent = textContent;

  if (replyTo) {
    payload.replyTo = { email: replyTo };
  } else if (process.env.BREVO_REPLY_TO_EMAIL || process.env.NODEMAILER_USER) {
    payload.replyTo = { email: process.env.BREVO_REPLY_TO_EMAIL || process.env.NODEMAILER_USER };
  }

  try {
    const result = await brevo.transactionalEmails.sendTransacEmail(payload);
    console.log(`[Brevo Email] Sent email '${subject}' - messageId: ${result.messageId}`);
    return { success: true, messageId: result.messageId, provider: "brevo" };
  } catch (error) {
    console.error("[Brevo Email Error]", error);
    throw new Error(`Brevo Email API Error: ${error.message || error}`);
  }
}

export async function sendBrevoSms({ to, message }) {
  const brevo = getClient();

  let phone = to.toString().trim();
  if (/^\d{10}$/.test(phone)) {
    phone = "+91" + phone;
  } else if (phone.startsWith("91") && phone.length === 12) {
    phone = "+" + phone;
  } else if (phone.startsWith("0") && phone.length === 11) {
    phone = "+91" + phone.substring(1);
  }
  
  if (!phone.startsWith("+")) {
     console.warn(`[Brevo SMS] Phone number ${phone} might be missing country code.`);
  }

  const sender = process.env.BREVO_SMS_SENDER || "AURA"; 

  const payload = {
    type: "transactional",
    sender,
    recipient: phone,
    content: message
  };

  try {
    const result = await brevo.transactionalSms.sendTransacSms(payload);
    console.log(`[Brevo SMS] Sent to ${phone} - reference: ${result.reference}`);
    return { success: true, messageId: result.reference, provider: "brevo" };
  } catch (error) {
    console.error("[Brevo SMS Error]", error);
    throw new Error(`Brevo SMS API Error: ${error.message || error}`);
  }
}
