import fs from "fs";
let content = fs.readFileSync("src/pages/admin/AdminProducts.jsx", "utf8");

const lines = content.split('\n');

const newColumn = `                      <td>
                        <span style={{ fontSize: "12px", color: p.freeShipping === false ? "#991b1b" : "#1d9450", fontWeight: "600" }}>
                          {p.freeShipping === false ? \`₹\${p.shippingFee}\` : "Free"}
                        </span>
                        <div style={{ marginTop: 4 }}>
                          <button 
                            type="button" 
                            onClick={(e) => {
                                e.stopPropagation();
                                const currentFee = p.freeShipping === false ? p.shippingFee : 0;
                                const feeInput = window.prompt(\`Enter delivery fee for \${p.name} (Enter 0 for Free Delivery):\`, currentFee);
                                if (feeInput !== null) {
                                  const fee = Number(feeInput);
                                  if (!isNaN(fee)) {
                                    db.updateProduct(p.id, { 
                                      freeShipping: fee === 0, 
                                      shippingFee: fee 
                                    }).then(() => {
                                      setProducts([...db.getProducts()]);
                                    });
                                  }
                                }
                            }}
                            style={{ fontSize: "10px", padding: "2px 6px", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "4px", cursor: "pointer", color: "#4f46e5" }}
                          >
                            Update
                          </button>
                        </div>
                      </td>`;

lines.splice(1338, 0, newColumn);

content = lines.join('\n');

content = content.replace(
  `<th>Price</th>\n                  <th>Stock</th>`,
  `<th>Price</th>\n                  <th>Delivery</th>\n                  <th>Stock</th>`
);

fs.writeFileSync("src/pages/admin/AdminProducts.jsx", content);
