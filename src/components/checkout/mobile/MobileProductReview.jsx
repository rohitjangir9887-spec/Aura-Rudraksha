import React from "react";
import { Link } from "react-router-dom";

export function MobileProductReview({
  firstItemImg,
  firstItemName
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "16px",
        padding: "16px 14px",
        marginBottom: "16px",
        boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #f0e6da" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#b88a58", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>
            2
          </div>
          <span style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d" }}>
            Sacred Item Review
          </span>
        </div>
        <Link to="/cart" style={{ fontSize: "11.5px", color: "#99582a", fontWeight: "700", textDecoration: "none" }}>
          Edit
        </Link>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <img
          src={firstItemImg}
          alt={firstItemName}
          style={{
            width: "76px",
            height: "76px",
            borderRadius: "10px",
            objectFit: "cover",
            border: "1.5px solid #dfc7af",
            background: "#f7eee3",
            flexShrink: 0
          }}
          onError={(e) => { e.target.src = "/images/product-1mukhi.jpg"; }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#99582a", background: "#fbf3eb", padding: "2px 6px", borderRadius: "4px" }}>
            Deva Mani • Lab Certified
          </span>
          <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d", margin: "4px 0", lineHeight: "1.25" }}>
            {firstItemName}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "16px", fontWeight: "800", color: "#2b170d" }}>
              ₹36,950
            </span>
            <del style={{ fontSize: "12px", color: "#8c796d" }}>₹59,000</del>
            <span style={{ fontSize: "10px", fontWeight: "800", color: "#166534", background: "#eef9f2", padding: "1px 6px", borderRadius: "4px" }}>
              37% OFF
            </span>
          </div>

          <div style={{ fontSize: "11px", color: "#166534", fontWeight: "700", marginTop: "3px" }}>
            ✓ You save ₹22,050
          </div>
        </div>
      </div>
    </div>
  );
}
