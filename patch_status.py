with open("src/pages/account/Orders.jsx", "r") as f:
    code = f.read()

target = """                            <span className={`status ${isCancelled ? 'error' : isDelivered ? 'success' : 'pending'}`} style={{
                              background: isCancelled ? '#ffebee' : isDelivered ? '#e5f6ea' : '#fff3e0',
                              color: isCancelled ? '#c62828' : isDelivered ? '#1d9450' : '#b85d25',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10.5,
                              fontWeight: 700,
                              display: 'inline-block'
                            }}>
                              {o.status || "Confirmed"}
                            </span>"""

replacement = """                            <span className={`status ${isCancelled || isFailed ? 'error' : isDelivered ? 'success' : 'pending'}`} style={{
                              background: (isCancelled || isFailed) ? '#ffebee' : isDelivered ? '#e5f6ea' : '#fff3e0',
                              color: (isCancelled || isFailed) ? '#c62828' : isDelivered ? '#1d9450' : '#b85d25',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10.5,
                              fontWeight: 700,
                              display: 'inline-block'
                            }}>
                              {isFailed ? "Payment Failed" : (o.status || "Confirmed")}
                            </span>"""

code = code.replace(target, replacement)

with open("src/pages/account/Orders.jsx", "w") as f:
    f.write(code)
