import React from "react";
import { Sparkles, ArrowRight, ShieldCheck, PackageCheck, Award, Flame } from "lucide-react";

export function WhyAuraSection() {
  return (
    <section className="aura-editorial-wrapper" id="about" aria-label="The Aura Editorial">
      <div className="aura-editorial-container">
        
        {/* 1. SECTION HEADER */}
        <div className="aura-editorial-header">
          <div className="aura-editorial-eyebrow-wrap">
            <Sparkles size={13} className="aura-editorial-sparkle" />
            <span className="aura-editorial-eyebrow">THE AURA SACRED COLLECTION</span>
            <Sparkles size={13} className="aura-editorial-sparkle" />
          </div>
          
          <h2 className="aura-editorial-title">
            The Aura Sacred Collection ⭐
          </h2>
          
          <p className="aura-editorial-subtitle">
            Timeless Rudraksha, Chosen for Your Spiritual Journey
          </p>
        </div>

        {/* 2. ASYMMETRIC BENTO EDITORIAL GRID */}
        <div className="aura-editorial-grid">
          
          {/* Left Hero Card (Large 1.35fr) */}
          <div
            id="btn-editorial-hero-malas"
            className="aura-editorial-hero-card group"
            aria-label="Explore Sacred Japa and Dhyana Malas"
          >
            <div className="aura-editorial-img-wrap">
              <img
                src="https://i.ibb.co/G4XWVbHR/file-000000008f508206b947f8cd82988acb.png"
                alt="Sacred Japa & Dhyana Himalayan Malas"
                className="aura-editorial-img"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "/images/product-5mukhi.jpg";
                }}
              />
            </div>
          </div>

          {/* Right Bento Column */}
          <div className="aura-editorial-right-col">
            
            {/* Sub-Card 1: 1 to 14 Mukhi Beads */}
            <div
              id="card-editorial-mukhis"
              className="aura-editorial-subcard group"
              aria-label="Explore 1 to 14 Mukhi Nepali Rudraksha Beads"
            >
              <div className="aura-editorial-img-wrap">
                <img
                  src="https://i.ibb.co/nMzc8B8k/file-00000000243482118ca7430425cda1ba.png"
                  alt="Certified Nepali Mukhi Rudraksha Beads"
                  className="aura-editorial-img"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "/images/product-7mukhi.jpg";
                  }}
                />
              </div>
            </div>

            {/* Sub-Card 2: Sacred Wrist Bracelets */}
            <div
              id="card-editorial-bracelets"
              className="aura-editorial-subcard group"
              aria-label="Explore Sacred Wrist Bracelets"
            >
              <div className="aura-editorial-img-wrap">
                <img
                  src="https://i.ibb.co/v6qncJqn/file-000000009b148211a15f486f2796884a.png"
                  alt="Sacred Wrist Bracelets with Rudraksha"
                  className="aura-editorial-img"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "/images/product-11mukhi.jpg";
                  }}
                />
              </div>
            </div>

            {/* Sub-Card 3: Full Width Puja & Consecration */}
            <div
              id="card-editorial-puja"
              className="aura-editorial-subcard aura-editorial-subcard-full group"
              aria-label="Explore Puja Essentials and Brass Diyas"
            >
              <div className="aura-editorial-img-wrap">
                <img
                  src="https://i.ibb.co/GQR7sCpS/file-00000000567c8211bf9d0bc607e701c0.png"
                  alt="Vedic Consecration & Brass Diyas"
                  className="aura-editorial-img"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "/images/product-1mukhi.jpg";
                  }}
                />
              </div>
            </div>

          </div>

        </div>

        {/* 3. THREE TRUST HIGHLIGHTS */}
        <div className="aura-editorial-trust-strip">
          <div className="aura-editorial-trust-item">
            <div className="aura-editorial-trust-icon terracotta">
              <ShieldCheck size={22} strokeWidth={1.8} />
            </div>
            <div className="aura-editorial-trust-text">
              <h4 className="aura-editorial-trust-h">Lab Tested &amp; Certified</h4>
              <p className="aura-editorial-trust-p">100% Genuine Himalayan Origin</p>
            </div>
          </div>

          <div className="aura-editorial-trust-item">
            <div className="aura-editorial-trust-icon gold">
              <Sparkles size={22} strokeWidth={1.8} />
            </div>
            <div className="aura-editorial-trust-text">
              <h4 className="aura-editorial-trust-h">Energized Before Dispatch</h4>
              <p className="aura-editorial-trust-p">Sanctified with Vedic Mantras</p>
            </div>
          </div>

          <div className="aura-editorial-trust-item">
            <div className="aura-editorial-trust-icon terracotta">
              <PackageCheck size={22} strokeWidth={1.8} />
            </div>
            <div className="aura-editorial-trust-text">
              <h4 className="aura-editorial-trust-h">Sacred Velvet Packaging</h4>
              <p className="aura-editorial-trust-p">Delivered Safely with Certificate</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
