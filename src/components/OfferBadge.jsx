import React from "react";
import { Gift } from "lucide-react";
import { useActiveOffer } from "../hooks/useActiveOffer";

/**
 * Premium Offer Badge for Product Cards & Gallery view
 */
export function OfferBadge({ product = null, variant = "card" }) {
  const { offer, isActive } = useActiveOffer(product);

  if (!isActive || !offer) return null;

  // Check feature toggles from offer config
  if (variant === "card" && offer.productCardEnabled === false) return null;
  if (variant === "image" && offer.imageBadgeEnabled === false) return null;

  const title = offer.title || "₹200 OFF";
  const code = offer.couponCode || "";
  const subtitle = offer.subtitle || "LIMITED OFFER";

  // Palette from active offer or default Aura luxury theme
  const bgColor = offer.badgeColor || offer.backgroundColor || "#2b170d";
  const textColor = offer.textColor || "#fbf5ef";
  const accentColor = offer.accentColor || "#c89b3c";

  if (variant === "image") {
    return (
      <div 
        className="aura-offer-image-badge"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          borderColor: accentColor
        }}
      >
        <div className="aura-badge-icon-box" style={{ color: accentColor }}>
          <Gift size={12} strokeWidth={2.4} />
        </div>
        <div className="aura-badge-content">
          <span className="aura-badge-title" style={{ color: textColor }}>{title}</span>
          {code && (
            <span className="aura-badge-code" style={{ color: accentColor }}>
              {code}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="aura-product-card-offer-badge"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        border: `1px solid ${accentColor}40`
      }}
      title={`${title} - Use Code: ${code}`}
      onClick={(e) => {
        if (code && navigator.clipboard) {
          e.stopPropagation();
          navigator.clipboard.writeText(code);
        }
      }}
    >
      <div className="badge-pulse-glow" style={{ background: accentColor }} />
      <div className="badge-inner">
        <div className="badge-header-row">
          <span className="badge-gift-icon" style={{ color: accentColor }}>🎁</span>
          <span className="badge-headline" style={{ color: textColor }}>{title}</span>
        </div>
        {code && (
          <div className="badge-code-chip" style={{ background: "rgba(255, 255, 255, 0.12)", color: accentColor, border: `1px solid ${accentColor}60` }}>
            {code}
          </div>
        )}
      </div>
    </div>
  );
}
