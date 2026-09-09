import fs from 'fs';

let content = fs.readFileSync('server/controllers/settingController.js', 'utf8');
if (!content.includes('NotificationEvent')) {
  content = content.replace(
    'import { Ticket } from "../models/Ticket.js";',
    'import { Ticket } from "../models/Ticket.js";\nimport { NotificationEvent } from "../models/NotificationEvent.js";'
  );
}

// Inject into getAnalytics
if (!content.includes('notificationStats')) {
  content = content.replace(
    'const tickets = await Ticket.countDocuments({});',
    `const tickets = await Ticket.countDocuments({});\n    const emailSent = await NotificationEvent.countDocuments({ channel: 'email' });\n    const smsSent = await NotificationEvent.countDocuments({ channel: 'sms' });\n    const emailDelivered = await NotificationEvent.countDocuments({ channel: 'email', event: 'delivered' });\n    const smsDelivered = await NotificationEvent.countDocuments({ channel: 'sms', event: 'delivered' });\n    const emailFailed = await NotificationEvent.countDocuments({ channel: 'email', event: { $in: ['bounce', 'hard_bounce', 'blocked', 'invalid', 'error'] } });\n    const smsFailed = await NotificationEvent.countDocuments({ channel: 'sms', event: { $in: ['soft_bounce', 'hard_bounce', 'rejected', 'error'] } });\n    const notificationStats = { emailSent, smsSent, emailDelivered, smsDelivered, emailFailed, smsFailed };`
  );
  
  content = content.replace(
    'res.json({ success: true, ',
    'res.json({ success: true, notificationStats, '
  );
  fs.writeFileSync('server/controllers/settingController.js', content);
  console.log("Patched getAnalytics");
} else {
  console.log("Already patched");
}
