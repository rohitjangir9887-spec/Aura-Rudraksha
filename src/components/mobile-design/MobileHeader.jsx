import React from "react";
import { Menu, Search, ShoppingBag, ArrowLeft, Lock } from "lucide-react";

/**
 * MobileHeader
 * 
 * Top mobile header for 390px mobile viewport:
 * Screen 1: ☰  Rudraksha logo  Search  Cart
 * Screen 2+: ←  Header Title  Security Badge
 */
export function MobileHeader({ 
  variant = "cart", // "cart" | "subpage"
  title = "Secure Checkout", 
  onBack,
  cartCount = 1,
  onMenuClick,
  onSearchClick,
  onCartClick
}) {
  if (variant === "cart") {
    return (
      <header
        style={{
          height: "56px",
          background: "#ffffff",
          borderBottom: "1px solid #ede3d8",
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40,
          boxShadow: "0 2px 8px rgba(43, 23, 13, 0.03)"
        }}
      >
        {/* Left: Hamburger Menu */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open Navigation Menu"
          style={{
            width: "40px",
            height: "40px",
            background: "none",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#2b170d",
            cursor: "pointer",
            padding: 0
          }}
        >
          <Menu size={22} color="#2b170d" strokeWidth={2} />
        </button>

        {/* Center: Brand Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "radial-gradient(circle, #b88a58 0%, #7a4a24 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              fontFamily: '"Cormorant Garamond", serif',
              fontWeight: "700",
              boxShadow: "0 2px 6px rgba(122, 74, 36, 0.25)"
            }}
          >
            ॐ
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: "17px",
                fontWeight: "700",
                color: "#2b170d",
                letterSpacing: "1.2px",
                lineHeight: "1.1"
              }}
            >
              RUDRAKSHA
            </div>
            <div
              style={{
                fontSize: "7.5px",
                fontWeight: "600",
                color: "#99582a",
                letterSpacing: "1.4px",
                textTransform: "uppercase"
              }}
            >
              Blessed by Tradition
            </div>
          </div>
        </div>

        {/* Right: Search & Cart */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Search Collection"
            style={{
              width: "38px",
              height: "38px",
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2b170d",
              cursor: "pointer",
              padding: 0
            }}
          >
            <Search size={20} color="#2b170d" strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={onCartClick}
            aria-label="View Shopping Cart"
            style={{
              width: "38px",
              height: "38px",
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2b170d",
              cursor: "pointer",
              position: "relative",
              padding: 0
            }}
          >
            <ShoppingBag size={20} color="#2b170d" strokeWidth={2} />
            {cartCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "4px",
                  background: "#b85d25",
                  color: "#ffffff",
                  fontSize: "9px",
                  fontWeight: "800",
                  minWidth: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1.5px solid #ffffff",
                  lineHeight: 1
                }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>
    );
  }

  // Subpage header with back button
  return (
    <header
      style={{
        height: "54px",
        background: "#ffffff",
        borderBottom: "1px solid #ede3d8",
        padding: "0 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: "0 2px 8px rgba(43, 23, 13, 0.03)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Go Back"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#f7eee3",
            border: "1px solid #ede3d8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#2b170d",
            cursor: "pointer",
            padding: 0
          }}
        >
          <ArrowLeft size={18} color="#2b170d" strokeWidth={2.2} />
        </button>
        <div>
          <div
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: "18px",
              fontWeight: "700",
              color: "#2b170d",
              lineHeight: 1.1
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: "8.5px", color: "#8c7360", fontWeight: "600", letterSpacing: "0.5px" }}>
            Rudraksha • Blessed by Tradition
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "#eef9f2",
          border: "1px solid #c9ebd4",
          color: "#166534",
          padding: "3px 8px",
          borderRadius: "12px",
          fontSize: "10px",
          fontWeight: "700"
        }}
      >
        <Lock size={10} color="#16a34a" strokeWidth={2.4} />
        <span>256-Bit SSL</span>
      </div>
    </header>
  );
}
