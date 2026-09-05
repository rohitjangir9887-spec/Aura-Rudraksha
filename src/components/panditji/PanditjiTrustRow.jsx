import React from "react";
import { ShieldCheck, Award, Lock, Truck, Headphones } from "lucide-react";

export function PanditjiTrustRow() {
  return (
    <div className="aura-panditji-trust-row" style={{ marginTop: 18 }}>
      <div className="aura-trust-item">
        <ShieldCheck size={13} className="aura-trust-icon" />
        <span>100% AUTHENTIC NEPAL</span>
      </div>
      <div className="aura-trust-divider" />
      <div className="aura-trust-item">
        <Award size={13} className="aura-trust-icon" />
        <span>GOVT LAB CERTIFIED</span>
      </div>
      <div className="aura-trust-divider" />
      <div className="aura-trust-item">
        <Lock size={13} className="aura-trust-icon" />
        <span>SECURE CHECKOUT</span>
      </div>
      <div className="aura-trust-divider" />
      <div className="aura-trust-item">
        <Truck size={13} className="aura-trust-icon" />
        <span>FREE DEVOTIONAL DELIVERY</span>
      </div>
      <div className="aura-trust-divider" />
      <div className="aura-trust-item">
        <Headphones size={13} className="aura-trust-icon" />
        <span>24/7 VEDIC SUPPORT</span>
      </div>
    </div>
  );
}
