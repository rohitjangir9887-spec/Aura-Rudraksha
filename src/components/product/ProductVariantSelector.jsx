import React from "react";
import { Check, Sparkles, Globe, Award, ShieldCheck, Leaf } from "lucide-react";
import { isRudrakshaProduct } from "../../lib/productHelper";

export function ProductVariantSelector({ 
  product, 
  selectedVariant, 
  onSelectVariant,
  selectedSize,
  onSelectSize,
  selectedOrigin = "Nepal",
  onSelectOrigin
}) {
  if (!product) return null;

  const isRudraksha = isRudrakshaProduct(product);
  const hasIndonesian = isRudraksha && (!!product.hasIndonesianVariant || (Number(product.indonesianPrice) > 0));
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;

  const nepalPrice = Number(product.price) || 0;
  const indoPrice = Number(product.indonesianPrice) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '14px 0' }}>
      {/* 1. Origin Selector (Nepal vs Indonesian) - ONLY for Rudraksha beads */}
      {hasIndonesian && (
        <div className="aura-origin-selector-container" style={{
          background: '#fffbf5',
          border: '1.5px solid #fed7aa',
          borderRadius: '10px',
          padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#7c2d12', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={15} style={{ color: '#c2410c' }} />
              Select Rudraksha Origin (उत्पत्ति चुनें):
            </label>
            <span style={{ fontSize: '11px', color: '#9a3412', fontWeight: '600' }}>
              {selectedOrigin === "Indonesia" ? "🇮🇩 Indonesian Selected" : "🇳🇵 Nepali Selected"}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Nepali Option */}
            <button
              type="button"
              onClick={() => onSelectOrigin && onSelectOrigin("Nepal")}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '8px',
                border: selectedOrigin !== "Indonesia" ? '2px solid #b44b1c' : '1px solid #e2e8f0',
                background: selectedOrigin !== "Indonesia" ? '#fff' : '#fafaf9',
                boxShadow: selectedOrigin !== "Indonesia" ? '0 2px 8px rgba(180, 75, 28, 0.15)' : 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              {selectedOrigin !== "Indonesia" && (
                <span style={{
                  position: 'absolute', top: '-7px', right: '8px',
                  background: '#b44b1c', color: '#fff', fontSize: '9.5px',
                  padding: '1px 6px', borderRadius: '4px', fontWeight: '700'
                }}>
                  Popular Choice
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px' }}>🇳🇵</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#2b170d' }}>Nepal Origin</span>
                {selectedOrigin !== "Indonesia" && <Check size={14} style={{ marginLeft: 'auto', color: '#b44b1c' }} />}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#8c2b10', marginBottom: '2px' }}>
                ₹{nepalPrice.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: '11px', color: '#78685c' }}>
                Large Mukhi • Deep Grooves (18–22 mm)
              </div>
            </button>

            {/* Indonesian Option */}
            <button
              type="button"
              onClick={() => onSelectOrigin && onSelectOrigin("Indonesia")}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '8px',
                border: selectedOrigin === "Indonesia" ? '2px solid #d97706' : '1px solid #e2e8f0',
                background: selectedOrigin === "Indonesia" ? '#fff' : '#fafaf9',
                boxShadow: selectedOrigin === "Indonesia" ? '0 2px 8px rgba(217, 119, 6, 0.15)' : 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              {selectedOrigin === "Indonesia" && (
                <span style={{
                  position: 'absolute', top: '-7px', right: '8px',
                  background: '#d97706', color: '#fff', fontSize: '9.5px',
                  padding: '1px 6px', borderRadius: '4px', fontWeight: '700'
                }}>
                  Budget Friendly
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px' }}>🇮🇩</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#2b170d' }}>Indonesian (Java)</span>
                {selectedOrigin === "Indonesia" && <Check size={14} style={{ marginLeft: 'auto', color: '#d97706' }} />}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#b45309', marginBottom: '2px' }}>
                ₹{indoPrice.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: '11px', color: '#78685c' }}>
                {product.indonesianSize || "Small Java Bead (10–14 mm)"}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 2. Variants if present */}
      {hasVariants && (
        <div className="aura-variant-selector-block">
          <label className="aura-variant-label">
            Choose your Variant (विकल्प चुनें):
          </label>
          <div className="aura-variant-chips">
            {product.variants.map((v, idx) => {
              const vName = typeof v === "string" ? v : (v.name || v.label || `Option ${idx + 1}`);
              const isSelected = selectedVariant === vName || (!selectedVariant && idx === 0);
              const vPrice = typeof v === "object" && v.price ? Number(v.price) : null;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`aura-variant-chip ${isSelected ? "selected" : ""}`}
                  onClick={() => onSelectVariant && onSelectVariant(vName)}
                >
                  {isSelected && <Check size={13} strokeWidth={2.5} />}
                  <span>{vName}</span>
                  {vPrice ? <span className="variant-price">₹{vPrice.toLocaleString("en-IN")}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Sizes / Quantity if present */}
      {hasSizes && (
        <div className="aura-variant-selector-block">
          <label className="aura-variant-label">
            {isRudraksha ? "Select Bead Dimension:" : "Select Quantity / Size:"}
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
      )}

      {/* Single Authentic Specification showcase */}
      {!hasVariants && !hasSizes && (
        <div className="aura-natural-spec-chip">
          <div className="spec-icon-box">{isRudraksha ? "📿" : "🪔"}</div>
          <div className="spec-text-box">
            <span className="spec-title">
              {isRudraksha 
                ? (selectedOrigin === "Indonesia" ? "AUTHENTIC JAVA / INDONESIAN BEAD SPECIFICATION" : "AUTHENTIC HIMALAYAN SEED SPECIFICATION")
                : "100% PURE & VEDIC SANCTIFIED SPECIFICATION"}
            </span>
            <span className="spec-desc">
              <strong>
                {isRudraksha 
                  ? (selectedOrigin === "Indonesia"
                      ? (product.indonesianSize || "Small Java Bead (10–14 mm)")
                      : (product.size || "Authentic Nepal Size (16–20 mm)"))
                  : (product.netWeight || product.size || "Auspicious Devotional Grade (100% Pure)")}
              </strong> • {isRudraksha ? "100% Genuine, Natural & Energized" : "100% Pure, Natural & Sanctified"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

