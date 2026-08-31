import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { db, onStoreUpdate } from "../lib/db";
import { ProductCard } from "../components/ProductCard";
import { ShopOfferBanner } from "../components/ShopOfferBanner";
import { useCart } from "../hooks/useCart";
import { 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Filter, 
  ShieldCheck, 
  Award, 
  Flame, 
  Truck, 
  HelpCircle, 
  MessageCircle, 
  Compass, 
  ArrowRight 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./Shop.css";

const CATEGORY_CHIPS = [
  { id: "all", label: "All Items" },
  { id: "mukhi", label: "1 to 7 Mukhi" },
  { id: "gauri", label: "Gauri Shankar" },
  { id: "mala", label: "Malas" },
  { id: "offers", label: "Special Offers" },
];

const SHOP_FAQS = [
  {
    q: "How can I verify that my Rudraksha from Aura is 100% genuine?",
    a: "Every Aura Rudraksha is sourced directly from certified high-altitude Himalayan groves in Nepal and undergoes rigorous X-ray and density testing. Each bead comes sealed with a government-recognized Lab Authenticity Certificate with a verifiable QR code."
  },
  {
    q: "Do I need to consecrate (Prana Pratishtha) my Rudraksha before wearing?",
    a: "No extra puja is needed! Aura Rudrakshas undergo a complete Vedic consecration (Prana Pratishtha) performed by seasoned temple priests using Gangajal, raw milk, sandalwood, and Beej Mantras right before being dispatched to you."
  },
  {
    q: "Can anyone wear Rudraksha regardless of zodiac sign, age, or gender?",
    a: "Yes! Ancient Shiva Purana and Shrimad Devi Bhagavatam texts explicitly state that sacred Rudrakshas bless all human beings equally. Certain Mukhis (like 5 Mukhi or Gauri Shankar) can be worn by anyone, while specific Mukhis can be chosen for targeted planetary benefits."
  },
  {
    q: "How should I maintain and care for my Rudraksha over time?",
    a: "Keep your Rudraksha clean by washing it with clean water once a month, allowing it to air dry, and gently conditioning it with pure sandalwood or almond oil. Avoid exposing it to chemical soaps, shampoos, or chlorine pools."
  }
];

const MUKHI_GUIDE = [
  {
    mukhi: "1 Mukhi (Eka Mukhi)",
    deity: "Lord Shiva",
    planet: "Sun (Surya)",
    benefit: "Enhances supreme consciousness, leadership, deep meditation & spiritual liberation.",
    chipTarget: "mukhi"
  },
  {
    mukhi: "5 Mukhi (Pancha Mukhi)",
    deity: "Kalagni Rudra",
    planet: "Jupiter (Guru)",
    benefit: "Brings mental peace, blood pressure balance, wisdom, and shields against negative energies.",
    chipTarget: "mukhi"
  },
  {
    mukhi: "7 Mukhi (Sapta Mukhi)",
    deity: "Goddess Mahalakshmi",
    planet: "Venus / Saturn",
    benefit: "Attracts immense wealth, career growth, financial stability and removes Saturnian hurdles.",
    chipTarget: "mukhi"
  },
  {
    mukhi: "Gauri Shankar",
    deity: "Shiva & Parvati",
    planet: "Moon (Chandra)",
    benefit: "Strengthens marital harmony, relationship peace, family unity and emotional fulfillment.",
    chipTarget: "gauri"
  },
  {
    mukhi: "108+1 Japa Mala",
    deity: "Maha Rudra",
    planet: "All 9 Planets",
    benefit: "Ideal for daily mantra japa, deep dhyana, auric shielding and complete nervous system calm.",
    chipTarget: "mala"
  }
];

export function Shop() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("featured");
  const [chip, setChip] = useState("all");
  const [openFaq, setOpenFaq] = useState(0);
  const { add } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").toLowerCase().trim();
  const isOfferQuery = params.get("offer") === "1";
  const isWishlistQuery = params.get("wishlist") === "1";

  const loadProducts = () => {
    const all = db.getProducts();
    setProducts(all.filter(p => p.status === "Active" || !p.status));
  };

  useEffect(() => {
    loadProducts();
    const unsub = onStoreUpdate(() => {
      loadProducts();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isWishlistQuery) {
      navigate('/wishlist', { replace: true });
    }
  }, [isWishlistQuery, navigate]);

  useEffect(() => {
    if (isOfferQuery) {
      setChip("offers");
    }
  }, [isOfferQuery]);

  // Compute category counts for chips
  const chipCounts = useMemo(() => {
    const counts = { all: products.length, mukhi: 0, gauri: 0, mala: 0, offers: 0 };
    products.forEach(p => {
      const name = (p.name || "").toLowerCase();
      if (/[1-7]\s*mukhi/i.test(name)) counts.mukhi++;
      if (/gauri/i.test(name)) counts.gauri++;
      if (/mala/i.test(name)) counts.mala++;
      if ((p.discountPercent && p.discountPercent > 0) || (p.mrp && p.mrp > p.price) || p.customOffer?.enabled) {
        counts.offers++;
      }
    });
    return counts;
  }, [products]);

  // Filtered and Sorted list
  const list = useMemo(() => {
    let next = [...products];
    if (q) {
      next = next.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.highlight && p.highlight.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    if (chip === "mukhi") next = next.filter(p => /[1-7]\s*mukhi/i.test(p.name));
    if (chip === "gauri") next = next.filter(p => /gauri/i.test(p.name));
    if (chip === "mala") next = next.filter(p => /mala/i.test(p.name));
    if (chip === "offers") {
      next = next.filter(p => 
        (p.discountPercent && p.discountPercent > 0) || 
        (p.mrp && p.mrp > p.price) ||
        p.customOffer?.enabled
      );
    }

    if (filter === "price-low") next.sort((a,b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (filter === "price-high") next.sort((a,b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (filter === "rating") next.sort((a,b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    if (filter === "popular") next.sort((a,b) => (Number(b.reviews) || 0) - (Number(a.reviews) || 0));
    
    return next;
  }, [products, filter, chip, q]);

  return (
    <Shell>
      <main className="shop-page-wrapper" id="shop-catalog-main">
        {/* 1. Back to Home Navigation */}
        <motion.button 
          className="shop-back-btn" 
          onClick={() => navigate('/')}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.96 }}
          id="shop-back-to-home-btn"
        >
          <ChevronLeft size={16} strokeWidth={2.4} />
          <span>Back to Home</span>
        </motion.button>
        
        {/* 2. Top Limited-Time Offer Area */}
        <ShopOfferBanner />

        {/* 3. Shop Header & Sort Tool */}
        <div className="shop-header-container">
          <motion.div 
            className="shop-heading-group"
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
          >
            <h1>Shop Catalog</h1>
            <p>
              {q ? (
                <>Showing authentic beads matching <b style={{ color: "#2b170d" }}>"{q}"</b> ({list.length})</>
              ) : (
                "Discover our full collection of authentic, energized beads."
              )}
            </p>
          </motion.div>
          
          <motion.div 
            className="shop-sort-box" 
            initial={{ opacity: 0, x: 10 }} 
            animate={{ opacity: 1, x: 0 }}
          >
            <select 
              className="shop-sort-select" 
              value={filter} 
              onChange={e => setFilter(e.target.value)}
              aria-label="Sort catalog products"
              id="shop-sort-select"
            >
              <option value="featured">Sort By: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
            <ChevronDown size={14} className="shop-sort-icon" />
          </motion.div>
        </div>
        
        {/* 4. Horizontal Category Chips */}
        <div className="shop-chips-scroll" id="shop-category-chips">
          {CATEGORY_CHIPS.map((c, i) => {
            const isActive = chip === c.id;
            const count = chipCounts[c.id];
            return (
              <motion.button 
                key={c.id} 
                className={`shop-chip-btn ${isActive ? "active" : ""}`}
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setChip(c.id)}
                whileTap={{ scale: 0.95 }}
                id={`shop-chip-${c.id}`}
                type="button"
              >
                <span>{c.label}</span>
                {count > 0 && <span className="shop-chip-count">{count}</span>}
              </motion.button>
            );
          })}
        </div>

        {/* 5. Responsive Product Grid */}
        <AnimatePresence mode="wait">
          {list.length === 0 ? (
            <motion.div 
              key="empty"
              className="shop-empty-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              id="shop-empty-state"
            >
              <h3 className="shop-empty-title">No matching sacred beads found</h3>
              <p className="shop-empty-desc">
                {q 
                  ? `We could not find any items matching "${q}". Try clearing the search or exploring other categories.`
                  : "No items currently available in this selection."}
              </p>
              <button 
                type="button"
                className="shop-chip-btn active"
                onClick={() => { setChip("all"); navigate("/shop"); }}
                style={{ margin: "0 auto" }}
              >
                View All Items
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key={chip + filter + q}
              className="shop-products-grid"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              id="shop-products-grid"
            >
              {list.map((p) => (
                <motion.div 
                  key={p.id} 
                  variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.25 }}
                >
                  <ProductCard p={p} onAdd={add} isShop={true} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6. Extended Luxury Sections (Compact & Ultra-Premium) */}
        <div className="shop-extended-sections" id="shop-extended-sections">
          
          {/* A. Sacred Trust 4-Pillars Horizontal Strip */}
          <div className="shop-trust-grid" id="shop-trust-pillars">
            <div className="shop-trust-card">
              <div className="shop-trust-icon-box">
                <ShieldCheck size={18} />
              </div>
              <div className="shop-trust-info">
                <h4>100% Nepali Origin</h4>
                <p>Direct from high-altitude Himalayan groves</p>
              </div>
            </div>

            <div className="shop-trust-card">
              <div className="shop-trust-icon-box">
                <Award size={18} />
              </div>
              <div className="shop-trust-info">
                <h4>Lab Tested & Certified</h4>
                <p>Individual X-ray report & QR card</p>
              </div>
            </div>

            <div className="shop-trust-card">
              <div className="shop-trust-icon-box">
                <Flame size={18} />
              </div>
              <div className="shop-trust-info">
                <h4>Vedic Prana Pratishtha</h4>
                <p>Consecrated with Gangajal & Beej Mantras</p>
              </div>
            </div>

            <div className="shop-trust-card">
              <div className="shop-trust-icon-box">
                <Truck size={18} />
              </div>
              <div className="shop-trust-info">
                <h4>Insured Free Express</h4>
                <p>Velvet pouch & sacred wearing manual</p>
              </div>
            </div>
          </div>

          {/* B. Vedic Mukhi Energy & Selection Guide (Compact Grid) */}
          <section className="shop-guide-section" id="shop-mukhi-guide">
            <div className="shop-section-header compact">
              <span className="shop-section-tag">
                <Sparkles size={12} /> SACRED ENERGIES
              </span>
              <h3>Quick Mukhi Selection Guide</h3>
              <p>Find the bead aligned with your planetary chakra and spiritual intent</p>
            </div>

            <div className="shop-mukhi-cards-grid compact">
              {MUKHI_GUIDE.map((m, idx) => (
                <div key={idx} className="shop-mukhi-card compact">
                  <div className="shop-mukhi-top">
                    <span className="shop-mukhi-badge">{m.mukhi}</span>
                    <span className="shop-mukhi-planet">{m.planet}</span>
                  </div>
                  <div className="shop-mukhi-body">
                    <h4>Deity: <span>{m.deity}</span></h4>
                    <p>{m.benefit}</p>
                  </div>
                  <button 
                    type="button"
                    className="shop-mukhi-btn"
                    onClick={() => {
                      setChip(m.chipTarget);
                      window.scrollTo({ top: 220, behavior: "smooth" });
                    }}
                  >
                    Filter Collection <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* C. Temple Consecration Protocol (Compact Luxury Flow) */}
          <div className="shop-consecration-card compact" id="shop-consecration-protocol">
            <div className="shop-section-header compact" style={{ color: "#faebd7" }}>
              <span className="shop-section-tag" style={{ color: "#f7dfa5" }}>
                <Flame size={12} /> SACRED TRADITION
              </span>
              <h3 style={{ color: "#ffffff" }}>The Himalayan Consecration Protocol</h3>
              <p style={{ color: "#e8dac9" }}>Authentic Shastric energization performed before dispatch</p>
            </div>

            <div className="shop-consecration-steps compact">
              <div className="shop-step-box compact">
                <div className="shop-step-num">1</div>
                <h5>Gangajal Shuddhi</h5>
                <p>Holy Gangajal & natural herb purification</p>
              </div>

              <div className="shop-step-box compact">
                <div className="shop-step-num">2</div>
                <h5>Beej Mantras</h5>
                <p>1,008 Vedic chant recitations by priests</p>
              </div>

              <div className="shop-step-box compact">
                <div className="shop-step-num">3</div>
                <h5>Chandan Anointing</h5>
                <p>Natural sandalwood conditioning</p>
              </div>

              <div className="shop-step-box compact">
                <div className="shop-step-num">4</div>
                <h5>Sealed Delivery</h5>
                <p>Lab card & sanctified sacred pouch</p>
              </div>
            </div>
          </div>

          {/* D. Frequently Asked Questions (Compact Accordion) */}
          <section className="shop-faq-section compact" id="shop-faqs">
            <div className="shop-section-header compact">
              <span className="shop-section-tag">
                <HelpCircle size={12} /> SPIRITUAL GUIDANCE
              </span>
              <h3>Frequently Asked Questions</h3>
            </div>

            <div className="shop-faq-list compact">
              {SHOP_FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className={`shop-faq-item compact ${isOpen ? "open" : ""}`}>
                    <button 
                      type="button" 
                      className="shop-faq-question compact"
                      onClick={() => setOpenFaq(isOpen ? -1 : i)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp size={16} color="#a54d2b" /> : <ChevronDown size={16} color="#806f62" />}
                    </button>
                    {isOpen && (
                      <motion.div 
                        className="shop-faq-answer compact"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* E. Astrological Consultation CTA (Compact Luxury Bar) */}
          <div className="shop-consult-cta compact" id="shop-consultation-banner">
            <div className="shop-consult-text compact">
              <h4>Need Personalized Astrological Guidance?</h4>
              <p>Our Vedic astrologers & AI Spiritual Assistant analyze your Kundali & life goals.</p>
            </div>
            <div className="shop-consult-actions compact">
              <Link to="/aura-ai" className="shop-consult-btn primary compact">
                <Compass size={14} /> Consult Aura AI
              </Link>
              <a 
                href="https://wa.me/919672996531?text=Namaste%20I%20need%20assistance%20choosing%20the%20right%20Rudraksha" 
                target="_blank" 
                rel="noreferrer" 
                className="shop-consult-btn secondary compact"
              >
                <MessageCircle size={14} color="#20a95a" /> WhatsApp Astrologer
              </a>
            </div>
          </div>

        </div>
      </main>
    </Shell>
  );
}
