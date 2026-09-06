import React from "react";
import { Minus, Plus, ShoppingCart, Zap, Check, MessageSquare } from "lucide-react";
import { SecurePaymentGuarantee } from "../checkout/SecurePaymentGuarantee";
import { money } from "../../data";

export function ProductPurchaseActions({
  product,
  qty,
  setQty,
  stockLimit,
  isOutOfStock,
  onAddToCart,
  onBuyNow,
  onWhatsAppOrder,
  added = false
}) {
  if (!product) return null;

  const price = Number(product.price) || 0;

  return (
    <div className="aura-purchase-actions-container">
      {/* Quantity & Total Price Indicator */}
      {!isOutOfStock && (
        <div className="aura-quantity-picker-row">
          <div className="qty-picker-label">
            <span>Select Quantity:</span>
          </div>

          <div className="aura-qty-control">
            <button
              type="button"
              className="qty-btn"
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="qty-number">{qty}</span>
            <button
              type="button"
              className="qty-btn"
              onClick={() => setQty(Math.min(stockLimit || 50, qty + 1))}
              disabled={qty >= (stockLimit || 50)}
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="qty-total-preview">
            Total: <strong>{money(price * qty)}</strong>
          </div>
        </div>
      )}

      {/* Primary Action Buttons (Add to Cart & Buy Now) */}
      <div className="aura-primary-cta-grid">
        <button
          type="button"
          className={`aura-btn-add-cart ${added ? "added" : ""}`}
          onClick={onAddToCart}
          disabled={isOutOfStock}
          aria-label={isOutOfStock ? "Out of stock" : "Add to Cart"}
        >
          {added ? (
            <>
              <Check size={18} strokeWidth={2.6} />
              <span>Added to Cart!</span>
            </>
          ) : (
            <>
              <ShoppingCart size={18} />
              <span>{isOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="aura-btn-buy-now"
          onClick={onBuyNow}
          disabled={isOutOfStock}
          aria-label={isOutOfStock ? "Unavailable" : "Buy It Now"}
        >
          <Zap size={18} />
          <span>{isOutOfStock ? "Unavailable" : "Buy It Now"}</span>
        </button>
      </div>

      {/* WhatsApp Express Order Button */}
      <button
        type="button"
        className="aura-btn-whatsapp-order"
        onClick={onWhatsAppOrder}
        disabled={isOutOfStock}
        aria-label="Order on WhatsApp"
      >
        <span className="wa-icon">💬</span>
        <span>Order Directly on WhatsApp</span>
      </button>

      {/* 100% Secure Payment Guarantee Strip */}
      <SecurePaymentGuarantee style={{ margin: "14px 0 6px 0" }} />
    </div>
  );
}
