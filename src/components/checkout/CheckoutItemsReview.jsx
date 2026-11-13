import { getProductPrimaryImage } from "../../lib/imageUtils";
import { getProductRoute } from "../../lib/routes";
import { resolveCartProduct } from "../../lib/productResolver";
import React from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Plus, Minus, Trash2, ShieldCheck, Edit3 } from "lucide-react";
import { money } from "../../data";
import { buildCustomMalaDisplay } from "../../../shared/customMalaCatalog";

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
          const p = resolveCartProduct(products, line);
          if (!p) return null;

          const itemImg = getProductPrimaryImage(p);
          const sellingPrice = Number(p.price) || 0;
          const mrpPrice = Number(p.mrp || p.comparePrice || 0);
          const hasDiscount = mrpPrice > sellingPrice;
          const discountPercent = hasDiscount ? Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100) : 0;
          const unitSavings = hasDiscount ? (mrpPrice - sellingPrice) : 0;
          const lineTotal = sellingPrice * line.qty;

          const malaDisplay = p.isCustomMala ? buildCustomMalaDisplay(p, products) : null;

          return (
            <div 
              key={line.id}
              id={`checkout-item-${line.id}`}
              style={{
                display: "flex",
                gap: "10px",
                padding: "10px 12px",
                background: p.isCustomMala ? "#fffaf2" : "#fcf9f4",
                borderRadius: "12px",
                border: p.isCustomMala ? "1.5px solid #dcb98a" : "1px solid #efe4d5",
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
                  onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/placeholder.svg"; }}
                />
              </div>

              {/* Product Info */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  {p.isCustomMala && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#78270b",
                        color: "#fffaf3",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        padding: "2px 7px",
                        borderRadius: "4px",
                        marginBottom: "4px"
                      }}
                    >
                      <span>Mala Customize</span>
                      {malaDisplay?.totalBeads > 0 && <span>· {malaDisplay.totalBeads} Beads</span>}
                    </div>
                  )}
                  <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d", lineHeight: "1.3", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {p.name}
                  </div>
                  {p.isCustomMala && (
                    malaDisplay?.beadsList && malaDisplay.beadsList.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "6px", background: "#ffffff", border: "1px solid #ecdcc8", borderRadius: "6px", padding: "5px 7px" }}>
                        {malaDisplay.beadsList.map((bead, bIdx) => (
                          <div key={`${bead.productId || bead.id || bIdx}-${bIdx}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", fontSize: "11px", color: "#3b2316" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {bead.img && !String(bead.img).includes("placeholder.svg") && (
                                <img src={bead.img} alt={bead.name} style={{ width: "18px", height: "18px", borderRadius: "3px", objectFit: "cover", flexShrink: 0 }} />
                              )}
                              <strong style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{bead.name}</strong>
                              <span style={{ color: "#806f62", flexShrink: 0 }}>× {bead.qty} pcs</span>
                            </span>
                            {(bead.lineTotal > 0 || bead.unitPrice > 0) && (
                              <span style={{ fontWeight: 700, color: "#78270b", flexShrink: 0 }}>
                                {money(Number(bead.lineTotal) || Number(bead.unitPrice) * (Number(bead.qty) || 1))}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      p.customDescription && (
                        <div style={{ fontSize: "11px", color: "#6b5546", lineHeight: "1.35", marginBottom: "4px" }}>
                          {p.customDescription}
                        </div>
                      )
                    )
                  )}

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


                </div>

                {/* Quantity & Line Total */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                  <div style={{ fontSize: "12.5px", color: "#736257", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>Qty:</span>
                    <span style={{ color: "#2b170d", fontWeight: "700" }}>{line.qty}</span>
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
