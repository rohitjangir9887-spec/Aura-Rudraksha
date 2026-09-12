const fs = require('fs');
let content = fs.readFileSync('src/styles.css', 'utf8');

const newCSS = `

/* MOBILE EDITORIAL HERO */
.desktop-hero {
  display: block;
}

.mobile-editorial-hero {
  display: none;
}

@media (max-width: 768px) {
  .desktop-hero {
    display: none !important;
  }

  .mobile-editorial-hero {
    display: flex;
    gap: 10px;
    padding: 12px;
    width: 100%;
    box-sizing: border-box;
    align-items: stretch;
    background: #faf7f2; /* warm ivory/cream background */
  }

  .meh-left-card {
    flex: 0 0 58%;
    position: relative;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .meh-bg-img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
  }

  /* overlay for readability */
  .meh-left-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(74, 48, 34, 0.9) 0%, rgba(74, 48, 34, 0.2) 60%, transparent 100%);
    z-index: 2;
  }

  .meh-left-content {
    position: relative;
    z-index: 3;
    padding: 16px;
    color: #fff;
  }

  .meh-title {
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 4px 0;
    line-height: 1.1;
    color: #fcebd1;
  }

  .meh-subtitle {
    font-size: 13px;
    margin: 0 0 16px 0;
    opacity: 0.9;
  }

  .meh-explore-btn {
    display: inline-block;
    padding: 8px 16px;
    background: #cf9b5b; /* gold accent */
    color: #2b1c13; /* deep brown */
    text-decoration: none;
    border-radius: 20px;
    font-weight: 600;
    font-size: 12px;
    letter-spacing: 0.5px;
  }

  .meh-right-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .meh-right-card {
    flex: 1;
    background: #fff;
    border-radius: 14px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: #333;
    position: relative;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    border: 1px solid rgba(139, 94, 52, 0.1);
  }

  .meh-badge {
    position: absolute;
    top: 6px;
    left: 6px;
    background: #b58039;
    color: #fff;
    font-size: 9px;
    font-weight: bold;
    padding: 3px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    z-index: 2;
  }

  .meh-product-img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .meh-details {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .meh-details h3 {
    font-size: 12px;
    line-height: 1.3;
    margin: 0 0 6px 0;
    font-weight: 600;
    color: #4a3022;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .meh-pricing {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }

  .meh-price {
    font-weight: 700;
    font-size: 13px;
    color: #b58039;
  }

  .meh-mrp {
    font-size: 11px;
    text-decoration: line-through;
    color: #999;
  }

  .meh-discount {
    font-size: 10px;
    color: #10b981;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .meh-view-link {
    margin-top: auto;
    font-size: 11px;
    font-weight: 600;
    color: #cf9b5b;
  }
}
`;

content += newCSS;

fs.writeFileSync('src/styles.css', content);
