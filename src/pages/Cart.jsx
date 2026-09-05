import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { money } from "../data";
import { db, onStoreUpdate } from "../lib/db";
import { ConfirmModal } from "../components/ConfirmModal";
import { emitToast } from "../context/ToastContext";
import { 
  ChevronLeft, 
  ShieldCheck, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { OrderSummaryCard } from "../components/checkout/OrderSummaryCard";
import { CartItemCard } from "../components/cart/CartItemCard";
import { CartFreeShippingMeter } from "../components/cart/CartFreeShippingMeter";
import { CartRecommendations } from "../components/cart/CartRecommendations";
import { CartTrustBanner } from "../components/cart/CartTrustBanner";
import { CartStickyBottomBar } from "../components/cart/CartStickyBottomBar";
import { CartEmptyState } from "../components/cart/CartEmptyState";

export function Cart() {
  const [products, setProducts] = useState([]);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccessMsg, setCouponSuccessMsg] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);

  const loadProducts = () => {
    setProducts(db.getProducts());
    setAvailableCoupons(db.getCoupons().filter(c => c.status === "Active"));
  };

  useEffect(() => {
    loadProducts();
    const unsub = onStoreUpdate(() => loadProducts());
    return () => unsub();
  }, []);

  const { 
    cart, 
    lines, 
    remove, 
    setQty, 
    add, 
    couponCode, 
    appliedCoupon, 
    couponStatus,
    totals, 
    subtotal, 
    totalMrp, 
    productSavings, 
    couponDiscount, 
    shipping: shippingCost, 
    isFreeShipping,
    freeShippingThreshold,
    finalTotal, 
    totalSavings, 
    applyCoupon, 
    removeCoupon 
  } = useCart();

  const { isWishlisted, toggleWishlist } = useWishlist();
  const navigate = useNavigate();

  const items = lines.reduce((acc, line) => {
    acc[line.id] = (acc[line.id] || 0) + line.qty;
    return acc;
  }, {});
  
  const cartItemCount = lines.reduce((n, l) => n + l.qty, 0);

  const confirmRemove = () => {
    if (!deleteTargetId) return;
    const p = products.find(x => String(x.id) === String(deleteTargetId));
    remove(deleteTargetId);
    emitToast(`${p?.name || "Item"} removed from cart`, "info");
    setDeleteTargetId(null);
  };

  const handleApplyCoupon = async (e, codeOverride) => {
    if (e) e.preventDefault();
    const code = codeOverride || couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError("Please enter a coupon code");
      return;
    }
    
    const result = await applyCoupon(code);
    if (result.valid) {
      setCouponError("");
      setCouponInput("");
      setCouponSuccessMsg(result.message || `Coupon '${code}' applied!`);
      emitToast(result.message || `Coupon '${code}' applied!`, "success");
    } else {
      setCouponSuccessMsg("");
      setCouponError(result.message || `Coupon '${code}' is invalid or expired.`);
      if (result.status === "EXPIRED") {
        emitToast(result.message || `Coupon '${code}' is expired.`, "error");
      } else if (result.status === "NOT_ELIGIBLE") {
        emitToast(result.message || `Cart not eligible for coupon '${code}'.`, "warning");
      } else {
        emitToast(result.message || `Coupon '${code}' is invalid.`, "error");
      }
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponError("");
    setCouponSuccessMsg("");
    emitToast("Coupon removed", "info");
  };

  const handleCheckout = () => {
    navigate("/checkout");
  };
  
  const recommendedProducts = products
    .filter(p => !Object.keys(items).includes(String(p.id)) && p.status !== "Out of Stock")
    .slice(0, 6);

  const isEmpty = !cart.length || subtotal === 0;

  return (
    <Shell>
      <main
        id="aura-cart-page"
        className="page cart-page"
        style={{
          padding: "16px 14px 100px",
          maxWidth: "1160px",
          margin: "0 auto",
          boxSizing: "border-box",
          minHeight: "80vh"
        }}
      >
        {/* Top Header & Breadcrumb Navigation */}
        <motion.div 
          className="cart-header-actions"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "14px",
            flexWrap: "wrap",
            gap: "8px"
          }}
        >
          <button 
            type="button"
            className="back-btn" 
            onClick={() => navigate('/shop')}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              border: "1px solid #ebd9c8",
              padding: "7px 12px",
              borderRadius: "10px",
              color: "#4a3223",
              fontSize: "12.5px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.02)"
            }}
          >
            <ChevronLeft size={16} /> Continue Shopping
          </button>
          
          <div 
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "#eef9f2",
              border: "1px solid #c9ebd4",
              color: "#166534",
              padding: "5px 10px",
              borderRadius: "20px",
              fontSize: "11.5px",
              fontWeight: "700"
            }}
          >
            <ShieldCheck size={14} /> 100% Original & Lab-Certified
          </div>
        </motion.div>

        {/* Page Title with Item Count */}
        <div style={{ marginBottom: "14px" }}>
          <h1
            style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: "28px",
              fontWeight: "700",
              color: "#2b170d",
              margin: 0,
              lineHeight: "1.2"
            }}
          >
            Shopping Bag{" "}
            {!isEmpty && (
              <span style={{ fontSize: "16px", color: "#8c5332", fontWeight: "600" }}>
                ({cartItemCount} {cartItemCount === 1 ? "item" : "items"})
              </span>
            )}
          </h1>
        </div>

        {isEmpty ? (
          <CartEmptyState />
        ) : (
          <div
            id="cart-main-responsive-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 540px), 1fr))",
              gap: "20px",
              alignItems: "start",
              width: "100%",
              boxSizing: "border-box"
            }}
          >
            {/* Left Column: Free Shipping Progress + Cart Items + Recommendations + Trust */}
            <div
              className="cart-left-column"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                minWidth: 0,
                width: "100%",
                boxSizing: "border-box"
              }}
            >
              {/* 1. Free Shipping Milestone Meter */}
              <CartFreeShippingMeter
                subtotal={subtotal}
                freeShippingThreshold={freeShippingThreshold}
                isFreeShipping={isFreeShipping}
              />

              {/* 2. Items List */}
              <div
                id="cart-items-collection"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  width: "100%"
                }}
              >
                {Object.entries(items).map(([id, qty], index) => {
                  const p = products.find((x) => String(x.id) === String(id));
                  if (!p) return null;

                  return (
                    <CartItemCard
                      key={id}
                      id={id}
                      product={p}
                      qty={qty}
                      index={index}
                      onUpdateQty={setQty}
                      onRequestDelete={(targetId) => setDeleteTargetId(targetId)}
                      onToggleWishlist={toggleWishlist}
                      isWishlisted={isWishlisted(p.id || p._id)}
                    />
                  );
                })}
              </div>

              {/* 3. Temple Consecration & Lab Guarantee Trust Banner */}
              <CartTrustBanner />

              {/* 4. Frequently Bought Together / Recommended Products */}
              {recommendedProducts.length > 0 && (
                <CartRecommendations
                  products={recommendedProducts}
                  onAddToCart={(p) => {
                    add(p.id, 1);
                    emitToast(`${p.name} added to cart`, "success");
                  }}
                  title="Frequently Bought Together"
                />
              )}
            </div>

            {/* Right Column: Order Summary & Instant Checkout CTA (Sticky on Desktop) */}
            <div
              className="cart-right-column"
              style={{
                minWidth: 0,
                width: "100%",
                boxSizing: "border-box",
                position: "sticky",
                top: "84px"
              }}
            >
              <OrderSummaryCard
                lines={lines}
                products={products}
                cartItemCount={cartItemCount}
                subtotal={subtotal}
                totalMrp={totalMrp}
                productSavings={productSavings}
                appliedCoupon={appliedCoupon}
                couponDiscount={couponDiscount}
                availableCoupons={availableCoupons}
                onApplyCoupon={(code) => handleApplyCoupon(null, code)}
                onRemoveCoupon={handleRemoveCoupon}
                couponError={couponError}
                couponSuccessMsg={couponSuccessMsg}
                shippingFee={shippingCost}
                finalTotal={finalTotal}
                onCheckout={handleCheckout}
                ctaText="Proceed to Checkout"
                isCheckoutPage={false}
              />
            </div>
          </div>
        )}

        {/* Mobile Floating Sticky Checkout Bar */}
        {!isEmpty && (
          <CartStickyBottomBar
            finalTotal={finalTotal}
            totalSavings={totalSavings}
            onCheckout={handleCheckout}
            itemCount={cartItemCount}
          />
        )}

        {/* Confirm Remove Item Modal */}
        <ConfirmModal
          isOpen={!!deleteTargetId}
          title="Remove Sacred Item"
          message="Are you sure you want to remove this item from your shopping bag?"
          confirmText="Remove"
          onConfirm={confirmRemove}
          onClose={() => setDeleteTargetId(null)}
        />
      </main>
    </Shell>
  );
}
