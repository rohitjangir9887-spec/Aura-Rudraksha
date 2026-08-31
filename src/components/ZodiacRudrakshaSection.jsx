import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, ChevronLeft, Sparkles, Compass, HelpCircle } from "lucide-react";
import { ZODIAC_SIGNS } from "../data/zodiac";
import { db, onStoreUpdate } from "../lib/db";
import { PanditjiSection } from "./PanditjiSection";

export function ZodiacRudrakshaSection() {
  const [zodiacList, setZodiacList] = useState(() => {
    const settings = db.getSettings();
    return settings.zodiacs || ZODIAC_SIGNS;
  });

  useEffect(() => {
    const loadZodiacs = () => {
      const settings = db.getSettings();
      setZodiacList(settings.zodiacs || ZODIAC_SIGNS);
    };
    loadZodiacs();
    const unsub = onStoreUpdate(() => {
      loadZodiacs();
    });
    return () => unsub();
  }, []);

  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <>
      <section 
        className="aura-zodiac-section-wrapper" 
        id="zodiac-guide"
        aria-label="Shop By Zodiac Sign & Rashi Rudraksha Guide"
      >
      <div className="aura-zodiac-container">
        
        {/* 1. SECTION HEADER */}
        <div className="aura-zodiac-header">
          <span className="aura-zodiac-eyebrow">
            THE AURA RASHI GUIDE
          </span>
          <h2 className="aura-zodiac-title">
            Shop By Zodiac Sign
          </h2>
          <p className="aura-zodiac-subtitle">
            Discover the Rudraksha traditionally recommended for your Rashi and find the bead that complements your spiritual journey.
          </p>

          {/* Desktop Navigation Arrows */}
          <div className="aura-zodiac-desktop-nav">
            <button 
              type="button"
              onClick={() => scroll("left")}
              aria-label="Scroll zodiac cards left"
              className="aura-zodiac-nav-btn"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              type="button"
              onClick={() => scroll("right")}
              aria-label="Scroll zodiac cards right"
              className="aura-zodiac-nav-btn"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* 2. MOBILE-FIRST HORIZONTAL TOUCH CAROUSEL */}
        <div 
          ref={scrollRef}
          className="aura-zodiac-carousel"
          role="region"
          aria-label="12 Rashi Zodiac Carousel"
          tabIndex={0}
        >
          {zodiacList.map((item) => {
            const Wrapper = item.link ? Link : 'div';
            const wrapperProps = item.link ? { to: item.link } : {};
            
            return (
            <Wrapper
              key={item.id}
              {...wrapperProps}
              className="aura-zodiac-card group"
              aria-label={`Explore ${item.productName || item.english} recommended for ${item.english} (${item.rashi})`}
              id={`card-zodiac-${item.id}`}
            >
              {/* Top Bar: Zodiac Badge + Element */}
              <div className="aura-zodiac-card-top">
                <div className="aura-zodiac-icon-badge" title={item.english}>
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="aura-zodiac-svg"
                  >
                    <path d={item.symbolPath} />
                  </svg>
                </div>
                <span className="aura-zodiac-symbol-text">{item.symbol}</span>
              </div>

              {/* Rashi & Zodiac Name */}
              <div className="aura-zodiac-names">
                <h3 className="aura-zodiac-rashi-hi">{item.rashi}</h3>
                <span className="aura-zodiac-rashi-en">{item.english}</span>
              </div>

              {/* Product Image Container */}
              {item.image ? (
                <div className="aura-zodiac-img-box">
                  <img
                    src={item.image}
                    alt={`${item.productName || item.english} for ${item.english}`}
                    className="aura-zodiac-product-img"
                    loading="lazy"
                    onError={(e) => {
                      if (!e.currentTarget.src.includes("product-5mukhi.jpg")) { e.currentTarget.src = "/images/product-5mukhi.jpg"; }
                    }}
                  />
                  <div className="aura-zodiac-img-glow" />
                </div>
              ) : (
                <div className="aura-zodiac-img-box" style={{ background: '#fdfbf7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#8c7a6e', fontSize: '12px' }}>{item.productName || 'Rudraksha'}</span>
                </div>
              )}

              {/* Bottom Info: Mukhi Badge & CTA */}
              <div className="aura-zodiac-card-bottom">
                <div className="aura-zodiac-mukhi-badge">
                  <span>{(item.recommended || "").toUpperCase()}</span>
                </div>
                {item.link && (
                  <div className="aura-zodiac-cta-link">
                    <span>Explore</span>
                    <ArrowRight size={14} className="aura-zodiac-arrow" />
                  </div>
                )}
              </div>

              {/* Card Subtle Benefit Tooltip/Note */}
              {item.benefit && (
                <div className="aura-zodiac-benefit-tag">
                  <span>{item.benefit}</span>
                </div>
              )}
            </Wrapper>
          )})}
        </div>

        {/* 3. SUBTLE CAROUSEL HELPER INDICATOR */}
        <div className="aura-zodiac-swipe-hint">
          <Compass size={14} className="aura-zodiac-hint-icon" />
          <span>Swipe to explore all 12 Rashis</span>
          <ArrowRight size={13} className="aura-zodiac-hint-arrow" />
        </div>

        {/* 4. PERSONALIZED RECOMMENDATION CTA BANNER */}
        <div className="aura-zodiac-recommendation-card">
          <div className="aura-zodiac-rec-icon-wrap">
            <Sparkles size={22} className="text-[#C89B3C]" />
          </div>
          <div className="aura-zodiac-rec-content">
            <h4 className="aura-zodiac-rec-title">
              Not sure which Rudraksha is right for you?
            </h4>
            <p className="aura-zodiac-rec-desc">
              Get personalized guidance and discover the Rudraksha that suits your spiritual journey.
            </p>
          </div>
          <div className="aura-zodiac-rec-action">
            <Link
              to="/shop?category=Rudraksha"
              id="btn-find-my-rudraksha"
              className="aura-zodiac-rec-btn"
            >
              <span>Find My Rudraksha</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

      </div>
    </section>

    {/* NEW PANDITJI SECTION DIRECTLY BELOW aura-zodiac-container */}
    <PanditjiSection />
    </>
  );
}
