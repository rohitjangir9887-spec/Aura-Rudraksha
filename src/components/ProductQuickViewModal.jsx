import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Star, ShoppingCart, ShieldCheck, Heart, ArrowRight, Check } from "lucide-react";
import { money, pct } from "../data";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { emitToast } from "../context/ToastContext";
import { OptimizedImage } from "./OptimizedImage";
import { getProductRoute } from "../lib/routes";

export function ProductQuickViewModal({ product, onClose }) {
  const navigate = useNavigate();
  const { add } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [selectedImg, setSelectedImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const isOutOfStock = product.stock === 0 || product.status === "Out of Stock";
  const images = product.images && product.images.length > 0 ? product.images : [product.img || "/images/placeholder.svg"];
  const currentImage = images[selectedImg] || images[0];
  const discount = pct(product);
  const isSaved = isWishlisted(product.id);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    add(product.id, qty);
    setAdded(true);
    emitToast(`${product.name} (x${qty}) added to cart! ✨`, "success");
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 900);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    add(product.id, qty);
    onClose();
    navigate("/checkout");
  };

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 999999,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          maxWidth: "760px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          position: "relative",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #ebd8c5"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "#f4f4f5",
            border: "none",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            color: "#52525b",
            zIndex: 10
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", alignItems: "center" }}>
          
          {/* Left: Images */}
          <div>
            <div style={{ width: "100%", height: "280px", borderRadius: "14px", overflow: "hidden", background: "#fcf9f6", border: "1px solid #f0dfcc", display: "grid", placeItems: "center" }}>
              <OptimizedImage
                src={currentImage}
                alt={product.name}
                width={560}
                quality={85}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* Thumbnail switcher */}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: "8px", marginTop: "10px", overflowX: "auto" }}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImg(idx)}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: selectedImg === idx ? "2px solid #ea580c" : "1px solid #e5e7eb",
                      padding: 0,
                      cursor: "pointer"
                    }}
                  >
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Details & Fast Buy */}
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#9a3412", textTransform: "uppercase", letterSpacing: "1px" }}>
              {product.category || "Nepali Rudraksha"}
            </span>

            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#2b170d", margin: "4px 0 8px" }}>
              {product.name}
            </h2>

            {/* Rating & Authenticity */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 700, color: "#b45309" }}>
                <Star size={14} fill="#b45309" color="#b45309" />
                <span>{product.rating || "4.9"}</span>
                <span style={{ color: "#78716c", fontWeight: 500 }}>({product.reviews || product.reviewCount || 42} reviews)</span>
              </div>
              <span style={{ fontSize: "12px", color: "#059669", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                <ShieldCheck size={14} /> 100% Lab Certified
              </span>
            </div>

            {/* Price Row */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "16px" }}>
              <span style={{ fontSize: "24px", fontWeight: 800, color: "#9a3412" }}>
                {money(product.price)}
              </span>
              {product.mrp > product.price && (
                <span style={{ fontSize: "15px", color: "#9ca3af", textDecoration: "line-through" }}>
                  {money(product.mrp)}
                </span>
              )}
              {discount > 0 && (
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#ea580c", background: "#fff7ed", border: "1px solid #fed7aa", padding: "2px 8px", borderRadius: "10px" }}>
                  {discount}% OFF
                </span>
              )}
            </div>

            {/* Short description */}
            <p style={{ fontSize: "13px", color: "#6e594d", lineHeight: "1.5", marginBottom: "16px" }}>
              {product.description?.slice(0, 140) || "हरिद्वार व काठमांडू से सीधे प्राप्त 100% शुद्ध एवं प्रतिष्ठित नेपाली रुद्राक्ष मनका।"}...
            </p>

            {/* Quantity Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#2b170d" }}>मात्रा (Qty):</span>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  style={{ width: "32px", height: "32px", background: "#f9fafb", border: "none", cursor: "pointer", fontWeight: 700 }}
                >
                  -
                </button>
                <span style={{ width: "36px", textAlign: "center", fontSize: "13px", fontWeight: 700 }}>
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(qty + 1)}
                  style={{ width: "32px", height: "32px", background: "#f9fafb", border: "none", cursor: "pointer", fontWeight: 700 }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                style={{
                  flex: 1,
                  minWidth: "140px",
                  background: added ? "#16a34a" : "#7c2d12",
                  color: "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "10px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: isOutOfStock ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                {added ? <Check size={16} /> : <ShoppingCart size={16} />}
                <span>{added ? "कार्ट में जोड़ा गया" : "Add to Cart"}</span>
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                style={{
                  flex: 1,
                  minWidth: "140px",
                  background: "#ea580c",
                  color: "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "10px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: isOutOfStock ? "not-allowed" : "pointer"
                }}
              >
                अभी खरीदें (Buy Now)
              </button>
            </div>

            {/* Full Product Page Link */}
            <Link
              to={getProductRoute(product)}
              onClick={onClose}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#9a3412",
                textDecoration: "none",
                marginTop: "4px"
              }}
            >
              संपूर्ण विवरण व वैदिक महत्व देखें <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ProductQuickViewModal;
