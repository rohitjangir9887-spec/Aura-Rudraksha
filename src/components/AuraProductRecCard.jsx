import React from "react";
import { Link } from "react-router-dom";
import { Eye, ShoppingBag, ShoppingCart, Check, Star } from "lucide-react";
import { getProductPrimaryImage } from "../lib/imageUtils";
import { getProductRoute } from "../lib/routes";
import { safePrice } from "../lib/productHelper";

export function AuraProductRecCard({
  product,
  isAdded = false,
  onNavigate,
  onBuy,
  onAddToCart,
  variant = "compact" // "compact" | "page"
}) {
  if (!product || typeof product !== "object") return null;

  const priceNum = Math.max(0, safePrice(product.price, 0));
  const realMrp = Math.max(0, safePrice(product.comparePrice || product.mrp, 0));
  const discountPercent =
    realMrp > priceNum && realMrp > 0
      ? Math.round(((realMrp - priceNum) / realMrp) * 100)
      : 0;
  const oos = Number(product.stock) <= 0 && product.stock !== undefined;
  const realImg = getProductPrimaryImage(product);
  const pName = product.name || "Sacred Himalayan Rudraksha";
  const ratingVal = Number(product.rating) > 0 ? Number(product.rating).toFixed(1) : null;
  const route = getProductRoute(product);

  return (
    <div className={`aura-rec-prod-card ${variant === "page" ? "aura-rec-prod-card-page" : ""}`}>
      <div className="aura-rec-prod-main">
        <Link
          to={route}
          onClick={() => {
            window.dispatchEvent(new CustomEvent("aura-ai-navigate"));
            if (typeof onNavigate === "function") onNavigate();
          }}
          className="aura-rec-prod-thumb-wrap"
        >
          <img
            src={realImg}
            alt={pName}
            className="aura-rec-prod-thumb"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={(e) => {
              if (!e.target.src.includes("placeholder.svg")) {
                e.target.src = "/images/placeholder.svg";
              }
            }}
          />
          {discountPercent > 0 && (
            <span className="aura-rec-prod-disc">{discountPercent}% OFF</span>
          )}
        </Link>

        <div className="aura-rec-prod-info">
          <Link
            to={route}
            onClick={() => {
              window.dispatchEvent(new CustomEvent("aura-ai-navigate"));
              if (typeof onNavigate === "function") onNavigate();
            }}
            className="aura-rec-prod-title"
            title={pName}
          >
            {pName}
          </Link>

          <div className="aura-rec-prod-price-row">
            <span className="aura-rec-prod-price tabular-nums">
              ₹{priceNum.toLocaleString("en-IN")}
            </span>
            {discountPercent > 0 && (
              <span className="aura-rec-prod-mrp tabular-nums">
                ₹{realMrp.toLocaleString("en-IN")}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="aura-rec-prod-save tabular-nums">Save {discountPercent}%</span>
            )}
          </div>

          <div className="aura-rec-prod-status-row">
            {ratingVal && (
              <span className="aura-rec-prod-rating tabular-nums">
                <Star size={10} strokeWidth={2.4} className="fill-[#C69A45] text-[#C69A45]" aria-hidden="true" />
                <span>{ratingVal}</span>
              </span>
            )}
            <span className={`aura-rec-prod-stock ${oos ? "is-oos" : "is-in"}`}>
              {oos ? "Out of Stock" : "In Stock"}
            </span>
          </div>
        </div>
      </div>

      <div className="aura-rec-prod-actions">
        <Link
          to={route}
          onClick={() => {
            window.dispatchEvent(new CustomEvent("aura-ai-navigate"));
            if (typeof onNavigate === "function") onNavigate();
          }}
          className="aura-rec-btn aura-rec-btn-view"
        >
          <Eye size={12} strokeWidth={2.1} aria-hidden="true" />
          <span>View</span>
        </Link>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!oos && typeof onBuy === "function") onBuy(product);
          }}
          disabled={oos}
          className="aura-rec-btn aura-rec-btn-buy"
          title="Buy Now in Chat"
        >
          <ShoppingBag size={12} strokeWidth={2.1} aria-hidden="true" />
          <span>Buy</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!oos && typeof onAddToCart === "function") onAddToCart(product);
          }}
          disabled={oos}
          className={`aura-rec-btn aura-rec-btn-add ${isAdded ? "is-added" : ""}`}
        >
          {isAdded ? (
            <>
              <Check size={12} strokeWidth={2.4} aria-hidden="true" />
              <span>Added</span>
            </>
          ) : oos ? (
            <span>Sold Out</span>
          ) : (
            <>
              <ShoppingCart size={12} strokeWidth={2.1} aria-hidden="true" />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
