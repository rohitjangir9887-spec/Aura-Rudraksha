import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { db, onStoreUpdate, isPublicProduct } from "../lib/db";
import { useCart } from "../hooks/useCart";

export function HomeFeaturedProductAd() {
  const navigate = useNavigate();
  const { buyNow, add } = useCart();
  const [settings, setSettings] = useState(() => db.getSettings() || {});
  const [products, setProducts] = useState(() => db.getProducts() || []);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const updateData = () => {
      setSettings(db.getSettings() || {});
      setProducts(db.getProducts() || []);
    };
    updateData();
    const unsub = onStoreUpdate(updateData);
    return () => unsub();
  }, []);

  const isEnabled = settings?.featuredProductEnabled !== false;
  if (!isEnabled) {
    return null;
  }

  const targetId = settings?.featuredProductId ? String(settings.featuredProductId).trim() : "";
  let product = null;

  if (targetId) {
    product = products.find(p => 
      isPublicProduct(p) && (String(p.id) === targetId || String(p._id) === targetId || String(p.slug) === targetId)
    );
  }

  // Fallback to top authentic sacred product in catalog if not specifically chosen or not yet loaded
  if (!product && products.length > 0) {
    product = products.find(p => isPublicProduct(p) && (String(p.id) === "14" || String(p.id) === "5"))
      || products.find(p => isPublicProduct(p) && (p.badge === "Best Seller" || p.isPopular))
      || products.find(isPublicProduct);
  }

  if (!product) {
    return null;
  }

  const price = Number(product.price) || 0;
  const comparePrice = Number(product.comparePrice || product.mrp) || 0;
  const hasDiscount = comparePrice > price;
  const discountPct = hasDiscount ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  const productImage = (Array.isArray(product.images) && product.images.length > 0 && product.images[0])
    ? product.images[0]
    : (product.img || "/images/product-5mukhi.jpg");

  const productUrl = `/product/${product.slug || product.id || product._id}`;

  const getCleanSummary = () => {
    if (product.highlight && product.highlight.trim()) {
      return product.highlight.trim();
    }
    if (product.description && typeof product.description === "string") {
      const plain = product.description.replace(/<[^>]*>?/gm, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      if (plain.length > 130) {
        return plain.slice(0, 127) + "...";
      }
      return plain;
    }
    return "";
  };

  const summary = getCleanSummary();
  const badgeLabel = product.badge || product.homeBadge || (product.isPopular ? "Best Seller" : "Featured Sacred Product");

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product || isNavigating) return;

    setIsNavigating(true);
    try {
      if (buyNow) {
        buyNow(product.id, 1);
      } else {
        sessionStorage.setItem("aura_buy_now_intent", JSON.stringify([{ id: String(product.id), qty: 1 }]));
      }
    } catch (_) {}

    // Instant seamless navigation
    navigate("/checkout");
  };

  return (
    <section 
      id="aura-home-featured-product-ad" 
      className="aura-featured-ad-wrapper"
      aria-label={`Featured Product: ${product.name}`}
      style={{
        margin: "0 0 24px 0",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      <div 
        className="aura-featured-ad-card"
        style={{
          background: "linear-gradient(180deg, #fffdfa 0%, #fbf7f0 100%)",
          border: "1px solid #ebdccb",
          borderRadius: "18px",
          boxShadow: "0 4px 20px rgba(43, 23, 13, 0.05), 0 1px 3px rgba(43, 23, 13, 0.03)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          transition: "transform 0.2s ease, box-shadow 0.2s ease"
        }}
      >
        {/* TOP: Image Container with Aspect Ratio */}
        <Link 
          to={productUrl} 
          style={{ textDecoration: "none", color: "inherit", display: "block", position: "relative" }}
          aria-label={`View ${product.name}`}
        >
          <div 
            style={{
              position: "relative",
              width: "100%",
              paddingTop: "75%", /* 4:3 Aspect Ratio for crisp presence on mobile */
              backgroundColor: "#f5eee4",
              overflow: "hidden"
            }}
          >
            <img 
              src={productImage} 
              alt={product.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                if (!e.currentTarget.src.includes("product-5mukhi.jpg")) {
                  e.currentTarget.src = "/images/product-5mukhi.jpg";
                }
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                transition: "transform 0.4s ease"
              }}
            />
            {/* Subtle Gradient Vignette at Bottom of Image */}
            <div 
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "40px",
                background: "linear-gradient(to top, rgba(43, 23, 13, 0.25), transparent)",
                pointerEvents: "none"
              }}
            />
          </div>
        </Link>

        {/* BOTTOM: Product Details and CTA */}
        <div 
          style={{
            padding: "16px 16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxSizing: "border-box"
          }}
        >
          {/* Header Row: Badge & Authenticity Tag */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
            {badgeLabel ? (
              <span 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#fed7aa",
                  color: "#7c2d12",
                  border: "1px solid #fdba74",
                  borderRadius: "999px",
                  padding: "3px 10px",
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.4px",
                  textTransform: "uppercase"
                }}
              >
                <Sparkles size={11} className="text-[#a54d2b]" />
                {badgeLabel}
              </span>
            ) : <span />}

            <span 
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                fontSize: "11px",
                color: "#6b594d",
                fontWeight: "600"
              }}
            >
              <ShieldCheck size={13} style={{ color: "#16a34a" }} /> 100% Lab Certified
            </span>
          </div>

          {/* Product Name */}
          <Link 
            to={productUrl}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <h3 
              style={{
                margin: 0,
                fontSize: "16.5px",
                fontWeight: "800",
                color: "#2b170d",
                lineHeight: "1.35",
                fontFamily: "var(--font-heading, inherit)"
              }}
            >
              {product.name}
            </h3>
          </Link>

          {/* Product Short Summary / Description */}
          {summary ? (
            <p 
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: "1.45",
                color: "#6b594d",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden"
              }}
            >
              {summary}
            </p>
          ) : null}

          {/* Pricing Row */}
          <div 
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "2px",
              paddingTop: "6px",
              borderTop: "1px dashed #e8dacb"
            }}
          >
            <span 
              style={{
                fontSize: "20px",
                fontWeight: "800",
                color: "#a54d2b",
                letterSpacing: "-0.3px"
              }}
            >
              ₹{price.toLocaleString("en-IN")}
            </span>

            {hasDiscount ? (
              <>
                <span 
                  style={{
                    fontSize: "13.5px",
                    color: "#9c8c80",
                    textDecoration: "line-through",
                    fontWeight: "500"
                  }}
                >
                  ₹{comparePrice.toLocaleString("en-IN")}
                </span>

                <span 
                  style={{
                    fontSize: "11.5px",
                    fontWeight: "700",
                    color: "#15803d",
                    background: "#dcfce7",
                    border: "1px solid #bbf7d0",
                    padding: "2px 6px",
                    borderRadius: "4px"
                  }}
                >
                  {discountPct}% OFF
                </span>
              </>
            ) : null}
          </div>

          {/* Buy Now CTA Button & View Details Row */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
            <button 
              type="button"
              id="btn-featured-product-buy-now"
              className="aura-featured-ad-buy-btn"
              onClick={handleBuyNow}
              disabled={isNavigating}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                minHeight: "46px",
                background: "linear-gradient(135deg, #8c2b10 0%, #a54d2b 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "700",
                letterSpacing: "0.5px",
                textDecoration: "none",
                textTransform: "uppercase",
                boxShadow: "0 4px 12px rgba(140, 43, 16, 0.25)",
                transition: "all 0.15s ease",
                cursor: "pointer",
                boxSizing: "border-box"
              }}
            >
              <Zap size={16} />
              <span>{isNavigating ? "Opening Checkout..." : "Buy Now"}</span>
              <ArrowRight size={16} />
            </button>

            <Link
              to={productUrl}
              style={{
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: "#8c6d56",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                padding: "2px 0"
              }}
            >
              View Full Product Details & Certificates →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
