const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');

code = code.replace(
  /if \(saveAddressCheck\) \{\s*try \{\s*await db\.saveAddress\(addressObj\);\s*\} catch \(_\) \{\}\s*\}/,
  `if (saveAddressCheck) {
      // Fire and forget, don't block payment redirect
      db.saveAddress(addressObj).catch(() => {});
    }`
);

fs.writeFileSync('src/pages/Checkout.jsx', code);
