const fs = require('fs');
let code = fs.readFileSync('src/pages/Product.jsx', 'utf8');

// Find the state declarations and add the offer badge state
code = code.replace(/const \[activeTab, setActiveTab\] = useState\('description'\);/, 
`const [activeTab, setActiveTab] = useState('description');
  const [offerBadge, setOfferBadge] = useState(null);

  useEffect(() => {
    if (!p) return;
    const allBadges = db.getOffers().filter(o => o.offerType === 'badge' && o.status === 'Active');
    const validBadges = allBadges.filter(o => {
      if (o.expiry && new Date(o.expiry) < new Date()) return false;
      return true;
    });
    const matchingBadge = validBadges.find(o => o.applyTo === 'ALL' || o.applyTo === String(p.id));
    if (matchingBadge) setOfferBadge(matchingBadge);
  }, [p]);
`);

// Replace the {p.badge && ...} rendering
code = code.replace(/\{p\.badge && <span className="product-hero-badge">\{p\.badge\}<\/span>\}/g,
`{(!offerBadge && p.badge) && <span className="product-hero-badge">{p.badge}</span>}
              {offerBadge && (
                <span 
                  className="product-hero-badge" 
                  style={{ 
                    background: offerBadge.bgColor || '#c64b2e', 
                    color: offerBadge.textColor || '#fff',
                    display: 'inline-flex',
                    flexDirection: 'column',
                    lineHeight: 1.2,
                    padding: '6px 12px',
                    border: 'none',
                    fontWeight: 600
                  }}
                >
                  <span style={{ fontSize: '13px' }}>{offerBadge.badgeText}</span>
                  {offerBadge.couponCode && (
                    <span style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px', letterSpacing: '0.5px' }}>
                      CODE: {offerBadge.couponCode}
                    </span>
                  )}
                </span>
              )}`);

fs.writeFileSync('src/pages/Product.jsx', code);
