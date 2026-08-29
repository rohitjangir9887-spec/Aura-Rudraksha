import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Zap, Check } from "lucide-react";
import { money, pct } from "../data";
import { emitToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";
import { useActiveOffer } from "../hooks/useActiveOffer";

/**
 * Sticky bottom purchase bar that activates when the main product CTA is scrolled out of view
 */
export function StickyPurchaseBar({ product, isVisible, onAddToCart }) {
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const { offer, isActive } = useActiveOffer(product);

  if (!product) return null;
  // Hide if disabled in Unified Offer Engine
  if (isActive && offer?.stickyEnabled === false) return null;
  if (!isActive && offer?.stickyEnabled === false) return null; // If offer is inactive, maybe it still applies? 
  // Wait, if stickyEnabled is false, NEVER show. If it's true, maybe it's independent of the promo being active?
  // Let's just check the offer object directly from db, or since useActiveOffer returns offer even if inactive.
  if (offer?.stickyEnabled === false) return null;

  const isOutOfStock = product.stock === 0 || product.status === "Out of Stock";
  const displayImg = (product.images && product.images[0]) || product.img || "/images/product-5mukhi.jpg";
  const mrp = Number(product.mrp) || Number(product.price) || 0;
  const price = Number(product.price) || 0;
  const discount = pct(product);
  const savings = mrp > price ? mrp - price : 0;

  const handleAdd = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (onAddToCart) {
      onAddToCart(product.id, 1);
    }
    setAdded(true);
    emitToast(`${product.name} added to cart!`, "success");
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuy = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (onAddToCart) {
      onAddToCart(product.id, 1);
    }
    navigate("/checkout");
  };

  return (
    <AnimatePresence>
      {isVisible && !isOutOfStock && (
        <motion.div
          className="aura-sticky-purchase-bar"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="sticky-purchase-inner container">
            {/* Left: Product Thumbnail & Price Information */}
            <div className="sticky-product-meta">
              <img 
                src={displayImg} 
                alt={product.name} 
                className="sticky-product-thumb"
                onError={(e) => { e.target.src = "/images/product-5mukhi.jpg"; }}
              />
              <div className="sticky-details">
                <span className="sticky-name" title={product.name}>{product.name}</span>
                <div className="sticky-prices">
                  <span className="sticky-selling-price">{money(price)}</span>
                  {mrp > price && <del className="sticky-mrp">{money(mrp)}</del>}
                  {discount > 0 && <span className="sticky-discount-tag">SAVE {discount}%</span>}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="sticky-actions">
              <button 
                type="button"
                className={`sticky-add-btn ${added ? "added" : ""}`}
                onClick={handleAdd}
                disabled={isOutOfStock}
              >
                {added ? (
                  <>
                    <Check size={15} strokeWidth={2.5} />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={15} />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button 
                type="button"
                className="sticky-buy-btn"
                onClick={handleBuy}
                disabled={isOutOfStock}
              >
                <Zap size={15} />
                <span>Buy Now</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
