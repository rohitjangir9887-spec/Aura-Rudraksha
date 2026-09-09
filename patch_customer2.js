import fs from 'fs';

let content = fs.readFileSync('server/controllers/customerController.js', 'utf8');

const targetStr = `return {
      success: true,
      message: "User synchronized",
      data: newCust
    };`;

const replaceStr = `
    if (userEmail) {
      sendWelcomeEmail({ to: userEmail, name: resolvedName }).catch(err => console.error('Failed to send welcome email', err));
    }
    
    return {
      success: true,
      message: "User synchronized",
      data: newCust
    };`;
    
if (!content.includes('sendWelcomeEmail({ to: userEmail')) {
    content = content.replace(targetStr, replaceStr);
    fs.writeFileSync('server/controllers/customerController.js', content);
    console.log("Patched syncUser successfully");
}
