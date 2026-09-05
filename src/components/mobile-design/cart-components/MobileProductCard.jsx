import React from "react";
import { Check, Heart, Trash2, Plus, Minus } from "lucide-react";

export function MobileProductCard({
  qty,
  isWishlisted,
  totalPrice,
  totalMrp,
  totalSavings,
  onMinus,
  onPlus,
  onWishlistToggle
}) {
  return (
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
            onClick={onMinus}
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
            onClick={onPlus}
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
            onClick={onWishlistToggle}
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
  );
}
