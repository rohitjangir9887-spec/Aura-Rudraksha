import React from "react";
import { ShieldCheck, Sparkles, Plus, Minus, CheckCircle2 } from "lucide-react";
import { money } from "../../data";

export function ProductReviewItem({ item, onUpdateQty }) {
  const sellingPrice = item.price;
  const mrpPrice = item.mrp;
  const savings = item.savings ?? Math.max(0, mrpPrice - sellingPrice);
  const discountPct = item.discountPct ?? (mrpPrice > sellingPrice ? Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100) : 0);

  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        padding: "16px",
        background: "linear-gradient(180deg, #fdfcf9 0%, #fcf9f4 100%)",
        border: "1px solid #ebd9c8",
        borderRadius: "14px",
        alignItems: "flex-start",
        position: "relative"
      }}
    >
      {/* High-res Rudraksha Image */}
      <div
        style={{
          width: "90px",
          height: "90px",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#f5ece2",
          border: "1.5px solid #dfc7af",
          flexShrink: 0,
          boxShadow: "0 3px 8px rgba(43, 23, 13, 0.06)",
          position: "relative"
        }}
      >
        <img
          src={item.img}
          alt={item.name}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { e.target.src = "/images/product-1mukhi.jpg"; }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(43, 23, 13, 0.75)",
            backdropFilter: "blur(2px)",
            color: "#ffffff",
            fontSize: "9px",
            fontWeight: "700",
            textAlign: "center",
            padding: "2px 0",
            letterSpacing: "0.4px"
          }}
        >
          NEPAL ORIGIN
        </div>
      </div>

      {/* Product Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Sacred Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: "700",
              color: "#99582a",
              background: "#fbf3eb",
              padding: "2px 8px",
              borderRadius: "4px",
              border: "1px solid #ebd9c8",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <Sparkles size={11} /> {item.badge || "Deva Mani • Lord Shiva & Hanuman"}
          </span>
        </div>

        {/* Product Name */}
        <h3
          style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: "18px",
            fontWeight: "700",
            color: "#2b170d",
            margin: "0 0 6px",
            lineHeight: "1.3"
          }}
        >
          {item.name}
        </h3>

        {/* Price Display */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
          <span style={{ fontSize: "20px", fontWeight: "800", color: "#2b170d" }}>
            {money(sellingPrice)}
          </span>
          {mrpPrice > sellingPrice && (
            <>
              <del style={{ fontSize: "14px", color: "#8c796d" }}>
                {money(mrpPrice)}
              </del>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: "800",
                  color: "#166534",
                  background: "#eef9f2",
                  border: "1px solid #cce8d4",
                  padding: "2px 8px",
                  borderRadius: "4px"
                }}
              >
                {discountPct}% OFF
              </span>
            </>
          )}
        </div>

        {/* Savings Highlight */}
        {savings > 0 && (
          <div
            style={{
              fontSize: "12.5px",
              color: "#166534",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              marginBottom: "10px"
            }}
          >
            <CheckCircle2 size={14} /> You save {money(savings * (item.qty || 1))}
          </div>
        )}

        {/* Trust hallmarks & quantity adjustment */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px dashed #ebd9c8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#6e5d50" }}>
            <ShieldCheck size={13} color="#16a34a" />
            <span>Lab Certificate Included</span>
          </div>

          {/* Quantity adjustment */}
          {onUpdateQty && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11.5px", color: "#806f62" }}>Qty:</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid #d4c5b9",
                  borderRadius: "6px",
                  background: "#ffffff",
                  height: "26px"
                }}
              >
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => onUpdateQty(item.id, Math.max(1, (item.qty || 1) - 1))}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "0 6px",
                    cursor: "pointer",
                    color: "#6e5d50"
                  }}
                >
                  <Minus size={12} />
                </button>
                <span style={{ fontSize: "12px", fontWeight: "700", padding: "0 8px", color: "#2b170d" }}>
                  {item.qty || 1}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => onUpdateQty(item.id, (item.qty || 1) + 1)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "0 6px",
                    cursor: "pointer",
                    color: "#6e5d50"
                  }}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
