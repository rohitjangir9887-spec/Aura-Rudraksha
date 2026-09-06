const fs = require('fs');
let code = fs.readFileSync('src/components/checkout/CheckoutItemsReview.jsx', 'utf8');

const target2 = `                  {/* Savings tag */}
                  {unitSavings > 0 && (
                    <div style={{ fontSize: "10.5px", color: "#166534", fontWeight: "600", marginBottom: "4px" }}>
                      ✓ Save {money(unitSavings * line.qty)}
                    </div>
                  )}`;

if (code.includes(target2)) {
  fs.writeFileSync('src/components/checkout/CheckoutItemsReview.jsx', code.replace(target2, ''));
  console.log('Patched savings tag successfully');
} else {
  console.log('Target2 not found!');
}
