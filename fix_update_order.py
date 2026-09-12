import re

with open("server/controllers/orderController.js", "r") as f:
    content = f.read()

start_str = """      if (data.status === "Cancelled" || data.orderStatus === "Cancelled") {
        if (!cancellableStatuses.includes(existing.orderStatus || existing.status)) {
          return res.status(400).json({
            success: false,
            message: `Order cannot be cancelled in '${existing.orderStatus || existing.status}' state.`
          });
        }
        updateFields.status = ORDER_STATES.CANCELLED;
        updateFields.orderStatus = ORDER_STATES.CANCELLED;
        updateFields.cancelledAt = new Date().toISOString();
        updateFields.cancelReason = String(data.cancelReason || "Cancelled by customer").trim();
        updateFields.cancelledBy = "Customer";

        // If customer cancels an already-paid order, flag for refund review
        if (existing.paymentStatus === PAYMENT_STATES.PAID) {
          updateFields.paymentStatus = PAYMENT_STATES.REFUND_PENDING;
          updateFields.refundDetails = {
            requestedAt: new Date().toISOString(),
            reason: updateFields.cancelReason,
            status: "Refund Pending Review"
          };
        }
      }"""

end_str = start_str

start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find block!")
    exit(1)

new_block = """      if (data.status === "Cancelled" || data.orderStatus === "Cancelled") {
        if (existing.paymentStatus === PAYMENT_STATES.PAID || existing.paymentStatus === "Refunded") {
          return res.status(400).json({
            success: false,
            message: "Paid orders cannot be cancelled via this endpoint. Please contact customer support for refund/cancellation."
          });
        }
        if (!cancellableStatuses.includes(existing.orderStatus || existing.status)) {
          return res.status(400).json({
            success: false,
            message: `Order cannot be cancelled in '${existing.orderStatus || existing.status}' state.`
          });
        }
        updateFields.status = ORDER_STATES.CANCELLED;
        updateFields.orderStatus = ORDER_STATES.CANCELLED;
        updateFields.cancelledAt = new Date().toISOString();
        updateFields.cancelReason = String(data.cancelReason || "Cancelled by customer").trim();
        updateFields.cancelledBy = "Customer";
        updateFields.paymentStatus = "Cancelled";
      }"""

with open("server/controllers/orderController.js", "w") as f:
    f.write(content[:start_idx] + new_block + content[end_idx:])

print("Successfully updated orderController.js for updateOrder")
