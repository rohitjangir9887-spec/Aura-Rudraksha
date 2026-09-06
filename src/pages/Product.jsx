import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Star, Share2, AlertCircle, ChevronRight, ChevronLeft, Sparkles, ArrowRight, Loader2
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
  const { add, buyNow, totals } = useCart();
  const shipThreshold = totals?.freeShippingThreshold ?? (db.getSettings()?.freeShippingThreshold ?? 0);
  const { isWishlisted, toggleWishlist } = useWishlist();

  // Core product state
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // User purchase selections
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedSize, setSelectedSize] = useState("Medium (16 - 20 mm)");
  const [added, setAdded] = useState(false);

  // Sticky bar visibility tracking
  const [showStickyBar, setShowStickyBar] = useState(false);
  const ctaSectionRef = useRef(null);

  // Load and subscribe to database updates
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
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

      setProduct(validProduct);

      if (validProduct) {
        setReviews(db.getReviews(validProduct.id || validProduct._id));
        if (validProduct.variants && validProduct.variants.length > 0) {
          const firstV = validProduct.variants[0];
          setSelectedVariant(typeof firstV === "string" ? firstV : (firstV.name || firstV.label || ""));
        }
      }

      if (!silent) setLoading(false);

      // Load related products & active coupons
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
    loadData(false);

    db.revalidateProducts().then(() => {
      loadData(true);
    }).catch(() => {});

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

  const p = product;

  // Rating & review summary from real approved devotee reviews in MongoDB
  const realReviewsForRating = reviews.filter(r => !r.isAiGenerated && !r.isSample);
  const reviewsCount = realReviewsForRating.length > 0 ? realReviewsForRating.length : (p?.reviews || 0);
  const totalRatingSum = realReviewsForRating.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
  const averageRating = realReviewsForRating.length > 0 
    ? (totalRatingSum / realReviewsForRating.length).toFixed(1) 
    : (p?.rating ? Number(p.rating).toFixed(1) : "5.0");

  const stockLimit = p?.stock !== undefined ? Number(p.stock) : (p?.status === "Out of Stock" ? 0 : 50);
  const isOutOfStock = stockLimit <= 0 || p?.status === "Out of Stock";
  const isFav = p ? isWishlisted(p.id) : false;

  // Cart & Buy Handlers
  const handleAddToCart = () => {
    if (!p || isOutOfStock) return;
    add(p.id, qty);
    setAdded(true);
    emitToast(`${p.name} added to your cart ❤️`, "success");
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!p || isOutOfStock) return;
    if (buyNow) {
      buyNow(p.id, qty);
    } else {
      try {
        sessionStorage.setItem("aura_buy_now_intent", JSON.stringify([{ id: String(p.id), qty }]));
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
    const message = `Namaste Aura Rudraksha,\n\nI would like to order:\n\n*Product:* ${p.name}\n*Variant:* ${selectedVariant || selectedSize}\n*Quantity:* ${qty}\n*Total Price:* ${money(price * qty)}\n*Link:* ${window.location.href}\n\nPlease confirm availability and dispatch details.\n\nDhanyawad!`;
    const waUrl = `https://wa.me/${waCleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  const handleShareProduct = () => {
    if (!p) return;
    if (navigator.share) {
      navigator.share({
        title: p.name,
        text: `Explore authentic ${p.name} at Aura Rudraksha`,
        url: window.location.href,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      emitToast("Product link copied to clipboard", "success");
    }
  };

  const handleAddBundle = (items) => {
    if (!Array.isArray(items)) return;
    items.forEach(item => {
      add(item.id, item.qty || 1);
    });
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
      <div className="aura-pdp-container">
        {/* 1. Breadcrumb Navigation Bar with Back Button */}
        <div className="aura-pdp-breadcrumb-bar">
          <div className="aura-breadcrumb-inner">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={handleBack}
                className="aura-pdp-back-btn"
                aria-label="Go back"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #ebdccb",
                  background: "#fffdfa",
                  color: "#6b594d",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>

              <nav className="aura-breadcrumb-links" aria-label="Breadcrumb">
                <Link to="/">Home</Link>
                <span className="aura-bc-sep">/</span>
                <Link to="/shop">Shop</Link>
                {p.category && (
                  <>
                    <span className="aura-bc-sep">/</span>
                    <Link to={`/shop?category=${encodeURIComponent(p.category)}`}>
                      {p.category}
                    </Link>
                  </>
                )}
                <span className="aura-bc-sep">/</span>
                <span className="aura-bc-current">{p.name}</span>
              </nav>
            </div>

            <button
              type="button"
              className="aura-pdp-share-btn"
              onClick={handleShareProduct}
              aria-label="Share product"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
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

              {/* Variant / Size / Dimension Selector */}
              <ProductVariantSelector
                product={p}
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
      </div>
    </Shell>
  );
}
export default Product;
