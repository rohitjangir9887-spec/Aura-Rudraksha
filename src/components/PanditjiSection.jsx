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

              {/* Realistic 3D Commercial Panditji SVG */}
              <div className="aura-panditji-character-wrapper">
                <svg
                  className="aura-panditji-svg"
                  viewBox="0 0 420 540"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Vedic Astrologer Panditji Character"
                >
                  <defs>
                    {/* Skin Gradients & Highlights */}
                    <linearGradient id="pjSkinGrad" x1="210" y1="100" x2="210" y2="280" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#E5B28F" />
                      <stop offset="45%" stopColor="#D4936A" />
                      <stop offset="85%" stopColor="#C17A50" />
                      <stop offset="100%" stopColor="#A35E35" />
                    </linearGradient>

                    <radialGradient id="pjFaceLight" cx="45%" cy="30%" r="50%">
                      <stop offset="0%" stopColor="#FFE0CC" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#D4936A" stopOpacity="0" />
                    </radialGradient>

                    {/* Premium Cream Silk Kurta Gradient */}
                    <linearGradient id="pjKurtaGrad" x1="120" y1="260" x2="300" y2="530" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="35%" stopColor="#FAF5E8" />
                      <stop offset="70%" stopColor="#EFE5D0" />
                      <stop offset="100%" stopColor="#D9CBAC" />
                    </linearGradient>

                    {/* Kurta Fabric Shading Overlay */}
                    <linearGradient id="pjKurtaShadow" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#4A0E17" stopOpacity="0.0" />
                      <stop offset="100%" stopColor="#4A0E17" stopOpacity="0.18" />
                    </linearGradient>

                    {/* Saffron Angavastram Stole Gradient */}
                    <linearGradient id="pjSaffronGrad" x1="90" y1="240" x2="330" y2="540" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FFA633" />
                      <stop offset="40%" stopColor="#F27B0C" />
                      <stop offset="80%" stopColor="#D95700" />
                      <stop offset="100%" stopColor="#B33C00" />
                    </linearGradient>

                    {/* Gold Zari Embroidery Gradient */}
                    <linearGradient id="pjGoldGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FFF2B2" />
                      <stop offset="30%" stopColor="#E5C158" />
                      <stop offset="70%" stopColor="#B88A22" />
                      <stop offset="100%" stopColor="#7A560B" />
                    </linearGradient>

                    {/* Rudraksha 3D Bead Shading */}
                    <radialGradient id="pjRudrakshaGrad" cx="35%" cy="30%" r="65%">
                      <stop offset="0%" stopColor="#C96818" />
                      <stop offset="40%" stopColor="#8F3E00" />
                      <stop offset="85%" stopColor="#542100" />
                      <stop offset="100%" stopColor="#301100" />
                    </radialGradient>

                    {/* Drop Shadow */}
                    <filter id="pjGrandShadow" x="-20%" y="-10%" width="140%" height="130%">
                      <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#3B0B12" floodOpacity="0.22" />
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#996515" floodOpacity="0.1" />
                    </filter>
                  </defs>

                  {/* CHARACTER BASE & BODY */}
                  <g className="pj-body-group" filter="url(#pjGrandShadow)">
                    
                    {/* CREAM SILK KURTA BODY */}
                    <path
                      d="M130 270 C 155 255, 265 255, 290 270 C 315 295, 340 440, 345 540 L 75 540 C 80 440, 105 295, 130 270 Z"
                      fill="url(#pjKurtaGrad)"
                    />
                    <path
                      d="M130 270 C 155 255, 265 255, 290 270 C 315 295, 340 440, 345 540 L 75 540 C 80 440, 105 295, 130 270 Z"
                      fill="url(#pjKurtaShadow)"
                    />

                    {/* Kurta Placket & Zari Gold Embroidery */}
                    <path
                      d="M185 260 L210 315 L235 260 C225 270, 195 270, 185 260 Z"
                      fill="url(#pjGoldGrad)"
                    />
                    <line x1="210" y1="315" x2="210" y2="460" stroke="url(#pjGoldGrad)" strokeWidth="4" strokeDasharray="6 3" />

                    {/* Kurta Buttons */}
                    <circle cx="210" cy="335" r="3" fill="#4A0E17" />
                    <circle cx="210" cy="365" r="3" fill="#4A0E17" />
                    <circle cx="210" cy="395" r="3" fill="#4A0E17" />
                    <circle cx="210" cy="425" r="3" fill="#4A0E17" />

                    {/* SAFFRON ANGAVASTRAM STOLE (SHOULDER DRAPE) */}
                    <path
                      className="pj-stole"
                      d="M115 275 C 140 295, 160 380, 150 540 L 90 540 C 95 420, 90 330, 115 275 Z"
                      fill="url(#pjSaffronGrad)"
                    />
                    {/* Gold Border on Stole */}
                    <path
                      d="M115 275 C 140 295, 160 380, 150 540"
                      stroke="url(#pjGoldGrad)"
                      strokeWidth="3.5"
                      fill="none"
                    />

                    <path
                      className="pj-stole-drape"
                      d="M305 280 C 280 330, 250 420, 255 540 L 315 540 C 325 440, 330 330, 305 280 Z"
                      fill="url(#pjSaffronGrad)"
                      opacity="0.95"
                    />
                    <path
                      d="M305 280 C 280 330, 250 420, 255 540"
                      stroke="url(#pjGoldGrad)"
                      strokeWidth="3.5"
                      fill="none"
                    />

                    {/* SACRED MULTI-LAYER RUDRAKSHA MALAS */}
                    <g className="pj-mala">
                      {/* Outer Mala */}
                      <path d="M165 265 C 175 330, 245 330, 255 265" fill="none" stroke="#542100" strokeWidth="2.5" />
                      {[
                        [165, 265], [172, 282], [183, 300], [197, 315], [210, 320],
                        [223, 315], [237, 300], [248, 282], [255, 265]
                      ].map(([cx, cy], idx) => (
                        <g key={`outer-bead-${idx}`}>
                          <circle cx={cx} cy={cy} r="5.5" fill="url(#pjRudrakshaGrad)" stroke="#FFE082" strokeWidth="0.8" />
                          <circle cx={cx - 1.5} cy={cy - 1.5} r="1.5" fill="#FFECB3" opacity="0.6" />
                        </g>
                      ))}

                      {/* Inner Mala */}
                      <path d="M176 260 C 185 300, 235 300, 244 260" fill="none" stroke="#542100" strokeWidth="2" />
                      {[
                        [176, 260], [183, 275], [195, 288], [210, 293],
                        [225, 288], [237, 275], [244, 260]
                      ].map(([cx, cy], idx) => (
                        <g key={`inner-bead-${idx}`}>
                          <circle cx={cx} cy={cy} r="4.5" fill="url(#pjRudrakshaGrad)" />
                          <circle cx={cx - 1} cy={cy - 1} r="1.2" fill="#FFECB3" opacity="0.6" />
                        </g>
                      ))}
                    </g>

                    {/* NECK */}
                    <path d="M188 230 L188 270 C188 276, 232 276, 232 270 L232 230 Z" fill="url(#pjSkinGrad)" />
                    <path d="M188 250 C202 260, 218 260, 232 250 C218 266, 202 266, 188 250 Z" fill="#9C522B" opacity="0.4" />

                    {/* HEAD GROUP */}
                    <g className="pj-head-group">
                      {/* EARS */}
                      <circle cx="158" cy="180" r="11" fill="url(#pjSkinGrad)" />
                      <circle cx="262" cy="180" r="11" fill="url(#pjSkinGrad)" />
                      <path d="M156 175 C159 180, 159 185, 156 188" stroke="#8A421D" strokeWidth="1.5" fill="none" />
                      <path d="M264 175 C261 180, 261 185, 264 188" stroke="#8A421D" strokeWidth="1.5" fill="none" />

                      {/* REALISTIC 3D FACE STRUCTURE */}
                      <path
                        d="M162 160 C162 105, 258 105, 258 160 C258 215, 234 242, 210 242 C186 242, 162 215, 162 160 Z"
                        fill="url(#pjSkinGrad)"
                      />
                      <path
                        d="M162 160 C162 105, 258 105, 258 160 C258 215, 234 242, 210 242 C186 242, 162 215, 162 160 Z"
                        fill="url(#pjFaceLight)"
                      />

                      {/* DARK SHAPED HAIRSTYLE */}
                      <path
                        d="M158 168 C155 130, 172 90, 210 90 C248 90, 265 130, 262 168 C258 142, 240 108, 210 108 C180 108, 162 142, 158 168 Z"
                        fill="#1A110C"
                      />
                      <path
                        d="M168 125 C180 98, 240 98, 252 125 C240 104, 180 104, 168 125 Z"
                        fill="#2E1D15"
                      />

                      {/* TRADITIONAL VEDIC RED & GOLD TILAK */}
                      <path d="M205 120 L215 120 L214 152 C214 155, 206 155, 206 152 Z" fill="#B30000" />
                      <circle cx="210" cy="154" r="3" fill="#F27B0C" />
                      <path d="M200 135 C206 139, 214 139, 220 135" stroke="#FFE082" strokeWidth="2" fill="none" />

                      {/* EXPRESSIVE EYEBROWS */}
                      <path d="M176 158 C186 153, 196 155, 202 160" stroke="#24160E" strokeWidth="3" strokeLinecap="round" fill="none" />
                      <path d="M244 158 C234 153, 224 155, 218 160" stroke="#24160E" strokeWidth="3" strokeLinecap="round" fill="none" />

                      {/* REALISTIC EYES WITH SPECULAR HIGHLIGHTS */}
                      <g className="pj-eyes-group">
                        <ellipse cx="188" cy="172" rx="8.5" ry="5.5" fill="#FFFFFF" />
                        <ellipse cx="232" cy="172" rx="8.5" ry="5.5" fill="#FFFFFF" />

                        <g className="pj-pupils">
                          <circle cx="188" cy="172" r="4" fill="#241408" />
                          <circle cx="232" cy="172" r="4" fill="#241408" />
                          <circle cx="189.5" cy="170.5" r="1.5" fill="#FFFFFF" />
                          <circle cx="233.5" cy="170.5" r="1.5" fill="#FFFFFF" />
                        </g>

                        {/* Animated Eyelids (Blinking) */}
                        <path className="pj-eyelid-left" d="M178 166 Q188 166 198 166" stroke="#C17A50" strokeWidth="8" strokeLinecap="round" />
                        <path className="pj-eyelid-right" d="M222 166 Q232 166 242 166" stroke="#C17A50" strokeWidth="8" strokeLinecap="round" />
                      </g>

                      {/* NOSE */}
                      <path d="M210 158 L206 192 C206 197, 214 197, 214 192 Z" fill="#BA7248" opacity="0.6" />
                      <path d="M204 193 C207 197, 213 197, 216 193" stroke="#8F4821" strokeWidth="1.8" fill="none" />

                      {/* MOUSTACHE & REASSURING SMILE */}
                      <path
                        d="M185 206 C198 202, 208 206, 210 208 C212 206, 222 202, 235 206 C240 212, 225 216, 210 212 C195 216, 180 212, 185 206 Z"
                        fill="#24160E"
                      />
                      <path
                        className="pj-smile"
                        d="M192 216 Q210 228, 228 216"
                        stroke="#802F17"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </g>

                    {/* ARMS & HANDS (NAMASTE -> WELCOMING GESTURE -> UPWARD POINT -> CTA POINT -> NAMASTE) */}

                    {/* LEFT ARM (Viewer's Left - Panditji's Right Hand) */}
                    <g className="pj-arm-left">
                      <path
                        d="M128 272 C 112 330, 155 390, 196 392"
                        stroke="url(#pjKurtaGrad)"
                        strokeWidth="32"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <circle cx="196" cy="392" r="16" fill="url(#pjGoldGrad)" opacity="0.35" />
                      
                      {/* Wrist Rudraksha Bracelets */}
                      <circle cx="190" cy="386" r="4.5" fill="url(#pjRudrakshaGrad)" />
                      <circle cx="198" cy="392" r="4.5" fill="url(#pjRudrakshaGrad)" />
                      <circle cx="204" cy="398" r="4.5" fill="url(#pjRudrakshaGrad)" />

                      {/* HAND PALM */}
                      <path
                        className="pj-hand-left-palm"
                        d="M190 382 C196 364, 204 346, 207 334 C210 346, 204 370, 198 386 Z"
                        fill="url(#pjSkinGrad)"
                      />
                    </g>

                    {/* RIGHT ARM (Viewer's Right - Panditji's Left Hand) */}
                    <g className="pj-arm-right">
                      <path
                        d="M292 272 C 308 330, 265 390, 224 392"
                        stroke="url(#pjKurtaGrad)"
                        strokeWidth="32"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <circle cx="224" cy="392" r="16" fill="url(#pjGoldGrad)" opacity="0.35" />

                      {/* Wrist Rudraksha Bracelets */}
                      <circle cx="230" cy="386" r="4.5" fill="url(#pjRudrakshaGrad)" />
                      <circle cx="222" cy="392" r="4.5" fill="url(#pjRudrakshaGrad)" />
                      <circle cx="216" cy="398" r="4.5" fill="url(#pjRudrakshaGrad)" />

                      {/* HAND PALM */}
                      <path
                        className="pj-hand-right-palm"
                        d="M230 382 C224 364, 216 346, 213 334 C210 346, 216 370, 222 386 Z"
                        fill="url(#pjSkinGrad)"
                      />
                    </g>

                    {/* NAMASTE JOINED PALMS FRONT HIGHLIGHT */}
                    <g className="pj-namaste-hands">
                      <path
                        d="M198 378 Q210 330 222 378 Z"
                        fill="url(#pjSkinGrad)"
                        stroke="#A35E35"
                        strokeWidth="1.2"
                      />
                      <ellipse cx="206" cy="350" rx="3.5" ry="2" fill="url(#pjGoldGrad)" />
                    </g>
                  </g>
                </svg>
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
