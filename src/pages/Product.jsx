import React, { useState, useEffect, useRef } from "react";
import DOMPurify from 'dompurify';
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Star, Minus, Plus, Gift, ShieldCheck, ChevronLeft, ChevronRight,
  ShoppingCart, Heart, ChevronDown, ChevronUp, Copy, Check, 
  Sparkles, Award, Truck, RotateCcw, Share2, ZoomIn, X, 
  Tag, CheckCircle2, AlertCircle, Flame, BookOpen, Compass, 
  Droplets, Package, FileCheck, Flower2, HeartHandshake
} from "lucide-react";
import { Shell } from "../components/Shell";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { emitToast } from "../context/ToastContext";
import { money, pct } from "../data";
import { db, onStoreUpdate, isPublicProduct } from "../lib/db";
import { authClient } from "../lib/authClient";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "../components/ProductCard";
import { ProductReviews } from "../components/ProductReviews";
import { OfferBadge } from "../components/OfferBadge";
import { OfferCard } from "../components/OfferCard";
import { FloatingOffer } from "../components/FloatingOffer";
import { StickyPurchaseBar } from "../components/StickyPurchaseBar";
import "../components/RichTextEditor.css";

export function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  // Core product state
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gallery & UI state
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("1.5 cm");
  const [activeImg, setActiveImg] = useState("");
  const [slideDirection, setSlideDirection] = useState(1);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");
  const [added, setAdded] = useState(false);

  // Hover Zoom Effect States & Handlers
  const [zoomStyle, setZoomStyle] = useState({ transformOrigin: "center center", transform: "scale(1)" });
  const [isZooming, setIsZooming] = useState(false);

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: "scale(2.2)"
    });
    setIsZooming(true);
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transformOrigin: "center center",
      transform: "scale(1)"
    });
    setIsZooming(false);
  };

  // Sticky Bar & Accordion states
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState("about");

  // Dynamic Offer Badge State
  const [offerBadge, setOfferBadge] = useState(null);

  // Refs for scrolling and touch gestures
  const ctaSectionRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  useEffect(() => {
    const loadBadges = () => {
      if (!product) return;
      const allBadges = db.getOffers().filter(o => o.offerType === 'badge' && o.status === 'Active');
      const validBadges = allBadges.filter(o => {
        if (o.expiry && new Date(o.expiry) < new Date()) return false;
        if (o.startDate && new Date(o.startDate) > new Date()) return false;
        return true;
      });
      const matchingBadge = validBadges.find(o => o.applyTo === 'ALL' || o.applyTo === String(product.id));
      setOfferBadge(matchingBadge || null);
    };

    loadBadges();
    const unsub = onStoreUpdate(() => {
      loadBadges();
    });
    return () => unsub();
  }, [product]);

  // Load and subscribe to database updates
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const found = await db.getProductAsync(id);
      const isDraft = found && (found.status === 'Draft' || found.status === 'draft' || found.status === 'Inactive' || found.status === 'inactive' || found.status === 'Archived');
      const isAdmin = authClient.isAdmin && authClient.isAdmin();
      const validProduct = (isDraft && !isAdmin) ? null : found;

      setProduct(validProduct);
      
      if (validProduct) {
        const defaultImg = (validProduct.images && validProduct.images[0]) || validProduct.img || "/images/product-5mukhi.jpg";
        setActiveImg(prev => (validProduct.images?.includes(prev) ? prev : defaultImg));
        setReviews(db.getReviews(validProduct.id || validProduct._id));
      }

      // Unblock main product UI immediately
      if (!silent) setLoading(false);

      // Load related products and coupons in background
      const prods = db.getProducts().filter(isPublicProduct);
      setAllProducts(prods);
      setCoupons(db.getCoupons().filter(c => c.status === "Active"));
    } catch (err) {
      console.error("[Product Page] Failed to load product:", err);
      if (!silent) {
        setProduct(null);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    db.logVisit();
    db.logProductView();
    loadData(false);

    db.revalidateProducts().then(() => {
      loadData(true);
    }).catch(() => {});

    // Live real-time sync when Admin updates product, stock, or offers
    const unsub = onStoreUpdate(() => {
      loadData(true);
    });

    return () => unsub();
  }, [id]);

  // Handle sticky CTA visibility on scroll without layout thrashing
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (ctaSectionRef.current) {
            const rect = ctaSectionRef.current.getBoundingClientRect();
            setShowStickyBar(rect.bottom < 0);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const p = product;

  // Live rating and review count from real approved devotee reviews in MongoDB
  const realReviewsForRating = reviews.filter(r => !r.isAiGenerated && !r.isSample);
  const reviewsCount = realReviewsForRating.length;
  const totalRatingSum = realReviewsForRating.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
  const averageRating = reviewsCount > 0 ? (totalRatingSum / reviewsCount).toFixed(1) : "5.0";

  // Normalized product images list
  const productImages = p
    ? ((Array.isArray(p.images) && p.images.length > 0)
        ? p.images
        : [p.img || "/images/product-5mukhi.jpg"])
    : ["/images/product-5mukhi.jpg"];

  // Derive active image index safely
  const currentIndex = productImages.indexOf(activeImg);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  // Preload all product images for instant thumbnail switching
  useEffect(() => {
    if (!productImages.length) return;
    productImages.forEach((src) => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [productImages]);

  // Navigation handlers (Infinite looping 1 -> 2 -> 3 -> 4 -> 1)
  const handlePreviousImage = () => {
    if (productImages.length <= 1) return;
    setSlideDirection(-1);
    const prevIndex = (activeIndex - 1 + productImages.length) % productImages.length;
    setActiveImg(productImages[prevIndex]);
  };

  const handleNextImage = () => {
    if (productImages.length <= 1) return;
    setSlideDirection(1);
    const nextIndex = (activeIndex + 1) % productImages.length;
    setActiveImg(productImages[nextIndex]);
  };

  const handleThumbnailClick = (imgUrl, idx) => {
    if (imgUrl === activeImg) return;
    setSlideDirection(idx > activeIndex ? 1 : -1);
    setActiveImg(imgUrl);
  };

  // Mobile Touch Swipe Gesture Support
  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (e.changedTouches && e.changedTouches[0]) {
      const diffX = touchStartX.current - e.changedTouches[0].clientX;
      const diffY = touchStartY.current - e.changedTouches[0].clientY;
      // Trigger swipe only if predominantly horizontal and movement > 35px
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
        if (diffX > 0) {
          handleNextImage(); // Swipe left -> next image
        } else {
          handlePreviousImage(); // Swipe right -> previous image
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isZoomOpen) {
        if (e.key === "Escape") setIsZoomOpen(false);
        if (e.key === "ArrowLeft") handlePreviousImage();
        if (e.key === "ArrowRight") handleNextImage();
        return;
      }
      if (e.key === "ArrowLeft") handlePreviousImage();
      if (e.key === "ArrowRight") handleNextImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, productImages, isZoomOpen]);

  if (loading) {
    return (
      <Shell>
        <div className="container" style={{ padding: "80px 16px", textAlign: "center" }}>
          <p style={{ color: "#7a320c", fontWeight: "600" }}>Loading sacred catalog...</p>
        </div>
      </Shell>
    );
  }

  if (!product && !loading) {
    return (
      <Shell>
        <main className="page empty" style={{ textAlign: "center", padding: "80px 16px" }}>
          <AlertCircle size={48} color="#8c2b10" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "32px", color: "#2b170d" }}>
            Product Not Found
          </h2>
          <p style={{ color: "#6b584c", marginBottom: "24px" }}>
            The sacred item you are looking for may have been updated or moved.
          </p>
          <Link to="/shop" className="primary-btn" style={{ display: "inline-flex", width: "auto" }}>
            Back to Catalog
          </Link>
        </main>
      </Shell>
    );
  }

  const stockLimit = p.stock !== undefined ? Number(p.stock) : (p.status === "Out of Stock" ? 0 : 50);
  const isOutOfStock = stockLimit <= 0 || p.status === "Out of Stock";
  const isLowStock = !isOutOfStock && stockLimit <= 5;
  const isFav = isWishlisted(p.id);

  const discountPct = pct(p);
  const mrp = Number(p.mrp) || Number(p.price) || 0;
  const price = Number(p.price) || 0;
  const savings = mrp > price ? mrp - price : 0;

  const activeCoupon = coupons.length > 0 ? coupons[0] : null;
  const suggestedProducts = allProducts.filter(x => String(x.id) !== String(p.id)).slice(0, 4);

  // Derive benefit tags
  const defaultCategoryTags = {
    "Rudraksha": ["Shiva's Living Presence", "Dissolves Negative Energy", "Inner Clarity & Focus", "Govt Lab Certified", "100% Nepali Origin"],
    "Mala": ["108+1 Sacred Count", "Hand-knotted Silk", "Japa & Meditation", "Protective Aura", "Natural Nepal Beads"],
    "Yantra": ["Sacred Geometry", "Vedic Energized", "Attracts Prosperity", "Pure Copper/Brass"],
    "default": ["100% Himalayan Origin", "Vedic Consecrated", "Govt Lab Certified", "Inner Peace & Protection"]
  };

  const benefitTags = (Array.isArray(p.tags) && p.tags.length > 0)
    ? p.tags
    : (Array.isArray(p.benefits) && p.benefits.length > 0)
    ? p.benefits
    : (defaultCategoryTags[p.category] || defaultCategoryTags["Rudraksha"] || defaultCategoryTags["default"]);

  // Highlight sentence
  
  const escapeHtml = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const renderDescription = (text) => {
    if (!text) return null;
    
    // Check if it's already HTML (Tiptap format)
    if (text.includes('<p>') || text.includes('<h1>') || text.includes('<h2>') || text.includes('<ul>')) {
      const cleanHtml = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'b', 'i', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'mark', 'span', 'div', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'color', 'class']
      });
      return <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
    }
    
    // Legacy plain text formatting - text is escaped first so raw HTML/script
    // in a product description can never execute; only the safe **bold**
    // markdown shorthand is converted to real tags after escaping.
    const lines = text.split('\n');
    let formattedHtml = '';
    
    lines.forEach((line) => {
      const rawT = line.trim();
      if (!rawT) {
        formattedHtml += '<div style="height: 12px;"></div>';
      } else if (rawT === p.name || (rawT.toUpperCase() === rawT && rawT.length > 5 && !rawT.includes('•'))) {
        const t = escapeHtml(rawT);
        if (rawT === p.name) {
          formattedHtml += `<h2 style="font-size: 1.5rem; font-weight: 700; color: #1a202c; margin-top: 1rem; margin-bottom: 0.75rem; line-height: 1.3;">${t}</h2>`;
        } else {
          formattedHtml += `<h3 style="font-size: 1.05rem; font-weight: 600; color: #4a5568; margin-top: 1.25rem; margin-bottom: 0.5rem; letter-spacing: 0.5px;">${t}</h3>`;
        }
      } else if (rawT.startsWith('•') || rawT.startsWith('-')) {
        const bulletText = escapeHtml(rawT.substring(1).trim());
        formattedHtml += `<div style="margin-left: 0.5rem; margin-bottom: 0.4rem; display: flex; align-items: flex-start;"><span style="margin-right: 8px; color: #b45309; font-weight: bold;">•</span><span>${bulletText}</span></div>`;
      } else {
        const t = escapeHtml(rawT).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedHtml += `<p style="margin-bottom: 0.5rem;">${t}</p>`;
      }
    });

    return <div dangerouslySetInnerHTML={{ __html: formattedHtml }} style={{ lineHeight: '1.65', color: '#4a3b32', fontSize: '15px' }} />;
  };

  // Strip HTML for the highlight text. Uses DOMPurify (tags stripped
  // entirely) rather than parsing into a detached element via innerHTML:
  // browsers still fire onerror/onload handlers on elements created that
  // way even when never attached to the document, so a crafted description
  // could otherwise execute script here.
  const stripHtml = (html) => DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

  const plainTextDesc = p.description ? stripHtml(p.description) : "";
  const rawHighlight = p.highlight || p.shortDesc || (plainTextDesc ? plainTextDesc.split('.')[0] + '.' : "Sacred soil (मिट्टी) & Holy Ganga Jal consecration from Mount Kailash region with certified Vedic energization.");
  const highlightText = rawHighlight.replace(/\*\*/g, '');

  // Cart and Wishlist Actions
  const handleAddToCart = () => {
    if (isOutOfStock) return;
    add(p.id, qty);
    setAdded(true);
    emitToast(`${p.name} (${selectedSize}) added to your cart ❤️`, "success");
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    add(p.id, qty);
    emitToast(`Proceeding to checkout with ${p.name} (${selectedSize})`, "info");
    navigate('/checkout');
  };

  const handleWhatsAppOrder = () => {
    if (isOutOfStock) return;
    const settings = db.getSettings();
    const supportPhone = settings.supportPhone || "+91 9672996531";
    const waCleanPhone = supportPhone.replace(/[^0-9]/g, "");
    const message = `Hello Aura Rudraksha,\n\nI would like to order:\n\n*Product:* ${p.name}\n*Bead Size:* ${selectedSize}\n*Quantity:* ${qty}\n*Price:* ${money(price * qty)}\n*Link:* ${window.location.href}\n\nPlease let me know the payment options and delivery details.\n\nThank you!`;
    const waUrl = `https://wa.me/${waCleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  const handleCopyCoupon = (code) => {
    if (!code) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    emitToast(`Coupon code ${code} copied! Apply at checkout.`, "success");
    setTimeout(() => setCopiedCode(""), 3000);
  };

  const handleShareProduct = () => {
    if (navigator.share) {
      navigator.share({
        title: p.name,
        text: `Check out ${p.name} at Aura Rudraksha`,
        url: window.location.href,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      emitToast("Product link copied to clipboard", "success");
    }
  };

  const scrollToReviews = () => {
    const el = document.getElementById("reviews-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!loading && !p) {
    return (
      <Shell>
        <div className="product-page-root" style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "60px 16px" }}>
          <div style={{ maxWidth: 480, textAlign: "center", background: "#ffffff", border: "1px solid #f2e6d9", borderRadius: "16px", padding: "40px 24px", boxShadow: "0 10px 30px rgba(100,60,30,0.05)" }}>
            <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "28px", color: "#2b170d", margin: "0 0 12px", fontWeight: 700 }}>
              Product Not Found
            </h2>
            <p style={{ fontSize: "14px", color: "#806f62", margin: "0 0 24px", lineHeight: 1.6 }}>
              The Rudraksha item or product ID requested could not be found in our current catalog.
            </p>
            <Link to="/shop" className="primary-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 99, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
              Explore Shop Catalog
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="product-page-root">
        {/* Top Breadcrumb (Desktop) & Simple Back Button (Mobile) */}
        <div className="container product-breadcrumb-bar">
          <div className="desktop-breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <Link to="/shop">Shop Catalog</Link>
            <span className="sep">›</span>
            <Link to={`/shop?category=${encodeURIComponent(p.category || 'Rudraksha')}`}>
              {p.category || "Rudraksha"}
            </Link>
            <span className="sep">›</span>
            <span className="current">{p.name}</span>
          </div>

          <button className="mobile-back-btn" onClick={() => navigate('/shop')}>
            <ChevronLeft size={18} /> Back to Catalog
          </button>

          <button className="share-btn" onClick={handleShareProduct} title="Share Product">
            <Share2 size={16} /> <span className="share-lbl">Share</span>
          </button>
        </div>

        {/* Main Product Layout Container */}
        <div className="container product-main-container">
          {/* ========================================================
              LEFT COLUMN: PREMIUM PRODUCT IMAGE GALLERY
             ======================================================== */}
          <div className="product-gallery-column" style={{
            marginTop: "-25px",
            paddingTop: "10px",
            paddingBottom: "10px"
          }}>
            <div 
              className="main-image-frame"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Product Badges (Top-Left) */}
              <div className="gallery-badges-top-left">
                {p.badge && !p.customOffer && (
                  <span className="product-hero-badge">{p.badge}</span>
                )}
                {discountPct > 0 && (
                  <span className="product-hero-discount">{discountPct}% OFF</span>
                )}
                <OfferBadge product={p} variant="image" />
              </div>

              {/* Wishlist Heart Button (Top-Right) */}
              <button 
                className="gallery-wishlist-btn" 
                onClick={() => toggleWishlist(p.id, p.name)}
                aria-label={isFav ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart size={20} fill={isFav ? "#7a320c" : "none"} color={isFav ? "#7a320c" : "#6b584c"} />
              </button>

              {/* Circular Left / Right Navigation Arrows */}
              {productImages.length > 1 && (
                <>
                  <button 
                    className="gallery-nav-btn prev" 
                    onClick={handlePreviousImage}
                    aria-label="Previous product image"
                  >
                    <ChevronLeft size={22} strokeWidth={2.4} />
                  </button>
                  <button 
                    className="gallery-nav-btn next" 
                    onClick={handleNextImage}
                    aria-label="Next product image"
                  >
                    <ChevronRight size={22} strokeWidth={2.4} />
                  </button>
                </>
              )}

              {/* Zoom Button (Bottom-Right) */}
              <button 
                className="gallery-zoom-btn" 
                onClick={() => setIsZoomOpen(true)}
                title="View Full High-Resolution Image"
                aria-label="Zoom image"
              >
                <ZoomIn size={18} />
              </button>

              {/* Floating Counter Chip */}
              {productImages.length > 1 && (
                <div className="gallery-counter-pill">
                  {activeIndex + 1} / {productImages.length}
                </div>
              )}

              {/* Main Product Image Container with Framer Motion Animation & Zoom */}
              <div 
                className="main-image-viewport"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ overflow: "hidden", cursor: "zoom-in" }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img 
                    key={activeImg || productImages[0]}
                    src={activeImg || productImages[0]} 
                    alt={`${p.name} - Sacred View ${activeIndex + 1}`}
                    className="main-product-img"
                    fetchPriority="high"
                    decoding="async"
                    style={{
                      transformOrigin: zoomStyle.transformOrigin,
                      transform: zoomStyle.transform,
                      transition: isZooming ? "transform 0.05s ease-out" : "transform 0.3s ease-out, transform-origin 0.3s ease-out"
                    }}
                    initial={{ opacity: 0, x: slideDirection * 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -slideDirection * 12 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                  />
                </AnimatePresence>
              </div>
            </div>

            {/* Horizontal Thumbnail Gallery Under Main Image */}
            {productImages.length > 1 && (
              <div className="thumbnail-strip" role="tablist" aria-label="Product image thumbnails">
                {productImages.map((imgUrl, idx) => {
                  const isActive = (activeImg || productImages[0]) === imgUrl;
                  return (
                    <button
                      key={idx}
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`View product image ${idx + 1}`}
                      className={`thumb-box ${isActive ? "active" : ""}`}
                      onClick={() => handleThumbnailClick(imgUrl, idx)}
                    >
                      <img 
                        src={imgUrl} 
                        alt={`${p.name} thumbnail ${idx + 1}`} 
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Desktop Verification & Authenticity Banner */}
            <div className="lab-cert-banner desktop-only-cert">
              <div className="cert-icon-box">
                <Award size={24} />
              </div>
              <div className="cert-text-box">
                <h4>Government Recognized Lab Certified</h4>
                <p>100% Original Natural Rudraksha Seed • Unique Identification Certificate Included</p>
              </div>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: PRODUCT INFO, PRICING & CONVERSION
             ======================================================== */}
          <div className="product-info-column" ref={ctaSectionRef}>
            {/* PRODUCT HEADER & EDITORIAL TITLE AREA */}
            <div className="product-header-block">
              <div className="product-eyebrow-row">
                <span className="product-eyebrow">
                  <Sparkles size={13} /> AUTHENTIC {p.category ? p.category.toUpperCase() : "RUDRAKSHA"}
                </span>
                {p.origin && (
                  <span className="product-origin-tag">
                    🌿 {p.origin}
                  </span>
                )}
              </div>

              <h1 className="product-main-title">{p.name}</h1>

              {/* Rating & Reviews */}
              <div 
                className="product-meta-rating"
                onClick={scrollToReviews}
                title="Click to view devotee reviews"
              >
                <div className="stars-row">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={15} 
                      fill={i < Math.floor(Number(averageRating)) ? "#d97706" : "none"} 
                      color={i < Math.floor(Number(averageRating)) ? "#d97706" : "#d1d5db"} 
                    />
                  ))}
                  <span className="rating-score">{averageRating}</span>
                </div>
                <span className="reviews-count">
                  ({reviewsCount} Verified Devotee Reviews)
                </span>
              </div>

              {/* PRODUCT HIGHLIGHT BOX */}
              <div className="product-sacred-highlight-box">
                <div className="highlight-icon">
                  <Sparkles size={18} className="premium-gold-icon" />
                </div>
                <div className="highlight-text">
                  {highlightText}
                </div>
              </div>

              {/* PROMINENT 1-2 CM LUXURY SIZE BADGE */}
              <div className="product-size-badge-prominent" style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "linear-gradient(135deg, #fffcf5 0%, #fff6e5 100%)",
                border: "1.5px solid #e5c158",
                borderRadius: "12px",
                padding: "10px 14px",
                margin: "12px 0",
                boxShadow: "0 6px 18px rgba(229, 193, 88, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
                position: "relative",
                overflow: "hidden"
              }}>
                {/* Embedded luxury shimmer element */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: "-50%",
                  width: "200%",
                  height: "100%",
                  background: "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)",
                  transform: "skewX(-25deg)",
                  animation: "shine 4s infinite linear",
                  pointerEvents: "none"
                }} />
                <div style={{
                  background: "linear-gradient(135deg, #e5c158 0%, #c49619 100%)",
                  color: "#fff",
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 4px 12px rgba(196, 150, 25, 0.3)",
                  flexShrink: 0
                }}>
                  <Award size={20} className="premium-icon-shimmer" style={{ strokeWidth: 2.0 }} />
                </div>
                <div>
                  <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.2px", color: "#b28514", fontWeight: 800, display: "block", marginBottom: "1px" }}>
                    Natural Bead Size &amp; Dimensions
                  </span>
                  <span style={{ fontSize: "18px", fontWeight: "800", color: "#1a0f08", letterSpacing: "0.3px", fontFamily: "Cormorant Garamond, serif" }}>
                    1 - 2 cm <span style={{ fontSize: "12px", fontWeight: "600", color: "#c49619", fontFamily: "sans-serif" }}>(Authentic Nepali Seed)</span>
                  </span>
                </div>
              </div>

              {/* PRODUCT BENEFIT CHIPS / TAGS */}
              {benefitTags.length > 0 && (
                <div className="product-benefit-chips-row">
                  {benefitTags.map((tag, idx) => (
                    <span key={idx} className="benefit-chip">
                      <Check size={12} strokeWidth={2.5} /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* PRICING & DISCOUNTS SECTION */}
            <div className="product-pricing-card">
              <div className="pricing-top-line">
                <span className="selling-price">{money(price)}</span>
                {mrp > price && <del className="mrp-price">{money(mrp)}</del>}
                {discountPct > 0 && <span className="discount-tag">{discountPct}% OFF</span>}
              </div>

              {savings > 0 && (
                <div className="savings-badge-row">
                  <span className="savings-pill">
                    <CheckCircle2 size={13} /> You Save {money(savings)}
                  </span>
                  <span className="tax-inclusive">Inclusive of all taxes</span>
                </div>
              )}

              {/* Stock Status */}
              <div className="stock-status-line">
                {isOutOfStock ? (
                  <span className="stock-tag out-of-stock">
                    <AlertCircle size={14} /> Out of Stock (Currently Unavailable)
                  </span>
                ) : isLowStock ? (
                  <span className="stock-tag low-stock">
                    <Sparkles size={14} /> Hurry! Only {stockLimit} left in stock
                  </span>
                ) : (
                  <span className="stock-tag in-stock">
                    <CheckCircle2 size={14} /> In Stock & Ready for Vedic Consecration
                  </span>
                )}
              </div>
            </div>

            {/* CENTRAL LIVE STORE OFFER REMOVED AS REQUESTED */}

            {/* FALLBACK COUPONS BOX REMOVED AS REQUESTED */}

            {/* BEAD SIZE SELECTION */}
            {!isOutOfStock && (
              <div className="size-selection-block" style={{ margin: "20px 0 15px 0" }}>
                <span style={{ 
                  fontSize: "12px", 
                  textTransform: "uppercase", 
                  letterSpacing: "1px", 
                  color: "#806f62", 
                  fontWeight: 700, 
                  display: "block", 
                  marginBottom: "8px" 
                }}>
                  Select Bead Size:
                </span>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {[
                    { value: "1.2 cm", label: "1.2 cm", desc: "Compact & Light" },
                    { value: "1.5 cm", label: "1.5 cm", desc: "Most Auspicious" },
                    { value: "2.0 cm", label: "2.0 cm", desc: "Collector's Bead" }
                  ].map((sz) => {
                    const isSel = selectedSize === sz.value;
                    return (
                      <button
                        key={sz.value}
                        type="button"
                        onClick={() => setSelectedSize(sz.value)}
                        style={{
                          flex: 1,
                          minWidth: "100px",
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: isSel ? "2px solid #b28514" : "1.5px solid #e8e0d8",
                          background: isSel ? "#fffdf5" : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: isSel ? "0 4px 12px rgba(178, 133, 20, 0.1)" : "none"
                        }}
                      >
                        <div style={{ 
                          fontWeight: 700, 
                          color: isSel ? "#8c6d53" : "#2b170d", 
                          fontSize: "14px" 
                        }}>
                          {sz.label}
                        </div>
                        <div style={{ 
                          fontSize: "10.5px", 
                          color: isSel ? "#b28514" : "#806f62",
                          marginTop: "2px"
                        }}>
                          {sz.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* QUANTITY SELECTOR */}
            {!isOutOfStock && (
              <div className="quantity-selection-row">
                <span className="qty-label">Quantity:</span>
                <div className="qty-picker">
                  <button 
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-value">{qty}</span>
                  <button 
                    onClick={() => setQty(Math.min(stockLimit, qty + 1))}
                    disabled={qty >= stockLimit}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className="qty-subtext">Total: <strong>{money(price * qty)}</strong></span>
              </div>
            )}

            {/* CTA BUTTONS */}
            <div className="product-cta-group">
              <button 
                className={`add-to-cart-btn ${added ? "added" : ""}`}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingCart size={18} />
                <span>{isOutOfStock ? "Out of Stock" : added ? "Added to Cart ✓" : "Add to Cart"}</span>
              </button>

              <button 
                className="buy-now-btn"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
              >
                <span>{isOutOfStock ? "Unavailable" : "⚡ Order on Website"}</span>
              </button>

              <button 
                className="whatsapp-order-btn"
                onClick={handleWhatsAppOrder}
                disabled={isOutOfStock}
              >
                <span>{isOutOfStock ? "Unavailable" : "💬 Order on WhatsApp"}</span>
              </button>
            </div>

            {/* WHY BUY FROM AURA RUDRAKSHA? COMPACT 5-COLUMN TRUST STRIP */}
            <div className="why-buy-aura-strip">
              <div className="why-buy-strip-header">
                <span className="why-buy-arrow-left">⇛</span>
                <h3 className="why-buy-strip-title">Why Buy From Aura Rudraksha?</h3>
                <span className="why-buy-arrow-right">⇚</span>
              </div>

              <div className="why-buy-pillars-row">
                {/* Pillar 1: Genuine */}
                <div className="why-buy-pillar">
                  <div className="why-buy-pillar-icon-circle">
                    <Award size={20} />
                  </div>
                  <strong className="why-buy-pillar-title">100% Genuine</strong>
                  <span className="why-buy-pillar-desc">Authentic Rudraksha with Guarantee</span>
                </div>

                <div className="why-buy-pillar-divider" />

                {/* Pillar 2: Lab Certified */}
                <div className="why-buy-pillar">
                  <div className="why-buy-pillar-icon-circle">
                    <FileCheck size={20} />
                  </div>
                  <strong className="why-buy-pillar-title">Lab Certified</strong>
                  <span className="why-buy-pillar-desc">Government Recognized Lab Certified</span>
                </div>

                <div className="why-buy-pillar-divider" />

                {/* Pillar 3: Energized */}
                <div className="why-buy-pillar">
                  <div className="why-buy-pillar-icon-circle">
                    <Flower2 size={20} />
                  </div>
                  <strong className="why-buy-pillar-title">Energized</strong>
                  <span className="why-buy-pillar-desc">Vedic Consecrated &amp; Energized</span>
                </div>

                <div className="why-buy-pillar-divider" />

                {/* Pillar 4: Free Shipping */}
                <div className="why-buy-pillar">
                  <div className="why-buy-pillar-icon-circle">
                    <Truck size={20} />
                  </div>
                  <strong className="why-buy-pillar-title">Free Shipping</strong>
                  <span className="why-buy-pillar-desc">On All Orders Above ₹499</span>
                </div>

                <div className="why-buy-pillar-divider" />

                {/* Pillar 5: Return */}
                <div className="why-buy-pillar">
                  <div className="why-buy-pillar-icon-circle">
                    <RotateCcw size={20} />
                  </div>
                  <strong className="why-buy-pillar-title">7-Day Return</strong>
                  <span className="why-buy-pillar-desc">Easy Returns &amp; Refund</span>
                </div>
              </div>
            </div>

            {/* GOVERNMENT RECOGNIZED LAB CERTIFIED BANNER */}
            <div className="lab-cert-showcase-card">
              <div className="lab-cert-shield-badge">
                <Flower2 size={24} />
              </div>
              
              <div className="lab-cert-text-content">
                <h4 className="lab-cert-main-title">Government Recognized Lab Certified</h4>
                <p className="lab-cert-sub-text">100% Original Natural Rudraksha Seed</p>
                <p className="lab-cert-detail-text">Unique Identification Certificate Included</p>
              </div>

              <div className="lab-cert-preview-thumbnail" title="Sample Government Lab Certificate">
                <div className="mini-cert-header">
                  <span className="mini-cert-line-top" />
                  <span className="mini-cert-line-brand" />
                </div>
                <div className="mini-cert-lines">
                  <div className="mini-cert-line short" />
                  <div className="mini-cert-line full" />
                  <div className="mini-cert-line full" />
                </div>
                <div className="mini-cert-seal">
                  <Award size={10} className="mini-cert-seal-icon" />
                </div>
              </div>
            </div>

            {/* COLLAPSIBLE ACCORDIONS (5 Clean Sections Matching Photo) */}
            <div className="product-accordions-wrapper">
              {/* Accordion 1: About this Sacred Rudraksha */}
              <div className={`accordion-item ${activeAccordion === "about" ? "is-open" : ""}`}>
                <button 
                  className="accordion-header" 
                  onClick={() => setActiveAccordion(activeAccordion === "about" ? "" : "about")}
                  aria-expanded={activeAccordion === "about"}
                >
                  <div className="acc-header-left">
                    <div className="acc-header-icon">
                      <Flower2 size={18} />
                    </div>
                    <span className="acc-title">About this Sacred Rudraksha</span>
                  </div>
                  <div className="acc-chevron-indicator">
                    {activeAccordion === "about" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                {activeAccordion === "about" && (
                  <div className="accordion-content">
                    {p.description ? (
                      renderDescription(p.description)
                    ) : (
                      <>
                        <p>
                          The <strong>{p.name}</strong> is an authentic, sacred spiritual instrument ethically gathered from pristine Himalayan regions. Worn by spiritual seekers, professionals, and devotees worldwide to invite divine blessings, focus, and inner harmony into their daily life.
                        </p>
                        <div className="accordion-inner-card">
                          <strong>Key Highlights:</strong>
                          <ul className="bullet-points">
                            <li>Naturally formed grooves with well-defined, un-altered mukhi lines.</li>
                            <li>Carefully selected for authentic density, symmetry, and structural purity.</li>
                            <li>Preserved in its pure, natural essence without synthetic polish or artificial chemical treatments.</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 2: Benefits & Significance */}
              <div className={`accordion-item ${activeAccordion === "benefits" ? "is-open" : ""}`}>
                <button 
                  className="accordion-header" 
                  onClick={() => setActiveAccordion(activeAccordion === "benefits" ? "" : "benefits")}
                  aria-expanded={activeAccordion === "benefits"}
                >
                  <div className="acc-header-left">
                    <div className="acc-header-icon">
                      <Sparkles size={18} />
                    </div>
                    <span className="acc-title">Benefits &amp; Significance</span>
                  </div>
                  <div className="acc-chevron-indicator">
                    {activeAccordion === "benefits" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                {activeAccordion === "benefits" && (
                  <div className="accordion-content">
                    <p>
                      In classical Vedic scriptures, the <strong>{p.name}</strong> is traditionally revered for radiating beneficial bio-energetic frequencies that harmonize the mind and aura.
                    </p>
                    <ul className="bullet-points">
                      <li><strong>Mental Tranquility &amp; Focus:</strong> Helps calm mental restlessness and enhances deep concentration during meditation, study, and analytical work.</li>
                      <li><strong>Emotional Grounding:</strong> Traditionally associated with releasing stress, tension, and emotional fatigue.</li>
                      <li><strong>Chakra &amp; Aura Harmony:</strong> Aligns subtle energy centers, fostering a shield of positive vibrations against negative influences.</li>
                      <li><strong>Spiritual Alignment:</strong> Accelerates spiritual sadhana, devotion, and alignment with classical planetary harmonies.</li>
                    </ul>
                    {benefitTags.length > 0 && (
                      <div className="accordion-inner-card" style={{ marginTop: '10px' }}>
                        <strong style={{ fontSize: '13px', color: '#2b170d', display: 'block', marginBottom: '8px' }}>Key Attributes:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {benefitTags.map((tag, idx) => (
                            <span key={idx} className="benefit-chip" style={{ fontSize: '12px' }}>
                              <Check size={11} strokeWidth={2.5} /> {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 3: How to Use */}
              <div className={`accordion-item ${activeAccordion === "usage" ? "is-open" : ""}`}>
                <button 
                  className="accordion-header" 
                  onClick={() => setActiveAccordion(activeAccordion === "usage" ? "" : "usage")}
                  aria-expanded={activeAccordion === "usage"}
                >
                  <div className="acc-header-left">
                    <div className="acc-header-icon">
                      <Compass size={18} />
                    </div>
                    <span className="acc-title">How to Use</span>
                  </div>
                  <div className="acc-chevron-indicator">
                    {activeAccordion === "usage" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                {activeAccordion === "usage" && (
                  <div className="accordion-content">
                    <div className="specs-grid">
                      <div className="spec-row">
                        <span>Auspicious Day to Wear</span>
                        <strong>Monday morning or auspicious Vedic Muhurta</strong>
                      </div>
                      <div className="spec-row">
                        <span>Wearing Procedure</span>
                        <strong>Wear after morning bath facing East / North with positive devotion</strong>
                      </div>
                      <div className="spec-row">
                        <span>Chanting Mantra</span>
                        <strong>"ॐ नमः शिवाय" (Om Namah Shivaya) or specific Beej Mantra (108 times)</strong>
                      </div>
                      <div className="spec-row">
                        <span>Capping / Cording</span>
                        <strong>Can be worn in sacred silk thread, silver, or gold pendant casing</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 4: Shipping & Returns */}
              <div className={`accordion-item ${activeAccordion === "shipping" ? "is-open" : ""}`}>
                <button 
                  className="accordion-header" 
                  onClick={() => setActiveAccordion(activeAccordion === "shipping" ? "" : "shipping")}
                  aria-expanded={activeAccordion === "shipping"}
                >
                  <div className="acc-header-left">
                    <div className="acc-header-icon">
                      <Truck size={18} />
                    </div>
                    <span className="acc-title">Shipping &amp; Returns</span>
                  </div>
                  <div className="acc-chevron-indicator">
                    {activeAccordion === "shipping" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                {activeAccordion === "shipping" && (
                  <div className="accordion-content">
                    <div className="specs-grid">
                      <div className="spec-row">
                        <span>Dispatch Timeline</span>
                        <strong>Within 24–48 business hours after Vedic consecration</strong>
                      </div>
                      <div className="spec-row">
                        <span>Estimated Delivery</span>
                        <strong>2–4 business days (Metros) • 3–6 days (Rest of India)</strong>
                      </div>
                      <div className="spec-row">
                        <span>Shipping Charges</span>
                        <strong>FREE Express Shipping across all Indian pincodes</strong>
                      </div>
                      <div className="spec-row">
                        <span>Packaging</span>
                        <strong>Luxury sacred velvet pouch inside tamper-evident protective box</strong>
                      </div>
                      <div className="spec-row">
                        <span>Return Policy</span>
                        <strong>7-Day Hassle-Free Return &amp; Full Refund / Replacement</strong>
                      </div>
                    </div>

                    <div className="accordion-inner-card" style={{ marginTop: '10px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6b584c', lineHeight: '1.5' }}>
                        🛡️ <strong>Aura Peace-of-Mind:</strong> We deliver via Bluedart, Delhivery, and DTDC with real-time SMS &amp; WhatsApp tracking links. If your package arrives damaged or you are unsatisfied, our 7-day return policy ensures immediate replacement or full refund.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 5: Product Care */}
              <div className={`accordion-item ${activeAccordion === "care" ? "is-open" : ""}`}>
                <button 
                  className="accordion-header" 
                  onClick={() => setActiveAccordion(activeAccordion === "care" ? "" : "care")}
                  aria-expanded={activeAccordion === "care"}
                >
                  <div className="acc-header-left">
                    <div className="acc-header-icon">
                      <HeartHandshake size={18} />
                    </div>
                    <span className="acc-title">Product Care</span>
                  </div>
                  <div className="acc-chevron-indicator">
                    {activeAccordion === "care" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                {activeAccordion === "care" && (
                  <div className="accordion-content">
                    <div className="specs-grid">
                      <div className="spec-row">
                        <span>Monthly Cleansing</span>
                        <strong>Clean gently with lukewarm water &amp; soft bristle brush</strong>
                      </div>
                      <div className="spec-row">
                        <span>Oil Conditioning</span>
                        <strong>Apply 1–2 drops of pure Sandalwood or Mustard oil periodically</strong>
                      </div>
                      <div className="spec-row">
                        <span>Chemical Precaution</span>
                        <strong>Avoid direct contact with artificial soaps, detergents &amp; perfumes</strong>
                      </div>
                      <div className="spec-row">
                        <span>Safe Storage</span>
                        <strong>Keep in the provided sacred velvet pouch when not worn</strong>
                      </div>
                    </div>

                    <div className="accordion-inner-card" style={{ marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: '700', fontSize: '12.5px', marginBottom: '3px' }}>
                        <CheckCircle2 size={15} /> Preserving Sacred Natural Radiance
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#4a3b32', lineHeight: '1.5' }}>
                        Natural Himalayan Rudraksha beads absorb the wearer's positive bio-magnetic aura over time. Regular gentle conditioning with pure natural oils keeps the seed grooves hydrated and enduring for generations.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SUGGESTED PRODUCTS CAROUSEL / GRID */}
        {suggestedProducts.length > 0 && (
          <div className="container suggested-section-container">
            <div className="suggested-header">
              <span className="sub-title">RECOMMENDED BLESSINGS</span>
              <h2 className="main-title">You May Also Like</h2>
            </div>
            <div className="product-grid swipeable">
              {suggestedProducts.map(sp => (
                <ProductCard key={sp.id} p={sp} onAdd={(pid) => add(pid, 1)} />
              ))}
            </div>
          </div>
        )}

        {/* REVIEWS SECTION */}
        <div id="reviews-section" className="container" style={{ marginTop: "40px" }}>
          <ProductReviews product={p} />
        </div>

        {/* STICKY BOTTOM PURCHASE BAR */}
        <StickyPurchaseBar 
          product={p} 
          isVisible={showStickyBar} 
          onAddToCart={(pid, q) => add(pid, q)} 
        />

        {/* FLOATING OFFER REMOVED AS REQUESTED */}

        {/* IMAGE ZOOM LIGHTBOX MODAL */}
        <AnimatePresence>
          {isZoomOpen && (
            <motion.div 
              className="lightbox-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsZoomOpen(false)}
            >
              <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="lightbox-close" 
                  onClick={() => setIsZoomOpen(false)}
                  aria-label="Close zoom modal"
                >
                  <X size={24} />
                </button>

                {productImages.length > 1 && (
                  <>
                    <button 
                      className="lightbox-nav-btn prev"
                      onClick={handlePreviousImage}
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={28} />
                    </button>
                    <button 
                      className="lightbox-nav-btn next"
                      onClick={handleNextImage}
                      aria-label="Next image"
                    >
                      <ChevronRight size={28} />
                    </button>
                  </>
                )}

                <img 
                  src={activeImg || productImages[0]} 
                  alt={`${p.name} Full View`} 
                  className="lightbox-img" 
                  decoding="async"
                />
                <div className="lightbox-caption">
                  {p.name} • {activeIndex + 1} of {productImages.length}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
