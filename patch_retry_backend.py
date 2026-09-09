with open("server/controllers/paymentController.js", "r") as f:
    code = f.read()

target = """    if (order.paymentStatus === "Refunded") {
      return res.status(400).json({ success: false, message: "Cannot retry payment on a refunded order." });
    }

    // Reactivate order status if it was pending or cancelled due to unpaid checkout
    if (order.status === "Cancelled" && order.paymentStatus !== "Paid") {
      order.status = "Pending";
    }"""

replacement = """    if (order.paymentStatus === "Refunded") {
      return res.status(400).json({ success: false, message: "Cannot retry payment on a refunded order." });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Cannot retry payment on a cancelled order." });
    }"""

code = code.replace(target, replacement)

with open("server/controllers/paymentController.js", "w") as f:
    f.write(code)
