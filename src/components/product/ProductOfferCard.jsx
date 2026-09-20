import React, { useState } from "react";
import { Tag, Copy, Check, Sparkles } from "lucide-react";
import { emitToast } from "../../context/ToastContext";
import { getOfferDisplayTitle } from "../../hooks/useActiveOffer";

export function ProductOfferCard({ coupons = [], activeOffer = null }) {
  const [copiedCode, setCopiedCode] = useState("");

  const offerToUse = activeOffer || ((Array.isArray(coupons) ? coupons.find(c => c.status === "Active") : null));

  if (!offerToUse) return null;

  const code = offerToUse.couponCode || offerToUse.code || "";
  if (!code) return null;

  const discountText = getOfferDisplayTitle(offerToUse);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!code) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    emitToast(`Coupon code "${code}" copied! Apply at checkout.`, "success");
    setTimeout(() => setCopiedCode(""), 2500);
  };

  return (
    <div className="aura-product-offer-box">
      <div className="aura-offer-left">
        <div className="aura-offer-icon-circle">
          <Tag size={16} />
        </div>
        <div className="aura-offer-details">
          <span className="aura-offer-heading">
            <Sparkles size={12} className="gold-sparkle" /> {discountText}
          </span>
          <span className="aura-offer-sub">
            Use code <strong className="aura-code-highlight">{code}</strong> at checkout
          </span>
        </div>
      </div>

      <button
        type="button"
        className={`aura-coupon-copy-btn ${copiedCode === code ? "copied" : ""}`}
        onClick={handleCopy}
        title="Copy coupon code"
      >
        {copiedCode === code ? (
          <>
            <Check size={14} strokeWidth={2.5} />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy size={13} />
            <span>Copy Code</span>
          </>
        )}
      </button>
    </div>
  );
}
