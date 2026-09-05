import React from "react";
import { Link } from "react-router-dom";
import { Plus, Sparkles, Check, ShieldCheck } from "lucide-react";
import { money } from "../../data";

export function CartRecommendations({
  products = [],
  onAddToCart,
  title = "You May Also Like"
}) {
  if (!products || products.length === 0) return null;

  return (
    <div
      id="cart-recommendations-section"
      style={{
        marginTop: "20px",
        marginBottom: "16px",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
          padding: "0 2px"
        }}
      >
        <h3
          style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: "20px",
            fontWeight: "700",
            color: "#2b170d",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Sparkles size={16} color="#b85d25" />
          <span>{title}</span>
        </h3>
        <span style={{ fontSize: "11px", color: "#8c5332", fontWeight: "600" }}>
          Frequently paired
        </span>
      </div>

      {/* Horizontal Scroll on Mobile / Flexible Grid */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          paddingBottom: "8px",
          scrollbarWidth: "thin",
          WebkitOverflowScrolling: "touch"
        }}
      >
        {products.map((p) => {
          const hasDiscount = p.mrp > p.price;
          const imageSrc = p.img || (p.images && p.images[0]) || "/images/product-5mukhi.jpg";

          return (
            <div
              key={p.id || p._id || p.productId}
              style={{
                background: "#ffffff",
                border: "1.5px solid #ebd9c8",
                borderRadius: "12px",
                padding: "10px",
                minWidth: "155px",
                maxWidth: "170px",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 2px 8px rgba(43,23,13,0.03)",
                boxSizing: "border-box"
              }}
            >
              <Link
                to={`/product/${p.id || p._id || p.productId}`}
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "110px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "#faf6f0",
                    border: "1px solid #ebdccb",
                    marginBottom: "8px"
                  }}
                >
                  <img
                    src={imageSrc}
                    alt={p.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    loading="lazy"
                    onError={(e) => {
                      if (!e.target.src.includes("product-5mukhi.jpg")) {
                        e.target.src = "/images/product-5mukhi.jpg";
                      }
                    }}
                  />
                </div>

                <h4
                  style={{
                    fontSize: "12.5px",
                    fontWeight: "700",
                    margin: "0 0 4px",
                    color: "#2b170d",
                    lineHeight: "1.3",
                    height: "32px",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical"
                  }}
                >
                  {p.name}
                </h4>

                <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "#2b170d" }}>
                    {money(p.price)}
                  </span>
                  {hasDiscount && (
                    <del style={{ fontSize: "10.5px", color: "#8a7566" }}>
                      {money(p.mrp)}
                    </del>
                  )}
                </div>
              </Link>

              <button
                type="button"
                onClick={() => onAddToCart(p)}
                style={{
                  background: "#fdf8f4",
                  border: "1px solid #b88a58",
                  color: "#8c5332",
                  padding: "6px 10px",
                  borderRadius: "7px",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  transition: "all 0.15s ease"
                }}
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add to Bag</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
