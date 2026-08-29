const fs = require('fs');
let content = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');

if (!content.includes('if (lines.length === 0) {')) {
  content = content.replace(
    '  const [paymentMethod, setPaymentMethod] = useState("cod");',
    `  const [paymentMethod, setPaymentMethod] = useState("cod");\n\n  useEffect(() => {\n    if (lines.length === 0) {\n      navigate("/cart");\n    }\n  }, [lines.length, navigate]);`
  );
  fs.writeFileSync('src/pages/Checkout.jsx', content);
}
