import React from "react";
import { Award, CheckCircle2, ShieldCheck, Sparkles, Droplets, Leaf } from "lucide-react";
import { isRudrakshaProduct } from "../../lib/productHelper";

export function ProductTrustBadges({ product }) {
  if (!product) return null;

  const isRudraksha = isRudrakshaProduct(product);
  const originText = product.origin || (isRudraksha ? "Nepali Origin" : "Holy Kashi / Haridwar");

  if (!isRudraksha) {
    return (
      <div className="aura-product-trust-chips-row">
        <div className="aura-trust-chip">
          <Leaf size={12} className="chip-icon green" />
          <span>100% Pure &amp; Natural</span>
        </div>

        <div className="aura-trust-chip">
          <Droplets size={12} className="chip-icon gold" />
          <span>Vedic Sanctified</span>
        </div>

        <div className="aura-trust-chip">
          <ShieldCheck size={12} className="chip-icon green" />
          <span>{originText}</span>
        </div>

        <div className="aura-trust-chip">
          <Sparkles size={12} className="chip-icon copper" />
          <span>Chemical-Free &amp; Sattvic</span>
        </div>
      </div>
    );
  }

  return (
    <div className="aura-product-trust-chips-row">
      <div className="aura-trust-chip">
        <Sparkles size={12} className="chip-icon gold" />
        <span>100% Natural Seed</span>
      </div>

      <div className="aura-trust-chip">
        <Award size={12} className="chip-icon gold" />
        <span>{product.hasCertificate !== false ? "Govt. Lab Certified" : "Authenticity Guaranteed"}</span>
      </div>

      <div className="aura-trust-chip">
        <ShieldCheck size={12} className="chip-icon green" />
        <span>{originText}</span>
      </div>

      <div className="aura-trust-chip">
        <Droplets size={12} className="chip-icon copper" />
        <span>Vedic Energized</span>
      </div>
    </div>
  );
}

