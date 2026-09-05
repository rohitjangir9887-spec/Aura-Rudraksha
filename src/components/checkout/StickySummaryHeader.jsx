import React from "react";

export function StickySummaryHeader({ itemCount }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "16px",
        paddingBottom: "12px",
        borderBottom: "1px solid #f0e6da"
      }}
    >
      <h3
        style={{
          fontFamily: '"Cormorant Garamond", serif',
          fontSize: "22px",
          fontWeight: "700",
          margin: 0,
          color: "#2b170d"
        }}
      >
        Order Summary
      </h3>
      <span
        style={{
          fontSize: "11.5px",
          fontWeight: "700",
          color: "#99582a",
          background: "#fbf3eb",
          padding: "2px 8px",
          borderRadius: "4px",
          border: "1px solid #ebd9c8"
        }}
      >
        {itemCount} {itemCount === 1 ? "Sacred Item" : "Sacred Items"}
      </span>
    </div>
  );
}
