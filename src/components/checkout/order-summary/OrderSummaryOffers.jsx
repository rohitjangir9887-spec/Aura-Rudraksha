import React from "react";
import { Sparkles } from "lucide-react";
import { money } from "../../../data";

export function OrderSummaryOffers({
  isReceipt,
  appliedCoupon,
  featuredOffers,
  handleSelectOffer,
  subtotal
}) {
  if (isReceipt || appliedCoupon) return null;

  return (
    <div id="order-summary-offers-section" style={{ marginTop: "14px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: "700", color: "#2b170d" }}>
          <Sparkles size={14} color="#8c2b10" strokeWidth={2} />
          <span>Available Offers</span>
        </div>

        <div
          style={{
            background: "#fbf0dc",
            border: "1px solid #ebd29f",
            color: "#8c2b10",
            fontSize: "10px",
            fontWeight: "700",
            padding: "2px 7px",
            borderRadius: "999px",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px"
          }}
        >
          <span>★ Best Value</span>
        </div>
      </div>

      {/* Selectable Offer Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {featuredOffers.map((offer) => {
          const savingsVal = offer.calcSavings(subtotal || 1000);

          return (
            <div
              key={offer.code}
              id={`offer-card-${offer.code}`}
              onClick={() => handleSelectOffer(offer.code)}
              style={{
                background: "#ffffff",
                border: "1px solid #ebdccb",
                borderRadius: "10px",
                padding: "9px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#8c2b10";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(140, 43, 16, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ebdccb";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Left: Radio + Code + Description */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "1.5px solid #d4c3b3",
                    background: "transparent",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                />

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: "12px",
                        fontWeight: "800",
                        color: "#2b170d",
                        letterSpacing: "0.5px"
                      }}
                    >
                      {offer.code}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6e5d50",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {offer.description}
                  </div>
                </div>
              </div>

              {/* Right: Savings Badge */}
              <div
                style={{
                  background: "#f0f9f2",
                  border: "1px solid #cbe6d2",
                  color: "#166534",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                  flexShrink: 0
                }}
              >
                You save {money(savingsVal)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
