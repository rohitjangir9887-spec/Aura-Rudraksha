
const getBrevoKey = () => (process.env.BREVO_API_KEY || "").trim();

export async function isBrevoConfigured() {
  return !!getBrevoKey();
}

export async function sendBrevoEmail({ to, subject, htmlContent, textContent, replyTo }) {
  const apiKey = getBrevoKey();
  if (!apiKey) throw new Error("BREVO_API_KEY is not configured");

  // to can be a string, array, or object
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
    htmlContent: htmlContent || undefined,
    textContent: textContent || undefined
  };

  if (replyTo) {
    payload.replyTo = { email: replyTo };
  } else if (process.env.BREVO_REPLY_TO_EMAIL || process.env.NODEMAILER_USER) {
    payload.replyTo = { email: process.env.BREVO_REPLY_TO_EMAIL || process.env.NODEMAILER_USER };
  }

  // Use global fetch (available in Node 18+)
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[Brevo Email Error]", errorBody);
    throw new Error(`Brevo Email API Error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`[Brevo Email] Sent email '${subject}' - messageId: ${result.messageId}`);
  return { success: true, messageId: result.messageId, provider: "brevo" };
}

export async function sendBrevoSms({ to, message }) {
  const apiKey = getBrevoKey();
  if (!apiKey) throw new Error("BREVO_API_KEY is not configured");

  let phone = to.toString().trim();
  // Basic normalization for India: if 10 digits, prepend +91
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

  // Brevo transactional SMS sender should be alphanumeric up to 11 chars
  const sender = process.env.BREVO_SMS_SENDER || "AURA"; 

  const payload = {
    type: "transactional",
    sender,
    recipient: phone,
    content: message
  };

  const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[Brevo SMS Error]", errorBody);
    throw new Error(`Brevo SMS API Error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`[Brevo SMS] Sent to ${phone} - reference: ${result.reference}`);
  return { success: true, messageId: result.reference, provider: "brevo" };
}
