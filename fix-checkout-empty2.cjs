const fs = require('fs');
let content = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');

const targetStr = `  return (
    <Shell>`;

if (content.includes(targetStr)) {
  const replacement = `  if (lines.length === 0) {
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "80px", textAlign: "center", paddingTop: "60px" }}>
          <h2>Your cart is empty</h2>
          <p style={{marginTop: 10, color: '#806f62'}}>Please add items to your cart before proceeding to checkout.</p>
          <button className="primary-btn" style={{marginTop: 20}} onClick={() => navigate("/shop")}>Explore Collection</button>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>`;
  content = content.replace(targetStr, replacement);
  fs.writeFileSync('src/pages/Checkout.jsx', content);
  console.log("Fixed Checkout empty state!");
} else {
  console.log("String not found");
}
