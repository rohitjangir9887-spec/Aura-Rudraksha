import React from "react";
import { Truck, RotateCcw, Package, Award, Headphones } from "lucide-react";

export function ProductTrustRow({ freeShippingThreshold = 0 }) {
  return (
    <div className="aura-trust-feature-row">
      <div className="aura-trust-card">
        <div className="trust-icon-wrap">
          <Truck size={20} />
        </div>
        <div className="trust-content">
          <strong className="trust-title">Free Shipping</strong>
          <span className="trust-desc">
            {freeShippingThreshold > 0 ? `On orders above ₹${freeShippingThreshold}` : "Free express shipping pan-India"}
          </span>
        </div>
      </div>

      <div className="aura-trust-card">
        <div className="trust-icon-wrap">
          <RotateCcw size={20} />
        </div>
        <div className="trust-content">
          <strong className="trust-title">7-Day Return</strong>
          <span className="trust-desc">Hassle-free return &amp; full refund</span>
        </div>
      </div>

      <div className="aura-trust-card">
        <div className="trust-icon-wrap">
          <Package size={20} />
        </div>
        <div className="trust-content">
          <strong className="trust-title">Sacred Packaging</strong>
          <span className="trust-desc">Tamper-proof box &amp; velvet pouch</span>
        </div>
      </div>

      <div className="aura-trust-card">
        <div className="trust-icon-wrap">
          <Award size={20} />
        </div>
        <div className="trust-content">
          <strong className="trust-title">Lab Certified</strong>
          <span className="trust-desc">100% genuine Himalayan seed</span>
        </div>
      </div>

      <div className="aura-trust-card">
        <div className="trust-icon-wrap">
          <Headphones size={20} />
        </div>
        <div className="trust-content">
          <strong className="trust-title">Devotee Support</strong>
          <span className="trust-desc">Vedic guidance via WhatsApp</span>
        </div>
      </div>
    </div>
  );
}
