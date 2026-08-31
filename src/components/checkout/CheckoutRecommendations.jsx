import React from "react";
import { Sparkles, Plus, Star } from "lucide-react";
import { money } from "../../data";
import { emitToast } from "../../context/ToastContext";

export function CheckoutRecommendations({ products, cartIds, onAddToCart }) {
  // Filter out products already in cart and select up to 3 relevant items
  const candidates = products.filter(p => !cartIds.includes(String(p.id)) && p.status === "Active");
  const recommended = candidates.slice(0, 3);

  if (recommended.length === 0) return null;

  return (
    <div 
      id="checkout-recommendations"
      style={{
        background: "#fffdf9",
        border: "1px solid #e8dac9",
        borderRadius: "14px",
        padding: "16px",
        marginBottom: "16px",
        boxShadow: "0 2px 10px rgba(43, 23, 13, 0.03)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
        <Sparkles size={15} color="#b85d25" />
        <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "17px", fontWeight: "700", margin: 0, color: "#2b170d" }}>
          Frequently Bought Together
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {recommended.map((item) => {
          const itemImg = item.img || (item.images && item.images[0]) || "/images/product-5mukhi.jpg";
          const sellingPrice = Number(item.price) || 0;
          const mrpPrice = Number(item.mrp || item.comparePrice || 0);
          const hasDiscount = mrpPrice > sellingPrice;
          const discountPercent = hasDiscount ? Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100) : 0;

          return (
            <div 
              key={item.id}
              id={`recommendation-item-${item.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                background: "#fdfbf7",
                borderRadius: "8px",
                border: "1px solid #f0e6da"
              }}
            >
              <img 
                src={itemImg} 
                alt={item.name}
                style={{ width: "46px", height: "46px", borderRadius: "6px", objectFit: "cover", flexShrink: 0, border: "1px solid #e8dac9" }}
                onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#2b170d", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {item.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                  <b style={{ fontSize: "12.5px", color: "#2b170d" }}>{money(sellingPrice)}</b>
                  {hasDiscount && (
                    <>
                      <del style={{ fontSize: "10.5px", color: "#8c796d" }}>{money(mrpPrice)}</del>
                      <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#166534", background: "#e5f6ea", padding: "1px 4px", borderRadius: "3px" }}>
                        {discountPercent}% OFF
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                id={`btn-add-rec-${item.id}`}
                onClick={() => {
                  onAddToCart(item.id);
                  emitToast(`Added '${item.name}' to order!`, "success");
                }}
                style={{
                  background: "#f7eee3",
                  border: "1px solid #b85d25",
                  color: "#b85d25",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                  transition: "all 0.2s"
                }}
              >
                <Plus size={13} /> Add
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
