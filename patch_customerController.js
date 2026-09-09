import fs from 'fs';

let content = fs.readFileSync('server/controllers/customerController.js', 'utf8');

const importStr = `import { sendBrevoSms } from "../services/brevoService.js";`;

content = content.replace(
  'import { sendWelcomeEmail, sendBulkEmail } from "../services/emailService.js";',
  `import { sendWelcomeEmail, sendBulkEmail } from "../services/emailService.js";\n${importStr}`
);

const smsFn = `
export async function sendAdminSms(req, res, next) {
  try {
    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (req.user?.authUserId ? await hasAdminRole(req.user.authUserId) : false);
    
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { target, customerIds, message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    let recipients = [];

    if (target === 'all') {
      const customers = await Customer.find({ phone: { $exists: true, $ne: "" } }).select('phone').lean();
      recipients = customers.map(c => c.phone);
    } else if (target === 'selected' && Array.isArray(customerIds) && customerIds.length > 0) {
      const customers = await Customer.find({ id: { $in: customerIds }, phone: { $exists: true, $ne: "" } }).select('phone').lean();
      recipients = customers.map(c => c.phone);
    } else if (target === 'viewing' && customerIds) {
       const c = await Customer.findOne({ id: String(customerIds) }).select('phone').lean();
       if (c && c.phone) recipients.push(c.phone);
    }

    // Filter out invalid phones
    recipients = recipients.filter(p => !!p);

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: "No valid phone numbers found for the selected customers." });
    }

    // Rate limiting for SMS (e.g. max 50 at once to avoid blocking)
    if (recipients.length > 50) {
      return res.status(400).json({ success: false, message: "Cannot send SMS to more than 50 recipients at once." });
    }

    let successCount = 0;
    let failCount = 0;

    // Send sequentially or chunks
    for (const phone of recipients) {
       try {
          await sendBrevoSms({ to: phone, message });
          successCount++;
       } catch (err) {
          console.error("Failed to send admin SMS to", phone, err.message);
          failCount++;
       }
    }

    return res.json({ success: true, message: \`SMS sent successfully to \${successCount} recipients (\${failCount} failed).\`, successCount, failCount });

  } catch (error) {
    console.error("Error sending admin SMS:", error);
    next(error);
  }
}
`;

content += `\n${smsFn}\n`;

fs.writeFileSync('server/controllers/customerController.js', content);
console.log("Patched customerController.js");
