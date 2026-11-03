import React, { useState } from "react";
import { Award, CheckCircle2, ShieldCheck, Sparkles, Droplets, Leaf } from "lucide-react";
import { isRudrakshaProduct } from "../../lib/productHelper";
import { SacredPujaCertificateModal } from "../SacredPujaCertificateModal";

export function ProductTrustBadges({ product }) {
  const [showCertModal, setShowCertModal] = useState(false);

  if (!product) return null;

  const isRudraksha = isRudrakshaProduct(product);
  const catLower = (product.category || "").toLowerCase();
  const nameLower = (product.name || "").toLowerCase();
  const isIdolOrYantra = catLower.includes("idol") || catLower.includes("god") || catLower.includes("statue") || catLower.includes("murti") || catLower.includes("yantra") || nameLower.includes("idol") || nameLower.includes("statue") || nameLower.includes("yantra");
  const isMala = catLower.includes("mala") || nameLower.includes("mala") || nameLower.includes("108");
  const isCrystalOrSphatik = nameLower.includes("sphatik") || nameLower.includes("spatika") || nameLower.includes("crystal") || catLower.includes("crystal");

  const hasCert = Boolean(
    product.hasCertificate === true || 
    (product.certificate && (product.certificate.url || product.certificate.number)) ||
    (product.labCertificate && product.labCertificate !== "")
  );

  const originText = product.origin && !product.origin.toLowerCase().includes("nepal")
    ? product.origin 
    : (isRudraksha ? "Nepali Origin" : isIdolOrYantra ? "Consecrated Idol" : "Holy Haridwar / Kashi");

  if (!isRudraksha) {
    const purityText = isCrystalOrSphatik 
      ? "100% Natural Quartz" 
      : isMala 
      ? "108+1 Consecrated" 
      : isIdolOrYantra 
      ? "100% Divine Craft" 
      : "100% Pure & Sattvic";

    return (
      <>
        <div className="aura-product-trust-chips-row">
          <div className="aura-trust-chip">
            <Sparkles size={12} className="chip-icon gold" />
            <span>{purityText}</span>
          </div>

          {hasCert ? (
            <div 
              className="aura-trust-chip" 
              onClick={() => setShowCertModal(true)}
              style={{ cursor: "pointer" }}
              title="Click to view Authenticity Certificate"
            >
              <Award size={12} className="chip-icon gold" />
              <span>Lab Certified 👁</span>
            </div>
          ) : (
            <div className="aura-trust-chip">
              <Droplets size={12} className="chip-icon gold" />
              <span>Vedic Sanctified</span>
            </div>
          )}

          <div className="aura-trust-chip">
            <ShieldCheck size={12} className="chip-icon green" />
            <span>{originText}</span>
          </div>

          <div className="aura-trust-chip">
            <Award size={12} className="chip-icon copper" />
            <span>{isIdolOrYantra ? "Handcrafted Quality" : isCrystalOrSphatik ? "Cooling Bio-Resonance" : "Chemical-Free & Pure"}</span>
          </div>
        </div>

        {hasCert && (
          <SacredPujaCertificateModal
            isOpen={showCertModal}
            onClose={() => setShowCertModal(false)}
            product={product}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="aura-product-trust-chips-row">
        <div className="aura-trust-chip">
          <Sparkles size={12} className="chip-icon gold" />
          <span>100% Natural Seed</span>
        </div>

        {hasCert ? (
          <div 
            className="aura-trust-chip" 
            onClick={() => setShowCertModal(true)}
            style={{ cursor: "pointer" }}
            title="Click to view Specimen Lab Certificate"
          >
            <Award size={12} className="chip-icon gold" />
            <span>Govt. Lab Certified 👁</span>
          </div>
        ) : (
          <div className="aura-trust-chip">
            <Award size={12} className="chip-icon gold" />
            <span>Authenticity Guaranteed</span>
          </div>
        )}

        <div className="aura-trust-chip">
          <ShieldCheck size={12} className="chip-icon green" />
          <span>{originText}</span>
        </div>

        <div 
          className="aura-trust-chip"
          onClick={() => hasCert && setShowCertModal(true)}
          style={{ cursor: hasCert ? "pointer" : "default" }}
          title="Vedic Sanctification details"
        >
          <Droplets size={12} className="chip-icon copper" />
          <span>Vedic Energized</span>
        </div>
      </div>

      {hasCert && (
        <SacredPujaCertificateModal
          isOpen={showCertModal}
          onClose={() => setShowCertModal(false)}
          product={product}
        />
      )}
    </>
  );
}

