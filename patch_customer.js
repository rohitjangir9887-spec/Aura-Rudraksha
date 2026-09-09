import fs from 'fs';

let content = fs.readFileSync('server/controllers/customerController.js', 'utf8');
if (!content.includes('sendWelcomeEmail')) {
    content = content.replace(
        'import { Order } from "../models/Order.js";',
        'import { Order } from "../models/Order.js";\nimport { sendWelcomeEmail } from "../services/emailService.js";'
    );
    
    // In syncUser
    content = content.replace(
        `const newCust = await Customer.create(`,
        `const newCust = await Customer.create(`
    );
    // Let's just find the exact block for syncUser creation
    const findStr = `const newCust = await Customer.create({
      id,
      authUserId,
      role: isInitialAdmin ? "admin" : "customer",
      name: resolvedName,
      email: userEmail || "",
      phone: userPhone ? (normalizePhoneNumber(userPhone) || userPhone) : "",
      avatar: googleAvatar || "",
      lastLoginAt: new Date(),
      lastSeen: now,
      firstSeen: now,
      visits: 1
    });`;
    
    const replaceStr = findStr + `\n\n    if (userEmail) {
      sendWelcomeEmail({ to: userEmail, name: resolvedName }).catch(err => console.error('Failed to send welcome email', err));
    }`;
    
    content = content.replace(findStr, replaceStr);
    
    fs.writeFileSync('server/controllers/customerController.js', content);
    console.log("Patched customerController.js");
}
