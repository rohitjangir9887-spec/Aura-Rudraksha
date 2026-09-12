with open("src/pages/PaymentResult.jsx", "r") as f:
    code = f.read()

target = """        // If query param indicated success or processing, but server state transition is mid-flight, poll with backoff
        if (res?.data?.paymentStatus !== "Paid" && (status === "success" || status === "processing")) {
          const delays = [1500, 2000, 2500, 3000];
          for (const delay of delays) {
            await new Promise((r) => setTimeout(r, delay));
            res = await db.verifyPayment(orderId, txnid, guestToken);
            if (res?.data?.paymentStatus === "Paid") break;
          }
        }"""

replacement = """        // If query param indicated success or processing, but server state transition is mid-flight, poll quickly
        if (res?.data?.paymentStatus !== "Paid" && (status === "success" || status === "processing")) {
          const delays = [500, 1000]; // drastically reduced wait times
          for (const delay of delays) {
            await new Promise((r) => setTimeout(r, delay));
            res = await db.verifyPayment(orderId, txnid, guestToken);
            if (res?.data?.paymentStatus === "Paid") break;
          }
        }"""

code = code.replace(target, replacement)
with open("src/pages/PaymentResult.jsx", "w") as f:
    f.write(code)
