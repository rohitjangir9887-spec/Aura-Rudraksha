const fs = require('fs');
const content = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('className="coupon-input-group"')) - 1;

let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  if (lines[i].includes(') : (')) {
    endIdx = i;
    break;
  }
}

const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx);

const premiumCouponUI = `                  <div className="cs-coupon-entry">
                    <div className="cs-coupon-input-group">
                      <Tag size={16} color="#806f62" />
                      <input 
                        className="coupon-input"
                        placeholder="Have a coupon code?" 
                        value={couponInput}
                        onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      />
                      <button type="button" className="coupon-btn" onClick={(e) => handleApplyCoupon(e)}>Apply</button>
                    </div>
                    {couponError && (
                      <div className="cs-error" style={{display:'flex', alignItems:'center', gap:'4px', color:'#c62828', fontSize:'11px', marginTop:'6px'}}><AlertCircle size={14}/> {couponError}</div>
                    )}

                    {availableCoupons.length > 0 && (
                      <div className="available-offers-section">
                        <div className="aos-title">Available Offers</div>
                        <div className="aos-list">
                          {availableCoupons.map(coupon => {
                            const minOrder = Number(coupon.minOrder) || 0;
                            const isLocked = subtotal < minOrder;
                            const shortfall = minOrder - subtotal;
                            
                            return (
                              <div className={\`avail-coupon-card \${isLocked ? 'locked' : 'unlocked'}\`} key={coupon.id || coupon.code}>
                                <div className="acc-left">
                                  <div className="acc-code">{coupon.code}</div>
                                  <div className="acc-desc">
                                    {coupon.type === 'percentage' ? \`Get \${coupon.discount}% OFF\` : \`Flat ₹\${coupon.discount} OFF\`}
                                  </div>
                                </div>
                                <div className="acc-right">
                                  {isLocked ? (
                                    <div className="acc-locked-msg">
                                      Add <b>₹\${shortfall}</b> more
                                    </div>
                                  ) : (
                                    <button type="button" className="acc-apply-btn" onClick={(e) => handleApplyCoupon(e, coupon.code)}>Apply</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>`;

if (startIdx > 0 && endIdx > startIdx) {
  const newContent = [...before, premiumCouponUI, ...after].join('\n');
  fs.writeFileSync('src/pages/Checkout.jsx', newContent);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find boundaries", startIdx, endIdx);
}
