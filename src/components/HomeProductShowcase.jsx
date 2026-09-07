import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronRight, 
  Sparkles, 
  Flame, 
  ArrowRight,
  ArrowUpRight,
  Play,
  X
} from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { useCart } from "../hooks/useCart";
import { isPublicProduct } from "../lib/db";

// Authentic Devotee Avatars for "Watch Our Story"
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

export function HomeProductShowcase({ products = [], isLoading = false }) {
  const { add } = useCart();
  const [activeTab, setActiveTab] = useState("all");
  const [showStoryModal, setShowStoryModal] = useState(false);

  // Filter products that admin explicitly enabled for Home Page Showcase
  const homeProducts = useMemo(() => {
    return products
      .filter(p => p.showOnHome !== false && isPublicProduct(p))
      .sort((a, b) => {
        const orderA = a.homeOrder !== undefined && a.homeOrder > 0 ? a.homeOrder : 999;
        const orderB = b.homeOrder !== undefined && b.homeOrder > 0 ? b.homeOrder : 999;
        if (orderA !== orderB) return orderA - orderB;
        return (b.rating || 0) - (a.rating || 0);
      });
  }, [products]);

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
      style={{ paddingTop: '20px', paddingBottom: '45px' }}
    >
      {/* 1. Header / Title Area */}
      <div className="section-heading fade-in-up-d1" style={{ marginBottom: '18px', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          {/* Small Decorative Vedic Divider */}
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ height: '1px', width: '28px', background: 'linear-gradient(to right, transparent, #b85d25)' }} />
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '700', 
              letterSpacing: '0.22em', 
              color: '#b85d25', 
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              ✦ SACRED VEDIC COLLECTION ✦
            </span>
            <span style={{ height: '1px', width: '28px', background: 'linear-gradient(to left, transparent, #b85d25)' }} />
          </div>

          <h2 style={{ 
            fontFamily: '"Cormorant Garamond", Georgia, serif', 
            fontSize: 'clamp(24px, 3.8vw, 34px)', 
            fontWeight: '700', 
            color: '#2a160d', 
            margin: '4px 0 8px',
            lineHeight: 1.15
          }}>
            Popular Rudraksha &amp; Sacred Beads
          </h2>

          <p style={{ fontSize: '13.5px', color: '#7a6a5e', margin: '0 auto', maxWidth: '520px', lineHeight: 1.55 }}>
            Hand-selected, authentic Nepali beads energized with Mount Kailash soil, holy Ganga Jal &amp; Vedic rituals.
          </p>
        </div>
      </div>

      {/* 2. Target Design Container: Warm Ivory Card with Benefits & Story Bar */}
      <div 
        style={{
          maxWidth: '920px',
          margin: '0 auto 16px',
          background: 'linear-gradient(180deg, #FAF7F2 0%, #F5ECE0 100%)',
          border: '1px solid #EADBCC',
          borderRadius: '24px',
          padding: '18px 16px 16px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 6px 24px rgba(90, 40, 16, 0.04)'
        }}
      >
        {/* Subtle Mandala Watermark in Top Right */}
        <MandalaCornerWatermark />

        {/* Card Header: "Why Choose Us — 🪷 —" and Authentic Rudraksha Visual Accent */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <h3 style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: '20px',
              fontWeight: '700',
              color: '#2A160D',
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center'
            }}>
              Why Choose Us
            </h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}>
              <span style={{ width: '14px', height: '1px', background: '#D27C38', display: 'inline-block' }} />
              <LotusFlourish />
              <span style={{ width: '14px', height: '1px', background: '#D27C38', display: 'inline-block' }} />
            </span>
          </div>

          {/* Genuine Nepali Rudraksha Visual Accent Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255,255,255,0.85)',
            border: '1px solid #EAD8C7',
            borderRadius: '20px',
            padding: '2px 8px 2px 3px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <img
              src="/images/product-5mukhi.jpg"
              alt="Authentic Nepal Consecrated Rudraksha"
              referrerPolicy="no-referrer"
              loading="lazy"
              style={{ width: '19px', height: '19px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #B85D25' }}
            />
            <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#66341C' }}>
              Authentic Nepal Bead
            </span>
          </div>
        </div>

        {/* 3. Four Trust / Benefit Columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          marginBottom: '14px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Benefit 1: 100% Nepali Origin */}
          <div style={{ textAlign: 'center', padding: '2px 1px', position: 'relative' }}>
            <div style={{
              width: '54px',
              height: '54px',
              margin: '0 auto',
              borderRadius: '50%',
              border: '1px solid #E8D5C0',
              background: 'radial-gradient(circle at 35% 35%, #FFFFFF 30%, #F5EAE0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(100, 50, 20, 0.04)'
            }}>
              <MountainSunIcon size={26} />
            </div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#2A160D', lineHeight: '1.25', marginTop: '7px' }}>
              100%<br />Nepali Origin
            </div>
            <span style={{ position: 'absolute', right: 0, top: '15%', height: '70%', width: '1px', background: '#EAE0D3' }} />
          </div>

          {/* Benefit 2: Govt Lab Certified */}
          <div style={{ textAlign: 'center', padding: '2px 1px', position: 'relative' }}>
            <div style={{
              width: '54px',
              height: '54px',
              margin: '0 auto',
              borderRadius: '50%',
              border: '1px solid #E8D5C0',
              background: 'radial-gradient(circle at 35% 35%, #FFFFFF 30%, #F5EAE0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(100, 50, 20, 0.04)'
            }}>
              <LabCertifiedIcon size={26} />
            </div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#2A160D', lineHeight: '1.25', marginTop: '7px' }}>
              Govt Lab<br />Certified
            </div>
            <span style={{ position: 'absolute', right: 0, top: '15%', height: '70%', width: '1px', background: '#EAE0D3' }} />
          </div>

          {/* Benefit 3: Free Vedic Energization */}
          <div style={{ textAlign: 'center', padding: '2px 1px', position: 'relative' }}>
            <div style={{
              width: '54px',
              height: '54px',
              margin: '0 auto',
              borderRadius: '50%',
              border: '1px solid #E8D5C0',
              background: 'radial-gradient(circle at 35% 35%, #FFFFFF 30%, #F5EAE0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(100, 50, 20, 0.04)'
            }}>
              <VedicEnergizationIcon size={26} />
            </div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#2A160D', lineHeight: '1.25', marginTop: '7px' }}>
              Free Vedic<br />Energization
            </div>
            <span style={{ position: 'absolute', right: 0, top: '15%', height: '70%', width: '1px', background: '#EAE0D3' }} />
          </div>

          {/* Benefit 4: 7-Day Return */}
          <div style={{ textAlign: 'center', padding: '2px 1px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              margin: '0 auto',
              borderRadius: '50%',
              border: '1px solid #E8D5C0',
              background: 'radial-gradient(circle at 35% 35%, #FFFFFF 30%, #F5EAE0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(100, 50, 20, 0.04)'
            }}>
              <SevenDayReturnIcon size={26} />
            </div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#2A160D', lineHeight: '1.25', marginTop: '7px' }}>
              7-Day<br />Return
            </div>
          </div>
        </div>

        {/* 4. "Watch Our Story" Bar */}
        <div 
          onClick={() => setShowStoryModal(true)}
          role="button"
          tabIndex={0}
          aria-label="Watch Our Story: Authentic Nepali Consecration Journey"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setShowStoryModal(true)}
          style={{
            background: 'linear-gradient(135deg, #35170A 0%, #220D04 100%)',
            border: '1px solid #4D2612',
            borderRadius: '9999px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(25, 10, 4, 0.16), inset 0 1px 0 rgba(230, 190, 130, 0.28)',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            userSelect: 'none',
            position: 'relative',
            zIndex: 1
          }}
        >
          {/* Left: Circular Play Button + Watch Our Story + Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              border: '1.5px solid #D4AF37',
              background: 'linear-gradient(135deg, #4A200E, #2B1106)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#FFFFFF">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </div>

            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.18)', margin: '0 1px' }} />

            <span style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: '15px',
              fontWeight: '600',
              color: '#FAF4EB',
              whiteSpace: 'nowrap'
            }}>
              Watch Our Story
            </span>
            <ArrowRight size={14} color="#E6C594" style={{ flexShrink: 0 }} />
          </div>

          {/* Right: Devotee Avatar Group + 10K+ Happy Devotees + Gold Lotus */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0, marginLeft: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {DEVOTEE_AVATARS.map((devotee, idx) => (
                <img
                  key={idx}
                  src={devotee.img}
                  alt={devotee.name}
                  title={`${devotee.name} (${devotee.city})`}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid #240E05',
                    marginLeft: idx > 0 ? '-7px' : '0',
                    position: 'relative',
                    zIndex: 3 - idx
                  }}
                />
              ))}
            </div>

            <div style={{ lineHeight: 1.15, textAlign: 'left' }}>
              <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#FFFFFF' }}>
                10K+
              </div>
              <div style={{ fontSize: '8.5px', fontWeight: '500', color: '#D5C2AF', whiteSpace: 'nowrap' }}>
                Happy Devotees
              </div>
            </div>

            {/* Far Right Subtle Lotus Outline */}
            <div style={{ opacity: 0.85, marginLeft: '2px', display: 'flex', alignItems: 'center' }}>
              <svg width="24" height="18" viewBox="0 0 32 24" fill="none" stroke="#D4AF37" strokeWidth="1.3">
                <path d="M16 3C16 3 13 8 13 14C13 18 16 20 16 20C16 20 19 18 19 14C19 8 16 3 16 3Z" />
                <path d="M13 9C10 11 6 13 6 17C6 19.5 8 20 10.5 20C13 20 14.5 17 14.5 17" />
                <path d="M19 9C22 11 26 13 26 17C26 19.5 24 20 21.5 20C19 20 17.5 17 17.5 17" />
                <path d="M12 21C14 22 18 22 20 21" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Category Filters: 2x2 Clean Layout matching Reference */}
      {tabs.length > 0 && (
        <div 
          style={{
            maxWidth: '920px',
            margin: '0 auto 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '9px'
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '46px',
                  padding: '0 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: isActive ? '700' : '600',
                  border: isActive ? '1px solid #9A3915' : '1px solid #EFE4D8',
                  background: isActive 
                    ? 'linear-gradient(135deg, #7A280D 0%, #4D1606 100%)' 
                    : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#2E1A11',
                  cursor: 'pointer',
                  boxShadow: isActive 
                    ? '0 4px 14px rgba(77, 22, 6, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                    : '0 2px 6px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.18s ease',
                  userSelect: 'none',
                  outline: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, overflow: 'hidden' }}>
                  {Icon && (
                    <Icon 
                      size={16} 
                      color={isActive ? '#F5CB87' : '#C85A2A'} 
                      style={{ flexShrink: 0 }} 
                    />
                  )}
                  <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {tab.label}
                  </span>
                </div>

                {tab.count !== undefined && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: isActive ? 'rgba(48, 12, 2, 0.65)' : '#F5EDE4',
                    color: isActive ? '#FFFFFF' : '#7E6252',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginLeft: '6px'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 6. Product Grid (Untouched functionality and props) */}
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
          displayedProducts.map(p => (
            <ProductCard key={p.id} p={p} onAdd={add} />
          ))
        )}
      </div>

      {/* 7. Footer Explore Action Area (Untouched functionality) */}
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

      {/* 8. Accessible "Watch Our Story" Consecration Modal */}
      {showStoryModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10050,
            background: 'rgba(20, 8, 4, 0.78)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowStoryModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sacred-story-modal-title"
        >
          <div 
            style={{
              background: '#FAF6F0',
              borderRadius: '24px',
              border: '1px solid #EADBCC',
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.32)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div style={{
              background: 'linear-gradient(135deg, #35170A 0%, #220D04 100%)',
              padding: '16px 20px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #4D2612'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: '1.5px solid #D4AF37',
                  background: '#4A200E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Play size={12} fill="#FFFFFF" color="#FFFFFF" />
                </div>
                <div>
                  <h4 id="sacred-story-modal-title" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '18px', fontWeight: '700', margin: 0, color: '#FAF4EB' }}>
                    The Sacred Consecration Story
                  </h4>
                  <span style={{ fontSize: '11px', color: '#D5C2AF' }}>
                    Nepal Sacred Groves → Haridwar Ganga Aarti Consecration
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStoryModal(false)}
                aria-label="Close story modal"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px' }}>
              {/* Consecration Visual Card */}
              <div style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                marginBottom: '16px',
                background: '#2A160D',
                border: '1px solid #E4D2BF'
              }}>
                <img 
                  src="/images/product-5mukhi.jpg" 
                  alt="Sacred Nepal Rudraksha Consecration" 
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '170px', objectFit: 'cover', opacity: 0.82 }} 
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(30,10,3,0.94) 0%, rgba(30,10,3,0.4) 65%, transparent 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '14px'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.15em', color: '#E5C088', textTransform: 'uppercase' }}>
                    ✦ Authenticity &amp; Devotion Since 2012
                  </span>
                  <p style={{ fontSize: '12.5px', color: '#FFFFFF', margin: '4px 0 0', lineHeight: 1.45 }}>
                    Every single bead is personally consecrated on the sacred banks of Mother Ganga in Haridwar with 108 Shiva Beej Mantras and sanctified with Mount Kailash soil.
                  </p>
                </div>
              </div>

              {/* 4 Sacred Steps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #EFE4D8', borderRadius: '12px', padding: '9px 11px' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#B85D25', textTransform: 'uppercase' }}>1. 100% Nepali Origin</div>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#2A160D', marginTop: '2px' }}>High-Altitude Groves</div>
                  <div style={{ fontSize: '10.5px', color: '#7A6A5E', marginTop: '2px', lineHeight: 1.3 }}>Gathered ethically from Bhojpur &amp; Sankhuwasabha.</div>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #EFE4D8', borderRadius: '12px', padding: '9px 11px' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#B85D25', textTransform: 'uppercase' }}>2. Govt Lab Certified</div>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#2A160D', marginTop: '2px' }}>Digital X-Ray Tested</div>
                  <div style={{ fontSize: '10.5px', color: '#7A6A5E', marginTop: '2px', lineHeight: 1.3 }}>Every Mukhi chamber tested with verification report.</div>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #EFE4D8', borderRadius: '12px', padding: '9px 11px' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#B85D25', textTransform: 'uppercase' }}>3. Free Energization</div>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#2A160D', marginTop: '2px' }}>Vedic Haridwar Puja</div>
                  <div style={{ fontSize: '10.5px', color: '#7A6A5E', marginTop: '2px', lineHeight: 1.3 }}>Sanctified with holy Ganga Jal &amp; Kailash soil.</div>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #EFE4D8', borderRadius: '12px', padding: '9px 11px' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#B85D25', textTransform: 'uppercase' }}>4. 10K+ Devotees</div>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#2A160D', marginTop: '2px' }}>Devotee Satisfaction</div>
                  <div style={{ fontSize: '10.5px', color: '#7A6A5E', marginTop: '2px', lineHeight: 1.3 }}>Backed by our 7-Day peaceful return assurance.</div>
                </div>
              </div>

              {/* Dismiss Action Button */}
              <button
                type="button"
                onClick={() => setShowStoryModal(false)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #78270B 0%, #A84118 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '11px 20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(120, 39, 11, 0.25)'
                }}
              >
                Browse Sacred Beads
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
