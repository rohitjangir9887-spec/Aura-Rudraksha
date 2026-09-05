import React from "react";
import { Link } from "react-router-dom";
import { Lock, ShoppingCart } from "lucide-react";

export function MobileHeader({ itemCount }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        background: "#ffffff",
        borderBottom: "1px solid #ebd9c8",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 50,
        boxShadow: "0 2px 8px rgba(43, 23, 13, 0.04)"
      }}
    >
      {/* Brand Logo & Name */}
      <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #b88a58 0%, #7a4a24 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontFamily: '"Cormorant Garamond", serif',
            fontWeight: "700"
          }}
        >
          ॐ
        </div>
        <div>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "17px", fontWeight: "700", color: "#2b170d", lineHeight: "1.1" }}>
            AURA RUDRAKSHA
          </div>
          <div style={{ fontSize: "8px", fontWeight: "700", color: "#8c6b54", letterSpacing: "1px" }}>
            SACRED CHECKOUT
          </div>
        </div>
      </Link>

      {/* Security & Cart */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px", background: "#eef9f2", color: "#166534", padding: "3px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "700" }}>
          <Lock size={10} color="#16a34a" />
          <span>PayU 256-Bit</span>
        </div>

        <Link
          to="/cart"
          style={{
            position: "relative",
            color: "#2b170d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "6px",
            borderRadius: "50%",
            background: "#fcf8f3",
            border: "1px solid #ebd9c8"
          }}
        >
          <ShoppingCart size={16} />
          {itemCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#b85d25",
                color: "#ffffff",
                fontSize: "9px",
                fontWeight: "800",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
