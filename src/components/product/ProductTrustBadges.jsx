import React from "react";
import { Award, CheckCircle2, ShieldCheck, Sparkles, Droplets } from "lucide-react";

export function ProductTrustBadges({ product }) {
  if (!product) return null;

  const originText = product.origin || "Nepali Origin";

  return (
    <div className="aura-product-trust-chips-row">
      <div className="aura-trust-chip">
        <Sparkles size={12} className="chip-icon gold" />
        <span>100% Natural Seed</span>
      </div>

      <div className="aura-trust-chip">
        <Award size={12} className="chip-icon gold" />
        <span>Govt. Lab Certified</span>
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
