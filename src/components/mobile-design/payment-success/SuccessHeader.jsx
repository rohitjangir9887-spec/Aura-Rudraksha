import React from "react";
import { Check } from "lucide-react";

export function SuccessHeader() {
  return (
    <>
      {/* Large Green Circular Success Icon */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #22c55e 0%, #15803d 100%)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(34, 197, 94, 0.35)",
          border: "4px solid #f0fdf4",
          marginTop: "10px"
        }}
      >
        <Check size={44} strokeWidth={3} color="#ffffff" />
      </div>

      {/* Headings */}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: "26px",
            fontWeight: "700",
            color: "#2b170d",
            margin: "0 0 4px",
            lineHeight: "1.2"
          }}
        >
          Payment Successful!
        </h1>
        <p
          style={{
            fontSize: "12.5px",
            color: "#6e5d50",
            margin: 0,
            fontWeight: "500"
          }}
        >
          Your Rudraksha order has been confirmed.
        </p>
      </div>
    </>
  );
}
