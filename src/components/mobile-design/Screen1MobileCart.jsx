import React, { useState } from "react";
import { 
  Check, 
  Heart, 
  Trash2, 
  Plus, 
  Minus, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Flame,
  Award,
  Clock
} from "lucide-react";
import { MobileHeader } from "./MobileHeader";

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
      <div
        style={{
          background: "#2b170d",
          color: "#f5eee4",
          fontSize: "10.5px",
          fontWeight: "600",
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          letterSpacing: "0.2px"
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Sparkles size={11} color="#dfc7af" /> 100% Nepali Origin
        </span>
        <span style={{ color: "#8c7360" }}>•</span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Award size={11} color="#dfc7af" /> Govt. Lab Certified
        </span>
        <span style={{ color: "#8c7360" }}>•</span>
        <span style={{ color: "#86efac", fontWeight: "700" }}>Free Shipping</span>
      </div>

      {/* 3. Main Content Container */}
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
        
        {/* Page Title & Breadcrumb */}
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

        {/* 4. High-Fidelity Product Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #ebd9c8",
            borderRadius: "16px",
            padding: "14px",
            boxShadow: "0 4px 16px rgba(43, 23, 13, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >
          {/* Top Row: Product Photography & Badges */}
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            {/* Product Image */}
            <div
              style={{
                width: "105px",
                height: "105px",
                borderRadius: "12px",
                border: "1.5px solid #dfc7af",
                background: "radial-gradient(circle, #ffffff 0%, #f7efe6 100%)",
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(43, 23, 13, 0.06)"
              }}
            >
              <img
                src="/images/product-1mukhi.jpg"
                alt="Original 14 Mukhi Rudraksha"
                style={{
                  width: "90%",
                  height: "90%",
                  objectFit: "contain",
                  filter: "drop-shadow(0 4px 8px rgba(43, 23, 13, 0.2))"
                }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: "4px",
                  left: "4px",
                  right: "4px",
                  background: "rgba(43, 23, 13, 0.85)",
                  color: "#ffffff",
                  fontSize: "7.5px",
                  fontWeight: "700",
                  textAlign: "center",
                  padding: "1.5px 0",
                  borderRadius: "4px",
                  letterSpacing: "0.5px"
                }}
              >
                100% NEPALI
              </span>
            </div>

            {/* Product Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: "16.5px",
                  fontWeight: "700",
                  color: "#2b170d",
                  lineHeight: "1.25",
                  marginBottom: "2px"
                }}
              >
                Original 14 Mukhi Rudraksha (Nepali)
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#8c6b54",
                  fontWeight: "600",
                  marginBottom: "8px"
                }}
              >
                Lab Certified Chaudah Mukhi Rudraksha
              </div>

              {/* Badges Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "4px",
                  marginBottom: "6px"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "10px",
                    fontWeight: "600",
                    color: "#166534",
                    background: "#f0f9f3",
                    padding: "2px 6px",
                    borderRadius: "4px"
                  }}
                >
                  <Check size={11} strokeWidth={2.5} color="#16a34a" /> Original
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "10px",
                    fontWeight: "600",
                    color: "#166534",
                    background: "#f0f9f3",
                    padding: "2px 6px",
                    borderRadius: "4px"
                  }}
                >
                  <Check size={11} strokeWidth={2.5} color="#16a34a" /> Lab Certified
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "10px",
                    fontWeight: "600",
                    color: "#78350f",
                    background: "#fef3c7",
                    padding: "2px 6px",
                    borderRadius: "4px"
                  }}
                >
                  <Check size={11} strokeWidth={2.5} color="#d97706" /> Energized
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "10px",
                    fontWeight: "600",
                    color: "#7a3e1d",
                    background: "#f7eee3",
                    padding: "2px 6px",
                    borderRadius: "4px"
                  }}
                >
                  <Check size={11} strokeWidth={2.5} color="#99582a" /> Nepali
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Row */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              paddingTop: "6px",
              borderTop: "1px dashed #ede3d8"
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "800",
                  color: "#2b170d"
                }}
              >
                ₹{totalPrice.toLocaleString("en-IN")}
              </span>
              <del
                style={{
                  fontSize: "13px",
                  color: "#8c796d"
                }}
              >
                ₹{totalMrp.toLocaleString("en-IN")}
              </del>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: "800",
                  color: "#166534",
                  background: "#eef9f2",
                  border: "1px solid #c9ebd4",
                  padding: "1.5px 6px",
                  borderRadius: "4px"
                }}
              >
                37% OFF
              </span>
            </div>

            <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534" }}>
              Save ₹{totalSavings.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Quantity & Actions Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "6px",
              borderTop: "1px solid #f2e9df"
            }}
          >
            {/* Quantity Stepper */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1.5px solid #d9c6b3",
                borderRadius: "8px",
                background: "#ffffff",
                overflow: "hidden"
              }}
            >
              <button
                type="button"
                onClick={handleMinus}
                aria-label="Decrease Quantity"
                style={{
                  width: "34px",
                  height: "32px",
                  background: "#fcf8f3",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: qty > 1 ? "pointer" : "not-allowed",
                  color: qty > 1 ? "#2b170d" : "#c4b5a5"
                }}
              >
                <Minus size={13} strokeWidth={2.4} />
              </button>
              <span
                style={{
                  width: "36px",
                  textAlign: "center",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#2b170d"
                }}
              >
                {qty}
              </span>
              <button
                type="button"
                onClick={handlePlus}
                aria-label="Increase Quantity"
                style={{
                  width: "34px",
                  height: "32px",
                  background: "#fcf8f3",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#2b170d"
                }}
              >
                <Plus size={13} strokeWidth={2.4} />
              </button>
            </div>

            {/* Actions: Wishlist & Delete */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setIsWishlisted(!isWishlisted)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: isWishlisted ? "1px solid #fecdd3" : "1px solid #ede3d8",
                  background: isWishlisted ? "#fff1f2" : "#fdfbf8",
                  color: isWishlisted ? "#e11d48" : "#6e5d50",
                  fontSize: "11.5px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                <Heart size={14} fill={isWishlisted ? "#e11d48" : "none"} color={isWishlisted ? "#e11d48" : "#6e5d50"} />
                <span>Wishlist</span>
              </button>

              <button
                type="button"
                onClick={() => alert("Item removed from cart")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid #fee2e2",
                  background: "#fff5f5",
                  color: "#dc2626",
                  fontSize: "11.5px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                <Trash2 size={14} color="#dc2626" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. Vedic Consecration Information Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #fbf7f0 0%, #f7eee3 100%)",
            border: "1px solid #dfc7af",
            borderRadius: "14px",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(184, 138, 88, 0.08)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#b88a58",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px"
              }}
            >
              🕉
            </div>
            <div>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#2b170d" }}>
                Vedic Consecration Included
              </div>
              <div style={{ fontSize: "10px", color: "#8c6b54" }}>
                Prana Pratishtha by Kashi Vishwanath Priests
              </div>
            </div>
          </div>

          <p
            style={{
              fontSize: "11px",
              color: "#5c483a",
              lineHeight: "1.45",
              margin: 0
            }}
          >
            Every Rudraksha bead is energized through holy Ganga Jal abhishek, bilva patra offerings, and sacred Shiva Beej Mantra chanting with the buyer's Gotra before shipment.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              paddingTop: "6px",
              borderTop: "1px dashed #d9c6b3",
              fontSize: "10.5px",
              color: "#7a4a24",
              fontWeight: "600"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <ShieldCheck size={12} color="#16a34a" /> 100% Authentic Guarantee
            </span>
            <span>•</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={12} color="#99582a" /> Dispatches in 24h
            </span>
          </div>
        </div>

        {/* 6. Free Gifts / Inclusions Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #ebd9c8",
            borderRadius: "14px",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>🎁</span>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#2b170d" }}>
                Free Sacred Inclusions
              </div>
              <div style={{ fontSize: "10.5px", color: "#806f62" }}>
                Govt. Lab Certificate + Red Silk Thread + Gangajal
              </div>
            </div>
          </div>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534" }}>
            FREE (₹950)
          </span>
        </div>
      </div>

      {/* 7. Sticky Bottom Payment / Checkout Bar */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#ffffff",
          borderTop: "1.5px solid #ebd9c8",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          boxShadow: "0 -4px 16px rgba(43, 23, 13, 0.08)",
          zIndex: 30
        }}
      >
        <div>
          <div style={{ fontSize: "10.5px", color: "#806f62", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Total Amount
          </div>
          <div style={{ fontSize: "19px", fontWeight: "800", color: "#2b170d", lineHeight: "1.1" }}>
            ₹{totalPrice.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "9.5px", color: "#166534", fontWeight: "700" }}>
            ✓ Free Insured Delivery
          </div>
        </div>

        <button
          type="button"
          onClick={onProceed}
          style={{
            flex: 1,
            maxWidth: "220px",
            background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            padding: "13px 16px",
            fontSize: "14px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            cursor: "pointer",
            boxShadow: "0 3px 10px rgba(184, 138, 88, 0.35)"
          }}
        >
          <span>Proceed to Checkout</span>
          <ArrowRight size={16} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
