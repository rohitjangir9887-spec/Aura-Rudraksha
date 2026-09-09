import fs from 'fs';

let content = fs.readFileSync('server/controllers/orderController.js', 'utf8');

// Ensure email functions are imported
if (!content.includes('sendOrderConfirmationEmail')) {
    content = content.replace(
        'import { recordCustomerOrder }',
        'import { sendOrderConfirmationEmail, sendOrderCancelledEmail, sendOrderShippedEmail, sendOrderDeliveredEmail } from "../services/emailService.js";\nimport { recordCustomerOrder }'
    );
}

// Order confirmation on creation
const createEndStr = `const responsePayload = { success: true, data: created };`;
const createReplaceStr = `const responsePayload = { success: true, data: created };

    try {
      if (email) {
        await sendOrderConfirmationEmail({ to: email, name: name, order: created });
      }
    } catch (err) {
      console.error("[Email] Failed to send order confirmation:", err.message);
    }
`;
if (!content.includes('sendOrderConfirmationEmail({ to: email')) {
    content = content.replace(createEndStr, createReplaceStr);
}

// Order status changes
// We need to find where order status is updated. Usually in updateOrderStatus or similar
fs.writeFileSync('server/controllers/orderController.js', content);
console.log("Patched createOrder in orderController.js");
