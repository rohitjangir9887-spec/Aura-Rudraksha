const fs = require('fs');
let code = fs.readFileSync('src/components/checkout/CheckoutItemsReview.jsx', 'utf8');

const target = `                {/* Quantity Controls & Line Total */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                  <div 
                    style={{
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid #d4c5b9",
                      borderRadius: "6px",
                      background: "#ffffff",
                      height: "26px"
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => onUpdateQty && onUpdateQty(line.id, Math.max(1, line.qty - 1))}
                      style={{
                        background: "none",
                        border: "none",
                        width: "24px",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#4a3528"
                      }}
                    >
                      <Minus size={11} />
                    </button>
                    <span style={{ fontSize: "12px", fontWeight: "700", padding: "0 6px", color: "#2b170d", minWidth: "16px", textAlign: "center" }}>
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => onUpdateQty && onUpdateQty(line.id, line.qty + 1)}
                      style={{
                        background: "none",
                        border: "none",
                        width: "24px",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#4a3528"
                      }}
                    >
                      <Plus size={11} />
                    </button>
                  </div>`;

const replacement = `                {/* Quantity & Line Total */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                  <div style={{ fontSize: "12.5px", color: "#736257", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>Qty:</span>
                    <span style={{ color: "#2b170d", fontWeight: "700" }}>{line.qty}</span>
                  </div>`;

if (code.includes(target)) {
  fs.writeFileSync('src/components/checkout/CheckoutItemsReview.jsx', code.replace(target, replacement));
  console.log('Patched successfully');
} else {
  console.log('Target not found!');
}
