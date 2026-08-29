const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const newHeader = `
    {/* Mobile Editorial Hero (Hidden on Desktop) */}
    <div className="mobile-editorial-hero-header">
      <div className="section-heading" style={{ marginBottom: '10px', marginTop: '10px' }}>
        <div><span>OUR COLLECTION</span><h2 style={{ fontSize: '28px' }}>Popular Collection</h2></div>
      </div>
    </div>
    <section className="mobile-editorial-hero">
`;

content = content.replace(
  /\{\/\* Mobile Editorial Hero \(Hidden on Desktop\) \*\/\}\s*<section className="mobile-editorial-hero">/,
  newHeader
);

fs.writeFileSync('src/pages/Home.jsx', content);

let cssContent = fs.readFileSync('src/styles.css', 'utf8');

cssContent += `
.mobile-editorial-hero-header {
  display: none;
}
@media (max-width: 768px) {
  .mobile-editorial-hero-header {
    display: block;
    background: #faf7f2;
    padding-top: 20px;
  }
}
`;
fs.writeFileSync('src/styles.css', cssContent);

