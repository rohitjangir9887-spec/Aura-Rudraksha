const fs = require('fs');
let code = fs.readFileSync('src/pages/Product.jsx', 'utf8');

// Insert after newReview
code = code.replace(/const \[newReview, setNewReview\] = useState\(\{ name: "", rating: 5, text: "" \}\);/, 
`const [newReview, setNewReview] = useState({ name: "", rating: 5, text: "" });
  const [offerBadge, setOfferBadge] = useState(null);

  useEffect(() => {
    if (!product) return;
    const allBadges = db.getOffers().filter(o => o.offerType === 'badge' && o.status === 'Active');
    const validBadges = allBadges.filter(o => {
      if (o.expiry && new Date(o.expiry) < new Date()) return false;
      return true;
    });
    const matchingBadge = validBadges.find(o => o.applyTo === 'ALL' || o.applyTo === String(product.id));
    if (matchingBadge) setOfferBadge(matchingBadge);
  }, [product]);`);

fs.writeFileSync('src/pages/Product.jsx', code);
