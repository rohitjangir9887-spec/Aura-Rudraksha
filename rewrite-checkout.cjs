const fs = require('fs');
let content = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');

// 1. Add availableCoupons state
content = content.replace(
  'const [paymentMethod, setPaymentMethod] = useState("cod");',
  'const [paymentMethod, setPaymentMethod] = useState("cod");\n  const [availableCoupons, setAvailableCoupons] = useState([]);'
);

// 2. Fetch coupons in useEffect
content = content.replace(
  'setProducts(db.getProducts());',
  'setProducts(db.getProducts());\n    setAvailableCoupons(db.getCoupons().filter(c => c.status === "Active"));'
);

// 3. Upgrade Layout classes
content = content.replace(
  'className="checkout-layout"',
  'className="cart-layout-premium"'
);

// 4. Upgrade Summary classes
content = content.replace(
  '<motion.aside \n              className="summary"',
  '<motion.aside \n              className="cart-summary-card"'
);

// 5. Replace Quick Test Chips and Coupon Box with Premium UI
const premiumCouponUI = `
                  <div className="cs-coupon-entry">
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
                      <div className="cs-error"><AlertCircle size={14}/> {couponError}</div>
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
                                    <button type="button" className="acc-apply-btn" onClick={() => handleApplyCoupon(null, coupon.code)}>Apply</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
`;

// Extract everything from <div className="coupon-input-group"> to {couponError ... }</div>
// We'll use a regex to replace the specific block.
const oldCouponStart = '<div>\\s*<div className="coupon-input-group">';
const oldCouponEnd = '</div>\\s*\\)\\s*:\\s*\\(';
const regex = new RegExp(oldCouponStart + '[\\\\s\\\\S]*?' + oldCouponEnd);
content = content.replace(regex, premiumCouponUI + '\\n                ) : (');

fs.writeFileSync('src/pages/Checkout.jsx', content);
