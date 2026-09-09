with open("src/pages/account/Orders.jsx", "r") as f:
    code = f.read()

target1 = """{!isPaid && !isRefunded && (
                              <button
                                type="button"
                                className="aura-order-btn-primary"
                                disabled={retryingOrderId === o.id}
                                onClick={() => handleRetryPayment(o.id)}"""
replacement1 = """{!isPaid && !isRefunded && !isCancelled && (
                              <button
                                type="button"
                                className="aura-order-btn-primary"
                                disabled={retryingOrderId === o.id}
                                onClick={() => handleRetryPayment(o.id)}"""

code = code.replace(target1, replacement1)

with open("src/pages/account/Orders.jsx", "w") as f:
    f.write(code)

with open("src/pages/account/OrderDetail.jsx", "r") as f:
    code2 = f.read()

target2 = """          {/* If unpaid, provide live Retry PayU button */}
          {order?.paymentStatus !== "Paid" && order?.paymentStatus !== "Refunded" && ("""
replacement2 = """          {/* If unpaid, provide live Retry PayU button */}
          {order?.paymentStatus !== "Paid" && order?.paymentStatus !== "Refunded" && order?.status !== "Cancelled" && ("""

code2 = code2.replace(target2, replacement2)

with open("src/pages/account/OrderDetail.jsx", "w") as f:
    f.write(code2)
