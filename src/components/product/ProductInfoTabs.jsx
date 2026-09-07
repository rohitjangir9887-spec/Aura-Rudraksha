import React, { useState } from "react";
import DOMPurify from "dompurify";
import { 
  Sparkles, Flower2, Award, Package, Droplets, BookOpen, 
  ChevronDown, ChevronUp, Check, ShieldCheck, HelpCircle, Star, HeartHandshake, Leaf
} from "lucide-react";
import { ProductSpecifications } from "./ProductSpecifications";
import { WhatsIncluded } from "./WhatsIncluded";
import { ProductCertification } from "./ProductCertification";
import { isRudrakshaProduct } from "../../lib/productHelper";

export function ProductInfoTabs({ product, reviewsCount = 0, averageRating = "5.0" }) {
  if (!product) return null;

  const isRudraksha = isRudrakshaProduct(product);
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

  const tabs = isRudraksha ? [
    { id: "about", label: "About This Bead", icon: <Flower2 size={16} /> },
    { id: "benefits", label: "Benefits & Significance", icon: <Sparkles size={16} /> },
    { id: "specs", label: "Specifications", icon: <Award size={16} /> },
    { id: "included", label: "What's Included", icon: <Package size={16} /> },
    { id: "energisation", label: "Vedic Energisation", icon: <Droplets size={16} /> },
    { id: "care", label: "Wearing & Care", icon: <HeartHandshake size={16} /> },
    { id: "faq", label: "FAQ", icon: <HelpCircle size={16} /> }
  ] : [
    { id: "about", label: "About This Samagri", icon: <Leaf size={16} /> },
    { id: "benefits", label: "Significance & Purity", icon: <Sparkles size={16} /> },
    { id: "specs", label: "Specifications", icon: <Award size={16} /> },
    { id: "included", label: "What's Included", icon: <Package size={16} /> },
    { id: "energisation", label: "Vedic Sanctification", icon: <Droplets size={16} /> },
    { id: "care", label: "Ritual Usage Guide", icon: <BookOpen size={16} /> },
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
            <h3 className="tab-pane-title">
              {isRudraksha ? `About the Sacred ${product.name}` : `About ${product.name}`}
            </h3>
            {product.description ? (
              renderDescription(product.description)
            ) : (
              <div className="tab-default-about">
                <p>
                  {isRudraksha ? (
                    <>The <strong>{product.name}</strong> is an authentic, sacred spiritual instrument ethically gathered from pristine Himalayan forests. Worn by spiritual seekers, professionals, and devotees worldwide to invite divine blessings, positive aura, and spiritual grounding into daily life.</>
                  ) : (
                    <>The <strong>{product.name}</strong> is an authentic, 100% pure spiritual preparation crafted from sacred natural ingredients. Used in daily mandir worship, aarti, and havans to create an auspicious, spiritually uplifting divine atmosphere.</>
                  )}
                </p>
                <div className="tab-inner-callout">
                  <strong>Purity Highlights:</strong>
                  <ul>
                    {isRudraksha ? (
                      <>
                        <li>Naturally developed mukhi grooves with unbroken internal compartments.</li>
                        <li>Meticulously inspected for density, weight, and authentic Himalayan geometry.</li>
                        <li>Delivered in its pure natural state without synthetic varnish or chemical adulterants.</li>
                      </>
                    ) : (
                      <>
                        <li>100% natural, chemical-free and non-toxic devotional grade ingredients.</li>
                        <li>Sanctified with holy Ganga Jal and sacred Vedic mantras before packaging.</li>
                        <li>Leaves pure divine fragrance without soot, irritation, or harsh synthetic odors.</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "benefits" && (
          <div className="tab-pane-content">
            <h3 className="tab-pane-title">
              {isRudraksha ? "Spiritual, Mental & Astrological Benefits" : "Divine Significance & Ritual Benefits"}
            </h3>
            <p>
              {isRudraksha ? (
                "According to ancient Vedic scriptures (such as the Shiva Purana, Padma Purana, and Shrimad Devi Bhagavatam), natural Rudraksha beads emit beneficial electromagnetic frequencies that harmonize the wearer’s subtle energy channels (Nadis) and Chakras."
              ) : (
                "According to Vedic Agamas and sacred scriptures, offering pure and unadulterated samagri in puja invites divine cosmic blessings, purifies household vastu, and uplifts positive prana."
              )}
            </p>

            <div className="benefits-cards-grid">
              {isRudraksha ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="benefit-feature-card">
                    <div className="benefit-card-icon">🪔</div>
                    <div className="benefit-card-text">
                      <h4>Sacred Atmosphere &amp; Positivity</h4>
                      <p>Fills the home with divine natural aroma, elevating mood, focus, and devotion during prayers and meditation.</p>
                    </div>
                  </div>

                  <div className="benefit-feature-card">
                    <div className="benefit-card-icon">✨</div>
                    <div className="benefit-card-text">
                      <h4>Vastu &amp; Negative Energy Cleansing</h4>
                      <p>Purifies atmospheric prana, removing negative domestic vibrations, stagnant energies, and indoor toxicity.</p>
                    </div>
                  </div>

                  <div className="benefit-feature-card">
                    <div className="benefit-card-icon">🌿</div>
                    <div className="benefit-card-text">
                      <h4>100% Pure &amp; Chemical-Free</h4>
                      <p>Formulated without charcoal, artificial scents, or harmful burning agents, ensuring healthy indoor air for family.</p>
                    </div>
                  </div>

                  <div className="benefit-feature-card">
                    <div className="benefit-card-icon">🙏</div>
                    <div className="benefit-card-text">
                      <h4>Devotional Grace (Punya Phala)</h4>
                      <p>Fulfills the scriptural requirement of offering authentic, unadulterated sattvic items to deities in daily puja.</p>
                    </div>
                  </div>
                </>
              )}
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
            <h3 className="tab-pane-title">
              {isRudraksha ? "Sacred Consecration (Prana Pratishtha) Ritual" : "Vedic Sanctification & Purity Assurance"}
            </h3>
            <div className="energisation-story-card">
              <div className="energisation-icon-circle">🪔</div>
              <div className="energisation-story-content">
                <h4>{isRudraksha ? "Empowered by Revered Vedic Pandits" : "Sanctified with Holy Gangajal & Mantras"}</h4>
                <p>
                  {isRudraksha ? (
                    <>Before dispatch, every Aura Rudraksha undergoes authentic <strong>Prana Pratishtha</strong> (Vedic consecration). The bead is purified with holy Haridwar Ganga Jal, anointed with pure Sandalwood paste, and awakened through 108 recitations of the Shiva Gayatri and specific Beej Mantras.</>
                  ) : (
                    <>Every batch of Puja Samagri is prepared in a sacred, clean sattvic environment and blessed with holy Ganga Jal and Vedic Stotras before being sealed into airtight packaging for dispatch.</>
                  )}
                </p>
                <div className="ritual-steps-row">
                  <div className="ritual-step">
                    <span className="step-num">1</span>
                    <strong>Shuddhi Snan</strong>
                    <small>Ganga Jal Cleansing</small>
                  </div>
                  <div className="ritual-step">
                    <span className="step-num">2</span>
                    <strong>Sattvic Quality</strong>
                    <small>100% Pure Herbs</small>
                  </div>
                  <div className="ritual-step">
                    <span className="step-num">3</span>
                    <strong>Mantra Abhishekam</strong>
                    <small>Sacred Stotra Japa</small>
                  </div>
                  <div className="ritual-step">
                    <span className="step-num">4</span>
                    <strong>Airtight Seal</strong>
                    <small>Ready for Devotee</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "care" && (
          <div className="tab-pane-content">
            <h3 className="tab-pane-title">
              {isRudraksha ? "Vedic Wearing Procedure & Care Guide" : "Auspicious Ritual Usage & Storage Guidelines"}
            </h3>
            <div className="care-guidelines-grid">
              {isRudraksha ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="care-rule-card">
                    <h4>🌅 Auspicious Ritual Timing</h4>
                    <p>Best used during Brahma Muhurta, morning/evening sandhya aarti, Navratri, Shivratri, and special festive pujas.</p>
                  </div>

                  <div className="care-rule-card">
                    <h4>🕉️ Mandir Offering</h4>
                    <p>Offer with clean hands and pure devotion to your Ishta Devata while chanting your preferred deity mantras.</p>
                  </div>

                  <div className="care-rule-card">
                    <h4>📦 Airtight Storage</h4>
                    <p>Store in a cool, dry place inside the provided airtight container to preserve the natural fragrance and prevent moisture absorption.</p>
                  </div>

                  <div className="care-rule-card">
                    <h4>🌿 Pure Sattvic Standard</h4>
                    <p>Free from chemicals, animal products, or synthetic boosters, making it completely safe for indoor sacred spaces.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "faq" && (
          <div className="tab-pane-content">
            <h3 className="tab-pane-title">Frequently Asked Questions</h3>
            <div className="faq-list">
              {isRudraksha ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="faq-item">
                    <h4>Q: Is this Puja Samagri 100% natural and chemical-free?</h4>
                    <p>A: Yes! Aura guarantees 100% pure, natural ingredients without artificial chemicals, charcoal, adulterants, or harmful burning residues.</p>
                  </div>
                  <div className="faq-item">
                    <h4>Q: Is it consecrated before delivery?</h4>
                    <p>A: Yes, all our devotional samagri items are blessed with holy Ganga Jal and consecrated with Vedic stotras before being sealed.</p>
                  </div>
                  <div className="faq-item">
                    <h4>Q: How should I store it to maintain freshness?</h4>
                    <p>A: Keep the container tightly sealed in a clean, dry place away from direct moisture to ensure lasting natural aroma.</p>
                  </div>
                  <div className="faq-item">
                    <h4>Q: Can this be used for daily mandir aarti and havans?</h4>
                    <p>A: Absolutely. It is prepared specifically for daily temple puja, home mandir aarti, dhyana, and special festive Vedic rituals.</p>
                  </div>
                </>
              )}
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
              <span>{isRudraksha ? "About this Sacred Rudraksha" : "About this Puja Samagri"}</span>
            </div>
            {openAccordions.about ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.about && (
            <div className="aura-mobile-acc-panel">
              {product.description ? (
                renderDescription(product.description)
              ) : (
                <p>
                  The <strong>{product.name}</strong> is an authentic, sacred spiritual product prepared with devotion and pure natural ingredients.
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
              <span>{isRudraksha ? "Benefits & Spiritual Significance" : "Purity & Sacred Significance"}</span>
            </div>
            {openAccordions.benefits ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.benefits && (
            <div className="aura-mobile-acc-panel">
              <div className="mobile-benefit-bullets">
                {isRudraksha ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="m-b-row">
                      <Check size={14} className="green-check" />
                      <div><strong>100% Pure &amp; Sattvic:</strong> Free from toxic chemicals, charcoal and artificial scents.</div>
                    </div>
                    <div className="m-b-row">
                      <Check size={14} className="green-check" />
                      <div><strong>Vastu Cleansing:</strong> Fills home with pure auspicious vibrations.</div>
                    </div>
                    <div className="m-b-row">
                      <Check size={14} className="green-check" />
                      <div><strong>Ganga Jal Sanctified:</strong> Consecrated with sacred Vedic chants.</div>
                    </div>
                  </>
                )}
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
              <span>{isRudraksha ? "Vedic Energisation Ritual" : "Vedic Sanctification"}</span>
            </div>
            {openAccordions.energisation ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.energisation && (
            <div className="aura-mobile-acc-panel">
              <p>
                {isRudraksha 
                  ? "Every bead is consecrated by Vedic Pandits with holy Ganga Jal and 108 Beej Mantra chants before shipment."
                  : "Every batch is prepared in clean sattvic conditions and blessed with holy Ganga Jal and Vedic Stotras."}
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
              <span>{isRudraksha ? "Wearing & Care Instructions" : "Ritual Usage & Storage"}</span>
            </div>
            {openAccordions.care ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openAccordions.care && (
            <div className="aura-mobile-acc-panel">
              <ul className="care-bullet-list">
                {isRudraksha ? (
                  <>
                    <li>Wear Monday morning after morning bath facing East/North.</li>
                    <li>Chant "ॐ नमः शिवाय" 108 times during wearing.</li>
                    <li>Gently oil with Sandalwood oil once a month.</li>
                  </>
                ) : (
                  <>
                    <li>Use during daily morning/evening mandir aarti and hawan.</li>
                    <li>Store tightly sealed in a dry, auspicious mandir space.</li>
                    <li>100% natural, non-toxic and devotee-safe formula.</li>
                  </>
                )}
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
              {isRudraksha ? (
                <>
                  <div className="faq-item">
                    <h4>Q: Who can wear this Rudraksha?</h4>
                    <p>A: Anyone of any age or background seeking spiritual grace and positivity.</p>
                  </div>
                  <div className="faq-item">
                    <h4>Q: Is certificate included?</h4>
                    <p>A: Yes, an original physical Government Recognized Lab Certificate is in the box.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="faq-item">
                    <h4>Q: Is this 100% natural and chemical free?</h4>
                    <p>A: Yes, 100% pure sattvic ingredients with no harmful burning chemicals or artificial perfumes.</p>
                  </div>
                  <div className="faq-item">
                    <h4>Q: Is it sanctified?</h4>
                    <p>A: Yes, consecrated with Holy Haridwar Ganga Jal and Vedic Stotras before dispatch.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

