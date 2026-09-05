import React from "react";
import { Plus, Minus } from "lucide-react";

export function ProductDetails({ product, unitPrice, unitMrp, qty, setQty }) {
  return (
    <div className="aura-ai-order-prod-row">
      <div className="aura-ai-order-prod-thumb">
        <img
          src={product.image || product.img || product.images?.[0] || "/images/product-5mukhi.jpg"}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
        />
      </div>
      <div className="aura-ai-order-prod-meta">
        <h4>{product.name}</h4>
        <div className="aura-ai-order-prod-price-line">
          <span className="aura-ai-order-cur-price">₹{unitPrice.toLocaleString('en-IN')}</span>
          {unitMrp > unitPrice && (
            <span className="aura-ai-order-mrp-price">₹{unitMrp.toLocaleString('en-IN')}</span>
          )}
          <span className="aura-ai-order-free-ship">Free Sacred Packaging</span>
        </div>
      </div>

      {/* Qty Stepper */}
      <div className="aura-ai-order-qty-stepper">
        <button
          type="button"
          onClick={() => setQty(Math.max(1, qty - 1))}
          aria-label="Decrease quantity"
        >
          <Minus size={12} />
        </button>
        <span>{qty}</span>
        <button
          type="button"
          onClick={() => setQty(Math.min(10, qty + 1))}
          aria-label="Increase quantity"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}
