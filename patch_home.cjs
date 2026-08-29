const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const newHero = `
    {/* Desktop Hero (Hidden on Mobile) */}
    <section 
      className="hero premium-slider desktop-hero"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="hero-slides">
        {banners.map((src, i) => (
          <img 
            key={i} 
            src={src} 
            alt={\`Ad Banner \${i + 1}\`} 
            className={\`hero-slide \${i === hero ? 'active' : ''}\`} 
          />
        ))}
      </div>
      {banners.length > 1 && (
        <div className="hero-pagination">
          {banners.map((_, i) => (
            <span key={i} className={\`dot \${i === hero ? 'active' : ''}\`} onClick={() => setHero(i)}></span>
          ))}
        </div>
      )}
    </section>

    {/* Mobile Editorial Hero (Hidden on Desktop) */}
    <section className="mobile-editorial-hero">
      <div className="meh-left-card">
        <img src="https://aurarudraksha.com/wp-content/uploads/2023/11/DSC_0128.jpg" alt="Rudraksha" className="meh-bg-img" />
        <div className="meh-left-content">
          <h2 className="meh-title">Rudraksha</h2>
          <p className="meh-subtitle">Sacred. Natural. Powerful.</p>
          <Link to="/shop" className="meh-explore-btn">Explore Collection &rarr;</Link>
        </div>
      </div>
      <div className="meh-right-column">
        <Link to="/shop" className="meh-right-card">
          <div className="meh-badge">Product of the Month</div>
          <img src="https://aurarudraksha.com/wp-content/uploads/2024/02/IMG_1020.jpg" alt="Gold-Plated Karungali Mala" className="meh-product-img" />
          <div className="meh-details">
            <h3>Gold-Plated Karungali Mala with Hanuman Kavach Pendant</h3>
            <div className="meh-pricing">
              <span className="meh-price">₹899</span>
              <span className="meh-mrp">₹1,499</span>
            </div>
            <span className="meh-discount">40% OFF</span>
            <div className="meh-view-link">View Product &rarr;</div>
          </div>
        </Link>

        <Link to="/shop" className="meh-right-card">
          <img src="https://aurarudraksha.com/wp-content/uploads/2023/11/DSC_0129.jpg" alt="11 Mukhi Rudraksha" className="meh-product-img" />
          <div className="meh-details">
            <h3>11 Mukhi Rudraksha</h3>
            <div className="meh-pricing">
              <span className="meh-price">₹1,699</span>
              <span className="meh-mrp">₹2,499</span>
            </div>
            <span className="meh-discount">32% OFF</span>
            <div className="meh-view-link">View Product &rarr;</div>
          </div>
        </Link>
      </div>
    </section>
`;

content = content.replace(
  /<section\s+className="hero premium-slider"[\s\S]*?<\/section>/,
  newHero
);

fs.writeFileSync('src/pages/Home.jsx', content);
