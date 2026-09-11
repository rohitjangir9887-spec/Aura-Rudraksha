import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronRight, 
  Sparkles, 
  Flame, 
  ArrowRight,
  ArrowUpRight
} from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { useCart } from "../hooks/useCart";
import { db, isPublicProduct } from "../lib/db";
import { auraChatStore } from "../lib/auraChatStore";
import { sortProductsByHomeOrder } from "../lib/productHelper";
import { getOptimizedImageUrl, markProxyFailed } from "../lib/imageUtils";

// Authentic Devotee Avatars
const DEVOTEE_AVATARS = [
  {
    name: "Aarav S.",
    city: "Varanasi",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
  },
  {
    name: "Pooja M.",
    city: "Bengaluru",
    img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80"
  },
  {
    name: "Rajesh K.",
    city: "Haridwar",
    img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80"
  }
];

// SVG Icon: Nepal Flag (for Authentic Nepal Bead badge)
function NepalFlagIcon({ size = 16, className = "" }) {
  return (
    <svg 
      width={size} 
      height={Math.round(size * 1.2)} 
      viewBox="0 0 18 22" 
      fill="none" 
      className={className} 
      aria-label="Nepal Flag"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M1 1V21H17L8.5 12.5H15.5L1 1Z" fill="#003893" />
      <path d="M2.5 2.8V19.5H14.5L7 11.8H13L2.5 2.8Z" fill="#DC143C" />
      <circle cx="5.2" cy="7.2" r="1.8" fill="#FFFFFF" />
      <circle cx="5.2" cy="6.6" r="1.4" fill="#DC143C" />
      <circle cx="5.2" cy="7.6" r="0.7" fill="#FFFFFF" />
      <circle cx="5.5" cy="15.5" r="1.8" fill="#FFFFFF" />
    </svg>
  );
}

// Icon: AI Pandit Ji Avatar with Warm Golden Halo and Authentic Panditji Portrait
function PanditJiAvatar({ size = 34 }) {
  return (
    <div 
      className="pandit-avatar-glow"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        border: "1.5px solid #D4AF37",
        background: "radial-gradient(circle at 50% 30%, #FFE9B8 0%, #D49B3E 70%, #7A4215 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)"
      }}
    >
      <img
        src={getOptimizedImageUrl("https://i.ibb.co/XxDccpPX/file-0000000089808211b252c5213cf8063e.png", { width: 160, quality: 80 })}
        alt="AI Pandit Ji"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block'
        }}
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src.includes("wsrv.nl")) {
            target.src = "https://i.ibb.co/XxDccpPX/file-0000000089808211b252c5213cf8063e.png";
            return;
          }
          target.style.display = 'none';
          const fallback = target.parentElement.querySelector('svg');
          if (fallback) fallback.style.display = 'block';
        }}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
      <svg width={size - 2} height={size - 2} viewBox="0 0 40 40" fill="none" style={{ display: 'none' }}>
        <circle cx="20" cy="16" r="14" fill="#F5CB87" fillOpacity="0.45" />
        <circle cx="20" cy="14" r="8" fill="#7A4215" />
        <path d="M10 32C10 25 14 22 20 22C26 22 30 25 30 32" fill="#D49B3E" />
      </svg>
    </div>
  );
}

// SVG Icon: Mountain Peak with Rising Sun (100% Nepali Origin)
function MountainSunIcon({ size = 26, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="23" cy="9.5" r="3" fill="#D27C38" />
      <path d="M5 24L13.5 10L18 16.5L21 11.5L27 24H5Z" stroke="#5A2813" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.5 10L11.8 13.5L14.8 14.5L13.5 10Z" fill="#5A2813" />
      <path d="M21 11.5L19.5 14L22 14.8L21 11.5Z" fill="#5A2813" />
      <path d="M10 17L13.5 14L15.5 16.5" stroke="#5A2813" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// SVG Icon: Document with Seal Ribbon (Govt Lab Certified)
function LabCertifiedIcon({ size = 26, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect x="7" y="5" width="15" height="21" rx="2" stroke="#5A2813" strokeWidth="1.8" fill="none" />
      <line x1="10.5" y1="9.5" x2="18.5" y2="9.5" stroke="#5A2813" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="13.5" x2="18.5" y2="13.5" stroke="#5A2813" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="17.5" x2="15.5" y2="17.5" stroke="#5A2813" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="22" cy="22" r="4.2" fill="#FDFBF7" stroke="#D27C38" strokeWidth="1.8" />
      <circle cx="22" cy="22" r="1.8" fill="#D27C38" />
      <path d="M20.5 25.5L19 28.5L22 27.2L25 28.5L23.5 25.5" stroke="#D27C38" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

// SVG Icon: Sacred Sprouting Leaf with Flame & Radiating Aura Rays (Free Vedic Energization)
function VedicEnergizationIcon({ size = 26, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="5.5" r="1.2" fill="#D27C38" />
      <circle cx="11.5" cy="8" r="1" fill="#D27C38" />
      <circle cx="20.5" cy="8" r="1" fill="#D27C38" />
      <circle cx="8" cy="12" r="0.9" fill="#D27C38" />
      <circle cx="24" cy="12" r="0.9" fill="#D27C38" />
      <path d="M16 10.5C16 10.5 11.5 14.5 11.5 19.5C11.5 22 13.5 24 16 24C18.5 24 20.5 22 20.5 19.5C20.5 14.5 16 10.5 16 10.5Z" fill="#5A2813" />
      <path d="M16 24V14.5" stroke="#FAF6F0" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11.5 20.5C9.5 19.5 8 17.5 8 15.5C10 15.5 12 17 12.5 19" stroke="#D27C38" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20.5 20.5C22.5 19.5 24 17.5 24 15.5C22 15.5 20 17 19.5 19" stroke="#D27C38" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// SVG Icon: Isometric Package with Curved Circular Return Arrow (7-Day Return)
function SevenDayReturnIcon({ size = 26, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M16 6.5L24 11V19.5L16 24L8 19.5V11L16 6.5Z" stroke="#5A2813" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <path d="M16 6.5V15M8 11L16 15L24 11" stroke="#5A2813" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M23 15C25.5 16.5 26.5 19.5 25 22.5C23.5 25.5 20 26.5 17 25.5" stroke="#D27C38" strokeWidth="1.8" strokeLinecap="round" />
      <polyline points="21 27 17 25.5 18.5 21.5" stroke="#D27C38" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// SVG Icon: Sacred Lotus Blossom (Mukti Rudraksha)
function LotusIcon({ size = 18, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 4C12 4 9 9 9 14C9 17.5 12 19 12 19C12 19 15 17.5 15 14C15 9 12 4 12 4Z" />
      <path d="M9 10C6 12 3 14 3 17C3 19 5 19.5 7 19.5C9 19.5 10.5 17 10.5 17" />
      <path d="M15 10C18 12 21 14 21 17C21 19 19 19.5 17 19.5C15 19.5 13.5 17 13.5 17" />
      <path d="M8 20C10 21 14 21 16 20" />
    </svg>
  );
}

// SVG Icon: Circular Japa Mala Beads (Sacred Malas)
function MalaBeadsIcon({ size = 18, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} aria-hidden="true">
      <circle cx="12" cy="3.5" r="1.7" />
      <circle cx="17.2" cy="5.2" r="1.7" />
      <circle cx="20.5" cy="9.5" r="1.7" />
      <circle cx="20.5" cy="14.5" r="1.7" />
      <circle cx="17.2" cy="18.8" r="1.7" />
      <circle cx="12" cy="20.5" r="2.2" />
      <circle cx="6.8" cy="18.8" r="1.7" />
      <circle cx="3.5" cy="14.5" r="1.7" />
      <circle cx="3.5" cy="9.5" r="1.7" />
      <circle cx="6.8" cy="5.2" r="1.7" />
    </svg>
  );
}

// SVG Decorative Flourish: Delicate Lotus
function LotusFlourish() {
  return (
    <svg width="22" height="15" viewBox="0 0 22 15" fill="none" stroke="#D27C38" strokeWidth="1.3" className="inline-block mx-1.5 align-middle" aria-hidden="true">
      <path d="M11 1.5C11 1.5 8.5 5.5 8.5 9.5C8.5 12.5 11 13.5 11 13.5C11 13.5 13.5 12.5 13.5 9.5C13.5 5.5 11 1.5 11 1.5Z" fill="#D27C38" fillOpacity="0.1" />
      <path d="M8.5 6.5C6 8 4 9.5 4 12C4 13.5 5.5 14 7 14C8.5 14 9.8 12 9.8 12" />
      <path d="M13.5 6.5C16 8 18 9.5 18 12C18 13.5 16.5 14 15 14C13.5 14 12.2 12 12.2 12" />
    </svg>
  );
}

// Corner Mandala SVG Line-Art
function MandalaCornerWatermark() {
  return (
    <svg
      width="170"
      height="170"
      viewBox="0 0 200 200"
      fill="none"
      stroke="#D4AF37"
      strokeWidth="1.2"
      className="pointer-events-none select-none"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        transform: "translate(18%, -18%)",
        opacity: 0.13,
        zIndex: 0
      }}
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="85" strokeDasharray="3 3" />
      <circle cx="100" cy="100" r="70" />
      <circle cx="100" cy="100" r="50" />
      <circle cx="100" cy="100" r="30" strokeDasharray="2 2" />
      <circle cx="100" cy="100" r="12" fill="#D4AF37" fillOpacity="0.08" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <g key={i} transform={`rotate(${angle} 100 100)`}>
          <path d="M100 30C95 50 85 70 100 90C115 70 105 50 100 30Z" fill="#D4AF37" fillOpacity="0.04" />
          <path d="M100 15L100 30" strokeLinecap="round" />
          <circle cx="100" cy="15" r="2" fill="#D4AF37" />
        </g>
      ))}
    </svg>
  );
}

export function HomeProductShowcase({ products = [], isLoading = false, overrideLayout = false }) {
  const { add } = useCart();
  const [activeTab, setActiveTab] = useState("all");

  // Handler to open Aura AI Pandit Ji chat assistant
  const handleOpenAiPandit = () => {
    auraChatStore.setMode("panditji");
    auraChatStore.setFloatingDismissed(false);
    auraChatStore.setFloatingOpen(true);
    try {
      window.dispatchEvent(
        new CustomEvent("aura_ai_trigger_chat", {
          detail: {
            mode: "panditji",
            prompt: "प्रणाम पंडित जी! मुझे अपनी राशि एवं ग्रह शांति हेतु उचित रुद्राक्ष के बारे में मार्गदर्शन चाहिए।"
          }
        })
      );
      window.dispatchEvent(new CustomEvent("aura_ai_open_change", { detail: true }));
    } catch (_) {}
  };

  // Filter products that admin explicitly enabled for Home Page Showcase
  const homeProducts = useMemo(() => {
    if (overrideLayout) {
      return products.filter(p => p && isPublicProduct(p));
    }
    const settings = db.getSettings();
    if (settings && settings.homeProductLayout && settings.homeProductLayout.live && settings.homeProductLayout.live.length > 0) {
      const liveOrder = settings.homeProductLayout.live;
      const orderedProducts = [];
      for (const id of liveOrder) {
        const prod = products.find(p => String(p.id || p._id) === String(id));
        if (prod && isPublicProduct(prod)) {
          orderedProducts.push(prod);
        }
      }
      return orderedProducts;
    }
    
    // Fallback if no layout is set
    const activeHomeProds = products.filter(p => p.showOnHome !== false && isPublicProduct(p));
    return sortProductsByHomeOrder(activeHomeProds);
  }, [products, overrideLayout]);

  // Compute sub-filters for easy user discovery
  const popularProducts = useMemo(() => {
    return homeProducts.filter(p => 
      p.isPopular || 
      p.badge?.toLowerCase().includes("popular") || 
      p.badge?.toLowerCase().includes("best") || 
      p.homeBadge?.toLowerCase().includes("popular") ||
      p.homeBadge?.toLowerCase().includes("best") ||
      p.rating >= 4.9
    );
  }, [homeProducts]);

  const mukhiProducts = useMemo(() => {
    return homeProducts.filter(p => 
      (p.category?.toLowerCase() === "rudraksha" || !p.category) &&
      !p.name?.toLowerCase().includes("mala")
    );
  }, [homeProducts]);

  const malaProducts = useMemo(() => {
    return homeProducts.filter(p => 
      p.category?.toLowerCase() === "mala" || 
      p.name?.toLowerCase().includes("mala")
    );
  }, [homeProducts]);

  // Determine displayed items based on selected tab
  const displayedProducts = useMemo(() => {
    if (activeTab === "popular" && popularProducts.length > 0) return popularProducts;
    if (activeTab === "mukhi" && mukhiProducts.length > 0) return mukhiProducts;
    if (activeTab === "mala" && malaProducts.length > 0) return malaProducts;
    return homeProducts;
  }, [activeTab, homeProducts, popularProducts, mukhiProducts, malaProducts]);

  // Tabs configured with specific icons matching the reference image exactly
  const tabs = [
    { id: "all", label: "All Divine Picks", count: homeProducts.length, icon: Sparkles },
    ...(popularProducts.length > 0 ? [{ id: "popular", label: "Popular & Bestsellers", count: popularProducts.length, icon: Flame }] : []),
    ...(mukhiProducts.length > 0 ? [{ id: "mukhi", label: "Mukti Rudraksha", count: mukhiProducts.length, icon: LotusIcon }] : []),
    ...(malaProducts.length > 0 ? [{ id: "mala", label: "Sacred Malas", count: malaProducts.length, icon: MalaBeadsIcon }] : []),
  ];

  return (
    <section 
      id="sacred-vedic-collection-section"
      className="section popular-collection-section" 
      style={{ paddingTop: '10px', paddingBottom: '45px' }}
    >
      <style>{`
        @keyframes panditPulseGlow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.45), 0 2px 6px rgba(0, 0, 0, 0.35);
          }
          50% {
            box-shadow: 0 0 0 3.5px rgba(212, 175, 55, 0.2), 0 0 10px rgba(245, 203, 135, 0.55), 0 2px 6px rgba(0, 0, 0, 0.35);
          }
        }
        .pandit-avatar-glow {
          animation: panditPulseGlow 3s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pandit-avatar-glow {
            animation: none !important;
          }
        }

        /* Mobile Responsive Enhancements */
        .why-choose-card {
          padding: 14px 12px 13px !important;
          border-radius: 20px !important;
        }
        @media (min-width: 480px) {
          .why-choose-card {
            padding: 18px 16px 16px !important;
            border-radius: 24px !important;
          }
        }

        .benefit-circle-wrap {
          width: clamp(38px, 11vw, 50px) !important;
          height: clamp(38px, 11vw, 50px) !important;
        }
        .benefit-title-text {
          font-size: clamp(9.5px, 2.6vw, 11px) !important;
          line-height: 1.2 !important;
          margin-top: 5px !important;
        }

        .filter-btn-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 7px !important;
        }
        @media (min-width: 480px) {
          .filter-btn-grid {
            gap: 9px !important;
          }
        }

        .filter-pill-btn {
          height: 40px !important;
          padding: 0 8px !important;
        }
        @media (min-width: 400px) {
          .filter-pill-btn {
            height: 44px !important;
            padding: 0 10px !important;
          }
        }
        @media (min-width: 600px) {
          .filter-pill-btn {
            height: 46px !important;
            padding: 0 12px !important;
          }
        }

        .filter-pill-text {
          font-size: 11px !important;
          letter-spacing: -0.01em !important;
        }
        @media (min-width: 380px) {
          .filter-pill-text {
            font-size: 11.5px !important;
          }
        }
        @media (min-width: 500px) {
          .filter-pill-text {
            font-size: 12px !important;
          }
        }

        .ai-pandit-bar-wrap {
          padding: 6px 10px !important;
          gap: 6px !important;
        }
        @media (max-width: 350px) {
          .ai-pandit-bar-wrap {
            padding: 5px 7px !important;
            gap: 4px !important;
          }
          .ai-pandit-lotus-deco {
            display: none !important;
          }
        }
      `}</style>

      {/* Target Design Container: Warm Ivory Card with Benefits & AI Pandit Ji Bar */}
      <div 
        className="why-choose-card"
        style={{
          maxWidth: '920px',
          margin: '0 auto 14px',
          background: 'linear-gradient(180deg, #FAF7F2 0%, #F5ECE0 100%)',
          border: '1px solid #EADBCC',
          borderRadius: '20px',
          padding: '14px 12px 13px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 6px 24px rgba(90, 40, 16, 0.04)'
        }}
      >
        {/* Subtle Mandala Watermark in Top Right */}
        <MandalaCornerWatermark />

        {/* Card Header: "Why Choose Us — 🪷 —" and Authentic Nepal Bead Badge with Nepal Flag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', position: 'relative', zIndex: 1, gap: '6px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, flexShrink: 1 }}>
            <h3 style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 'clamp(17px, 4.4vw, 20px)',
              fontWeight: '700',
              color: '#2A160D',
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              whiteSpace: 'nowrap'
            }}>
              Why Choose Us
            </h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '5px', flexShrink: 0 }}>
              <span style={{ width: '10px', height: '1px', background: '#D27C38', display: 'inline-block' }} />
              <LotusFlourish />
              <span style={{ width: '10px', height: '1px', background: '#D27C38', display: 'inline-block' }} />
            </span>
          </div>

          {/* Genuine Nepal Flag & Authentic Nepal Bead Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid #EAD8C7',
            borderRadius: '20px',
            padding: '3px 8px 3px 5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            flexShrink: 0
          }}>
            <NepalFlagIcon size={13} />
            <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#3A1E11', whiteSpace: 'nowrap' }}>
              Authentic Nepal Bead
            </span>
          </div>
        </div>

        {/* Four Trust / Benefit Columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '2px',
          marginBottom: '12px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Benefit 1: 100% Nepali Origin */}
          <div style={{ textAlign: 'center', padding: '1px', position: 'relative' }}>
            <div 
              className="benefit-circle-wrap"
              style={{
                width: '46px',
                height: '46px',
                margin: '0 auto',
                borderRadius: '50%',
                border: '1px solid #E8D5C0',
                background: 'radial-gradient(circle at 35% 35%, #FFFFFF 30%, #F5EAE0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(100, 50, 20, 0.04)'
              }}
            >
              <MountainSunIcon size={22} />
            </div>
            <div className="benefit-title-text" style={{ fontSize: '10.5px', fontWeight: '700', color: '#2A160D', lineHeight: '1.2', marginTop: '5px' }}>
              100%<br />Nepali Origin
            </div>
            <span style={{ position: 'absolute', right: 0, top: '15%', height: '70%', width: '1px', background: '#EAE0D3' }} />
          </div>

          {/* Benefit 2: Govt Lab Certified */}
          <div style={{ textAlign: 'center', padding: '1px', position: 'relative' }}>
            <div 
              className="benefit-circle-wrap"
              style={{
                width: '46px',
                height: '46px',
                margin: '0 auto',
                borderRadius: '50%',
                border: '1px solid #E8D5C0',
                background: 'radial-gradient(circle at 35% 35%, #FFFFFF 30%, #F5EAE0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(100, 50, 20, 0.04)'
              }}
            >
              <LabCertifiedIcon size={22} />
            </div>
            <div className="benefit-title-text" style={{ fontSize: '10.5px', fontWeight: '700', color: '#2A160D', lineHeight: '1.2', marginTop: '5px' }}>
              Govt Lab<br />Certified
            </div>
            <span style={{ position: 'absolute', right: 0, top: '15%', height: '70%', width: '1px', background: '#EAE0D3' }} />
          </div>

          {/* Benefit 3: Free Vedic Energization */}
          <div style={{ textAlign: 'center', padding: '1px', position: 'relative' }}>
            <div 
              className="benefit-circle-wrap"
              style={{
                width: '46px',
                height: '46px',
                margin: '0 auto',
                borderRadius: '50%',
                border: '1px solid #E8D5C0',
                background: 'radial-gradient(circle at 35% 35%, #FFFFFF 30%, #F5EAE0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(100, 50, 20, 0.04)'
              }}
            >
              <VedicEnergizationIcon size={22} />
            </div>
            <div className="benefit-title-text" style={{ fontSize: '10.5px', fontWeight: '700', color: '#2A160D', lineHeight: '1.2', marginTop: '5px' }}>
              Free Vedic<br />Energization
            </div>
            <span style={{ position: 'absolute', right: 0, top: '15%', height: '70%', width: '1px', background: '#EAE0D3' }} />
          </div>

          {/* Benefit 4: 7-Day Return */}
          <div style={{ textAlign: 'center', padding: '1px' }}>
            <div 
              className="benefit-circle-wrap"
              style={{
                width: '46px',
                height: '46px',
                margin: '0 auto',
                borderRadius: '50%',
                border: '1px solid #E8D5C0',
                background: 'radial-gradient(circle at 35% 35%, #FFFFFF 30%, #F5EAE0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(100, 50, 20, 0.04)'
              }}
            >
              <SevenDayReturnIcon size={22} />
            </div>
            <div className="benefit-title-text" style={{ fontSize: '10.5px', fontWeight: '700', color: '#2A160D', lineHeight: '1.2', marginTop: '5px' }}>
              7-Day<br />Return
            </div>
          </div>
        </div>

        {/* Brown AI Pandit Ji Promotional Bar */}
        <div 
          onClick={handleOpenAiPandit}
          role="button"
          tabIndex={0}
          aria-label="Chat with AI Pandit Ji - Vedic Astrologer & Spiritual Guide"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenAiPandit()}
          className="ai-pandit-bar-wrap"
          style={{
            background: 'linear-gradient(135deg, #35170A 0%, #220D04 100%)',
            border: '1px solid #4D2612',
            borderRadius: '9999px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(25, 10, 4, 0.16), inset 0 1px 0 rgba(230, 190, 130, 0.28)',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            userSelect: 'none',
            position: 'relative',
            zIndex: 1,
            gap: '6px'
          }}
        >
          {/* Left: AI Pandit Ji Avatar + "Chat with AI Pandit Ji" + Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexShrink: 1 }}>
            <PanditJiAvatar size={30} />

            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
              <span style={{
                fontSize: '8.5px',
                fontWeight: '500',
                color: '#D5C2AF',
                lineHeight: 1.1,
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap'
              }}>
                Chat with
              </span>
              <span style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 'clamp(13px, 3.4vw, 15px)',
                fontWeight: '700',
                color: '#FAF4EB',
                lineHeight: 1.15,
                whiteSpace: 'nowrap'
              }}>
                AI Pandit Ji
              </span>
            </div>

            <ArrowRight size={13} color="#E6C594" style={{ flexShrink: 0, marginLeft: '1px' }} />
          </div>

          {/* Right: Devotee Avatar Group + 10K+ Happy Devotees + Gold Lotus */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {DEVOTEE_AVATARS.map((devotee, idx) => (
                <img
                  key={idx}
                  src={devotee.img}
                  alt={devotee.name}
                  title={`${devotee.name} (${devotee.city})`}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.2px solid #240E05',
                    marginLeft: idx > 0 ? '-6px' : '0',
                    position: 'relative',
                    zIndex: 3 - idx
                  }}
                />
              ))}
            </div>

            <div style={{ lineHeight: 1.15, textAlign: 'left', flexShrink: 0 }}>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#FFFFFF' }}>
                10K+
              </div>
              <div style={{ fontSize: '8px', fontWeight: '500', color: '#D5C2AF', whiteSpace: 'nowrap' }}>
                Happy Devotees
              </div>
            </div>

            {/* Far Right Subtle Lotus Outline */}
            <div className="ai-pandit-lotus-deco" style={{ opacity: 0.85, marginLeft: '1px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <svg width="20" height="15" viewBox="0 0 32 24" fill="none" stroke="#D4AF37" strokeWidth="1.3">
                <path d="M16 3C16 3 13 8 13 14C13 18 16 20 16 20C16 20 19 18 19 14C19 8 16 3 16 3Z" />
                <path d="M13 9C10 11 6 13 6 17C6 19.5 8 20 10.5 20C13 20 14.5 17 14.5 17" />
                <path d="M19 9C22 11 26 13 26 17C26 19.5 24 20 21.5 20C19 20 17.5 17 17.5 17" />
                <path d="M12 21C14 22 18 22 20 21" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filters: 2x2 Clean Layout matching Reference */}
      {tabs.length > 0 && (
        <div 
          className="filter-btn-grid"
          style={{
            maxWidth: '920px',
            margin: '0 auto 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '7px'
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className="filter-pill-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '42px',
                  padding: '0 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: isActive ? '700' : '600',
                  border: isActive ? '1px solid #9A3915' : '1px solid #EFE4D8',
                  background: isActive 
                    ? 'linear-gradient(135deg, #7A280D 0%, #4D1606 100%)' 
                    : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#2E1A11',
                  cursor: 'pointer',
                  boxShadow: isActive 
                    ? '0 4px 12px rgba(77, 22, 6, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                    : '0 2px 5px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.18s ease',
                  userSelect: 'none',
                  outline: 'none',
                  minWidth: 0,
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden', flexShrink: 1 }}>
                  {Icon && (
                    <Icon 
                      size={15} 
                      color={isActive ? '#F5CB87' : (tab.id === "popular" || tab.id === "mukhi" ? '#D84315' : '#8B3A1C')} 
                      style={{ flexShrink: 0 }} 
                    />
                  )}
                  <span className="filter-pill-text" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', minWidth: 0 }}>
                    {tab.label}
                  </span>
                </div>

                {tab.count !== undefined && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    width: '19px',
                    height: '19px',
                    borderRadius: '50%',
                    background: isActive ? 'rgba(48, 12, 2, 0.7)' : '#F5EDE4',
                    color: isActive ? '#FFFFFF' : '#7E6252',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginLeft: '4px'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Product Grid */}
      <div className="product-grid swipeable">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
        ) : displayedProducts.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '40px 20px', 
            background: '#fffdf9', 
            borderRadius: '12px',
            border: '1px dashed #decbb8' 
          }}>
            <p style={{ fontSize: '15px', color: '#7a6a5e', margin: '0 0 12px' }}>
              No products are currently showcased in this tab.
            </p>
            <Link to="/shop" className="primary-btn" style={{ fontSize: '13px', padding: '9px 18px' }}>
              Browse Complete Catalog
            </Link>
          </div>
        ) : (
          displayedProducts.map((p, index) => (
            <ProductCard key={p.id} p={p} onAdd={add} priority={index < 2} index={index} />
          ))
        )}
      </div>

      {/* Footer Explore Action Area */}
      <div className="explore-more-container" style={{ marginTop: '36px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <Link 
            to="/shop" 
            className="explore-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #78270b 0%, #a84118 100%)',
              color: '#ffffff',
              padding: '13px 32px',
              borderRadius: '30px',
              fontSize: '14px',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(120, 39, 11, 0.25)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
          >
            <span>Explore Full Sacred Collection</span>
            <ChevronRight size={18} />
          </Link>

          {/* Quick links pill row */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/shop?category=Rudraksha" style={{ fontSize: '11.5px', color: '#8c593b', background: '#fff', border: '1px solid #e2d2c1', padding: '4px 12px', borderRadius: '15px' }}>
              1 to 14 Mukhi Beads <ArrowUpRight size={11} style={{ display: 'inline' }} />
            </Link>
            <Link to="/shop?category=Mala" style={{ fontSize: '11.5px', color: '#8c593b', background: '#fff', border: '1px solid #e2d2c1', padding: '4px 12px', borderRadius: '15px' }}>
              108+1 Japa Malas <ArrowUpRight size={11} style={{ display: 'inline' }} />
            </Link>
            <Link to="/shop?sort=popular" style={{ fontSize: '11.5px', color: '#8c593b', background: '#fff', border: '1px solid #e2d2c1', padding: '4px 12px', borderRadius: '15px' }}>
              Top Rated Beads <ArrowUpRight size={11} style={{ display: 'inline' }} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
