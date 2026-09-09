import fs from 'fs';

let content = fs.readFileSync('server/controllers/orderController.js', 'utf8');

// Inside getOrderById
const targetStr = `order = normalizeOrderState(order);`;

const replaceStr = `order = normalizeOrderState(order);
    
    // Timeout check for pending orders (20 minutes)
    if (order.paymentStatus === "Pending") {
      const orderDate = new Date(order.createdAt || order.date);
      const now = new Date();
      const diffMins = (now - orderDate) / (1000 * 60);
      if (diffMins > 20) {
        order.paymentStatus = "Failed";
        order.status = "Cancelled";
        order.orderStatus = "Cancelled";
        
        // Also update in DB lazily without awaiting to not block read
        Order.updateOne(
          { _id: order._id, paymentStatus: "Pending" },
          { $set: { paymentStatus: "Failed", status: "Cancelled", orderStatus: "Cancelled", cancelReason: "Payment timeout after 20 minutes" } }
        ).catch(err => console.error("Auto cancel timeout err", err));
      }
    }
`;

if (!content.includes('cancelReason: "Payment timeout')) {
    content = content.replace(targetStr, replaceStr);
    fs.writeFileSync('server/controllers/orderController.js', content);
    console.log("Patched getOrderById");
}
