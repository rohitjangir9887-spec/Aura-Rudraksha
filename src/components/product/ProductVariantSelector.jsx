import React from "react";
import { Check, Sparkles } from "lucide-react";

export function ProductVariantSelector({ 
  product, 
  selectedVariant, 
  onSelectVariant,
  selectedSize,
  onSelectSize 
}) {
  if (!product) return null;

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;

  // If real variants exist in DB
  if (hasVariants) {
    return (
      <div className="aura-variant-selector-block">
        <label className="aura-variant-label">
          Select Bead / Variant Option:
        </label>
        <div className="aura-variant-chips">
          {product.variants.map((v, idx) => {
            const vName = typeof v === "string" ? v : (v.name || v.label || `Option ${idx + 1}`);
            const isSelected = selectedVariant === vName || (!selectedVariant && idx === 0);
            return (
              <button
                key={idx}
                type="button"
                className={`aura-variant-chip ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectVariant && onSelectVariant(vName)}
              >
                {isSelected && <Check size={13} strokeWidth={2.5} />}
                <span>{vName}</span>
                {v.price && <span className="variant-price">₹{v.price}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // If real sizes exist in DB
  if (hasSizes) {
    return (
      <div className="aura-variant-selector-block">
        <label className="aura-variant-label">
          Select Bead Dimension:
        </label>
        <div className="aura-variant-chips">
          {product.sizes.map((s, idx) => {
            const sName = typeof s === "string" ? s : (s.size || s.name || s);
            const isSelected = selectedSize === sName || (!selectedSize && idx === 0);
            return (
              <button
                key={idx}
                type="button"
                className={`aura-variant-chip ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectSize && onSelectSize(sName)}
              >
                {isSelected && <Check size={13} strokeWidth={2.5} />}
                <span>{sName}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Single Authentic Bead specification showcase (No fake dropdowns)
  const defaultSizeLabel = product.size || "Authentic Medium Size (16–20 mm)";
  return (
    <div className="aura-natural-spec-chip">
      <div className="spec-icon-box">📿</div>
      <div className="spec-text-box">
        <span className="spec-title">AUTHENTIC NATURAL SEED SPECIFICATION</span>
        <span className="spec-desc">
          <strong>{defaultSizeLabel}</strong> • Pure Himalayan Density &amp; Symmetry
        </span>
      </div>
    </div>
  );
}
