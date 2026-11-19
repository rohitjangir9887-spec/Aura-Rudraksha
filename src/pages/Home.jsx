import React, { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Shell } from "../components/Shell";
import { db, onStoreUpdate, isPublicProduct } from "../lib/db";
import { OptimizedImage } from "../components/OptimizedImage";
import { WhyAuraSection } from "../components/WhyAuraSection";
import { ZodiacRudrakshaSection } from "../components/ZodiacRudrakshaSection";
import { ShopByCategory } from "../components/ShopByCategory";
import { HomeProductShowcase } from "../components/HomeProductShowcase";
import { CustomizeMalaSection } from "../components/CustomizeMalaSection";
import { AllProductsSection } from "../components/AllProductsSection";
import { AuraTrustFeatureBar } from "../components/AuraTrustFeatureBar";
import { HomeHeroOffer } from "../components/HomeHeroOffer";
import { SacredFeaturesShowcase } from "../components/SacredFeaturesShowcase";
import { useSeo } from "../hooks/useSeo";

export function Home() {
  const [hero, setHero] = useState(0);
  const [pauseCarousel, setPauseCarousel] = useState(false);
  const [carouselInteracting, setCarouselInteracting] = useState(false);
  const reduceMotion = useReducedMotion();
  const touchStart = useRef(null);
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const prods = db.getProducts().filter(isPublicProduct);
      return prods.length === 0;
    } catch {
      return false;
    }
  });
  const [banners, setBanners] = useState(() => db.getBanners() || []);
  const [products, setProducts] = useState(() => {
    try {
      const list = db.getProducts().filter(isPublicProduct);
      return list.length > 0 ? list : [];
    } catch {
      return [];
    }
  });
  const location = useLocation();

  useSeo({
    title: "Aura Rudraksha — 100% Authentic Nepal & Indonesian Rudraksha | Lab Certified",
    description: "Discover genuine lab-tested Nepali Rudraksha beads (1 to 21 Mukhi), consecrated 108+1 Japa Malas, and protective Vedic wristlets. Free nationwide shipping & authentic certificates.",
    canonical: "https://aurarudraksha.bond/",
    ogImage: "https://aurarudraksha.bond/og-image.jpg"
  });

  const updateLocalState = () => {
    const freshProducts = db.getProducts().filter(isPublicProduct);
    setProducts((prev) => {
      if (
        prev.length === freshProducts.length &&
        prev.every(
          (p, i) =>
            p === freshProducts[i] ||
            (p.id === freshProducts[i]?.id &&
            p.name === freshProducts[i]?.name &&
            p.price === freshProducts[i]?.price &&
            p.mrp === freshProducts[i]?.mrp &&
            p.img === freshProducts[i]?.img &&
            p.stock === freshProducts[i]?.stock &&
            p.homeOrder === freshProducts[i]?.homeOrder &&
            p.sortOrder === freshProducts[i]?.sortOrder &&
            p.displayOrder === freshProducts[i]?.displayOrder &&
            p.showOnHome === freshProducts[i]?.showOnHome &&
            p.isPopular === freshProducts[i]?.isPopular &&
            p.homeBadge === freshProducts[i]?.homeBadge &&
            p.badge === freshProducts[i]?.badge &&
            p.reviews === freshProducts[i]?.reviews &&
            p.updatedAt === freshProducts[i]?.updatedAt)
        )
      ) {
        return prev;
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

    if (freshProducts.length > 0) {
      setIsLoading(false);
    }
  };

  const loadHomeData = async () => {
    updateLocalState();
    // Force fresh revalidation so admin product updates appear immediately on first visitor visit
    db.fetchHomeData(true)
      .then(() => {
        updateLocalState();
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadHomeData();
    const visitTimer = setTimeout(() => {
      db.logVisit({ path: "/" });
    }, 2200);

    const unsub = onStoreUpdate(() => {
      updateLocalState();
    });

    return () => {
      clearTimeout(visitTimer);
      unsub();
    };
  }, []);

  useEffect(() => {
    if (location.hash === "#about") {
      document.getElementById("about")?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth" });
    }
  }, [location.hash, reduceMotion]);

  const rawBanners = (banners && banners.length > 0) ? banners : db.getBanners();
  const activeBanners = (Array.isArray(rawBanners) ? rawBanners : [])
    .map(b => (typeof b === "string" ? b : (b?.url || b?.image || b?.src || "")))
    .filter(Boolean);
  if (activeBanners.length === 0) {
    activeBanners.push("/images/placeholder.svg");
  }
  const bannerCount = activeBanners.length;
  const activeSlide = hero % bannerCount;
  useEffect(() => {
    if (bannerCount <= 1 || reduceMotion || pauseCarousel || carouselInteracting) return;
    const interval = setInterval(() => {
      if (!document.hidden) setHero(current => (current + 1) % bannerCount);
    }, 3500);
    return () => clearInterval(interval);
  }, [bannerCount, reduceMotion, pauseCarousel, carouselInteracting]);

  const onTouchEnd = (event) => {
    const end = event.changedTouches[0]?.clientX;
    const start = touchStart.current;
    touchStart.current = null;
    if (start === null || end === undefined || Math.abs(start - end) < 50) return;
    const step = start > end ? 1 : -1;
    setHero(current => (current + step + bannerCount) % bannerCount);
  };

  const revealStart = reduceMotion ? false : { opacity: 0, y: 12 };
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const bannerWidth = isMobile ? 640 : 1200;
  const bannerQuality = isMobile ? 78 : 84;

  return <Shell>
    <section className="hero premium-slider"
      onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchCancel={() => { touchStart.current = null; }}
      onPointerEnter={event => { if (event.pointerType === "mouse") setCarouselInteracting(true); }}
      onPointerLeave={() => setCarouselInteracting(false)}
      onTouchEnd={onTouchEnd}
      aria-label="Aura Sacred Hero Banners"
      style={{ overflow: 'hidden', borderRadius: '12px', margin: '24px auto 16px', width: '100%' }}
    >
      <div className="hero-slides" style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', background: "linear-gradient(135deg, #2b170d 0%, #1a0c06 100%)", position: "relative" }}>
        {activeBanners.map((src, i) => {
          return (
            <OptimizedImage
              key={`${src}-${i}`}
              src={src}
              alt={`Aura Sacred Banner ${i + 1}`}
              width={bannerWidth}
              quality={bannerQuality}
              priority={i === 0}
              aria-hidden={i !== activeSlide}
              containerClassName={`hero-slide ${i === activeSlide ? 'active' : ''}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
            />
          );
        })}
      </div>
      {activeBanners.length > 1 && (
        <div className="hero-pagination" role="group" aria-label="Banner controls">
          {activeBanners.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === activeSlide}
              aria-label={`Go to slide ${i + 1}`}
              className={`dot ${i === activeSlide ? 'active' : ''}`}
              onClick={() => { setHero(i); setPauseCarousel(true); }}
            />
          ))}
          {!reduceMotion && (
            <button
              type="button"
              className="hero-play-toggle"
              aria-label={pauseCarousel ? "Play banners" : "Pause banners"}
              onClick={() => setPauseCarousel(value => !value)}
            >
              <span aria-hidden="true">{pauseCarousel ? "▶" : "Ⅱ"}</span>
            </button>
          )}
        </div>
      )}
    </section>

    <AuraTrustFeatureBar />
    <HomeHeroOffer />

    {/* COMPACT SHOP BY CATEGORY CAROUSEL */}
    <motion.div
      initial={revealStart}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <ShopByCategory />
    </motion.div>

    {/* HOME PRODUCT SHOWCASE / POPULAR SECTION (Admin Configurable) */}
    <motion.div
      initial={revealStart}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
    >
      <HomeProductShowcase products={products} isLoading={isLoading} />
    </motion.div>

    {/* CUSTOMIZE YOUR MALA STUDIO (Directly below Explore Full Sacred Collection) */}
    <CustomizeMalaSection products={products} />

    {/* SACRED DEVOTIONAL TOOLS: JAPA COUNTER, COMPARISON & PRAN PRATISHTHA */}
    <motion.div
      initial={revealStart}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
    >
      <SacredFeaturesShowcase />
    </motion.div>

    {/* THE AURA EDITORIAL: ASYMMETRIC SACRED DISCOVERY SECTION */}
    <motion.div
      initial={revealStart}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
    >
      <WhyAuraSection />
    </motion.div>

    {/* ALL PRODUCTS SECTION */}
    <motion.div
      initial={revealStart}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
    >
      <AllProductsSection products={products} isLoading={isLoading} />
    </motion.div>

    {/* THE AURA RASHI GUIDE: SHOP BY ZODIAC SIGN SECTION */}
    <motion.div
      initial={revealStart}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
    >
      <ZodiacRudrakshaSection />
    </motion.div>
  </Shell>
}
