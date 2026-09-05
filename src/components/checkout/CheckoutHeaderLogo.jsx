import React from "react";
import { Link } from "react-router-dom";

export function CheckoutHeaderLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <Link
        to="/"
        style={{
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        {/* Sacred Emblem */}
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #b88a58 0%, #7a4a24 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            boxShadow: "0 3px 10px rgba(122, 74, 36, 0.25)",
            border: "1.5px solid #dfc7af",
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: "20px", fontFamily: '"Cormorant Garamond", serif', fontWeight: "700" }}>ॐ</span>
        </div>

        <div>
          <div
            style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: "24px",
              fontWeight: "700",
              letterSpacing: "1.5px",
              color: "#2b170d",
              lineHeight: "1.1"
            }}
          >
            AURA RUDRAKSHA
          </div>
          <div
            style={{
              fontSize: "9px",
              fontWeight: "700",
              letterSpacing: "1.8px",
              color: "#8c6b54",
              textTransform: "uppercase"
            }}
          >
            Sacred Himalayan Seeds • Lab Certified
          </div>
        </div>
      </Link>
    </div>
  );
}
