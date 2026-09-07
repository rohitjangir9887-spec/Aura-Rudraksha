import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ShieldCheck, 
  Sparkles, 
  Award, 
  Truck, 
  ChevronRight, 
  CheckCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  Sun, 
  Compass, 
  Layers,
  ArrowRight
} from "lucide-react";
import { db } from "../lib/db";
import { MUKHI_CATALOG } from "../data/seoCatalogData";
import { useSeo } from "../hooks/useSeo";
import ProductCard from "../components/ProductCard";

export default function CategoryLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);

  const activeSlug = slug || "all";
  const catalogEntry = MUKHI_CATALOG[activeSlug] || (activeSlug === "all" ? {
    name: "Sacred Rudraksha Collection",
    tagline: "100% Authentic Nepal & Indonesian Consecrated Beads (1 to 21 Mukhi)",
    description: "Explore our divine collection of lab-certified Rudraksha beads, 108+1 Japa Malas, and sacred Vedic jewelry energized with traditional Prana Pratishtha rituals.",
    faqs: [
      { q: "How are Aura Rudraksha beads authenticated?", a: "Every rare bead is rigorously inspected and certified by independent gemological laboratories using non-destructive X-ray density radiography." },
      { q: "What does Prana Pratishtha consecration mean?", a: "Before shipment, each sacred item undergoes a traditional Vedic sanctification ritual using holy Ganga water, raw milk, and sacred Beej mantras." },
      { q: "Can anyone wear a Rudraksha bead?", a: "Yes. Ancient scriptures like the Shiva Purana confirm that Rudraksha can be worn by anyone irrespective of gender, religion, or age." }
    ]
  } : null);

  const pageTitle = catalogEntry 
    ? `${catalogEntry.name} — Authentic Lab Certified | Aura Rudraksha` 
    : "Sacred Rudraksha Beads | Aura Rudraksha";
  const pageDescription = catalogEntry?.description 
    ? `${catalogEntry.description.slice(0, 150)} Free shipping & certificate.` 
    : "Shop 100% genuine lab-certified Nepali and Indonesian Rudraksha beads.";

  useSeo({
    title: pageTitle,
    description: pageDescription,
    canonical: `https://aurarudraksha.com/rudraksha${slug ? `/${slug}` : ""}`,
    ogType: "website"
  });

  useEffect(() => {
    let isMounted = true;
    const loadCatalog = async () => {
      try {
        setLoading(true);
        const list = await db.getProducts();
        if (isMounted) {
          setProducts(list || []);
        }
      } catch (err) {
        console.warn("Notice loading products:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadCatalog();
    return () => { isMounted = false; };
  }, []);

  // Filter products relevant to this category/mukhi
  const matchingProducts = useMemo(() => {
    if (!products.length) return [];
    if (!slug || slug === "all") return products;

    const lowerSlug = slug.toLowerCase();
    const mukhiNum = lowerSlug.replace("-mukhi", "");

    return products.filter(p => {
      const name = (p.name || "").toLowerCase();
      const pMukhi = String(p.mukhi || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();

      if (lowerSlug.includes("mukhi")) {
        return pMukhi === mukhiNum || name.includes(`${mukhiNum} mukhi`) || desc.includes(`${mukhiNum} mukhi`);
      }
      if (lowerSlug === "nepali") {
        return (p.origin || "").toLowerCase().includes("nepal") || name.includes("nepal");
      }
      if (lowerSlug === "indonesian") {
        return (p.origin || "").toLowerCase().includes("indonesia") || (p.origin || "").toLowerCase().includes("java") || p.hasIndonesianVariant;
      }
      if (lowerSlug === "mala") {
        return cat.includes("mala") || name.includes("mala") || name.includes("kantha");
      }
      if (lowerSlug === "bracelets") {
        return cat.includes("bracelet") || name.includes("bracelet") || name.includes("wrist");
      }
      if (lowerSlug === "gauri-shankar") {
        return name.includes("gauri shankar") || desc.includes("gauri shankar");
      }
      if (lowerSlug === "ganesh-rudraksha") {
        return name.includes("ganesh") || desc.includes("ganesh");
      }
      return false;
    });
  }, [products, slug]);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? -1 : idx);
  };

  return (
    <div className="bg-[#faf7f2] min-h-screen pb-20 text-[#2a160d]">
      {/* Sacred Top Banner & Breadcrumbs */}
      <div className="border-b border-[#ebdccb] bg-white/70 backdrop-blur-sm sticky top-0 z-10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs sm:text-sm text-[#7a5843]">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2">
            <Link to="/" className="hover:text-[#6f3518] transition">Home</Link>
            <ChevronRight className="w-3 h-3 text-[#bfa99b]" />
            <Link to="/rudraksha" className="hover:text-[#6f3518] transition">Rudraksha</Link>
            {catalogEntry && slug && (
              <>
                <ChevronRight className="w-3 h-3 text-[#bfa99b]" />
                <span className="font-semibold text-[#6f3518] truncate max-w-[160px] sm:max-w-none">
                  {catalogEntry.name}
                </span>
              </>
            )}
          </nav>
          <Link 
            to="/rudraksha-calculator"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#8c3e1e] hover:text-[#5e2710] bg-[#faeee4] px-3 py-1 rounded-full border border-[#f0d4c2]"
          >
            <Compass className="w-3.5 h-3.5" />
            Find Your Rashi Mukhi
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Header Hero */}
        <header className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f4ebe1] text-[#8c3e1e] text-xs font-medium uppercase tracking-wider mb-3 border border-[#ebdccb]">
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            Consecrated Vedic Bead
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2a160d] tracking-tight leading-tight">
            {catalogEntry ? catalogEntry.name : "Sacred Rudraksha Collection"}
          </h1>
          <p className="mt-3 text-[#6e5343] text-base sm:text-lg font-serif italic max-w-2xl mx-auto leading-relaxed">
            {catalogEntry?.tagline || "100% Authentic Nepal & Indonesian Consecrated Beads with Lab Certificate"}
          </p>

          {/* Bead Specific Attributes Badges */}
          {catalogEntry && catalogEntry.deity && (
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs sm:text-sm font-medium">
              <span className="bg-white border border-[#ebdccb] px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 text-[#5c3e2e]">
                <Flame className="w-4 h-4 text-[#d9531e]" />
                <strong>Deity:</strong> {catalogEntry.deity}
              </span>
              {catalogEntry.planet && (
                <span className="bg-white border border-[#ebdccb] px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 text-[#5c3e2e]">
                  <Sun className="w-4 h-4 text-[#d4af37]" />
                  <strong>Planet:</strong> {catalogEntry.planet}
                </span>
              )}
              {catalogEntry.beejMantra && (
                <span className="bg-[#fcf5ec] border border-[#f0dfcc] px-3 py-1.5 rounded-lg shadow-2xs text-[#8c3e1e] font-serif">
                  🕉️ <strong>Mantra:</strong> {catalogEntry.beejMantra}
                </span>
              )}
            </div>
          )}
        </header>

        {/* Spiritual Context & Vedic Authority */}
        {catalogEntry?.description && (
          <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 mb-12 shadow-xs">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2a160d] mb-3">
              Vedic Significance & Sacred Origin
            </h2>
            <p className="text-[#5c493d] text-base sm:text-lg leading-relaxed">
              {catalogEntry.description}
            </p>
            {catalogEntry.whoShouldWear && (
              <div className="mt-4 pt-4 border-t border-[#f4ebe1] flex items-start gap-3 text-sm text-[#4a3427]">
                <CheckCircle className="w-5 h-5 text-[#2f855a] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#2a160d]">Recommended For: </strong>
                  {catalogEntry.whoShouldWear}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Live Matching Products Grid */}
        <section className="mb-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-2 border-b border-[#ebdccb]">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2a160d]">
                Available Consecrated Beads & Malas
              </h2>
              <p className="text-xs sm:text-sm text-[#7a5843] mt-1">
                Each bead includes Government-Approved Laboratory Certificate & Gangajal Consecration
              </p>
            </div>
            <div className="mt-3 sm:mt-0 text-xs font-medium text-[#8c3e1e]">
              Showing {matchingProducts.length} Sacred Item(s)
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl h-64 animate-pulse border border-[#ebdccb]" />
              ))}
            </div>
          ) : matchingProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {matchingProducts.map(product => (
                <ProductCard key={product.id || product._id} p={product} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#ebdccb] p-10 text-center max-w-lg mx-auto my-6 shadow-xs">
              <Sparkles className="w-10 h-10 text-[#d4af37] mx-auto mb-3" />
              <h3 className="font-serif text-xl font-bold text-[#2a160d]">Sacred Collector Bead Available on Request</h3>
              <p className="text-sm text-[#6e5343] mt-2 mb-5">
                Rare Himalayan formations of this Mukhi are sourced directly from our Nepal ashram. Contact our Vedic consultant for certificate verification and private viewing.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a 
                  href="https://wa.me/919672996531?text=Namaste%2C+I+am+interested+in+authentic+Rudraksha" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-[#25D366] text-white font-medium rounded-xl text-sm shadow-xs hover:bg-[#20bd5a] transition"
                >
                  Inquire on WhatsApp
                </a>
                <Link 
                  to="/shop" 
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-[#6f3518] text-white font-medium rounded-xl text-sm hover:bg-[#5a2a12] transition"
                >
                  Browse Full Catalog
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Authenticity & Consecration Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white border border-[#ebdccb] rounded-2xl p-6 shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#faeee4] flex items-center justify-center shrink-0 text-[#8c3e1e]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#2a160d]">100% Lab Certified</h3>
              <p className="text-xs sm:text-sm text-[#6e5343] mt-1 leading-relaxed">
                Tested with non-destructive X-ray density radiography to confirm unbroken mukhi lines and genuine internal seed chambers.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#ebdccb] rounded-2xl p-6 shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#faeee4] flex items-center justify-center shrink-0 text-[#8c3e1e]">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#2a160d]">Prana Pratishtha Consecrated</h3>
              <p className="text-xs sm:text-sm text-[#6e5343] mt-1 leading-relaxed">
                Blessed through sacred Vedic rituals, raw cow milk, Ganga jal, and Beej mantra chanting by learned scholars before dispatch.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#ebdccb] rounded-2xl p-6 shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#faeee4] flex items-center justify-center shrink-0 text-[#8c3e1e]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#2a160d]">Insured Fast Delivery</h3>
              <p className="text-xs sm:text-sm text-[#6e5343] mt-1 leading-relaxed">
                Free insured packaging across India, 7-day authenticity return policy, and real-time live shipment tracking.
              </p>
            </div>
          </div>
        </section>

        {/* Sacred Mukhi Navigation Grid */}
        <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 mb-14 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-2 border-b border-[#f4ebe1]">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2a160d]">
              Explore Other Sacred Mukhi Beads
            </h2>
            <Link to="/rudraksha-calculator" className="text-xs font-semibold text-[#8c3e1e] hover:underline mt-2 sm:mt-0 inline-flex items-center gap-1">
              Check by Birth Chart <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-center text-xs">
            {Array.from({ length: 14 }).map((_, i) => {
              const num = i + 1;
              const isCurr = slug === `${num}-mukhi`;
              return (
                <Link
                  key={num}
                  to={`/rudraksha/${num}-mukhi`}
                  className={`p-2.5 rounded-xl border transition flex flex-col items-center justify-center ${
                    isCurr
                      ? "bg-[#6f3518] text-white border-[#6f3518] font-bold shadow-xs"
                      : "bg-[#fcfaf7] border-[#ebdccb] text-[#5c3e2e] hover:bg-[#faeee4] hover:border-[#dfc4b0]"
                  }`}
                >
                  <span className="text-base font-serif font-bold">{num}</span>
                  <span className="text-[10px] uppercase tracking-wider">Mukhi</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Authentic FAQs Accordion */}
        {catalogEntry?.faqs && catalogEntry.faqs.length > 0 && (
          <section className="mb-14">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2a160d] mb-6 text-center">
              Frequently Asked Vedic Questions
            </h2>
            <div className="space-y-3 max-w-3xl mx-auto">
              {catalogEntry.faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div 
                    key={idx} 
                    className="bg-white border border-[#ebdccb] rounded-xl overflow-hidden shadow-2xs transition"
                  >
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#fdfbf9] transition"
                    >
                      <span className="font-medium text-sm sm:text-base text-[#2a160d]">
                        {faq.q}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-[#8c3e1e] shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#8c3e1e] shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#5c493d] border-t border-[#f4ebe1] leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Sacred Guides Links Banner */}
        <section className="bg-gradient-to-r from-[#2b170d] to-[#422112] text-white rounded-2xl p-6 sm:p-8 text-center shadow-sm">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#f7e3ce]">
            Learn More About Authentic Rudraksha Care & Rules
          </h2>
          <p className="text-xs sm:text-sm text-[#ebdccb] mt-2 max-w-xl mx-auto leading-relaxed">
            Read our verified guides on Prana Pratishtha consecration rituals, identifying real vs fake beads under X-ray, and maintaining your sacred beads.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs sm:text-sm font-medium">
            <Link 
              to="/how-to-wear-rudraksha" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition"
            >
              How to Wear Rudraksha
            </Link>
            <Link 
              to="/rudraksha-authenticity" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition"
            >
              Authenticity &amp; Lab Testing
            </Link>
            <Link 
              to="/rudraksha-benefits" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition"
            >
              Vedic &amp; Scientific Benefits
            </Link>
            <Link 
              to="/rudraksha-care" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition"
            >
              Care &amp; Cleaning Guide
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
