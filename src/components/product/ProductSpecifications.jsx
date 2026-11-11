import React from "react";
import { Check } from "lucide-react";
import { isRudrakshaProduct, formatMukhiLabel } from "../../lib/productHelper";

function formatSpecDisplayValue(val) {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") return String(item);
        if (item && typeof item === "object") return String(item.name || item.label || item.value || "");
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof val === "object") {
    return String(val.name || val.label || val.value || "");
  }
  return String(val);
}

export function ProductSpecifications({ product }) {
  if (!product) return null;

  const isRudraksha = isRudrakshaProduct(product);
  const specs = [];
  const safeNameLower = String(product.name || "").toLowerCase();

  if (product.name) specs.push({ label: "Product Name", value: formatSpecDisplayValue(product.name) });
  if (product.sku || product.id) specs.push({ label: "Item SKU / Code", value: formatSpecDisplayValue(product.sku || `AR-${product.id}`) });
  if (product.category) specs.push({ label: "Category", value: formatSpecDisplayValue(product.category) });

  if (!isRudraksha) {
    // Specifications for Puja Samagri & General Spiritual Products
    specs.push({ 
      label: "Material / Ingredients", 
      value: formatSpecDisplayValue(product.material || "100% Pure, Natural & Chemical-Free Ingredients")
    });
    specs.push({ 
      label: "Net Quantity / Weight", 
      value: formatSpecDisplayValue(product.netWeight || product.size || "Standard Devotional Pack")
    });
    specs.push({ 
      label: "Purity Grade", 
      value: formatSpecDisplayValue(product.purity || "100% Pure & Sattvic (Free from Charcoal, Toxic Chemicals & Artificial Perfumes)")
    });
    specs.push({ 
      label: "Sacred Sourcing", 
      value: formatSpecDisplayValue(product.origin || "Ethically Sourced from Holy Pilgrimage Regions (Haridwar / Kashi)")
    });
    specs.push({ 
      label: "Consecration (Prana Pratishtha)", 
      value: formatSpecDisplayValue(product.sanctification || "Purified with Holy Haridwar Ganga Jal & Vedic Mantra Chants")
    });
    specs.push({ 
      label: "Ideal Ritual Usage", 
      value: formatSpecDisplayValue(product.usageGuide || "Daily Home Mandir Aarti, Hawan, Dhyana & Festive Puja")
    });
    specs.push({ 
      label: "Packaging", 
      value: "Airtight Hermetically Sealed Moisture-Proof Packaging" 
    });
    specs.push({ 
      label: "Purity Guarantee", 
      value: "100% Sattvic & Devotee Satisfaction Guarantee" 
    });

    return (
      <div className="aura-specs-table-wrapper">
        <div className="aura-specs-grid">
          {specs.filter(item => item.value).map((item, idx) => (
            <div key={idx} className="aura-spec-row">
              <span className="spec-name">{item.label}</span>
              <strong className="spec-val">{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Rudraksha Specific Specifications
  if (product.mukhi || product.mukhiCount) {
    specs.push({ label: "Mukhi / Faces", value: `${formatMukhiLabel(product.mukhi || product.mukhiCount)} (Natural Lines)` });
  }

  specs.push({ label: "Origin", value: formatSpecDisplayValue(product.origin || "Himalayan Region (Nepal)") });
  
  if (product.rulingDeity || product.deity) {
    specs.push({ label: "Ruling Deity", value: formatSpecDisplayValue(product.rulingDeity || product.deity) });
  } else if (safeNameLower.includes("14 mukhi")) {
    specs.push({ label: "Ruling Deity", value: "Lord Shiva & Lord Hanuman (Deva Mani)" });
  } else if (safeNameLower.includes("1 mukhi")) {
    specs.push({ label: "Ruling Deity", value: "Lord Shiva (Paramashiva)" });
  } else if (safeNameLower.includes("5 mukhi")) {
    specs.push({ label: "Ruling Deity", value: "Lord Shiva (Kalagni Rudra)" });
  } else if (safeNameLower.includes("7 mukhi")) {
    specs.push({ label: "Ruling Deity", value: "Goddess Mahalakshmi" });
  } else if (safeNameLower.includes("11 mukhi")) {
    specs.push({ label: "Ruling Deity", value: "Lord Hanuman (Ekadasha Rudra)" });
  }

  if (product.rulingPlanet) {
    specs.push({ label: "Ruling Planet", value: formatSpecDisplayValue(product.rulingPlanet) });
  } else if (safeNameLower.includes("14 mukhi")) {
    specs.push({ label: "Ruling Planet", value: "Saturn (Shani) & Mars (Mangal)" });
  } else if (safeNameLower.includes("1 mukhi")) {
    specs.push({ label: "Ruling Planet", value: "Sun (Surya)" });
  } else if (safeNameLower.includes("5 mukhi")) {
    specs.push({ label: "Ruling Planet", value: "Jupiter (Brihaspati)" });
  } else if (safeNameLower.includes("7 mukhi")) {
    specs.push({ label: "Ruling Planet", value: "Venus (Shukra) & Saturn (Shani)" });
  }

  const zodiacFormatted = formatSpecDisplayValue(product.zodiac || product.zodiacSign);
  if (zodiacFormatted) {
    specs.push({ label: "Suitable Zodiac (Rashi)", value: zodiacFormatted });
  }

  specs.push({ label: "Seed Structure", value: "100% Natural, Uncut, Non-Polished Elaeocarpus ganitrus" });
  specs.push({ label: "Bead Dimension", value: formatSpecDisplayValue(product.size || "16 mm – 22 mm (Collector Grade)") });
  specs.push({ label: "Color / Finish", value: formatSpecDisplayValue(product.color || "Natural Brown Himalayan Tone") });
  specs.push({ label: "Consecration (Siddhi)", value: "Prana Pratishtha with Ganga Jal, Bhasma & Vedic Mantras" });
  specs.push({ 
    label: "Authenticity", 
    value: product.hasCertificate === true 
      ? "Government Recognized Gemological Lab Certificate Included" 
      : "100% Authentic & Vedic Energized Guarantee" 
  });

  return (
    <div className="aura-specs-table-wrapper">
      <div className="aura-specs-grid">
        {specs.filter(item => item.value).map((item, idx) => (
          <div key={idx} className="aura-spec-row">
            <span className="spec-name">{item.label}</span>
            <strong className="spec-val">{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

