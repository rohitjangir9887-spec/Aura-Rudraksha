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
        background: "#fffdf9",
        border: "1px solid #e8dac9",
        borderRadius: "16px",
        padding: "22px 18px",
        marginBottom: "18px",
        boxShadow: "0 4px 16px rgba(43, 23, 13, 0.04)"
      }}
    >
      {/* Header */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid #f0e6da"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div 
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "#b85d25",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: "700",
              flexShrink: 0
            }}
          >
            2
          </div>
          <div>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "22px", fontWeight: "700", margin: 0, color: "#2b170d", letterSpacing: "0.2px" }}>
              Review Your Items ({totalItemCount} {totalItemCount === 1 ? "Item" : "Items"})
            </h2>
            <div style={{ fontSize: "12px", color: "#806f62", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
              <ShieldCheck size={13} color="#20a95a" />
              <span>100% Original & Lab-Certified Sacred Rudraksha</span>
            </div>
          </div>
        </div>

        <Link 
          to="/cart"
          id="btn-edit-cart"
          style={{
            fontSize: "12px",
            color: "#b85d25",
            fontWeight: "700",
            textDecoration: "none",
            background: "#fbf3ea",
            padding: "6px 12px",
            borderRadius: "8px",
            border: "1px solid #e8dac9",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.2s"
          }}
        >
          <Edit3 size={13} />
          <span>Edit Cart</span>
        </Link>
      </div>

      {/* Item List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
                gap: "14px",
                padding: "14px",
                background: "#fcf9f4",
                borderRadius: "12px",
                border: "1px solid #efe4d5",
                position: "relative",
                boxShadow: "0 2px 6px rgba(43, 23, 13, 0.02)"
              }}
            >
              {/* Product Image */}
              <div 
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  background: "#efe4d3",
                  flexShrink: 0,
                  border: "1px solid #e2d2c1",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
                }}
              >
                <img 
                  src={itemImg} 
                  alt={p.name} 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.target.src = "/images/product-5mukhi.jpg"; }}
                />
              </div>

              {/* Product Info */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d", lineHeight: "1.35", marginBottom: "4px" }}>
                    {p.name}
                  </div>

                  {/* Price and MRP */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <b style={{ fontSize: "16px", color: "#2b170d", fontWeight: "800" }}>{money(sellingPrice)}</b>
                    {hasDiscount && (
                      <>
                        <del style={{ fontSize: "12.5px", color: "#8c796d" }}>{money(mrpPrice)}</del>
                        <span 
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#166534",
                            background: "#e5f6ea",
                            padding: "2px 7px",
                            borderRadius: "5px",
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
                    <div style={{ fontSize: "11.5px", color: "#166534", fontWeight: "600", marginBottom: "8px" }}>
                      ✓ You save {money(unitSavings * line.qty)} on this item
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
                      borderRadius: "8px",
                      background: "#ffffff",
                      height: "30px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => onUpdateQty && onUpdateQty(line.id, Math.max(1, line.qty - 1))}
                      style={{
                        background: "none",
                        border: "none",
                        width: "28px",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#4a3528"
                      }}
                    >
                      <Minus size={13} />
                    </button>
                    <span style={{ fontSize: "13px", fontWeight: "700", padding: "0 8px", color: "#2b170d", minWidth: "18px", textAlign: "center" }}>
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => onUpdateQty && onUpdateQty(line.id, line.qty + 1)}
                      style={{
                        background: "none",
                        border: "none",
                        width: "28px",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#4a3528"
                      }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "11px", color: "#806f62", display: "block" }}>Subtotal</span>
                    <span style={{ fontSize: "15px", fontWeight: "800", color: "#2b170d" }}>
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
