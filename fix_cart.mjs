import fs from "fs";
let content = fs.readFileSync("src/hooks/useCart.jsx", "utf8");

content = content.replace(
  `        const storeSettings = (db.getSettings ? db.getSettings() : {}) || {};
        const standardFee = Number(storeSettings.standardShippingFee ?? 0);
        const threshold = Number(storeSettings.freeShippingThreshold ?? 0);
        const isFreeShipping = subtotal === 0 || threshold === 0 || subtotal >= threshold;
        const shipping = isFreeShipping ? 0 : standardFee;
        const shippingDiscount = isFreeShipping && standardFee > 0 ? standardFee : 0;`,
  `        const storeSettings = (db.getSettings ? db.getSettings() : {}) || {};
        let productShipping = 0;
        validItems.forEach(item => {
          const p = db.getProducts().find(x => String(x.id) === String(item.id));
          if (p && p.freeShipping === false) {
            productShipping += (Number(p.shippingFee) || 0) * item.quantity;
          }
        });

        // Use strictly per-product delivery charges, overriding global automatic free shipping
        const shipping = productShipping;
        const isFreeShipping = shipping === 0;
        const shippingDiscount = 0;
        const threshold = 0;
        const standardFee = 0;`
);

fs.writeFileSync("src/hooks/useCart.jsx", content);
