import React from "react";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { money, pct } from "../../data";

export function ProductPricing({ product }) {
  if (!product) return null;

  const mrp = Number(product.mrp) || Number(product.price) || 0;
  const price = Number(product.price) || 0;
  const discount = pct(product);
  const savings = mrp > price ? mrp - price : 0;

  const stockLimit = product.stock !== undefined ? Number(product.stock) : (product.status === "Out of Stock" ? 0 : 50);
  const isOutOfStock = stockLimit <= 0 || product.status === "Out of Stock";
  const isLowStock = !isOutOfStock && stockLimit <= 5;

  // Format sales count (total sales added in admin dashboard or dynamic fallback)
  const rawSales = product.totalSold || product.salesCount || product.totalSales;
  let formattedSales = "";
  if (rawSales !== undefined && rawSales !== null && String(rawSales).trim() !== "") {
    const s = String(rawSales).trim();
    formattedSales = s.toLowerCase().includes("sold") || s.toLowerCase().includes("orders") || s.toLowerCase().includes("bought") 
      ? s 
      : `${s} Sold`;
  } else {
    // Dynamic social proof fallback based on reviews or product attributes
    const baseCount = (Number(product.reviews) || 64) * 4 + 180;
    formattedSales = `${baseCount.toLocaleString("en-IN")}+ Sold`;
  }

  return (
    <div className="aura-pricing-block">
      {/* Price Main Row */}
      <div className="aura-pricing-main-row">
        <div style={{ display: "inline-flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
          <span className="aura-selling-price">{money(price)}</span>
          {mrp > price && (
            <del className="aura-mrp-price">{money(mrp)}</del>
          )}
          {discount > 0 && (
            <span className="aura-discount-pill">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* 🔥 Total Sales Social Proof Counter with Live Animation */}
        {formattedSales && (
          <div 
            className="aura-sales-counter-badge"
            title={`${formattedSales} authentic beads consecrated and delivered`}
          >
            <span className="aura-sales-flame-icon">🔥</span>
            <span className="aura-sales-badge-text">{formattedSales}</span>
            <span className="aura-sales-live-dot" />
          </div>
        )}
      </div>

      {/* Savings & Tax Row */}
      <div className="aura-savings-row">
        {savings > 0 && (
          <span className="aura-savings-pill">
            <CheckCircle2 size={13} /> You Save {money(savings)}
          </span>
        )}
        <span className="aura-tax-text">Inclusive of all taxes &amp; Free Vedic Blessing</span>
      </div>

      {/* Stock Status Badge */}
      <div className="aura-stock-row">
        {isOutOfStock ? (
          <span className="aura-stock-badge out-of-stock">
            <AlertCircle size={14} /> Currently Out of Stock
          </span>
        ) : isLowStock ? (
          <span className="aura-stock-badge low-stock">
            <Sparkles size={14} /> Only {stockLimit} authentic beads left in this batch
          </span>
        ) : (
          <span className="aura-stock-badge in-stock">
            <CheckCircle2 size={14} /> In Stock &bull; Ready for Vedic Consecration
          </span>
        )}
      </div>
    </div>
  );
}
