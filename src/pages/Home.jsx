import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldCheck, PackageCheck, BadgeCheck, Flower2 } from "lucide-react";
import { Shell } from "../components/Shell";
import { useCart } from "../hooks/useCart";
import { db, onStoreUpdate } from "../lib/db";
import { Countdown } from "../components/Countdown";
import { WhyAuraSection } from "../components/WhyAuraSection";
import { ZodiacRudrakshaSection } from "../components/ZodiacRudrakshaSection";
import { PanditjiBioSection } from "../components/PanditjiBioSection";
import { ShopByCategory } from "../components/ShopByCategory";
import { HomeProductShowcase } from "../components/HomeProductShowcase";
import { AllProductsSection } from "../components/AllProductsSection";

export function Home() {
  const [hero, setHero] = useState(0);
  const [isLoading, setIsLoading] = useState(true); 
  const { add } = useCart();
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const location = useLocation();

  const loadHomeData = async () => {
    await db.waitForHydration();
    setBanners(db.getBanners());
    setProducts(db.getProducts().filter(p => p.status === 'Active'));
    
    // Banner offers that are Active
    const allOffers = db.getOffers().filter(o => {
      // Must be banner type (or legacy undefined)
      if (o.offerType === 'badge') return false;
      // Must be Active
      if (o.status !== 'Active') return false;
      
      // Legacy shownOn check
      if (o.shownOn && o.shownOn !== 'Home Banner') return false;
      
      // Expiry check
      if (o.expiry && new Date(o.expiry) < new Date()) return false;
      
      // Start date check
      if (o.startDate && new Date(o.startDate) > new Date()) return false;
      
      return true;
    });

    setOffers(allOffers.sort((a,b) => (a.order || 0) - (b.order || 0)));
    setIsLoading(false);
  };

  useEffect(() => {
    loadHomeData();
    db.logVisit();
    const unsub = onStoreUpdate(() => {
      loadHomeData();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (location.hash === "#about") {
      document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setHero((current) => (current + 1) % banners.length);
    }, 4500); 
    return () => clearInterval(interval);
  }, [banners.length]);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      setHero((current) => (current + 1) % banners.length);
    } else if (isRightSwipe) {
      setHero((current) => (current === 0 ? banners.length - 1 : current - 1));
    }
  };
  
  return <Shell>
    

    
    <section className="hero premium-slider"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="hero-slides">
        {banners.map((src, i) => (
          <img 
            key={i} 
            src={src} 
            alt={`Ad Banner ${i + 1}`} 
            className={`hero-slide ${i === hero ? 'active' : ''}`} 
          />
        ))}
      </div>
      {banners.length > 1 && (
        <div className="hero-pagination">
          {banners.map((_, i) => (
            <span key={i} className={`dot ${i === hero ? 'active' : ''}`} onClick={() => setHero(i)}></span>
          ))}
        </div>
      )}
    </section>

    


    <div className="feature-bar fade-in-up">
      <div><div className="icon-wrapper"><BadgeCheck strokeWidth={1.5}/></div><b>100% Authentic</b><span>Lab Certified</span></div>
      <div><div className="icon-wrapper"><Flower2 strokeWidth={1.5}/></div><b>Positive Energy</b><span>Energized Beads</span></div>
      <div><div className="icon-wrapper"><ShieldCheck strokeWidth={1.5}/></div><b>Premium Quality</b><span>Nepal Origin</span></div>
      <div><div className="icon-wrapper"><PackageCheck strokeWidth={1.5}/></div><b>Free Shipping</b><span>On Orders ₹499+</span></div>
    </div>

    {/* COMPACT SHOP BY CATEGORY CAROUSEL */}
    <ShopByCategory />

    {/* HOME PRODUCT SHOWCASE / POPULAR SECTION (Admin Configurable) */}
    <HomeProductShowcase products={products} isLoading={isLoading} />

    {/* THE AURA EDITORIAL: ASYMMETRIC SACRED DISCOVERY SECTION */}
    <WhyAuraSection />

    {/* ALL PRODUCTS SECTION */}
    <AllProductsSection products={products} isLoading={isLoading} />

    {/* THE AURA RASHI GUIDE: SHOP BY ZODIAC SIGN SECTION */}
    <ZodiacRudrakshaSection />
  </Shell>
}
