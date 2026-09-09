import fs from 'fs';

let content = fs.readFileSync('server/controllers/customerController.js', 'utf8');

// Ensure email functions are imported
if (!content.includes('sendBulkEmail')) {
    content = content.replace(
        'import { sendWelcomeEmail } from "../services/emailService.js";',
        'import { sendWelcomeEmail, sendBulkEmail } from "../services/emailService.js";'
    );
}

const sendAdminEmailFunc = `
export async function sendAdminEmail(req, res, next) {
  try {
    const { isInitialAdmin } = isAdminUser(req.user);
    const isAdmin = isInitialAdmin || (req.user?.authUserId ? await hasAdminRole(req.user.authUserId) : false);
    
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { target, customerIds, subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: "Subject and message are required" });
    }

    let recipients = [];

    if (target === 'all') {
      const customers = await Customer.find({ email: { $exists: true, $ne: "" } }).select('email').lean();
      recipients = customers.map(c => c.email);
    } else if (target === 'selected' && Array.isArray(customerIds) && customerIds.length > 0) {
      const customers = await Customer.find({ id: { $in: customerIds }, email: { $exists: true, $ne: "" } }).select('email').lean();
      recipients = customers.map(c => c.email);
    } else {
      return res.status(400).json({ success: false, message: "Invalid target or empty customer list" });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: "No valid email addresses found for the selected customers" });
    }

    // Rate limiting / safety check: If it's a huge list, might want to limit or batch, but let's just send it
    if (recipients.length > 500) {
       return res.status(400).json({ success: false, message: "Cannot send to more than 500 recipients at once." });
    }

    const htmlContent = \`
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        \${message.replace(/\\n/g, '<br/>')}
      </div>
    \`;

    // sendBulkEmail takes { toList, subject, htmlContent, textContent }
    await sendBulkEmail({ 
      toList: recipients, 
      subject, 
      htmlContent, 
      textContent: message 
    });

    return res.json({ success: true, message: \`Email sent to \${recipients.length} recipients successfully\` });
  } catch (err) {
    next(err);
  }
}
`;

if (!content.includes('export async function sendAdminEmail')) {
    content += '\n' + sendAdminEmailFunc;
    fs.writeFileSync('server/controllers/customerController.js', content);
    console.log("Patched sendAdminEmail in customerController.js");
}
