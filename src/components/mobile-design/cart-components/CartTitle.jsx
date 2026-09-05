import React from "react";

export function CartTitle({ qty }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <div>
        <h1
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: "22px",
            fontWeight: "700",
            color: "#2b170d",
            margin: 0,
            lineHeight: "1.2"
          }}
        >
          Your Sacred Cart
        </h1>
        <p style={{ fontSize: "11px", color: "#806f62", margin: "2px 0 0" }}>
          Blessed Items Ready for Energization ({qty} {qty === 1 ? "Item" : "Items"})
        </p>
      </div>
      <span
        style={{
          fontSize: "10px",
          fontWeight: "700",
          color: "#166534",
          background: "#eef9f2",
          border: "1px solid #c9ebd4",
          padding: "2px 8px",
          borderRadius: "12px"
        }}
      >
        In Stock
      </span>
    </div>
  );
}
