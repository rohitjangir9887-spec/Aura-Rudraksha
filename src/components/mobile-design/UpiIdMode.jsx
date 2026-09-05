import React from "react";

export function UpiIdMode({ upiId, setUpiId }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "16px",
        padding: "16px 14px",
        boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
        Enter UPI ID / VPA
      </div>

      <div>
        <input
          type="text"
          placeholder="example@okaxis, user@okhdfcbank"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1.5px solid #b88a58",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
            background: "#fffdfa"
          }}
        />
        <div style={{ fontSize: "10.5px", color: "#806f62", marginTop: "4px" }}>
          A payment request notification will be sent to your UPI app.
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {["@okaxis", "@okhdfcbank", "@okicici", "@oksbi", "@paytm", "@ybl"].map((suffix) => (
          <button
            key={suffix}
            type="button"
            onClick={() => setUpiId((prev) => (prev.split("@")[0] || "user") + suffix)}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: "#f7eee3",
              border: "1px solid #ebd9c8",
              fontSize: "10.5px",
              fontWeight: "600",
              color: "#7a4a24",
              cursor: "pointer"
            }}
          >
            {suffix}
          </button>
        ))}
      </div>
    </div>
  );
}
