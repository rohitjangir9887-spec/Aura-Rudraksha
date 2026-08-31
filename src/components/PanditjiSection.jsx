import React from "react";
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Award, 
  Lock, 
  Truck, 
  Headphones,
  MessageCircle 
} from "lucide-react";

export function PanditjiSection() {
  const handleTalkToAstrologer = () => {
    // Try opening Aura AI floating window first
    const floatBtn = document.getElementById("aura-ai-floating-toggle");
    if (floatBtn) {
      floatBtn.click();
      return;
    }
    // Fallback to direct WhatsApp guidance
    window.open(
      "https://wa.me/919672996531?text=Namaste%20Panditji%2C%20mujhe%20apne%20liye%20sahi%20Rudraksha%20chahiye.%20Kripya%20guidance%20dein.",
      "_blank"
    );
  };

  return (
    <section 
      id="aura-panditji-section"
      className="aura-panditji-section" 
      aria-label="Personalised Vedic Astrologer Rudraksha Guidance"
    >
      <div className="aura-panditji-container">
        {/* TEMPLE & SPIRITUAL BACKGROUND AMBIENCE */}
        <div className="aura-panditji-temple-bg" aria-hidden="true">
          <div className="aura-panditji-arch-glow" />
          <div className="aura-panditji-diya left-diya">
            <div className="diya-base" />
            <div className="diya-flame" />
            <div className="diya-glow" />
          </div>
          <div className="aura-panditji-diya right-diya">
            <div className="diya-base" />
            <div className="diya-flame" />
            <div className="diya-glow" />
          </div>
        </div>

        <div className="aura-panditji-grid">
          {/* LEFT SIDE: 60% CONTENT AREA */}
          <div className="aura-panditji-content">
            <div className="aura-panditji-badge">
              <Sparkles className="aura-panditji-badge-icon" size={14} />
              <span>VEDIC ASTROLOGY CONSULTATION</span>
            </div>

            <h2 className="aura-panditji-heading">
              Not sure which Rudraksha is right for you?
            </h2>

            <p className="aura-panditji-subtext">
              Get personalised guidance from our Vedic astrologer and discover the right Rudraksha for your spiritual journey.
            </p>

            {/* THREE BENEFIT BLOCKS */}
            <div className="aura-panditji-benefits-grid">
              <div className="aura-panditji-benefit-card">
                <div className="aura-panditji-check-icon">
                  <CheckCircle2 size={18} />
                </div>
                <div className="aura-panditji-benefit-text">
                  <h3>PERSONALISED CONSULTATION</h3>
                  <p>One-to-one guidance from our Vedic astrologer</p>
                </div>
              </div>

              <div className="aura-panditji-benefit-card">
                <div className="aura-panditji-check-icon">
                  <CheckCircle2 size={18} />
                </div>
                <div className="aura-panditji-benefit-text">
                  <h3>KUNDALI-BASED RECOMMENDATION</h3>
                  <p>Find the Rudraksha suited to your needs</p>
                </div>
              </div>

              <div className="aura-panditji-benefit-card">
                <div className="aura-panditji-check-icon">
                  <CheckCircle2 size={18} />
                </div>
                <div className="aura-panditji-benefit-text">
                  <h3>WEAR & CARE GUIDANCE</h3>
                  <p>Learn how to wear and care for your Rudraksha</p>
                </div>
              </div>
            </div>

            {/* PRIMARY CTA */}
            <div className="aura-panditji-cta-wrap">
              <button
                type="button"
                onClick={handleTalkToAstrologer}
                className="aura-panditji-cta-btn"
                id="btn-talk-to-astrologer"
              >
                <MessageCircle size={20} />
                <span>TALK TO OUR ASTROLOGER</span>
                <ArrowRight size={18} className="aura-cta-arrow" />
              </button>
            </div>
          </div>

          {/* RIGHT SIDE: 40% HIGH-DEFINITION 3D PANDITJI CHARACTER */}
          <div className="aura-panditji-visual">
            <div className="aura-panditji-stage">
              {/* Soft Temple Pillar & Halo Backdrop */}
              <div className="aura-panditji-mandap-backdrop" aria-hidden="true">
                <div className="mandap-arch" />
                <div className="mandap-sunburst" />
              </div>

              {/* Looping Panditji Video / GIF Animation */}
              <div className="aura-panditji-character-wrapper">
                <video
                  className="aura-panditji-media aura-panditji-video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  disablePictureInPicture
                  controls={false}
                  aria-label="Vedic Astrologer Panditji"
                >
                  <source src="/images/panditji.mp4" type="video/mp4" />
                  <source src="/images/panditji.webm" type="video/webm" />
                  <img
                    src="/images/panditji.gif"
                    alt="Vedic Astrologer Panditji"
                    className="aura-panditji-media aura-panditji-gif"
                    onError={(e) => {
                      e.currentTarget.style.opacity = '0';
                    }}
                  />
                </video>
              </div>
            </div>
          </div>
        </div>

        {/* COMPACT TRUST ROW BELOW HERO GRID */}
        <div className="aura-panditji-trust-row">
          <div className="aura-trust-item">
            <ShieldCheck size={14} className="aura-trust-icon" />
            <span>100% AUTHENTIC</span>
          </div>
          <div className="aura-trust-divider" />
          <div className="aura-trust-item">
            <Award size={14} className="aura-trust-icon" />
            <span>PREMIUM QUALITY</span>
          </div>
          <div className="aura-trust-divider" />
          <div className="aura-trust-item">
            <Lock size={14} className="aura-trust-icon" />
            <span>SECURE PAYMENT</span>
          </div>
          <div className="aura-trust-divider" />
          <div className="aura-trust-item">
            <Truck size={14} className="aura-trust-icon" />
            <span>FREE SHIPPING</span>
          </div>
          <div className="aura-trust-divider" />
          <div className="aura-trust-item">
            <Headphones size={14} className="aura-trust-icon" />
            <span>24/7 SUPPORT</span>
          </div>
        </div>
      </div>
    </section>
  );
}
