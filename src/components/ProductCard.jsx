import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Star, ShoppingCart, Gift, Check, ShieldCheck } from "lucide-react";
import { money, pct } from "../data";
import { useWishlist } from "../hooks/useWishlist";
import { useActiveOffer } from "../hooks/useActiveOffer";
import { emitToast } from "../context/ToastContext";

export function ProductCardSkeleton() {
  return (
    <div className="aura-shop-card skeleton" style={{ minHeight: "340px", background: "#fffdf9" }}>
      <div style={{ width: "100%", height: "185px", background: "#f1e7db", animation: "pulse 1.5s infinite" }} />
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ height: "16px", width: "70%", background: "#f1e7db", borderRadius: "4px" }} />
        <div style={{ height: "12px", width: "40%", background: "#f1e7db", borderRadius: "4px" }} />
        <div style={{ height: "18px", width: "50%", background: "#f1e7db", borderRadius: "4px" }} />
        <div style={{ height: "34px", width: "100%", background: "#f1e7db", borderRadius: "8px", marginTop: "6px" }} />
      </div>
    </div>
  );
}

function ProductCardComponent({ p, onAdd, isShop = false }) {
  if (!p) return null;
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { offer, isActive: hasOffer } = useActiveOffer(p);
  const [added, setAdded] = useState(false);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);

  const productId = String(p?.id || p?._id || p?.slug || "");
  const isSaved = isWishlisted(productId);
  const images = (Array.isArray(p?.images) && p.images.length > 0) 
    ? p.images 
    : [p?.img || "/images/product-5mukhi.jpg"];
  const displayImage = images[selectedImgIdx] || images[0] || "/images/product-5mukhi.jpg";
  const discount = pct(p);
  const isOutOfStock = p?.stock === 0 || p?.status === "Out of Stock";

  const handleCardClick = () => {
    if (productId) navigate(`/product/${productId}`);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    
    if (onAdd) {
      onAdd(productId || p?.id);
    }
    setAdded(true);
    emitToast(`${p.name} added to cart`, "success");
    setTimeout(() => {
      setAdded(false);
    }, 1800);
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(productId || p?.id, p.name);
  };

  const handleSelectImage = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImgIdx(idx);
  };

  // Dynamic offer display text
  const offerTitle = offer?.title || "Special Offer";
  const offerCode = offer?.couponCode || "";

  return (
    <div 
      className="aura-shop-card" 
      onClick={handleCardClick}
      id={`product-card-${p.id}`}
    >
      {/* 1. Card Image Area */}
      <div className="aura-card-media">
        <img 
          src={displayImage} 
          alt={p.name}
          className="aura-card-img"
          loading="lazy"
          decoding="async"
          onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
        />

        {/* Floating Offer Badge (Top Left of image) */}
        {hasOffer && offer?.productCardEnabled !== false && (
          <div 
            className="aura-card-offer-tag"
            title={`${offerTitle} with code ${offerCode}`}
            onClick={(e) => {
              e.stopPropagation();
              if (offerCode) {
                try {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(offerCode).catch(() => {});
                  }
                } catch (_) {}
                emitToast(`Coupon ${offerCode} copied! ✨`, "success");
              }
            }}
          >
            <span className="aura-card-offer-tag-title">
              <Gift size={10} color="#fde8b7" /> {offerTitle}
            </span>
            {offerCode && (
              <span className="aura-card-offer-tag-code">
                {offerCode}
              </span>
            )}
          </div>
        )}

        {/* Auspicious / Curated Badge (Bottom Left) */}
        {p.badge && !isOutOfStock && (
          <span className="aura-card-badge-pill">
            {p.badge}
          </span>
        )}

        {/* Stock Pill if out of stock */}
        {isOutOfStock && (
          <span className="aura-card-stock-pill">
            Out of Stock
          </span>
        )}

        {/* Wishlist Heart Button (Top Right) */}
        <button 
          type="button" 
          className={`aura-card-wish-btn ${isSaved ? "active" : ""}`}
          onClick={handleToggleWishlist}
          aria-label={isSaved ? "Remove from Wishlist" : "Add to Wishlist"}
          id={`wishlist-btn-${p.id}`}
        >
          <Heart size={15} fill={isSaved ? "#a54d2b" : "none"} strokeWidth={2.2} />
        </button>

        {/* Interactive Gallery Dots (if multiple images available) */}
        {images.length > 1 && (
          <div className="aura-card-gallery-dots">
            {images.slice(0, 4).map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`aura-card-gallery-dot ${selectedImgIdx === idx ? "active" : ""}`}
                onClick={(e) => handleSelectImage(e, idx)}
                aria-label={`View image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. Card Content Area */}
      <div className="aura-card-body">
        <div>
          {/* Category Tag */}
          {p.category && (
            <div className="aura-card-category-row" style={{ marginBottom: "4px" }}>
              <span style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "#7e3b12",
                background: "#fef3e7",
                border: "1px solid #f3d1b7",
                padding: "2px 8px",
                borderRadius: "10px",
                display: "inline-block",
                letterSpacing: "0.2px"
              }}>
                {p.category}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="aura-card-title">
            <Link 
              to={`/product/${productId}`} 
              onClick={(e) => e.stopPropagation()}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              {p.name}
            </Link>
          </h3>

          {/* Rating */}
          <div className="aura-card-rating-row">
            <Star size={12} fill="#b45309" color="#b45309" />
            <span>{p.rating || 4.9}</span>
            <span className="aura-card-reviews-count">({p.reviews || 84})</span>
          </div>

          {/* Price & Discounts */}
          <div className="aura-card-price-row">
            <span className="aura-card-current-price">{money(p.price)}</span>
            {p.mrp > p.price && (
              <span className="aura-card-mrp">{money(p.mrp)}</span>
            )}
            {discount > 0 && (
              <span className="aura-card-discount-tag">{discount}% off</span>
            )}
          </div>

          {/* Stock status info */}
          <div className="aura-card-stock-status">
            {isOutOfStock ? (
              <span style={{ color: "#71717a" }}>Temporarily Unavailable</span>
            ) : (
              <>
                <span className="aura-card-stock-dot" />
                <span>In Stock • Vedic Energized</span>
              </>
            )}
          </div>
        </div>

        {/* 3. Add to Cart Button */}
        <button 
          type="button" 
          className={`aura-card-add-btn ${added ? "added" : ""}`}
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          id={`add-to-cart-btn-${p.id}`}
        >
          {added ? (
            <>
              <Check size={14} strokeWidth={2.6} /> Added ✓
            </>
          ) : isOutOfStock ? (
            "Out of Stock"
          ) : (
            <>
              <ShoppingCart size={14} /> Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export const ProductCard = React.memo(ProductCardComponent);

