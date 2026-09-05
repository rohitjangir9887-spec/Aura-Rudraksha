import React, { useState } from "react";
import { CheckoutHeaderTrustStrip } from "./CheckoutHeaderTrustStrip";
import { CheckoutHeaderLogo } from "./CheckoutHeaderLogo";
import { CheckoutHeaderDesktopNav } from "./CheckoutHeaderDesktopNav";
import { CheckoutHeaderActions } from "./CheckoutHeaderActions";
import { CheckoutHeaderMobileMenu } from "./CheckoutHeaderMobileMenu";

/**
 * CheckoutHeader
 * Premium Indian spiritual luxury checkout header.
 * Displays top trust announcement strip, sacred Rudraksha brand identity,
 * primary shop navigation, search, account, and cart count.
 */
export function CheckoutHeader({ onOpenSearch }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="checkout-luxury-header" style={{ width: "100%", background: "#ffffff", borderBottom: "1px solid #e8dac9" }}>
      {/* 1. Top Trust Announcement Strip */}
      <CheckoutHeaderTrustStrip />

      {/* 2. Main Navigation Bar */}
      <div 
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px"
        }}
      >
        {/* Left: Brand Identity / Sacred Logo */}
        <CheckoutHeaderLogo />

        {/* Center: Desktop Navigation Links */}
        <CheckoutHeaderDesktopNav />

        {/* Right: Search, Account, Cart & Security Badge */}
        <CheckoutHeaderActions mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <CheckoutHeaderMobileMenu setMobileMenuOpen={setMobileMenuOpen} />
      )}
    </header>
  );
}
