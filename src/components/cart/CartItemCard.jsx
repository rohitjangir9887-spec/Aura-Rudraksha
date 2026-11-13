import { getProductRoute } from "../../lib/routes";
import { getProductPrimaryImage } from "../../lib/imageUtils";
import React from "react";
import { Link } from "react-router-dom";
import { Trash2, Heart, ShieldCheck, Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { money } from "../../data";
import { db } from "../../lib/db";
import { buildCustomMalaDisplay } from "../../../shared/customMalaCatalog";

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

  const imageSrc = getProductPrimaryImage(product);
  const itemHref = product.isCustomMala ? "/#customize-your-mala-section" : getProductRoute(product);
  const malaDisplay = product.isCustomMala
    ? buildCustomMalaDisplay(product, db && typeof db.getProducts === "function" ? db.getProducts() : null)
    : null;

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
        to={itemHref}
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
          position: "relative",
          boxSizing: "border-box"
        }}
      >
        <img
          src={imageSrc}
          alt={product.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: imageSrc?.includes("placeholder.svg") ? "contain" : "cover",
            padding: imageSrc?.includes("placeholder.svg") ? "8px" : "0",
            display: "block"
          }}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            if (!e.target.src.includes("placeholder.svg")) {
              e.target.src = "/images/placeholder.svg";
            }
          }}
        />
      </Link>

      {/* Product Content Details */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        {product.isCustomMala && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              background: "linear-gradient(90deg, #78270b 0%, #a54d2b 100%)",
              color: "#fffaf3",
              padding: "4px 9px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase"
            }}
          >
            <span>Mala Customize · Hand-Strung</span>
            {malaDisplay?.totalBeads > 0 && (
              <span style={{ opacity: 0.95 }}>
                {malaDisplay.beadsList.length > 0 ? `${malaDisplay.beadsList.length} Items · ` : ""}
                {malaDisplay.totalBeads} Beads
              </span>
            )}
          </div>
        )}
        {/* Title and Delete Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
          <Link
            to={itemHref}
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "11px", color: "#6b5546" }}>
          <span style={{ fontWeight: 700, color: product.isIndonesian ? "#1e40af" : "#78270b" }}>
            {product.isCustomMala
              ? "Hand-Strung Custom Mala"
              : product.isIndonesian || String(id).endsWith("-indo")
              ? "Indonesian Origin"
              : "Nepal Origin"}
          </span>
          <span aria-hidden="true">·</span>
          <span>{product.category || "Original Rudraksha"}</span>
          <span aria-hidden="true">·</span>
          <span style={{ color: "#166534", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "2px" }}>
            <ShieldCheck size={11} /> Lab-Certified
          </span>
        </div>

        {product.isCustomMala && (
          <div style={{ background: "#fbf6ef", border: "1px solid #ead8c2", borderRadius: "8px", padding: "7px 8px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#78270b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "5px" }}>
              Selected Rudraksha in This Mala ({malaDisplay?.beadsList?.length || 0}):
            </div>
            {malaDisplay?.beadsList && malaDisplay.beadsList.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {malaDisplay.beadsList.map((bead, bIdx) => {
                  const beadImg = bead.img && !String(bead.img).includes("placeholder.svg") ? bead.img : "/images/placeholder.svg";
                  const beadPrice = Number(bead.lineTotal) || Number(bead.unitPrice || 0) * (Number(bead.qty) || 1);
                  return (
                    <div
                      key={`${bead.productId || bead.id || bIdx}-${bIdx}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "#ffffff",
                        border: "1px solid #efe2d1",
                        borderRadius: "6px",
                        padding: "4px 7px"
                      }}
                    >
                      <img
                        src={beadImg}
                        alt={bead.name}
                        loading="lazy"
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "5px",
                          objectFit: beadImg.includes("placeholder.svg") ? "contain" : "cover",
                          background: "#faf4ec",
                          border: "1px solid #ebd9c4",
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {bead.name}
                        </div>
                        <div style={{ fontSize: "10.5px", color: "#7a5e4d", fontWeight: 600 }}>
                          {bead.qty} pcs{bead.unitPrice > 0 ? ` × ${money(bead.unitPrice)}` : ""}
                        </div>
                      </div>
                      {beadPrice > 0 && (
                        <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#78270b", flexShrink: 0 }}>
                          {money(beadPrice)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              product.customDescription && (
                <div style={{ fontSize: "11.5px", color: "#5c483b", lineHeight: "1.4" }}>
                  {product.customDescription}
                </div>
              )
            )}
          </div>
        )}

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

          {/* Move to Wishlist (standard catalog items) */}
          {!product.isCustomMala && (
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
          )}
        </div>
      </div>
    </motion.div>
  );
}
