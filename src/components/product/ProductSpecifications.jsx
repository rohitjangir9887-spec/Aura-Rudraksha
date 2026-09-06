import React from "react";
import { Check } from "lucide-react";

export function ProductSpecifications({ product }) {
  if (!product) return null;

  const specs = [];

  if (product.name) specs.push({ label: "Product Name", value: product.name });
  if (product.sku || product.id) specs.push({ label: "Item SKU / Code", value: product.sku || `AR-${product.id}` });
  if (product.category) specs.push({ label: "Category", value: product.category });
  
  if (product.mukhi || product.mukhiCount) {
    specs.push({ label: "Mukhi / Faces", value: `${product.mukhi || product.mukhiCount} Mukhi (Natural Lines)` });
  }

  specs.push({ label: "Origin", value: product.origin || "Himalayan Region (Nepal)" });
  
  if (product.rulingDeity) {
    specs.push({ label: "Ruling Deity", value: product.rulingDeity });
  } else if (product.name.toLowerCase().includes("14 mukhi")) {
    specs.push({ label: "Ruling Deity", value: "Lord Shiva & Lord Hanuman (Deva Mani)" });
  } else if (product.name.toLowerCase().includes("1 mukhi")) {
    specs.push({ label: "Ruling Deity", value: "Lord Shiva (Paramashiva)" });
  } else if (product.name.toLowerCase().includes("5 mukhi")) {
    specs.push({ label: "Ruling Deity", value: "Lord Shiva (Kalagni Rudra)" });
  } else if (product.name.toLowerCase().includes("7 mukhi")) {
    specs.push({ label: "Ruling Deity", value: "Goddess Mahalakshmi" });
  } else if (product.name.toLowerCase().includes("11 mukhi")) {
    specs.push({ label: "Ruling Deity", value: "Lord Hanuman (Ekadasha Rudra)" });
  }

  if (product.rulingPlanet) {
    specs.push({ label: "Ruling Planet", value: product.rulingPlanet });
  } else if (product.name.toLowerCase().includes("14 mukhi")) {
    specs.push({ label: "Ruling Planet", value: "Saturn (Shani) & Mars (Mangal)" });
  } else if (product.name.toLowerCase().includes("1 mukhi")) {
    specs.push({ label: "Ruling Planet", value: "Sun (Surya)" });
  } else if (product.name.toLowerCase().includes("5 mukhi")) {
    specs.push({ label: "Ruling Planet", value: "Jupiter (Brihaspati)" });
  } else if (product.name.toLowerCase().includes("7 mukhi")) {
    specs.push({ label: "Ruling Planet", value: "Venus (Shukra) & Saturn (Shani)" });
  }

  if (product.zodiac || product.zodiacSign) {
    specs.push({ label: "Suitable Zodiac (Rashi)", value: product.zodiac || product.zodiacSign });
  }

  specs.push({ label: "Seed Structure", value: "100% Natural, Uncut, Non-Polished Elaeocarpus ganitrus" });
  specs.push({ label: "Bead Dimension", value: product.size || "16 mm – 22 mm (Collector Grade)" });
  specs.push({ label: "Color / Finish", value: product.color || "Natural Brown Himalayan Tone" });
  specs.push({ label: "Consecration (Siddhi)", value: "Prana Pratishtha with Ganga Jal, Bhasma & Vedic Mantras" });
  specs.push({ label: "Lab Certificate", value: "Government Recognized Gemological Lab Certificate Included" });

  return (
    <div className="aura-specs-table-wrapper">
      <div className="aura-specs-grid">
        {specs.map((item, idx) => (
          <div key={idx} className="aura-spec-row">
            <span className="spec-name">{item.label}</span>
            <strong className="spec-val">{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
