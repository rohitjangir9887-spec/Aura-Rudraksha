import React from "react";
import { Link } from "react-router-dom";
import { Trash2, Heart, ShieldCheck, Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { money } from "../../data";

export function CartItemCard({
  id,
  product,
  qty = 1,
  onUpdateQty,
  onRequestDelete,
  onToggleWishlist,
  isWishlisted = false,
  index = 0
}) {
  if (!product) return null;

  const stockLimit = product.stock !== undefined ? Number(product.stock) : (product.status === "Out of Stock" ? 0 : 99);
  const hasDiscount = product.mrp > product.price;
  const discountAmount = hasDiscount ? product.mrp - product.price : 0;
  const discountPercent = hasDiscount ? Math.round((discountAmount / product.mrp) * 100) : 0;
  const itemTotal = (product.price || 0) * qty;

  const imageSrc = product.img || (product.images && product.images[0]) || "/images/product-5mukhi.jpg";

  return (
    <motion.div
      id={`cart-item-card-${id}`}
      className="cart-item-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.2 }}
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "14px",
        padding: "14px 12px",
        display: "flex",
        gap: "12px",
        boxShadow: "0 2px 10px rgba(43,23,13,0.03)",
        alignItems: "flex-start",
        position: "relative",
        boxSizing: "border-box",
        width: "100%"
      }}
    >
      {/* Product Image Link */}
      <Link
        to={`/product/${product.id || product._id || product.productId}`}
        style={{
          width: "82px",
          height: "82px",
          minWidth: "82px",
          borderRadius: "10px",
          overflow: "hidden",
          background: "#faf6f0",
          border: "1px solid #ebdccb",
          flexShrink: 0,
          display: "block",
          position: "relative"
        }}
      >
        <img
          src={imageSrc}
          alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
          onError={(e) => {
            if (!e.target.src.includes("product-5mukhi.jpg")) {
              e.target.src = "/images/product-5mukhi.jpg";
            }
          }}
        />
      </Link>

      {/* Product Content Details */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        {/* Title and Delete Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
          <Link
            to={`/product/${product.id || product._id || product.productId}`}
            style={{ textDecoration: "none", color: "#2b170d", flex: 1 }}
          >
            <h3
              style={{
                fontSize: "14.5px",
                fontWeight: "700",
                margin: 0,
                lineHeight: "1.3",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden"
              }}
            >
              {product.name}
            </h3>
          </Link>

          <button
            type="button"
            onClick={() => onRequestDelete(id)}
            style={{
              background: "none",
              border: "none",
              color: "#9c8273",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              flexShrink: 0
            }}
            title="Remove from Cart"
            aria-label="Remove item"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Badges / Certification */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "10.5px",
              background: "#fdf5eb",
              color: "#9c5025",
              border: "1px solid #f2ddcc",
              padding: "1px 6px",
              borderRadius: "4px",
              fontWeight: "700"
            }}
          >
            {product.category || "Original Rudraksha"}
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "#166534",
              background: "#ecfdf5",
              border: "1px solid #bbf7d0",
              padding: "1px 5px",
              borderRadius: "4px",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px"
            }}
          >
            <ShieldCheck size={10} /> Lab-Certified
          </span>
        </div>

        {/* Price & Savings */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap", margin: "2px 0" }}>
          <span style={{ fontSize: "16px", fontWeight: "800", color: "#2b170d" }}>
            {money(product.price)}
          </span>
          {hasDiscount && (
            <>
              <del style={{ fontSize: "12px", color: "#8a7566" }}>{money(product.mrp)}</del>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: "700",
                  color: "#166534",
                  background: "#dcfce7",
                  padding: "1px 5px",
                  borderRadius: "4px"
                }}
              >
                {discountPercent}% OFF
              </span>
            </>
          )}
        </div>

        {/* Quantity Controls and Wishlist Action Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "2px",
            paddingTop: "6px",
            borderTop: "1px dashed #f0e6da"
          }}
        >
          {/* Stepper Quantity */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid #ebdccb",
              borderRadius: "7px",
              background: "#faf6f0",
              overflow: "hidden",
              height: "28px"
            }}
          >
            <button
              type="button"
              onClick={() => onUpdateQty(id, Math.max(1, qty - 1))}
              disabled={qty <= 1}
              style={{
                border: "none",
                background: "none",
                width: "28px",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: qty <= 1 ? "not-allowed" : "pointer",
                color: qty <= 1 ? "#c4b5a5" : "#2b170d",
                padding: 0
              }}
              aria-label="Decrease quantity"
            >
              <Minus size={13} strokeWidth={2.5} />
            </button>
            <span
              style={{
                padding: "0 8px",
                fontSize: "13px",
                fontWeight: "700",
                color: "#2b170d",
                minWidth: "16px",
                textAlign: "center"
              }}
            >
              {qty}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQty(id, qty + 1)}
              disabled={qty >= stockLimit}
              style={{
                border: "none",
                background: "none",
                width: "28px",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: qty >= stockLimit ? "not-allowed" : "pointer",
                color: qty >= stockLimit ? "#c4b5a5" : "#2b170d",
                padding: 0
              }}
              aria-label="Increase quantity"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Move to Wishlist */}
          <button
            type="button"
            onClick={() => onToggleWishlist(product.id || product._id, product.name)}
            style={{
              background: "none",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              color: isWishlisted ? "#b88a58" : "#7a675a",
              fontSize: "11.5px",
              fontWeight: "600",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: "6px"
            }}
          >
            <Heart size={13} fill={isWishlisted ? "#b88a58" : "none"} strokeWidth={2} />
            <span>{isWishlisted ? "Wishlisted" : "Save for later"}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
