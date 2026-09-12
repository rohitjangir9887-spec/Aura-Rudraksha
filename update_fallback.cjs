const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const oldBlock = `{offers.length > 0 && (
      <section className="offers" >
        {offers.map((o, idx) => (
          <div key={o.id || idx} className={\`offer \${o.theme === 'light' || idx > 0 ? 'light' : ''}\`}>
            <div>
              <small>{o.discountText || o.label || "Special Offer"}</small>
              <h2>{o.title}</h2>
              <p>{o.description}</p>
              
              {o.expiry && <Countdown targetDate={o.expiry} />}
              
              {o.couponCode && (
                <div style={{ display: 'inline-block', background: '#fdf0e8', color: '#a54d2b', border: '1px dashed #a54d2b', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', marginBottom: '10px' }}>
                  Use Code: {o.couponCode}
                </div>
              )}
              
              <div>
                <Link to={o.link || "/shop"} className="primary-btn">
                  {o.ctaText || o.buttonText || "Shop Now"}
                </Link>
              </div>
            </div>
            {o.image && <img src={o.image} alt={o.title} onError={(e) => { e.target.src = "https://i.ibb.co/xKN0T46x/file-00000000b33082088625dc1f759658a4.png"; }} />}
          </div>
        ))}
      </section>
    )}`;

const newBlock = `<section className="offers">
      {offers.length === 0 ? (
        <div className="offer">
          <div>
            <small>Special Offer</small>
            <h2>Flat 20% OFF</h2>
            <p>On All Rudraksha</p>
            <Link to="/shop" className="primary-btn">Shop Now</Link>
          </div>
          <img src="https://i.ibb.co/xKN0T46x/file-00000000b33082088625dc1f759658a4.png" alt="Special Offer" />
        </div>
      ) : (
        offers.map((o, idx) => (
          <div key={o.id || idx} className={\`offer \${o.theme === 'light' || idx > 0 ? 'light' : ''}\`}>
            <div>
              <small>{o.discountText || o.label || "Special Offer"}</small>
              <h2>{o.title}</h2>
              <p>{o.description}</p>
              
              {o.expiry && <Countdown targetDate={o.expiry} />}
              
              {o.couponCode && (
                <div style={{ display: 'inline-block', background: '#fdf0e8', color: '#a54d2b', border: '1px dashed #a54d2b', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', marginBottom: '10px' }}>
                  Use Code: {o.couponCode}
                </div>
              )}
              
              <div>
                <Link to={o.link || "/shop"} className="primary-btn">
                  {o.ctaText || o.buttonText || "Shop Now"}
                </Link>
              </div>
            </div>
            {o.image && <img src={o.image} alt={o.title} onError={(e) => { e.target.src = "https://i.ibb.co/xKN0T46x/file-00000000b33082088625dc1f759658a4.png"; }} />}
          </div>
        ))
      )}
    </section>`;

if (content.includes("{offers.length > 0 && (\n      <section className=\"offers\" >")) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync('src/pages/Home.jsx', content);
  console.log("Updated fallback offer successfully.");
} else {
  console.log("Could not find the target block to replace.");
}
