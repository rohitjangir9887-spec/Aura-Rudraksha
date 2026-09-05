import React from "react";

export function StickySummaryItem({ firstItemImg, firstItemName, itemCount }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px",
        background: "#fdfaf6",
        borderRadius: "10px",
        border: "1px solid #ebd9c8",
        marginBottom: "18px"
      }}
    >
      <img
        src={firstItemImg}
        alt={firstItemName}
        style={{
          width: "52px",
          height: "52px",
          objectFit: "cover",
          borderRadius: "8px",
          border: "1px solid #dfc7af",
          background: "#fff"
        }}
        onError={(e) => { e.target.src = "/images/product-1mukhi.jpg"; }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "12.5px",
            fontWeight: "700",
            color: "#2b170d",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {firstItemName}
        </div>
        <div style={{ fontSize: "11px", color: "#806f62", marginTop: "2px" }}>
          Quantity: <b>{itemCount}</b> • Govt Lab Certified
        </div>
      </div>
    </div>
  );
}
