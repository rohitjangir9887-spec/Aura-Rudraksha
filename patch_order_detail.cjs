const fs = require('fs');
let content = fs.readFileSync('src/pages/account/OrderDetail.jsx', 'utf-8');

content = content.replace(
  /\{order\.mihpayid && \([\s\S]*?PayU Payment ID:[\s\S]*?\{order\.mihpayid\} <Copy size=\{10\} \/>\n\s*<\/code>\n\s*<\/span>\n\s*\)\}/m,
  `<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  PayU Payment ID:
                  {order.mihpayid ? (
                    <code 
                      onClick={() => {
                        navigator.clipboard.writeText(order.mihpayid);
                        emitToast("PayU Payment ID copied to clipboard!", "success");
                      }}
                      title="Click to copy"
                      style={{ fontFamily: "monospace", background: "#ffffff", padding: "1px 5px", borderRadius: "4px", border: "1px solid #e8dac9", cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                    >
                      {order.mihpayid} <Copy size={10} />
                    </code>
                  ) : (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>N/A (Not Captured)</span>
                  )}
                </span>`
);

fs.writeFileSync('src/pages/account/OrderDetail.jsx', content);
