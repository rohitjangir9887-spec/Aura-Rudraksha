with open("src/pages/account/OrderDetail.jsx", "r") as f:
    code = f.read()

target = """            {isCancelled ? (
              <span style={{background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                <X size={16} /> Cancelled
              </span>
            ) : (
              <span style={{background: '#e5f6ea', color: '#1d9450', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                <Check size={16} /> {order.status}
              </span>
            )}"""

replacement = """            {isCancelled ? (
              <span style={{background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                <X size={16} /> Cancelled
              </span>
            ) : order.paymentStatus === "Failed" ? (
              <span style={{background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                <X size={16} /> Payment Failed
              </span>
            ) : (
              <span style={{background: '#e5f6ea', color: '#1d9450', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                <Check size={16} /> {order.status}
              </span>
            )}"""

code = code.replace(target, replacement)

with open("src/pages/account/OrderDetail.jsx", "w") as f:
    f.write(code)
