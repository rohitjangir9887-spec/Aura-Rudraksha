import React from "react";
import { motion } from "framer-motion";
import { 
  BadgeCheck, 
  Flower2, 
  ShieldCheck, 
  Lock, 
  PackageCheck, 
  ShieldAlert,
  CheckCircle2
} from "lucide-react";
import { db } from "../lib/db";
import { useCart } from "../hooks/useCart";

export function AuraTrustFeatureBar() {
  const { totals } = useCart();
  const shippingThreshold = totals?.freeShippingThreshold ?? (db.getSettings()?.freeShippingThreshold ?? 0);

  const features = [
    {
      id: "authentic",
      icon: BadgeCheck,
      title: "100% Authentic",
      subtitle: "Govt. Lab Certified",
      color: "#a54d2b",
      bgColor: "linear-gradient(135deg, #fdf6ec 0%, #f7ebd9 100%)",
      borderColor: "#faeedb"
    },
    {
      id: "consecration",
      icon: Flower2,
      title: "Vedic Consecration",
      subtitle: "Pran Pratishtha Puja",
      color: "#b85d25",
      bgColor: "linear-gradient(135deg, #fdf6ec 0%, #f7ebd9 100%)",
      borderColor: "#faeedb"
    },
    {
      id: "origin",
      icon: ShieldCheck,
      title: "Himalayan Origin",
      subtitle: "Nepal & Java Beads",
      color: "#8e3d1e",
      bgColor: "linear-gradient(135deg, #fdf6ec 0%, #f7ebd9 100%)",
      borderColor: "#faeedb"
    },
    {
      id: "shipping",
      icon: PackageCheck,
      title: "Free Express Delivery",
      subtitle: shippingThreshold > 0 ? `Orders Above ₹${shippingThreshold}` : "On All Sacred Orders",
      color: "#a54d2b",
      bgColor: "linear-gradient(135deg, #fdf6ec 0%, #f7ebd9 100%)",
      borderColor: "#faeedb"
    },
    {
      id: "secure_payment",
      icon: Lock,
      title: "100% Secure Payment",
      subtitle: "PayU 256-Bit SSL Encryption",
      color: "#166534",
      bgColor: "#f0fdf4",
      borderColor: "#bbf7d0",
      highlight: true
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="aura-trust-feature-container"
      style={{
        maxWidth: 1240,
        width: "94%",
        margin: "-48px auto 36px",
        position: "relative",
        zIndex: 20
      }}
    >
      <div 
        className="aura-trust-bar-card"
        style={{
          background: "#ffffff",
          border: "1px solid #ebdccb",
          borderRadius: 18,
          boxShadow: "0 10px 32px rgba(43, 23, 13, 0.06)",
          padding: "16px 14px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Ambient Top Subtle Gold Accent Line */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, #a54d2b 0%, #e2934b 50%, #a54d2b 100%)",
          opacity: 0.9
        }} />

        {/* All-in-One Non-Swiping Responsive Grid */}
        <div className="aura-trust-unified-grid">
          {features.map((item) => {
            const Icon = item.icon;
            const isSecure = item.id === "secure_payment";

            return (
              <div 
                key={item.id}
                className={`aura-trust-card ${isSecure ? "aura-trust-card-secure" : ""}`}
              >
                {/* Icon Box */}
                <div 
                  className="aura-trust-icon-box"
                  style={{
                    borderRadius: 10,
                    background: item.bgColor,
                    border: `1px solid ${item.borderColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: item.color,
                    boxShadow: "0 2px 5px rgba(0,0,0,0.02)"
                  }}
                >
                  <Icon size={20} strokeWidth={1.9} />
                </div>

                {/* Text Block */}
                <div className="aura-trust-text-block">
                  <div className="aura-trust-title">
                    {item.title}
                  </div>
                  <div className="aura-trust-subtitle">
                    {item.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
