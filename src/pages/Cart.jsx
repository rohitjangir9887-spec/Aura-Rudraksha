import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { money, pct } from "../data";
import { db, onStoreUpdate } from "../lib/db";
import { ConfirmModal } from "../components/ConfirmModal";
import { emitToast } from "../context/ToastContext";
import { 
  Trash2, 
  ShoppingBag, 
  ChevronLeft, 
  Heart, 
  ShieldCheck, 
  Tag, 
  X, 
  AlertCircle,
  Truck,
  Sparkles,
  Lock,
  ArrowRight,
  CheckCircle2,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { OrderSummaryCard } from "../components/checkout/OrderSummaryCard";
import { SecurePaymentGuarantee } from "../components/checkout/SecurePaymentGuarantee";

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
    .sort(() => 0.5 - Math.random())
    .slice(0, 4);

  return (
    <Shell>
      <main className="page cart-page" style={{ paddingBottom: "120px", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Top Header & Breadcrumb Navigation */}
        <motion.div 
          className="cart-header-actions"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <button 
            className="back-btn" 
            onClick={() => navigate('/shop')}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              border: "1px solid #e5d8cc",
              padding: "8px 14px",
              borderRadius: "10px",
              color: "#4a3223",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            <ChevronLeft size={18} /> Continue Shopping
          </button>
          
          <div 
            className="secure-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#eef9f2",
              border: "1px solid #c9ebd4",
              color: "#166534",
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700"
            }}
          >
            <ShieldCheck size={16} /> 100% Secure & Blessed Vedic Store
          </div>
        </motion.div>

        {/* Stepper Progress Indicator */}
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "24px",
            padding: "10px 16px",
            background: "#ffffff",
            border: "1px solid #f0e6da",
            borderRadius: "14px",
            boxShadow: "0 2px 8px rgba(43,23,13,0.03)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#b88a58", fontWeight: "800", fontSize: "13px" }}>
            <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#b88a58", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>1</span>
            <span>Shopping Cart</span>
          </div>
          <div style={{ width: "24px", height: "1px", background: "#e8dac9" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8a7566", fontWeight: "600", fontSize: "13px" }}>
            <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#f0e6da", color: "#6b584c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>2</span>
            <span>Delivery Address</span>
          </div>
          <div style={{ width: "24px", height: "1px", background: "#e8dac9" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8a7566", fontWeight: "600", fontSize: "13px" }}>
            <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#f0e6da", color: "#6b584c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>3</span>
            <span>Payment</span>
          </div>
        </div>

        <motion.div className="cart-title-section" initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.1}} style={{ marginBottom: "18px" }}>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", fontWeight: "700", color: "#2b170d", margin: 0 }}>
            Your Shopping Bag <span style={{ fontSize: "20px", color: "#8c5332", fontWeight: "600" }}>({cartItemCount} {cartItemCount === 1 ? 'Item' : 'Items'})</span>
          </h1>
        </motion.div>

        {(!cart.length || subtotal === 0) ? (
          <motion.div 
            className="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: "#fffdf9",
              border: "1px solid #ebdccb",
              borderRadius: "16px",
              padding: "60px 20px",
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(43,23,13,0.04)"
            }}
          >
            <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "#fdf5eb", color: "#b88a58", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <ShoppingBag size={36} strokeWidth={1.8} />
            </div>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "28px", color: "#2b170d", margin: "0 0 8px" }}>Your Sacred Cart is Empty</h2>
            <p style={{ color: "#7a675a", fontSize: "14px", maxWidth: "400px", margin: "0 auto 24px" }}>
              Explore our laboratory-certified Nepali Rudraksha beads and sacred spiritual malas.
            </p>
            <Link 
              to="/shop" 
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #b88a58 0%, #a07343 100%)",
                color: "#ffffff",
                padding: "13px 26px",
                borderRadius: "12px",
                fontWeight: "700",
                fontSize: "15px",
                boxShadow: "0 4px 14px rgba(184,138,88,0.3)"
              }}
            >
              Explore Rudraksha Collection <ArrowRight size={18} />
            </Link>
          </motion.div>
        ) : (
          <div className="cart-layout-premium" style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr", gap: "24px", alignItems: "start" }}>
            
            {/* Left Column: Cart Items & Promotions */}
            <div className="cart-left-col">
              
              {/* Free Shipping Milestone Meter */}
              {subtotal > 0 && (
                <motion.div 
                  className="smart-offer-banner"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: isFreeShipping ? "#ecfdf5" : "#fffdf8",
                    border: isFreeShipping ? "1.5px solid #a7f3d0" : "1.5px solid #f3decb",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    marginBottom: "16px",
                    boxShadow: "0 2px 10px rgba(43,23,13,0.03)"
                  }}
                >
                  {isFreeShipping ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#166534" }}>
                      <span style={{ fontSize: "22px" }}>🎉</span>
                      <div>
                        <strong style={{ fontSize: "13.5px", letterSpacing: "0.2px", display: "block" }}>FREE EXPRESS SHIPPING UNLOCKED!</strong>
                        <span style={{ fontSize: "12px", color: "#15803d" }}>Congratulations! Your sacred order qualifies for fast free doorstep delivery.</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
                          Add <span style={{ color: "#b88a58" }}>{money((freeShippingThreshold || 0) - subtotal)}</span> more for <strong style={{ color: "#166534" }}>FREE SHIPPING</strong>
                        </span>
                        <Truck size={16} color="#b88a58" />
                      </div>
                      <div style={{ height: "7px", background: "#f0e4d7", borderRadius: "99px", overflow: "hidden" }}>
                        <div 
                          style={{ 
                            height: "100%", 
                            width: `${Math.min(100, (subtotal / (freeShippingThreshold || 1)) * 100)}%`,
                            background: "linear-gradient(90deg, #b88a58 0%, #16a34a 100%)",
                            borderRadius: "99px",
                            transition: "width 0.4s ease"
                          }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Items List */}
              <motion.div className="cart-items-list" initial={{opacity: 0, y: 15}} animate={{opacity: 1, y: 0}} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {Object.entries(items).map(([id, qty], index) => {
                  const p = products.find(x => String(x.id) === String(id));
                  if (!p) return null;
                  const stockLimit = p.stock !== undefined ? Number(p.stock) : (p.status === "Out of Stock" ? 0 : 99);
                  
                  const hasDiscount = p.mrp > p.price;
                  const discountAmount = hasDiscount ? p.mrp - p.price : 0;
                  const discountPercent = hasDiscount ? Math.round((discountAmount / p.mrp) * 100) : 0;

                  return (
                    <motion.div 
                      key={id}
                      initial={{opacity: 0, y: 10}} 
                      animate={{opacity: 1, y: 0}} 
                      transition={{delay: 0.1 + (index * 0.05)}}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #ebdccb",
                        borderRadius: "14px",
                        padding: "16px",
                        display: "flex",
                        gap: "16px",
                        boxShadow: "0 2px 10px rgba(43,23,13,0.03)",
                        alignItems: "flex-start",
                        position: "relative"
                      }}
                    >
                      {/* Product Image */}
                      <Link 
                        to={`/product/${p.id || p._id || p.productId}`} 
                        style={{
                          width: "96px",
                          height: "96px",
                          borderRadius: "12px",
                          overflow: "hidden",
                          background: "#f9f4ec",
                          border: "1px solid #f0e6da",
                          flexShrink: 0,
                          display: "block"
                        }}
                      >
                        <img 
                          src={p.img || (p.images && p.images[0]) || "/images/product-5mukhi.jpg"} 
                          alt={p.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          loading="lazy"
                          onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                        />
                      </Link>

                      {/* Product Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                          <Link to={`/product/${p.id || p._id || p.productId}`} style={{ textDecoration: 'none', color: '#2b170d' }}>
                            <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 4px", lineHeight: "1.3" }}>
                              {p.name}
                            </h3>
                          </Link>
                          <button 
                            type="button"
                            onClick={() => setDeleteTargetId(id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#a38d7f",
                              cursor: "pointer",
                              padding: "4px",
                              display: "flex",
                              alignItems: "center"
                            }}
                            title="Remove from Cart"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Category and Consecration Tag */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", background: "#fdf5eb", color: "#a5582f", border: "1px solid #f2ddcc", padding: "2px 7px", borderRadius: "6px", fontWeight: "700" }}>
                            {p.category || "Authentic Rudraksha"}
                          </span>
                          <span style={{ fontSize: "11px", color: "#166534", background: "#ecfdf5", border: "1px solid #bbf7d0", padding: "2px 7px", borderRadius: "6px", fontWeight: "600" }}>
                            ✓ Haridwar Blessed
                          </span>
                        </div>

                        {/* Pricing Line */}
                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "10px" }}>
                          <span style={{ fontSize: "18px", fontWeight: "800", color: "#2b170d" }}>
                            {money(p.price)}
                          </span>
                          {hasDiscount && (
                            <>
                              <del style={{ fontSize: "13px", color: "#8a7566" }}>{money(p.mrp)}</del>
                              <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534", background: "#dcfce7", padding: "1px 6px", borderRadius: "4px" }}>
                                {discountPercent}% OFF
                              </span>
                            </>
                          )}
                        </div>

                        {/* Quantity & Wishlist Action Bar */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                          <div 
                            style={{ 
                              display: "inline-flex", 
                              alignItems: "center", 
                              border: "1px solid #ebdccb", 
                              borderRadius: "8px", 
                              background: "#faf6f0",
                              overflow: "hidden"
                            }}
                          >
                            <button 
                              type="button" 
                              onClick={() => setQty(id, Math.max(1, qty - 1))}
                              disabled={qty <= 1}
                              style={{ border: "none", background: "none", padding: "6px 12px", cursor: qty <= 1 ? "not-allowed" : "pointer", fontWeight: "700", color: "#2b170d" }}
                            >−</button>
                            <span style={{ padding: "0 8px", fontSize: "14px", fontWeight: "700", color: "#2b170d" }}>{qty}</span>
                            <button 
                              type="button" 
                              onClick={() => {
                                if (qty >= stockLimit) {
                                  emitToast(`Maximum stock available: ${stockLimit}`, "warning");
                                  return;
                                }
                                setQty(id, qty + 1);
                              }}
                              disabled={qty >= stockLimit}
                              style={{ border: "none", background: "none", padding: "6px 12px", cursor: qty >= stockLimit ? "not-allowed" : "pointer", fontWeight: "700", color: "#2b170d" }}
                            >+</button>
                          </div>

                          <button 
                            type="button"
                            onClick={() => toggleWishlist(p.id, p.name)}
                            style={{
                              background: "none",
                              border: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              color: isWishlisted(p.id) ? "#b88a58" : "#806f62",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer"
                            }}
                          >
                            <Heart size={14} fill={isWishlisted(p.id) ? "#b88a58" : "none"} />
                            <span>{isWishlisted(p.id) ? "Saved in Wishlist" : "Move to Wishlist"}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Temple Consecration & Purity Assurance Box */}
              <div 
                style={{
                  marginTop: "20px",
                  background: "linear-gradient(135deg, #fffcf7 0%, #faf3eb 100%)",
                  border: "1.5px solid #ebdccb",
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px"
                }}
              >
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#f5e8d8", color: "#b88a58", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "20px" }}>
                  📿
                </div>
                <div>
                  <h4 style={{ margin: "0 0 3px", fontSize: "14px", fontWeight: "700", color: "#2b170d" }}>
                    Vedic Consecration (Prana Pratishtha) Included
                  </h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#7a675a", lineHeight: "1.4" }}>
                    Each bead is purified with holy Ganga Jal and energized with sacred Vedic mantras at Haridwar temple before safe dispatch.
                  </p>
                </div>
              </div>

              {/* Frequently Bought Together Carousel */}
              {recommendedProducts.length > 0 && (
                <div style={{ marginTop: "28px" }}>
                  <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "22px", fontWeight: "700", color: "#2b170d", margin: "0 0 14px" }}>
                    Frequently Bought Together
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                    {recommendedProducts.map((rp) => (
                      <div 
                        key={rp.id || rp._id}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #ebdccb",
                          borderRadius: "12px",
                          padding: "12px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between"
                        }}
                      >
                        <Link to={`/product/${rp.id || rp._id || rp.productId}`} style={{ textDecoration: "none", color: "inherit" }}>
                          <img 
                            src={rp.img || (rp.images && rp.images[0]) || "/images/product-5mukhi.jpg"} 
                            alt={rp.name}
                            style={{ width: "100%", height: "130px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }}
                            onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                          />
                          <h4 style={{ fontSize: "13.5px", fontWeight: "700", margin: "0 0 4px", color: "#2b170d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {rp.name}
                          </h4>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "10px" }}>
                            <span style={{ fontSize: "15px", fontWeight: "800", color: "#2b170d" }}>{money(rp.price)}</span>
                            {rp.mrp > rp.price && <del style={{ fontSize: "11px", color: "#8a7566" }}>{money(rp.mrp)}</del>}
                          </div>
                        </Link>
                        <button 
                          type="button"
                          onClick={() => {
                            add(rp.id, 1);
                            emitToast(`${rp.name} added to cart`, "success");
                          }}
                          style={{
                            background: "#fdf8f4",
                            border: "1px solid #b88a58",
                            color: "#8c5332",
                            padding: "7px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                            width: "100%"
                          }}
                        >
                          + Add to Cart
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
            
            {/* Right Column: Order Summary & Dual Action Buttons */}
            <div className="cart-right-col" style={{ position: "sticky", top: "85px" }}>
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

              {/* Secondary Instant Buy Button (Deep Rich Dark Chocolate matching screenshot #2) */}
              <button
                type="button"
                onClick={handleCheckout}
                style={{
                  width: "100%",
                  marginTop: "10px",
                  padding: "14px 20px",
                  background: "linear-gradient(135deg, #2e1d15 0%, #1f120c 100%)",
                  color: "#ffffff",
                  border: "1px solid #4a3224",
                  borderRadius: "14px",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(46,29,21,0.35)",
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
              >
                <span>Buy It Now</span>
                <ArrowRight size={17} strokeWidth={2.4} />
              </button>
            </div>

          </div>
        )}

        {/* Mobile Sticky Floating CTA Bar */}
        {cart.length > 0 && (
          <div 
            className="cart-mobile-sticky"
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "#ffffff",
              borderTop: "1.5px solid #ebdccb",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 1000,
              boxShadow: "0 -4px 20px rgba(43,23,13,0.08)"
            }}
          >
            <div>
              <span style={{ fontSize: "11px", color: "#8a7566", display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Amount</span>
              <span style={{ fontSize: "20px", fontWeight: "900", color: "#2b170d" }}>{money(finalTotal)}</span>
              {totalSavings > 0 && (
                <span style={{ fontSize: "11px", color: "#166534", fontWeight: "700", display: "block" }}>
                  Saved {money(totalSavings)}
                </span>
              )}
            </div>
            
            <button 
              type="button"
              onClick={handleCheckout}
              style={{
                background: "linear-gradient(135deg, #b88a58 0%, #a07343 100%)",
                color: "#ffffff",
                border: "none",
                padding: "12px 22px",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 14px rgba(184,138,88,0.35)"
              }}
            >
              Checkout <ArrowRight size={17} />
            </button>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deleteTargetId}
          title="Remove Sacred Item"
          message="Are you sure you want to remove this consecrated item from your bag?"
          confirmText="Remove"
          onConfirm={confirmRemove}
          onClose={() => setDeleteTargetId(null)}
        />
      </main>
    </Shell>
  );
}
