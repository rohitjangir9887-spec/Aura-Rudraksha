import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useCart } from "../hooks/useCart";
import { db, onStoreUpdate, isPublicProduct } from "../lib/db";
import { getOptimizedImageUrl, markProxyFailed } from "../lib/imageUtils";
import { OptimizedImage } from "../components/OptimizedImage";
import { Countdown } from "../components/Countdown";
import { WhyAuraSection } from "../components/WhyAuraSection";
import { ZodiacRudrakshaSection } from "../components/ZodiacRudrakshaSection";
import { PanditjiBioSection } from "../components/PanditjiBioSection";
import { ShopByCategory } from "../components/ShopByCategory";
import { HomeProductShowcase } from "../components/HomeProductShowcase";
import { AllProductsSection } from "../components/AllProductsSection";
import { PaymentFailureAlert } from "../components/PaymentFailureAlert";
import { AuraTrustFeatureBar } from "../components/AuraTrustFeatureBar";

export function Home() {
  const [hero, setHero] = useState(0);
  const [isLoading, setIsLoading] = useState(false); 
  const { add, totals } = useCart();
  const shippingThreshold = totals?.freeShippingThreshold ?? (db.getSettings()?.freeShippingThreshold ?? 0);
  const [banners, setBanners] = useState(() => db.getBanners() || []);
  const [products, setProducts] = useState(() => {
    try {
      return db.getProducts().filter(isPublicProduct);
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

  const updateLocalState = () => {
    const freshProducts = db.getProducts().filter(isPublicProduct);
    setProducts((prev) => {
      if (prev && prev.length === freshProducts.length) {
        let isSame = true;
        for (let i = 0; i < prev.length; i++) {
          const a = prev[i];
          const b = freshProducts[i];
          if (
            !b ||
            a.id !== b.id ||
            a.name !== b.name ||
            a.price !== b.price ||
            a.salesCount !== b.salesCount ||
            a.stock !== b.stock ||
            a.badge !== b.badge ||
            a.status !== b.status ||
            a.image !== b.image ||
            (Array.isArray(a.images) ? a.images[0] : a.images) !== (Array.isArray(b.images) ? b.images[0] : b.images) ||
            a.updatedAt !== b.updatedAt
          ) {
            isSame = false;
            break;
          }
        }
        if (isSame) return prev;
      }
      return freshProducts;
    });

    const cachedBanners = db.getBanners();
    if (cachedBanners && cachedBanners.length > 0) {
      setBanners((prev) => {
        if (
          prev &&
          prev.length === cachedBanners.length &&
          prev.every(
            (b, i) =>
              (b?.url || b?.image || b) ===
              (cachedBanners[i]?.url || cachedBanners[i]?.image || cachedBanners[i])
          )
        ) {
          return prev;
        }
        return cachedBanners;
      });
    }

    const allOffers = db.getOffers().filter((o) => {
      if (o.offerType === "badge") return false;
      if (o.status !== "Active") return false;
      if (o.shownOn && o.shownOn !== "Home Banner") return false;
      if (o.expiry && new Date(o.expiry) < new Date()) return false;
      if (o.startDate && new Date(o.startDate) > new Date()) return false;
      return true;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));

    setOffers((prev) => {
      if (
        prev &&
        prev.length === allOffers.length &&
        prev.every((o, i) => o.id === allOffers[i]?.id && o.status === allOffers[i]?.status)
      ) {
        return prev;
      }
      return allOffers;
    });
    setIsLoading(false);
  };

  const loadHomeData = async () => {
    // 1. Instantly render from local cache
    updateLocalState();

    // 2. Background fetch for home dataset (products, banners, offers)
    db.fetchHomeData().then(() => {
      updateLocalState();
    }).catch(() => {});
  };

  useEffect(() => {
    loadHomeData();
    db.logVisit();

    // Periodic product revalidation (60s) when tab is visible
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        db.revalidateProducts().catch(() => {});
      }
    }, 60000);

    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        db.revalidateProducts().catch(() => {});
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    const unsub = onStoreUpdate(() => {
      updateLocalState();
    });

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      unsub();
    };
  }, []);

  useEffect(() => {
    if (location.hash === "#about") {
      document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  const rawBanners = (banners && banners.length > 0) ? banners : db.getBanners();
  const activeBanners = (Array.isArray(rawBanners) ? rawBanners : [])
    .map(b => (typeof b === "string" ? b : (b?.url || b?.image || b?.src || "")))
    .filter(Boolean);
  if (activeBanners.length === 0) {
    activeBanners.push("/images/placeholder.svg");
  }
  const [loadedBanners, setLoadedBanners] = useState({});

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setHero((current) => (current + 1) % activeBanners.length);
    }, 3500); 
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
  
  const currentBannerSrc = activeBanners[hero] || activeBanners[0];
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const bannerWidth = isMobile ? 640 : 1200;

  return <Shell>
    
    <section className="hero premium-slider"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-label="Aura Sacred Hero Banners"
      style={{ overflow: 'hidden', borderRadius: '12px', margin: '0 0 16px 0' }}
    >
      <div className="hero-slides" style={{ minHeight: "220px", background: "linear-gradient(135deg, #2b170d 0%, #1a0c06 100%)", position: "relative" }}>
        {activeBanners.map((src, i) => {
          const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
          const bannerWidth = isMobile ? 640 : 1200;
          const bannerQuality = isMobile ? 78 : 84;

          return (
            <OptimizedImage 
              key={`${src}-${i}`} 
              src={src} 
              alt={`Aura Sacred Banner ${i + 1}`} 
              width={bannerWidth}
              quality={bannerQuality}
              priority={i === 0}
              containerClassName={`hero-slide ${i === hero ? 'active' : ''}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          );
        })}
      </div>
      {activeBanners.length > 1 && (
        <div className="hero-pagination" role="tablist" aria-label="Slider Pagination">
          {activeBanners.map((_, i) => (
            <button 
              key={i} 
              type="button"
              role="tab"
              aria-selected={i === hero}
              aria-label={`Go to slide ${i + 1}`}
              className={`dot ${i === hero ? 'active' : ''}`} 
              onClick={() => setHero(i)}
            />
          ))}
        </div>
      )}
    </section>

    


    <AuraTrustFeatureBar />
    <PaymentFailureAlert />
    {/* COMPACT SHOP BY CATEGORY CAROUSEL */}
    <motion.div    ><ShopByCategory /></motion.div>

    {/* HOME PRODUCT SHOWCASE / POPULAR SECTION (Admin Configurable) */}
    <motion.div    ><HomeProductShowcase products={products} isLoading={isLoading} /></motion.div>

    {/* THE AURA EDITORIAL: ASYMMETRIC SACRED DISCOVERY SECTION */}
    <motion.div    ><WhyAuraSection /></motion.div>

    {/* ALL PRODUCTS SECTION */}
    <motion.div    ><AllProductsSection products={products} isLoading={isLoading} /></motion.div>

    {/* THE AURA RASHI GUIDE: SHOP BY ZODIAC SIGN SECTION */}
    <motion.div    ><ZodiacRudrakshaSection /></motion.div>
  </Shell>
}
