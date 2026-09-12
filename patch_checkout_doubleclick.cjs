const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');

// Add a ref to track submission
code = code.replace(
  /const isRedirectingRef = useRef\(false\);/,
  `const isRedirectingRef = useRef(false);\n  const isSubmittingRef = useRef(false);`
);

// Update handlePlaceOrder
code = code.replace(
  /const handlePlaceOrder = async \(e\) => \{/,
  `const handlePlaceOrder = async (e) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;`
);

// Reset ref if validation fails
code = code.replace(
  /const el = document\.getElementById\("checkout-address-section"\);\s*if \(el\) el\.scrollIntoView\(\{ behavior: "smooth", block: "center" \}\);\s*return;/,
  `const el = document.getElementById("checkout-address-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      isSubmittingRef.current = false;
      return;`
);

// Reset ref if auth needed
code = code.replace(
  /setAuthModalOpen\(true\);\s*return;/,
  `setAuthModalOpen(true);
      isSubmittingRef.current = false;
      return;`
);

// Reset ref if executeOrderSubmission fails
code = code.replace(
  /setLoading\(false\);/,
  `setLoading(false);\n      isSubmittingRef.current = false;`
);

fs.writeFileSync('src/pages/Checkout.jsx', code);
