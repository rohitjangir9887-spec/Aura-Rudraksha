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
  const [isLoading, setIsLoading] = useState(false); 
  const { add } = useCart();
  const [banners, setBanners] = useState(() => db.getBanners() || []);
  const [products, setProducts] = useState(() => {
    try {
      return db.getProducts().filter(p => p.status === 'Active');
    } catch {
      return [];
    }
  });
  const [offers, setOffers] = useState(() => {
    try {
      return db.getOffers().filter(o => {
        if (o.offerType === 'badge') return false;
        if (o.status !== 'Active') return false;
        if (o.shownOn && o.shownOn !== 'Home Banner') return false;
        if (o.expiry && new Date(o.expiry) < new Date()) return false;
        if (o.startDate && new Date(o.startDate) > new Date()) return false;
        return true;
      }).sort((a,b) => (a.order || 0) - (b.order || 0));
    } catch {
      return [];
    }
  });
  const location = useLocation();

  const loadHomeData = async () => {
    // Instantly set banners from cache so hero slider never disappears during hydration wait
    const cachedBanners = db.getBanners();
    if (cachedBanners && cachedBanners.length > 0) {
      setBanners(cachedBanners);
    }

    await db.waitForHydration();

    const hydratedBanners = db.getBanners();
    if (hydratedBanners && hydratedBanners.length > 0) {
      setBanners(hydratedBanners);
    }

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

  const activeBanners = (banners && banners.length > 0) ? banners : db.getBanners();

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setHero((current) => (current + 1) % activeBanners.length);
    }, 4500); 
    return () => clearInterval(interval);
  }, [activeBanners.length]);

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
      setHero((current) => (current + 1) % activeBanners.length);
    } else if (isRightSwipe) {
      setHero((current) => (current === 0 ? activeBanners.length - 1 : current - 1));
    }
  };
  
  return <Shell>
    
    <section className="hero premium-slider"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="hero-slides" style={{ minHeight: "220px", background: "linear-gradient(135deg, #2b170d 0%, #1a0c06 100%)", position: "relative" }}>
        {activeBanners.map((src, i) => (
          <img 
            key={i} 
            src={src} 
            alt={`Aura Sacred Banner ${i + 1}`} 
            className={`hero-slide ${i === hero ? 'active' : ''}`}
            loading={i === 0 ? "eager" : "lazy"}
            fetchpriority={i === 0 ? "high" : "auto"}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              if (!e.currentTarget.src.includes("product-5mukhi.jpg")) {
                e.currentTarget.src = "/images/product-5mukhi.jpg";
              }
            }}
          />
        ))}
      </div>
      {activeBanners.length > 1 && (
        <div className="hero-pagination">
          {activeBanners.map((_, i) => (
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
