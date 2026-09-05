import React from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Plus, Minus, Trash2, ShieldCheck, Edit3 } from "lucide-react";
import { money } from "../../data";

export function CheckoutItemsReview({ lines, products, onUpdateQty, onRemoveItem }) {
  const totalItemCount = lines.reduce((acc, l) => acc + l.qty, 0);

  return (
    <div 
      id="checkout-items-review"
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "16px",
        padding: "18px 16px",
        marginBottom: "0",
        boxShadow: "0 4px 16px rgba(43, 23, 13, 0.04)",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden"
      }}
    >
      {/* Header */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          paddingBottom: "10px",
          borderBottom: "1px solid #f0e6da",
          flexWrap: "wrap",
          gap: "8px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div 
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "800",
              flexShrink: 0
            }}
          >
            2
          </div>
          <div>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: "700", margin: 0, color: "#2b170d", lineHeight: "1.2" }}>
              Order Items ({totalItemCount})
            </h2>
            <div style={{ fontSize: "11px", color: "#806f62", marginTop: "1px", display: "flex", alignItems: "center", gap: "4px" }}>
              <ShieldCheck size={12} color="#166534" />
              <span>100% Original & Lab-Certified</span>
            </div>
          </div>
        </div>

        <Link 
          to="/cart"
          id="btn-edit-cart"
          style={{
            fontSize: "11.5px",
            color: "#b85d25",
            fontWeight: "700",
            textDecoration: "none",
            background: "#fbf3ea",
            padding: "5px 10px",
            borderRadius: "8px",
            border: "1px solid #e8dac9",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.2s"
          }}
        >
          <Edit3 size={12} />
          <span>Edit Cart</span>
        </Link>
      </div>

      {/* Item List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", boxSizing: "border-box" }}>
        {lines.map((line) => {
          const p = products.find(x => String(x.id) === String(line.id));
          if (!p) return null;

          const itemImg = p.img || (p.images && p.images[0]) || "/images/product-5mukhi.jpg";
          const sellingPrice = Number(p.price) || 0;
          const mrpPrice = Number(p.mrp || p.comparePrice || 0);
          const hasDiscount = mrpPrice > sellingPrice;
          const discountPercent = hasDiscount ? Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100) : 0;
          const unitSavings = hasDiscount ? (mrpPrice - sellingPrice) : 0;
          const lineTotal = sellingPrice * line.qty;

          return (
            <div 
              key={line.id}
              id={`checkout-item-${line.id}`}
              style={{
                display: "flex",
                gap: "10px",
                padding: "10px 12px",
                background: "#fcf9f4",
                borderRadius: "12px",
                border: "1px solid #efe4d5",
                position: "relative",
                boxShadow: "0 2px 6px rgba(43, 23, 13, 0.02)",
                boxSizing: "border-box",
                width: "100%"
              }}
            >
              {/* Product Image */}
              <div 
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#efe4d3",
                  flexShrink: 0,
                  border: "1px solid #e2d2c1"
                }}
              >
                <img 
                  src={itemImg} 
                  alt={p.name} 
                  loading="lazy"
                  decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                />
              </div>

              {/* Product Info */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d", lineHeight: "1.3", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {p.name}
                  </div>

                  {/* Price and MRP */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                    <b style={{ fontSize: "14.5px", color: "#2b170d", fontWeight: "800" }}>{money(sellingPrice)}</b>
                    {hasDiscount && (
                      <>
                        <del style={{ fontSize: "11.5px", color: "#8c796d" }}>{money(mrpPrice)}</del>
                        <span 
                          style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            color: "#166534",
                            background: "#e5f6ea",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            border: "1px solid #c4e9cf"
                          }}
                        >
                          {discountPercent}% OFF
                        </span>
                      </>
                    )}
                  </div>

                  {/* Savings tag */}
                  {unitSavings > 0 && (
                    <div style={{ fontSize: "10.5px", color: "#166534", fontWeight: "600", marginBottom: "4px" }}>
                      ✓ Save {money(unitSavings * line.qty)}
                    </div>
                  )}
                </div>

                {/* Quantity Controls & Line Total */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                  <div 
                    style={{
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid #d4c5b9",
                      borderRadius: "6px",
                      background: "#ffffff",
                      height: "26px"
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => onUpdateQty && onUpdateQty(line.id, Math.max(1, line.qty - 1))}
                      style={{
                        background: "none",
                        border: "none",
                        width: "24px",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#4a3528"
                      }}
                    >
                      <Minus size={11} />
                    </button>
                    <span style={{ fontSize: "12px", fontWeight: "700", padding: "0 6px", color: "#2b170d", minWidth: "16px", textAlign: "center" }}>
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => onUpdateQty && onUpdateQty(line.id, line.qty + 1)}
                      style={{
                        background: "none",
                        border: "none",
                        width: "24px",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#4a3528"
                      }}
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#2b170d" }}>
                      {money(lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
