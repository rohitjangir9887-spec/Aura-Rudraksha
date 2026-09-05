import React, { useState } from "react";
import { MobileHeader } from "./MobileHeader";
import { SacredTrustTicker } from "./cart-components/SacredTrustTicker";
import { CartTitle } from "./cart-components/CartTitle";
import { MobileProductCard } from "./cart-components/MobileProductCard";
import { VedicConsecrationCard } from "./cart-components/VedicConsecrationCard";
import { FreeGiftsCard } from "./cart-components/FreeGiftsCard";
import { StickyCheckoutBar } from "./cart-components/StickyCheckoutBar";

/**
 * Screen 1 — Mobile Product / Cart Card
 * 
 * Specifically designed for 390px mobile viewport:
 * - Top header with Menu, Rudraksha logo, Search, Cart
 * - High-definition Rudraksha product showcase
 * - Badges: ✓ Original, ✓ Lab Certified, ✓ Energized, ✓ Nepali
 * - Pricing: ₹36,950 (MRP ₹59,000 crossed out, 37% OFF)
 * - Quantity stepper: - 1 +
 * - Actions: ♡ Wishlist & Trash (Delete)
 * - Vedic Consecration Included spiritual info card
 * - Sticky bottom: Total ₹36,950 & "Proceed to Checkout →"
 */
export function Screen1MobileCart({
  onProceed,
  onOpenMenu,
  onOpenSearch
}) {
  const [qty, setQty] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const unitPrice = 36950;
  const mrpPrice = 59000;
  const totalPrice = unitPrice * qty;
  const totalMrp = mrpPrice * qty;
  const totalSavings = totalMrp - totalPrice;

  const handleMinus = () => {
    if (qty > 1) setQty(qty - 1);
  };

  const handlePlus = () => {
    setQty(qty + 1);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: "#fcfaf7",
        position: "relative",
        paddingBottom: "82px",
        boxSizing: "border-box"
      }}
    >
      {/* 1. Header */}
      <MobileHeader
        variant="cart"
        cartCount={qty}
        onMenuClick={onOpenMenu}
        onSearchClick={onOpenSearch}
      />

      {/* 2. Top Sacred Trust Ticker */}
      <SacredTrustTicker />

      {/* 3. Main Content Container */}
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
        
        {/* Page Title & Breadcrumb */}
        <CartTitle qty={qty} />

        {/* 4. High-Fidelity Product Card */}
        <MobileProductCard
          qty={qty}
          isWishlisted={isWishlisted}
          totalPrice={totalPrice}
          totalMrp={totalMrp}
          totalSavings={totalSavings}
          onMinus={handleMinus}
          onPlus={handlePlus}
          onWishlistToggle={() => setIsWishlisted(!isWishlisted)}
        />

        {/* 5. Vedic Consecration Information Card */}
        <VedicConsecrationCard />

        {/* 6. Free Gifts / Inclusions Card */}
        <FreeGiftsCard />
      </div>

      {/* 7. Sticky Bottom Payment / Checkout Bar */}
      <StickyCheckoutBar totalPrice={totalPrice} onProceed={onProceed} />
    </div>
  );
}
