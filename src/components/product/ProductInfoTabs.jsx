import React, { useState } from "react";
import DOMPurify from "dompurify";
import { 
  Sparkles, Flower2, Award, Package, Droplets, BookOpen, 
  ChevronDown, ChevronUp, Check, ShieldCheck, HelpCircle, Star, HeartHandshake
} from "lucide-react";
import { ProductSpecifications } from "./ProductSpecifications";
import { WhatsIncluded } from "./WhatsIncluded";
import { ProductCertification } from "./ProductCertification";

export function ProductInfoTabs({ product, reviewsCount = 0, averageRating = "5.0" }) {
  if (!product) return null;

  const [activeTab, setActiveTab] = useState("about");
  // For mobile accordion, which sections are open (defaulting about and benefits to open for quick scanning)
  const [openAccordions, setOpenAccordions] = useState({
    about: true,
    benefits: true,
    specs: false,
    included: false,
    energisation: false,
    care: false,
    faq: false
  });

  const toggleAccordion = (key) => {
    setOpenAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderDescription = (text) => {
    if (!text) return null;
    
    // If HTML
    if (text.includes('<p>') || text.includes('<h1>') || text.includes('<h2>') || text.includes('<ul>')) {
      const cleanHtml = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'b', 'i', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'mark', 'span', 'div', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'color', 'class']
      });
      return <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
    }
    
    // Plain text / markdown bold formatting
    const lines = text.split('\n');
    let formattedHtml = '';
    
    lines.forEach((line) => {
      const rawT = line.trim();
      if (!rawT) {
        formattedHtml += '<div style="height: 10px;"></div>';
      } else if (rawT.startsWith('•') || rawT.startsWith('-')) {
        const bulletText = rawT.substring(1).trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedHtml += `<div class="desc-bullet-row"><span class="desc-bullet-dot">•</span><span>${bulletText}</span></div>`;
      } else {
        const t = rawT.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedHtml += `<p class="desc-paragraph">${t}</p>`;
      }
    });

    return <div dangerouslySetInnerHTML={{ __html: formattedHtml }} className="custom-desc-body" />;
  };

  const tabs = [
    { id: "about", label: "About This Bead", icon: <Flower2 size={16} /> },
    { id: "benefits", label: "Benefits & Significance", icon: <Sparkles size={16} /> },
    { id: "specs", label: "Specifications", icon: <Award size={16} /> },
    { id: "included", label: "What's Included", icon: <Package size={16} /> },
    { id: "energisation", label: "Vedic Energisation", icon: <Droplets size={16} /> },
    { id: "care", label: "Wearing & Care", icon: <HeartHandshake size={16} /> },
    { id: "faq", label: "FAQ", icon: <HelpCircle size={16} /> }
  ];

  return (
    <div className="aura-product-info-wrapper">
      {/* DESKTOP TABS HEADER */}
      <div className="aura-desktop-tabs-header" role="tablist">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`aura-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* DESKTOP TABS CONTENT CONTAINER */}
      <div className="aura-desktop-tab-content">
        {activeTab === "about" && (
          <div className="tab-pane-content">
            <h3 className="tab-pane-title">About the Sacred {product.name}</h3>
            {product.description ? (
              renderDescription(product.description)
            ) : (
              <div className="tab-default-about">
                <p>
                  The <strong>{product.name}</strong> is an authentic, sacred spiritual instrument ethically gathered from pristine Himalayan forests. Worn by spiritual seekers, professionals, and devotees worldwide to invite divine blessings, positive aura, and spiritual grounding into daily life.
                </p>
                <div className="tab-inner-callout">
                  <strong>Purity Highlights:</strong>
                  <ul>
                    <li>Naturally developed mukhi grooves with unbroken internal compartments.</li>
                    <li>Meticulously inspected for density, weight, and authentic Himalayan geometry.</li>
                    <li>Delivered in its pure natural state without synthetic varnish or chemical adulterants.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "benefits" && (
          <div className="tab-pane-content">
            <h3 className="tab-pane-title">Spiritual, Mental &amp; Astrological Benefits</h3>
            <p>
              According to ancient Vedic scriptures (such as the Shiva Purana, Padma Purana, and Shrimad Devi Bhagavatam), natural Rudraksha beads emit beneficial electromagnetic frequencies that harmonize the wearer’s subtle energy channels (Nadis) and Chakras.
            </p>

            <div className="benefits-cards-grid">
              <div className="benefit-feature-card">
                <div className="benefit-card-icon">🧠</div>
                <div className="benefit-card-text">
                  <h4>Mental Tranquility &amp; Focus</h4>
                  <p>Calms an overactive nervous system, helping dissipate anxiety, restlessness, and mental fog during work and meditation.</p>
                </div>
              </div>

              <div className="benefit-feature-card">
                <div className="benefit-card-icon">🛡️</div>
                <div className="benefit-card-text">
                  <h4>Shield of Positive Aura</h4>
                  <p>Acts as an energetic shield against negative vibes, environmental stressors, and psychic disturbances.</p>
                </div>
              </div>

              <div className="benefit-feature-card">
                <div className="benefit-card-icon">⚡</div>
                <div className="benefit-card-text">
                  <h4>Planetary Alignment &amp; Balance</h4>
                  <p>Harmonizes planetary influences and pacifies malefic cosmic vibrations as prescribed in classical Jyotish Shastra.</p>
                </div>
              </div>

              <div className="benefit-feature-card">
                <div className="benefit-card-icon">🪔</div>
                <div className="benefit-card-text">
                  <h4>Spiritual Elevation (Sadhana)</h4>
                  <p>Accelerates spiritual growth, devotion, and inner peace, establishing a direct communion with Lord Shiva’s grace.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "specs" && (
          <div className="tab-pane-content">
            <h3 className="tab-pane-title">Authentic Product Specifications</h3>
            <ProductSpecifications product={product} />
          </div>
        )}

        {activeTab === "included" && (
          <div className="tab-pane-content">
            <h3 className="tab-pane-title">What's Inside Your Sacred Package</h3>
            <WhatsIncluded product={product} />
          </div>
        )}

        {activeTab === "energisation" && (
          <div className="tab-pane-content">
            <h3 className="tab-pane-title">Sacred Consecration (Prana Pratishtha) Ritual</h3>
            <div className="energisation-story-card">
              <div className="energisation-icon-circle">🪔</div>
              <div className="energisation-story-content">
                <h4>Empowered by Revered Vedic Pandits</h4>
                <p>
                  Before dispatch, every Aura Rudraksha undergoes authentic <strong>Prana Pratishtha</strong> (Vedic consecration). The bead is purified with holy Haridwar Ganga Jal, anointed with pure Sandalwood paste, and awakened through 108 recitations of the Shiva Gayatri and specific Beej Mantras.
                </p>
                <div className="ritual-steps-row">
                  <div className="ritual-step">
                    <span className="step-num">1</span>
                    <strong>Shuddhi Snan</strong>
                    <small>Ganga Jal Cleansing</small>
                  </div>
                  <div className="ritual-step">
                    <span className="step-num">2</span>
                    <strong>Panchamrit Abhishekam</strong>
                    <small>Sacred Offerings</small>
                  </div>
                  <div className="ritual-step">
                    <span className="step-num">3</span>
                    <strong>Beej Mantra Japa</strong>
                    <small>108 Consecration Chants</small>
                  </div>
                  <div className="ritual-step">
                    <span className="step-num">4</span>
                    <strong>Siddhi Seal</strong>
                    <small>Ready for the Devotee</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "care" && (
          <div className="tab-pane-content">
            <h3 className="tab-pane-title">Vedic Wearing Procedure &amp; Care Guide</h3>
            <div className="care-guidelines-grid">
              <div className="care-rule-card">
                <h4>🌅 Auspicious Time to Wear</h4>
                <p>Wear on a Monday morning or auspicious Vedic Muhurta after taking a morning bath, facing East or North.</p>
              </div>

              <div className="care-rule-card">
                <h4>🕉️ Sacred Chanting</h4>
                <p>Chant <strong>"ॐ नमः शिवाय" (Om Namah Shivaya)</strong> 11 or 108 times before putting on the sacred bead for the first time.</p>
              </div>

              <div className="care-rule-card">
                <h4>💧 Monthly Purification</h4>
                <p>Once a month, gently wash the bead in clean water with a soft brush and lightly condition with pure Sandalwood or Mustard oil.</p>
              </div>

              <div className="care-rule-card">
                <h4>🚫 Chemical Precautions</h4>
                <p>Avoid contact with harsh chemical soaps, body washes, or synthetic perfumes while wearing your sacred Rudraksha.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "faq" && (
          <div className="tab-pane-content">
            <h3 className="tab-pane-title">Frequently Asked Questions</h3>
            <div className="faq-list">
              <div className="faq-item">
                <h4>Q: Who can wear this sacred Rudraksha?</h4>
                <p>A: Anyone can wear Rudraksha regardless of gender, age, religion, or zodiac sign. Nature's sacred seed showers grace and positive bio-energetic balance on all pure-hearted seekers.</p>
              </div>
              <div className="faq-item">
                <h4>Q: How do I know this bead is 100% genuine and not fake?</h4>
                <p>A: Every bead is delivered with a Government Recognized Gemological Lab Certificate with unique serial number, X-ray line verification, and density proof.</p>
              </div>
              <div className="faq-item">
                <h4>Q: Can I wear it while sleeping or showering?</h4>
                <p>A: It is recommended to remove the Rudraksha before sleeping or taking a chemical soap bath to prevent mechanical damage and preserve the bead's natural essential oils.</p>
              </div>
              <div className="faq-item">
                <h4>Q: Is it already energized or do I need to perform puja?</h4>
                <p>A: Your Aura Rudraksha arrives fully energized with Haridwar Ganga Jal and Vedic Beej Mantras. You may wear it immediately after a simple morning bath with pure devotion.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE ACCORDIONS VIEW (Below 900px) */}
      <div className="aura-mobile-accordions-container">
        {/* 1. About Accordion */}
        <div className={`aura-mobile-acc-item ${openAccordions.about ? "open" : ""}`}>
          <button 
            type="button" 
            className="aura-mobile-acc-btn"
            onClick={() => toggleAccordion("about")}
          >
            <div className="acc-left-meta">
              <Flower2 size={17} className="acc-icon" />
              <span>About this Sacred Rudraksha</span>
            </div>
            {openAccordions.about ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.about && (
            <div className="aura-mobile-acc-panel">
              {product.description ? (
                renderDescription(product.description)
              ) : (
                <p>
                  The <strong>{product.name}</strong> is an authentic, sacred spiritual instrument ethically gathered from pristine Himalayan regions.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 2. Benefits Accordion */}
        <div className={`aura-mobile-acc-item ${openAccordions.benefits ? "open" : ""}`}>
          <button 
            type="button" 
            className="aura-mobile-acc-btn"
            onClick={() => toggleAccordion("benefits")}
          >
            <div className="acc-left-meta">
              <Sparkles size={17} className="acc-icon" />
              <span>Benefits &amp; Spiritual Significance</span>
            </div>
            {openAccordions.benefits ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.benefits && (
            <div className="aura-mobile-acc-panel">
              <div className="mobile-benefit-bullets">
                <div className="m-b-row">
                  <Check size={14} className="green-check" />
                  <div><strong>Mental Calmness:</strong> Releases tension, anxiety and improves focus.</div>
                </div>
                <div className="m-b-row">
                  <Check size={14} className="green-check" />
                  <div><strong>Protective Aura:</strong> Shields against negative environmental energies.</div>
                </div>
                <div className="m-b-row">
                  <Check size={14} className="green-check" />
                  <div><strong>Vedic Harmony:</strong> Aligns Chakras and pacifies planetary doshas.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Specifications Accordion */}
        <div className={`aura-mobile-acc-item ${openAccordions.specs ? "open" : ""}`}>
          <button 
            type="button" 
            className="aura-mobile-acc-btn"
            onClick={() => toggleAccordion("specs")}
          >
            <div className="acc-left-meta">
              <Award size={17} className="acc-icon" />
              <span>Authentic Specifications</span>
            </div>
            {openAccordions.specs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.specs && (
            <div className="aura-mobile-acc-panel">
              <ProductSpecifications product={product} />
            </div>
          )}
        </div>

        {/* 4. What's Included Accordion */}
        <div className={`aura-mobile-acc-item ${openAccordions.included ? "open" : ""}`}>
          <button 
            type="button" 
            className="aura-mobile-acc-btn"
            onClick={() => toggleAccordion("included")}
          >
            <div className="acc-left-meta">
              <Package size={17} className="acc-icon" />
              <span>What's Included in Your Parcel</span>
            </div>
            {openAccordions.included ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.included && (
            <div className="aura-mobile-acc-panel">
              <WhatsIncluded product={product} />
            </div>
          )}
        </div>

        {/* 5. Consecration & Energisation Accordion */}
        <div className={`aura-mobile-acc-item ${openAccordions.energisation ? "open" : ""}`}>
          <button 
            type="button" 
            className="aura-mobile-acc-btn"
            onClick={() => toggleAccordion("energisation")}
          >
            <div className="acc-left-meta">
              <Droplets size={17} className="acc-icon" />
              <span>Vedic Energisation Ritual</span>
            </div>
            {openAccordions.energisation ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.energisation && (
            <div className="aura-mobile-acc-panel">
              <p>
                Every bead is consecrated by Vedic Pandits with holy Ganga Jal and 108 Beej Mantra chants before shipment.
              </p>
            </div>
          )}
        </div>

        {/* 6. Wearing & Care Accordion */}
        <div className={`aura-mobile-acc-item ${openAccordions.care ? "open" : ""}`}>
          <button 
            type="button" 
            className="aura-mobile-acc-btn"
            onClick={() => toggleAccordion("care")}
          >
            <div className="acc-left-meta">
              <HeartHandshake size={17} className="acc-icon" />
              <span>Wearing &amp; Care Instructions</span>
            </div>
            {openAccordions.care ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.care && (
            <div className="aura-mobile-acc-panel">
              <ul className="care-bullet-list">
                <li>Wear Monday morning after morning bath facing East/North.</li>
                <li>Chant "ॐ नमः शिवाय" 108 times during wearing.</li>
                <li>Gently oil with Sandalwood oil once a month.</li>
              </ul>
            </div>
          )}
        </div>

        {/* 7. FAQ Accordion */}
        <div className={`aura-mobile-acc-item ${openAccordions.faq ? "open" : ""}`}>
          <button 
            type="button" 
            className="aura-mobile-acc-btn"
            onClick={() => toggleAccordion("faq")}
          >
            <div className="acc-left-meta">
              <HelpCircle size={17} className="acc-icon" />
              <span>Frequently Asked Questions</span>
            </div>
            {openAccordions.faq ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.faq && (
            <div className="aura-mobile-acc-panel">
              <div className="faq-item">
                <h4>Q: Who can wear this Rudraksha?</h4>
                <p>A: Anyone of any age or background seeking spiritual grace and positivity.</p>
              </div>
              <div className="faq-item">
                <h4>Q: Is certificate included?</h4>
                <p>A: Yes, an original physical Government Recognized Lab Certificate is in the box.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
