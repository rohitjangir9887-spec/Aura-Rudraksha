import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronRight, 
  Sparkles, 
  Flame, 
  ShieldCheck, 
  Award, 
  CheckCircle2,
  ArrowUpRight
} from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { useCart } from "../hooks/useCart";

export function HomeProductShowcase({ products = [], isLoading = false }) {
  const { add } = useCart();
  const [activeTab, setActiveTab] = useState("all");

  // Filter products that admin explicitly enabled for Home Page Showcase
  const homeProducts = useMemo(() => {
    return products
      .filter(p => p.showOnHome !== false && p.status !== "Draft" && p.status !== "draft" && p.status !== "Inactive" && p.status !== "inactive" && p.status !== "Archived")
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

  const tabs = [
    { id: "all", label: "All Divine Picks", count: homeProducts.length, icon: Sparkles },
    ...(popularProducts.length > 0 ? [{ id: "popular", label: "Popular & Bestsellers", count: popularProducts.length, icon: Flame }] : []),
    ...(mukhiProducts.length > 0 ? [{ id: "mukhi", label: "Mukhi Rudraksha", count: mukhiProducts.length }] : []),
    ...(malaProducts.length > 0 ? [{ id: "mala", label: "Sacred Malas", count: malaProducts.length }] : []),
  ];

  return (
    <section className="section popular-collection-section" style={{ paddingTop: '20px', paddingBottom: '45px' }}>
      {/* Section Header */}
      <div className="section-heading fade-in-up-d1" style={{ marginBottom: '22px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '11px', 
            fontWeight: '700', 
            letterSpacing: '0.2em', 
            color: '#b85d25', 
            textTransform: 'uppercase',
            marginBottom: '6px'
          }}>
            <Sparkles size={13} />
            SACRED VEDIC COLLECTION
          </span>
          <h2 style={{ 
            fontFamily: '"Cormorant Garamond", Georgia, serif', 
            fontSize: '34px', 
            fontWeight: '700', 
            color: '#2a160d', 
            margin: '4px 0 8px',
            lineHeight: 1.15
          }}>
            Popular Rudraksha &amp; Sacred Beads
          </h2>
          <p style={{ fontSize: '13.5px', color: '#7a6a5e', margin: '0 auto', maxWidth: '520px', lineHeight: 1.5 }}>
            Hand-selected, authentic Nepali beads energized with Mount Kailash soil, holy Ganga Jal &amp; Vedic rituals.
          </p>
        </div>
      </div>

      {/* Trust Highlights Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '6px 14px',
        background: 'linear-gradient(to right, #fffdf9, #fdf8f2, #fffdf9)',
        border: '1px solid #efe4d8',
        borderRadius: '8px',
        padding: '8px 12px',
        maxWidth: '920px',
        margin: '0 auto 16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '600', color: '#542611' }}>
          <ShieldCheck size={13} color="#b85d25" />
          <span>100% Nepali Origin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '600', color: '#542611' }}>
          <Award size={13} color="#b85d25" />
          <span>Govt Lab Certified</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '600', color: '#542611' }}>
          <CheckCircle2 size={13} color="#20a95a" />
          <span>Free Vedic Energization</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '600', color: '#542611' }}>
          <span style={{ color: '#b85d25', fontWeight: '700', fontSize: '11px' }}>⚡</span>
          <span>7-Day Return</span>
        </div>
      </div>

      {/* Interactive Category / Collection Filter Pills */}
      {tabs.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          marginBottom: '20px'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: isActive ? '700' : '600',
                  border: isActive ? '1px solid #8c2b10' : '1px solid #ebdccb',
                  background: isActive ? 'linear-gradient(135deg, #8c2b10, #731e08)' : '#fffdf9',
                  color: isActive ? '#ffffff' : '#6f5446',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 6px rgba(140, 43, 16, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                {Icon && <Icon size={12} />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span style={{
                    fontSize: '9px',
                    padding: '1px 5px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#f2e8dc',
                    color: isActive ? '#ffffff' : '#8a6e5b',
                    fontWeight: '700',
                    marginLeft: '2px'
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
          displayedProducts.map(p => (
            <ProductCard key={p.id} p={p} onAdd={add} />
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
