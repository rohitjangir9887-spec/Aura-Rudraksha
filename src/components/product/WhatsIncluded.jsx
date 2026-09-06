import React from "react";
import { Package, Award, Droplets, BookOpen, ShieldCheck, Gift } from "lucide-react";

export function WhatsIncluded({ product }) {
  const items = [
    {
      icon: <Gift size={22} className="inc-icon" />,
      title: product?.name || "1x Authentic Sacred Rudraksha Bead",
      desc: "Carefully inspected for symmetrical mukhi lines, natural density, and spiritual integrity."
    },
    {
      icon: <Award size={22} className="inc-icon" />,
      title: "1x Government Recognized Lab Certificate",
      desc: "Physical laminated card with unique specimen identification number and gemological testing stamp."
    },
    {
      icon: <Droplets size={22} className="inc-icon" />,
      title: "1x Consecrated Ganga Jal & Bhasma Pouch",
      desc: "Holy Gangotri जल and sacred ash from Vedic Hawan to preserve the bead's consecrated energy."
    },
    {
      icon: <Package size={22} className="inc-icon" />,
      title: "1x Luxury Royal Velvet Storage Pouch",
      desc: "Premium silk-lined drawstring pouch to safeguard the sacred bead when not being worn."
    },
    {
      icon: <BookOpen size={22} className="inc-icon" />,
      title: "1x Vedic Wearing & Beej Mantra Guide",
      desc: "Step-by-step instructions on auspicious muhurta, morning purification ritual, and chanting rules."
    },
    {
      icon: <ShieldCheck size={22} className="inc-icon" />,
      title: "1x Tamper-Proof Protective Packaging",
      desc: "Heavy-duty shock-absorbing outer box with secure hologram seal for 100% transit safety."
    }
  ];

  return (
    <div className="aura-whats-included-container">
      <div className="aura-whats-included-grid">
        {items.map((item, idx) => (
          <div key={idx} className="aura-included-card">
            <div className="included-icon-box">
              {item.icon}
            </div>
            <div className="included-info">
              <h4 className="included-item-title">{item.title}</h4>
              <p className="included-item-desc">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
