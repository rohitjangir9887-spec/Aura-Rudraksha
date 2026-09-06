import React, { useState } from "react";
import { ShoppingCart, Zap, Check } from "lucide-react";
import { money, pct } from "../../data";
import { emitToast } from "../../context/ToastContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export function MobileStickyPurchaseBar({
  product,
  qty = 1,
  selectedVariant = "",
  selectedSize = "",
  isVisible = true,
  onAddToCart,
  onBuyNow
}) {
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const stockLimit = product.stock !== undefined ? Number(product.stock) : (product.status === "Out of Stock" ? 0 : 50);
  const isOutOfStock = stockLimit <= 0 || product.status === "Out of Stock";

  const displayImg = (Array.isArray(product.images) && product.images[0]) || product.img || "/images/product-5mukhi.jpg";
  const mrp = Number(product.mrp) || Number(product.price) || 0;
  const price = Number(product.price) || 0;
  const discount = pct(product);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    if (onAddToCart) {
      onAddToCart(product.id, qty);
    }
    setAdded(true);
    emitToast(`${product.name} added to cart!`, "success");
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    if (onBuyNow) {
      onBuyNow();
    } else {
      if (onAddToCart) {
        onAddToCart(product.id, qty);
      }
      navigate("/checkout");
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="aura-mobile-sticky-purchase-bar"
          className="aura-mobile-sticky-purchase-bar"
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div className="aura-sticky-inner">
            {/* Left mini preview info */}
            <div className="aura-sticky-meta">
              <img
                src={displayImg}
                alt={product.name}
                className="aura-sticky-thumb"
                loading="lazy"
                onError={(e) => {
                  if (!e.target.src.includes("product-5mukhi.jpg")) {
                    e.target.src = "/images/product-5mukhi.jpg";
                  }
                }}
              />
              <div className="aura-sticky-price-box">
                <div className="aura-sticky-price-row">
                  <span className="aura-sticky-price">{money(price * qty)}</span>
                  {mrp > price && (
                    <del className="aura-sticky-mrp">{money(mrp * qty)}</del>
                  )}
                </div>
                <span className="aura-sticky-tagline">
                  {isOutOfStock ? "Out of Stock" : (discount > 0 ? `SAVE ${discount}% • FREE SHIPPING` : "FREE SHIPPING")}
                </span>
              </div>
            </div>

            {/* Right Buttons: Add to Cart + Buy Now */}
            <div className="aura-sticky-buttons">
              <button
                type="button"
                className={`aura-sticky-btn-add ${added ? "added" : ""}`}
                onClick={handleAdd}
                disabled={isOutOfStock}
                aria-label="Add to Cart"
              >
                {added ? (
                  <>
                    <Check size={14} strokeWidth={3} />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={15} />
                    <span>Add</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="aura-sticky-btn-buy"
                onClick={handleBuy}
                disabled={isOutOfStock}
                aria-label="Buy It Now"
              >
                <Zap size={15} />
                <span>{isOutOfStock ? "Unavailable" : "Buy Now"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
