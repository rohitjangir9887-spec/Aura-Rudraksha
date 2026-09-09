import fs from 'fs';

let content = fs.readFileSync('server/controllers/orderController.js', 'utf8');

const regex = /(const updated = await Order\.findByIdAndUpdate\(existing\._id,\s*\{ \$set: updateFields \},\s*\{ returnDocument: "after" \}\);)/;

const replaceStr = `$1

    try {
      if (updated && updateFields && Object.keys(updateFields).length > 0) {
        const email = updated.customerEmail || updated.email || updated.shippingAddress?.email;
        const name = updated.customerName || updated.firstName || 'Customer';
        
        if (email) {
          if (updateFields.orderStatus && existing.orderStatus !== updateFields.orderStatus) {
            if (updateFields.orderStatus === 'Cancelled' || updateFields.status === 'Cancelled') {
              await sendOrderCancelledEmail({ to: email, name, order: updated });
            } else if (updateFields.orderStatus === 'Shipped') {
              await sendOrderShippedEmail({ to: email, name, order: updated });
            } else if (updateFields.orderStatus === 'Delivered') {
              await sendOrderDeliveredEmail({ to: email, name, order: updated });
            }
          }
        }
      }
    } catch (err) {
      console.error("[Email] Error sending status update email:", err.message);
    }
`;

content = content.replace(regex, replaceStr);

fs.writeFileSync('server/controllers/orderController.js', content);
console.log("Patched updateOrder in orderController.js");
