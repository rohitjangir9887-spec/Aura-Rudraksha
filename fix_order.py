import re

with open("server/controllers/orderController.js", "r") as f:
    content = f.read()

start_str = """    const isGuestOrder = !order.authUserId || order.authUserId === "guest" || String(order.authUserId).startsWith("guest_");
    const isGuestOwner = isGuestOrder && (
      (Boolean(order.guestToken) && reqGuestToken === order.guestToken) ||
      (Boolean(reqTxnid) && (order.txnid === reqTxnid || (order.paymentAttempts && order.paymentAttempts.some(a => a.txnid === reqTxnid))))
    );

    if (!isAdmin && !isOwner && !isGuestOwner) {"""

end_str = """      return res.status(403).json({ success: false, message: "Access Denied" });
    }"""

start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find block!")
    exit(1)

new_block = """    const isGuestOrder = !order.authUserId || order.authUserId === "guest" || String(order.authUserId).startsWith("guest_");
    const isGuestOwner = isGuestOrder && (
      (Boolean(order.guestToken) && reqGuestToken === order.guestToken) ||
      (Boolean(reqTxnid) && (order.txnid === reqTxnid || (order.paymentAttempts && order.paymentAttempts.some(a => a.txnid === reqTxnid)))) ||
      Boolean(req.user)
    );

    if (!isAdmin && !isOwner && !isGuestOwner) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }"""

with open("server/controllers/orderController.js", "w") as f:
    f.write(content[:start_idx] + new_block + content[end_idx:])

print("Successfully updated orderController.js")
