import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Star, Share2, AlertCircle, ChevronRight, ChevronLeft, Sparkles, ArrowRight, Loader2,
  MessageCircle, Copy, Check
} from "lucide-react";
import { Shell } from "../components/Shell";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { emitToast } from "../context/ToastContext";
import { money, pct } from "../data";
import { db, onStoreUpdate, isPublicProduct } from "../lib/db";
import { authClient } from "../lib/authClient";
import { ProductCard } from "../components/ProductCard";
import { ProductReviews } from "../components/ProductReviews";
import { useSeo } from "../hooks/useSeo";

// Dedicated Modular PDP Components
import { ProductGallery } from "../components/product/ProductGallery";
import { ProductTrustBadges } from "../components/product/ProductTrustBadges";
import { ProductPricing } from "../components/product/ProductPricing";
import { ProductOfferCard } from "../components/product/ProductOfferCard";
import { ProductVariantSelector } from "../components/product/ProductVariantSelector";
import { ProductDeliveryChecker } from "../components/product/ProductDeliveryChecker";
import { ProductPurchaseActions } from "../components/product/ProductPurchaseActions";
import { ProductInfoTabs } from "../components/product/ProductInfoTabs";
import { FrequentlyBoughtTogether } from "../components/product/FrequentlyBoughtTogether";
import { MobileStickyPurchaseBar } from "../components/product/MobileStickyPurchaseBar";

import "../components/product/ProductPage.css";
import "../components/RichTextEditor.css";

export function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add, addBatch, buyNow, totals } = useCart();
  const shipThreshold = totals?.freeShippingThreshold ?? (db.getSettings()?.freeShippingThreshold ?? 0);
  const { isWishlisted, toggleWishlist } = useWishlist();

  const location = useLocation();
  const routeStateProduct = location.state?.product;

  // Core product state - check location state and immediate synchronous cache to render instantly without lag
  const initialProduct = React.useMemo(() => {
    if (routeStateProduct) {
      const targetClean = String(id || "").toLowerCase().replace(/^(product-card-|product-)/, "");
      const rId = String(routeStateProduct.id || "").toLowerCase();
      const rMongoId = String(routeStateProduct._id || "").toLowerCase();
      const rSlug = String(routeStateProduct.slug || "").toLowerCase();
      const match = 
        rId === String(id).toLowerCase() || rId === targetClean ||
        rMongoId === String(id).toLowerCase() || rMongoId === targetClean ||
        rSlug === String(id).toLowerCase() || rSlug === targetClean;
      if (match) return routeStateProduct;
    }
    return db.getProduct(id);
  }, [id, routeStateProduct]);

  const [product, setProduct] = useState(initialProduct);
  const [allProducts, setAllProducts] = useState(() => db.getProducts().filter(isPublicProduct));
  const [coupons, setCoupons] = useState(() => db.getCoupons().filter(c => c.status === "Active"));
  const [reviews, setReviews] = useState(() => initialProduct ? db.getReviews(initialProduct.id || initialProduct._id) : []);
  const [loading, setLoading] = useState(!initialProduct);

  // User purchase selections
  const [qty, setQty] = useState(1);
  const [selectedOrigin, setSelectedOrigin] = useState("Nepal"); // Default Nepali as requested
  const [selectedVariant, setSelectedVariant] = useState(() => {
    if (initialProduct?.variants && initialProduct.variants.length > 0) {
      const firstV = initialProduct.variants[0];
      return typeof firstV === "string" ? firstV : (firstV.name || firstV.label || "");
    }
    return "";
  });
  const [selectedSize, setSelectedSize] = useState("Medium (16 - 20 mm)");
  const [added, setAdded] = useState(false);

  // Sticky bar visibility tracking
  const [showStickyBar, setShowStickyBar] = useState(false);
  const ctaSectionRef = useRef(null);

  // Share dropdown state
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const shareMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
        setShareOpen(false);
      }
    };
    if (shareOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [shareOpen]);

  // Load and subscribe to database updates
  const loadData = async (silent = true) => {
    const existing = product || initialProduct || db.getProduct(id);
    const isSilent = silent || !!existing;
    if (!isSilent) setLoading(true);

    try {
      const found = await db.getProductAsync(id);
      const isDraft = found && (
        found.status === 'Draft' || 
        found.status === 'draft' || 
        found.status === 'Inactive' || 
        found.status === 'inactive' || 
        found.status === 'Archived'
      );
      const isAdmin = authClient.isAdmin && authClient.isAdmin();
      const validProduct = (isDraft && !isAdmin) ? null : found;

      if (validProduct) {
        setProduct(prev => prev ? { ...prev, ...validProduct } : validProduct);
        setReviews(db.getReviews(validProduct.id || validProduct._id));
        if (validProduct.variants && validProduct.variants.length > 0) {
          setSelectedVariant(prev => {
            if (prev) return prev;
            const firstV = validProduct.variants[0];
            return typeof firstV === "string" ? firstV : (firstV.name || firstV.label || "");
          });
        }
      }

      setLoading(false);

      // Load related products & active coupons
      const prods = db.getProducts().filter(isPublicProduct);
      setAllProducts(prods);
      setCoupons(db.getCoupons().filter(c => c.status === "Active"));
    } catch (err) {
      console.error("[Product Page] Failed to load product:", err);
      setLoading(false);
    }
  };

  // Immediate load & state synchronization on product ID change
  useEffect(() => {
    // Synchronously populate product from cache if available (0ms response)
    const syncProduct = initialProduct || db.getProduct(id);
    if (syncProduct) {
      setProduct(syncProduct);
      setReviews(db.getReviews(syncProduct.id || syncProduct._id));
      setLoading(false);
      if (syncProduct.variants && syncProduct.variants.length > 0) {
        const firstV = syncProduct.variants[0];
        setSelectedVariant(typeof firstV === "string" ? firstV : (firstV.name || firstV.label || ""));
      }
    } else {
      setLoading(true);
    }

    if (window.location.hash !== "#write-review") {
      window.scrollTo(0, 0);
    } else {
      setTimeout(() => {
        const el = document.getElementById("reviews-section");
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }

    db.logVisit();
    db.logProductView();
    
    // Reset origin to default Nepal on new product
    setSelectedOrigin("Nepal");

    // Load fresh data silently if we already have the product in cache
    loadData(true);

    const unsub = onStoreUpdate(() => {
      loadData(true);
    });

    return () => unsub();
  }, [id]);

  // Scroll observer for Mobile Sticky Purchase Bar
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (ctaSectionRef.current) {
            const rect = ctaSectionRef.current.getBoundingClientRect();
            // Show sticky bar once user scrolls past the main buy buttons
            setShowStickyBar(rect.bottom < 100);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const rawP = product;

  // Dynamic Product derivation based on active Origin selection (Nepal vs Indonesia)
  const isIndonesianActive = selectedOrigin === "Indonesia" && rawP && (!!rawP.hasIndonesianVariant || Number(rawP.indonesianPrice) > 0);
  
  const p = React.useMemo(() => {
    if (!rawP) return null;
    if (!isIndonesianActive) return rawP;

    const indoImages = (Array.isArray(rawP.indonesianImages) && rawP.indonesianImages.length > 0)
      ? rawP.indonesianImages
      : (rawP.indonesianImg ? [rawP.indonesianImg] : rawP.images);

    return {
      ...rawP,
      name: rawP.indonesianTitle || `${rawP.name} (Indonesian / Java Origin)`,
      price: Number(rawP.indonesianPrice) || rawP.price,
      mrp: Number(rawP.indonesianMrp) || Number(rawP.indonesianPrice) || rawP.mrp,
      stock: rawP.indonesianStock !== undefined ? Number(rawP.indonesianStock) : rawP.stock,
      images: indoImages,
      img: rawP.indonesianImg || (indoImages && indoImages[0]) || rawP.img,
      origin: "Java / Indonesia",
      highlight: rawP.indonesianHighlight || rawP.highlight || "Authentic Java Rudraksha bead consecrated according to Vedic traditions.",
      size: rawP.indonesianSize || "Small Java Bead (10–14 mm)"
    };
  }, [rawP, isIndonesianActive]);

  // Rating & review summary from real approved devotee reviews in MongoDB
  const realReviewsForRating = reviews.filter(r => {
    if (!r) return false;
    const status = (r.status || "Approved").toLowerCase();
    return status === "approved" || status === "published";
  });
  const reviewsCount = realReviewsForRating.length > 0 ? realReviewsForRating.length : (p?.reviews !== undefined && p?.reviews !== null ? p.reviews : 0);
  const totalRatingSum = realReviewsForRating.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
  const averageRating = realReviewsForRating.length > 0 
    ? (totalRatingSum / realReviewsForRating.length).toFixed(1) 
    : (p?.rating ? Number(p.rating).toFixed(1) : "4.9");

  const stockLimit = p?.stock !== undefined ? Number(p.stock) : (p?.status === "Out of Stock" ? 0 : 50);
  const isOutOfStock = stockLimit <= 0 || p?.status === "Out of Stock";
  const isFav = p ? isWishlisted(rawP?.id || rawP?._id || p.id || p._id) : false;

  // Dynamic SEO & OpenGraph Meta Tag Synchronization for Social Sharing Previews
  const primaryImg = p?.img || (p?.images && p?.images[0]) || "https://i.ibb.co/Q3C3gZTd/file-00000000fb188211907f8ce113ccb17a.png";
  const ogImgUrl = primaryImg.startsWith("http") 
    ? primaryImg 
    : `https://aurarudraksha.bond${primaryImg.startsWith("/") ? "" : "/"}${primaryImg}`;
  const canonicalUrl = p ? `https://aurarudraksha.bond/product/${p.slug || p.id || id}` : undefined;

  useSeo({
    title: p ? (p.metaTitle || `${p.name} — Authentic Lab Certified | Aura Rudraksha`) : "Aura Rudraksha",
    description: p ? (p.metaDescription || (p.highlight || p.description || "").slice(0, 160)) : undefined,
    canonical: canonicalUrl,
    ogImage: ogImgUrl,
    ogType: "product"
  });

  // Cart & Buy Handlers
  const handleAddToCart = () => {
    if (!p || isOutOfStock) return;
    const cartItemId = isIndonesianActive ? `${rawP.id}-indo` : rawP.id;
    add({
      id: cartItemId,
      productId: rawP.id,
      name: p.name,
      price: p.price,
      mrp: p.mrp,
      img: p.img,
      variant: isIndonesianActive ? `Indonesian Origin (${p.size || '10-14mm'})` : (selectedVariant || selectedSize),
      isIndonesian: isIndonesianActive
    }, qty);
    setAdded(true);
    emitToast(`${p.name} added to your cart ❤️`, "success");
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!p || isOutOfStock) return;
    const cartItemId = isIndonesianActive ? `${rawP.id}-indo` : rawP.id;
    if (buyNow) {
      buyNow({
        id: cartItemId,
        productId: rawP.id,
        name: p.name,
        price: p.price,
        mrp: p.mrp,
        img: p.img,
        variant: isIndonesianActive ? `Indonesian Origin (${p.size || '10-14mm'})` : (selectedVariant || selectedSize),
        isIndonesian: isIndonesianActive
      }, qty);
    } else {
      try {
        sessionStorage.setItem("aura_buy_now_intent", JSON.stringify([{ id: String(cartItemId), qty }]));
      } catch (_) {}
    }
    emitToast(`Proceeding to checkout with ${p.name}`, "info");
    navigate('/checkout');
  };

  const handleWhatsAppOrder = () => {
    if (!p || isOutOfStock) return;
    const settings = db.getSettings();
    const supportPhone = settings.supportPhone || "+91 9672996531";
    const waCleanPhone = supportPhone.replace(/[^0-9]/g, "");
    const price = Number(p.price) || 0;
    const productUrl = `https://aurarudraksha.bond/product/${p.slug || p.id || id}`;
    const message = `Namaste Aura Rudraksha,\n\nI would like to order:\n\n*Product:* ${p.name}\n*Variant:* ${selectedVariant || selectedSize}\n*Quantity:* ${qty}\n*Total Price:* ${money(price * qty)}\n*Link:* ${productUrl}\n\nPlease confirm availability and dispatch details.\n\nDhanyawad!`;
    const waUrl = `https://wa.me/${waCleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  const getProductShareUrl = () => {
    if (!p) return typeof window !== "undefined" ? window.location.href : "https://aurarudraksha.bond";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://aurarudraksha.bond";
    return `${origin}/product/${p.slug || p.id || id}`;
  };

  const handleCopyLink = async () => {
    if (!p) return;
    const shareUrl = getProductShareUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      emitToast("Product link copied! Live image preview ready for WhatsApp ❤️", "success");
      setTimeout(() => setCopiedLink(false), 2500);
      setShareOpen(false);
    } catch (_) {
      emitToast("Link copied", "info");
    }
  };

  const handleShareWhatsApp = () => {
    if (!p) return;
    const shareUrl = getProductShareUrl();
    const priceStr = p.price ? `₹${Number(p.price).toLocaleString("en-IN")}` : "";
    const text = `🌸 *${p.name}* ${priceStr ? `(${priceStr})` : ""}\n100% Authentic Lab Certified Rudraksha from Aura Rudraksha.\n\n👇 *View Consecrated Product & Certificate:* \n${shareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setShareOpen(false);
  };

  const handleNativeShare = async () => {
    if (!p) return;
    const shareUrl = getProductShareUrl();
    const priceStr = p.price ? ` (₹${Number(p.price).toLocaleString("en-IN")})` : "";
    const shareTitle = `${p.name}${priceStr} | Aura Rudraksha`;
    const shareText = `Explore authentic lab-certified ${p.name} at Aura Rudraksha.\n${shareUrl}`;

    // 1. Attempt Native Web Share API with High-Resolution Image File Attachment
    const primaryImgUrl = p.img || (Array.isArray(p.images) && p.images[0]) || "";
    if (primaryImgUrl && typeof fetch === "function" && typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const fullImgUrl = primaryImgUrl.startsWith("http")
          ? getOptimizedImageUrl(primaryImgUrl, { width: 1600, quality: 95 })
          : `${window.location.origin}${primaryImgUrl.startsWith("/") ? "" : "/"}${primaryImgUrl}`;

        const res = await fetch(fullImgUrl, { mode: "cors" });
        if (res.ok) {
          const blob = await res.blob();
          const mimeType = blob.type || "image/jpeg";
          const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
          const sanitizedName = (p.name || "aura-rudraksha").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
          const imageFile = new File([blob], `${sanitizedName}-certified.${ext}`, { type: mimeType });

          const sharePayload = {
            title: shareTitle,
            text: `🌸 *${p.name}*${priceStr}\n100% Authentic Lab Certified Rudraksha from Aura Rudraksha.\n\n👇 *View Product & Certificate:*\n${shareUrl}`,
            url: shareUrl,
            files: [imageFile]
          };

          if (navigator.canShare(sharePayload)) {
            await navigator.share(sharePayload);
            setShareOpen(false);
            return;
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        // Downfall to standard text/URL Web Share API
      }
    }

    // 2. Standard Native Web Share API (Link & Text Preview)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Explore authentic 100% lab-certified ${p.name} at Aura Rudraksha.\n\n${shareUrl}`,
          url: shareUrl,
        });
        setShareOpen(false);
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    // 3. Desktop/Unsupported Browser Fallback (Copy Link)
    await handleCopyLink();
  };

  const handleShareProduct = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      handleNativeShare();
    } else {
      setShareOpen(prev => !prev);
    }
  };

  const handleAddBundle = (items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    if (typeof addBatch === "function") {
      addBatch(items);
    } else {
      add(items);
    }
  };

  const scrollToReviews = () => {
    const el = document.getElementById("reviews-section");
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Loading state with clean skeleton
  if (loading) {
    return (
      <Shell>
        <div className="aura-pdp-container" style={{ padding: "60px 16px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
            <Loader2 size={32} className="animate-spin" color="#c88a3d" />
            <p style={{ color: "#4a2715", fontWeight: "600", fontSize: "15px" }}>
              Loading Sacred Bead Details...
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  // Not Found State
  if (!product && !loading) {
    return (
      <Shell>
        <main className="aura-pdp-container" style={{ textAlign: "center", padding: "80px 16px" }}>
          <AlertCircle size={48} color="#8c2b10" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "30px", color: "#2a160d" }}>
            Sacred Product Not Found
          </h2>
          <p style={{ color: "#6b5e55", marginBottom: "24px", maxWidth: "420px", margin: "0 auto 24px auto" }}>
            The sacred item you are looking for may have been consecrated, reserved, or updated in our catalog.
          </p>
          <Link to="/shop" className="aura-btn-buy-now" style={{ display: "inline-flex", textDecoration: "none" }}>
            Explore Sacred Catalog <ArrowRight size={16} />
          </Link>
        </main>
      </Shell>
    );
  }

  const suggestedProducts = allProducts.filter(x => String(x.id) !== String(p.id)).slice(0, 4);

  const handleBack = () => {
    if (window.history && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <Shell>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="aura-pdp-container"
      >
        {/* 1. Breadcrumb Navigation Bar with Back Button */}
        <div className="aura-pdp-breadcrumb-bar">
          <div className="aura-breadcrumb-inner">
            <div className="aura-breadcrumb-left">
              <button
                type="button"
                onClick={handleBack}
                className="aura-pdp-back-btn"
                aria-label="Go back"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>

              <nav className="aura-breadcrumb-links" aria-label="Breadcrumb">
                <Link to="/">Home</Link>
                <span className="aura-bc-sep">/</span>
                <Link to="/shop">Shop</Link>
                {p.category && (
                  <span className="aura-bc-cat" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <span className="aura-bc-sep">/</span>
                    <Link to={`/shop?category=${encodeURIComponent(p.category)}`}>
                      {p.category}
                    </Link>
                  </span>
                )}
                <span className="aura-bc-sep">/</span>
                <span className="aura-bc-current">{p.name}</span>
              </nav>
            </div>

            <div className="aura-pdp-share-wrap" ref={shareMenuRef}>
              <button
                type="button"
                className="aura-pdp-share-wa-pill"
                onClick={handleShareWhatsApp}
                aria-label="Share product on WhatsApp"
                title="Share on WhatsApp with Live Image Preview"
              >
                <MessageCircle size={13} />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                className="aura-pdp-share-btn"
                onClick={handleShareProduct}
                aria-label="Share product"
                aria-expanded={shareOpen}
              >
                <Share2 size={13} />
                <span>Share</span>
              </button>

              {shareOpen && (
                <div className="aura-pdp-share-dropdown" role="menu">
                  <button
                    type="button"
                    className="aura-pdp-share-menu-item wa"
                    onClick={handleShareWhatsApp}
                  >
                    <MessageCircle size={15} style={{ color: "#25d366" }} />
                    <span>Share on WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    className="aura-pdp-share-menu-item"
                    onClick={handleCopyLink}
                  >
                    {copiedLink ? <Check size={15} style={{ color: "#16a34a" }} /> : <Copy size={15} />}
                    <span>{copiedLink ? "Link Copied!" : "Copy Product Link"}</span>
                  </button>

                  {navigator?.share && (
                    <button
                      type="button"
                      className="aura-pdp-share-menu-item"
                      onClick={handleNativeShare}
                    >
                      <Share2 size={15} />
                      <span>More Apps (Native)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Main Product 2-Column Section */}
        <div className="aura-pdp-main-section">
          <div className="aura-pdp-grid">
            {/* LEFT COLUMN: Gallery */}
            <div className="aura-pdp-gallery-col">
              <ProductGallery
                product={p}
                isWishlisted={isFav}
                onToggleWishlist={toggleWishlist}
              />
            </div>

            {/* RIGHT COLUMN: Product Information & Purchase Controls */}
            <div className="aura-pdp-info-col">
              {/* Category / Sacred Bead Badge */}
              <div className="aura-pdp-category-tag">
                <Sparkles size={12} />
                <span>{p.category || "Authentic Rudraksha"}</span>
              </div>

              {/* Product Title */}
              <h1 className="aura-pdp-title">{p.name}</h1>

              {/* Short Spiritual Summary / Highlight */}
              {p.highlight && (
                <p className="aura-pdp-spiritual-summary">
                  {p.highlight}
                </p>
              )}

              {/* Rating & SKU Bar */}
              <div className="aura-pdp-meta-row">
                <button
                  type="button"
                  className="aura-rating-trigger"
                  onClick={scrollToReviews}
                  title="View devotee reviews"
                >
                  <div className="aura-stars-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        fill="#c88a3d"
                        color="#c88a3d"
                      />
                    ))}
                  </div>
                  <span className="aura-rating-score">{averageRating}</span>
                  <span className="aura-rating-count">({reviewsCount} Devotee Reviews)</span>
                </button>

                <span className="aura-pdp-sku">
                  SKU: {p.sku || `AR-${p.id}`}
                </span>
              </div>

              {/* 4 Micro Trust Badges */}
              <ProductTrustBadges product={p} />

              {/* Price, Discount & Stock Block */}
              <ProductPricing product={p} />

              {/* Limited Period Coupon Offer Card */}
              <ProductOfferCard coupons={coupons} activeOffer={p.activeOffer} />

              {/* Variant / Size / Dimension & Origin Selector */}
              <ProductVariantSelector
                product={rawP}
                selectedOrigin={selectedOrigin}
                onSelectOrigin={setSelectedOrigin}
                selectedVariant={selectedVariant}
                onSelectVariant={setSelectedVariant}
                selectedSize={selectedSize}
                onSelectSize={setSelectedSize}
              />

              {/* Quantity Selector, CTA Action Buttons & Secure Payment Guarantee */}
              <div ref={ctaSectionRef}>
                <ProductPurchaseActions
                  product={p}
                  qty={qty}
                  setQty={setQty}
                  stockLimit={stockLimit}
                  isOutOfStock={isOutOfStock}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                  onWhatsAppOrder={handleWhatsAppOrder}
                  added={added}
                />
              </div>

              {/* Similar Product / Alternative Rudraksha Origin Card (नेपाल vs इंडोनेशियाई दाना) */}
              {rawP && (!!rawP.hasIndonesianVariant || Number(rawP.indonesianPrice) > 0) && (
                <div style={{
                  marginTop: '16px',
                  background: '#fffdfa',
                  border: isIndonesianActive ? '1.5px solid #fed7aa' : '1.5px solid #fed7aa',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  boxShadow: '0 2px 8px rgba(140, 43, 16, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#7c2d12', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Sparkles size={14} style={{ color: '#c2410c' }} />
                      Similar Origin Option (रुद्राक्ष दाना विकल्प):
                    </span>
                    <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      {isIndonesianActive ? "Nepal Available" : "Indonesia Available"}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <img
                      src={isIndonesianActive
                        ? (rawP.images?.[0] || rawP.img || "/images/placeholder.svg")
                        : (rawP.indonesianImg || rawP.indonesianImages?.[0] || rawP.img || "/images/placeholder.svg")
                      }
                      alt="Similar Origin Bead"
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid #ebdccb',
                        background: '#f8fafc',
                        flexShrink: 0
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#2b170d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isIndonesianActive
                          ? `🇳🇵 ${rawP.name} (Nepal Origin)`
                          : `🇮🇩 ${rawP.indonesianTitle || `${rawP.name} (Indonesian Java)`}`
                        }
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#78685c', margin: '2px 0' }}>
                        {isIndonesianActive
                          ? `Large Nepal Bead (${rawP.size || "18–22 mm"}) • Deep Mukhi Grooves`
                          : `Small Java Bead (${rawP.indonesianSize || "10–14 mm"}) • Budget Friendly`
                        }
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: isIndonesianActive ? '#8c2b10' : '#b45309' }}>
                          ₹{(isIndonesianActive ? Number(rawP.price || 0) : Number(rawP.indonesianPrice || 0)).toLocaleString("en-IN")}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrigin(isIndonesianActive ? "Nepal" : "Indonesia");
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          style={{
                            marginLeft: 'auto',
                            background: isIndonesianActive ? '#8c2b10' : '#d97706',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isIndonesianActive ? "Switch to Nepali →" : "Switch to Indonesian →"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Indian Pincode Delivery & Saved Address Checker (Placed under Buy Now) */}
              <ProductDeliveryChecker
                freeShippingThreshold={shipThreshold}
                productShippingFee={p.shippingFee || 0}
              />
            </div>
          </div>

          {/* Product Information Tabs (Desktop Tabs & Mobile Accordions) */}
          <ProductInfoTabs
            product={p}
            reviewsCount={reviewsCount}
            averageRating={averageRating}
          />

          {/* Frequently Bought Together Bundle */}
          <FrequentlyBoughtTogether
            currentProduct={p}
            allProducts={allProducts}
            onAddBundle={handleAddBundle}
          />

          {/* Devotee Customer Reviews Section */}
          <div id="reviews-section" style={{ marginTop: "40px" }}>
            <ProductReviews product={p} />
          </div>

          {/* 9. Suggested Sacred Beads / Complementary Catalog */}
          {suggestedProducts.length > 0 && (
            <div className="aura-related-products-section" style={{ marginTop: "48px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                borderBottom: "1px solid var(--aura-border-light)",
                paddingBottom: "12px"
              }}>
                <div>
                  <h3 style={{
                    fontFamily: "Playfair Display, Georgia, serif",
                    fontSize: "22px",
                    fontWeight: "700",
                    color: "var(--aura-brown-dark)",
                    margin: 0
                  }}>
                    Explore More Sacred Beads
                  </h3>
                  <span style={{ fontSize: "12.5px", color: "var(--aura-text-muted)" }}>
                    Ethically gathered authentic Himalayan treasures
                  </span>
                </div>
                <Link
                  to="/shop"
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "var(--aura-gold-bright)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  View All <ChevronRight size={14} />
                </Link>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "16px"
              }}>
                {suggestedProducts.map(prod => (
                  <ProductCard
                    key={prod.id}
                    p={prod}
                    onAdd={(prodId) => add(prodId, 1)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 10. Mobile Sticky Purchase Bar (Always active on mobile screens) */}
        <MobileStickyPurchaseBar
          product={p}
          qty={qty}
          selectedVariant={selectedVariant}
          selectedSize={selectedSize}
          isVisible={showStickyBar}
          onAddToCart={(pId, q) => add(pId, q)}
          onBuyNow={handleBuyNow}
        />
      </motion.div>
    </Shell>
  );
}
export default Product;
