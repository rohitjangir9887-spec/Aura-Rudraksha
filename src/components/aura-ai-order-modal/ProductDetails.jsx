import { getProductPrimaryImage, getProductGalleryImages } from "../../lib/imageUtils";
import { getProductRoute } from "../../lib/routes";
import React from "react";
import { Plus, Minus } from "lucide-react";

export function ProductDetails({ product, unitPrice = 0, unitMrp = 0, qty = 1, setQty }) {
  const safeUnitPrice = Number(unitPrice) || 0;
  const safeUnitMrp = Number(unitMrp) || 0;
  const safeQty = Math.max(1, Number(qty) || 1);
  const prodName = product?.name || "Sacred Himalayan Rudraksha";

  return (
    <div className="aura-ai-order-prod-row">
      <div className="aura-ai-order-prod-thumb">
        <img
          src={getProductPrimaryImage(product)}
          alt={prodName}
          loading="lazy"
          decoding="async"
          onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/placeholder.svg"; }}
        />
      </div>
      <div className="aura-ai-order-prod-meta">
        <h4>{prodName}</h4>
        <div className="aura-ai-order-prod-price-line">
          <span className="aura-ai-order-cur-price">₹{safeUnitPrice.toLocaleString('en-IN')}</span>
          {safeUnitMrp > safeUnitPrice && (
            <span className="aura-ai-order-mrp-price">₹{safeUnitMrp.toLocaleString('en-IN')}</span>
          )}
          <span className="aura-ai-order-free-ship">Free Sacred Packaging</span>
        </div>
      </div>

      {/* Qty Stepper */}
      <div className="aura-ai-order-qty-stepper">
        <button
          type="button"
          onClick={() => setQty && setQty(Math.max(1, safeQty - 1))}
          aria-label="Decrease quantity"
        >
          <Minus size={12} />
        </button>
        <span>{safeQty}</span>
        <button
          type="button"
          onClick={() => setQty && setQty(Math.min(10, safeQty + 1))}
          aria-label="Increase quantity"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}
