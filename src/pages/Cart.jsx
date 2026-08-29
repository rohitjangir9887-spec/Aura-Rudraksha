import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { money, pct } from "../data";
import { db, onStoreUpdate } from "../lib/db";
import { ConfirmModal } from "../components/ConfirmModal";
import { emitToast } from "../context/ToastContext";
import { Trash2, ShoppingBag, ChevronLeft, Heart, ShieldCheck, Tag, X, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { authClient } from "../lib/authClient";
import { OrderSummaryCard } from "../components/checkout/OrderSummaryCard";

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
    if (!authClient.isSignedIn() || (authClient.getUser() && authClient.getUser().isAnonymous)) {
      emitToast("Please sign in to proceed to checkout", "info");
      navigate("/login", { state: { from: "/checkout" } });
    } else {
      navigate("/checkout");
    }
  };
  
  const recommendedProducts = products
    .filter(p => !Object.keys(items).includes(String(p.id)) && p.status !== "Out of Stock")
    .sort(() => 0.5 - Math.random())
    .slice(0, 5);

  return (
    <Shell>
      <main className="page cart-page" style={{ paddingBottom: "120px" }}>
        <motion.div 
          className="cart-header-actions"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button className="back-btn" onClick={() => navigate('/shop')}>
            <ChevronLeft size={20} /> Continue Shopping
          </button>
          <div className="secure-badge">
            <ShieldCheck size={16} /> 100% Safe & Protected
          </div>
        </motion.div>

        <motion.div className="cart-title-section" initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.1}}>
          <h1>Your Cart <span>({cartItemCount})</span></h1>
        </motion.div>

        {(!cart.length || subtotal === 0) ? (
          <motion.div 
            className="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <ShoppingBag size={48} color="#8c2b10" strokeWidth={1.5} />
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added any spiritual items yet.</p>
            <Link to="/shop" className="primary-btn">Explore Rudraksha Collection</Link>
          </motion.div>
        ) : (
          <div className="cart-layout-premium">
            <div className="cart-left-col">
              {subtotal > 0 && (
              <motion.div 
                className="smart-offer-banner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {isFreeShipping ? (
                  <div className="so-success">
                    <span className="so-icon">🎉</span>
                    <div className="so-text">
                      <strong>FREE SHIPPING UNLOCKED</strong>
                      <p>Great choice! You have unlocked free express shipping.</p>
                    </div>
                  </div>
                ) : (
                  <div className="so-progress">
                    <div className="so-text">
                      <strong>Add {money((freeShippingThreshold || 499) - subtotal)} more to unlock FREE SHIPPING</strong>
                    </div>
                    <div className="so-bar-bg">
                      <div className="so-bar-fill" style={{ width: `${Math.min(100, (subtotal / (freeShippingThreshold || 499)) * 100)}%` }}></div>
                    </div>
                  </div>
                )}
              </motion.div>
              )}

              <motion.div className="cart-items-list" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
                {Object.entries(items).map(([id, qty], index) => {
                  const p = products.find(x => String(x.id) === String(id));
                  if (!p) return null;
                  const stockLimit = p.stock !== undefined ? Number(p.stock) : (p.status === "Out of Stock" ? 0 : 99);
                  
                  const hasDiscount = p.mrp > p.price;
                  const discountAmount = hasDiscount ? p.mrp - p.price : 0;
                  const discountPercent = hasDiscount ? Math.round((discountAmount / p.mrp) * 100) : 0;

                  return (
                    <motion.div 
                      className="premium-cart-card" 
                      key={id}
                      initial={{opacity: 0, x: -20}} 
                      animate={{opacity: 1, x: 0}} 
                      transition={{delay: 0.2 + (index * 0.1)}}
                    >
                      <div className="pcc-img-wrap">
                        <img 
                          src={p.img || (p.images && p.images[0]) || "/images/product-5mukhi.jpg"} 
                          alt={p.name}
                          onError={(e) => { e.target.src = "/images/product-5mukhi.jpg"; }}
                         loading="lazy" />
                      </div>
                      <div className="pcc-details">
                        <div className="pcc-header">
                          <h3>{p.name}</h3>
                          {p.rating && <span className="pcc-rating">★ {p.rating}</span>}
                        </div>
                        
                        <div className="pcc-price-row">
                          <span className="pcc-price">{money(p.price)}</span>
                          {hasDiscount && (
                            <>
                              <del className="pcc-mrp">{money(p.mrp)}</del>
                              <span className="pcc-discount-badge">{discountPercent}% OFF</span>
                            </>
                          )}
                        </div>
                        
                        {hasDiscount && (
                          <div className="pcc-savings-text">
                            You save {money(discountAmount * qty)}
                          </div>
                        )}
                        
                        <div className="pcc-actions-row">
                          <div className="pcc-qty">
                            <button 
                              type="button" 
                              onClick={() => setQty(id, Math.max(1, qty - 1))}
                              disabled={qty <= 1}
                              aria-label="Decrease quantity"
                            >−</button>
                            <span>{qty}</span>
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
                              aria-label="Increase quantity"
                            >+</button>
                          </div>
                          
                          <div className="pcc-utils">
                            <button className="pcc-util-btn" onClick={() => toggleWishlist(p.id, p.name)}>
                              <Heart size={16} fill={isWishlisted(p.id) ? "#a54d2b" : "none"} color={isWishlisted(p.id) ? "#a54d2b" : "#806f62"} />
                              <span>{isWishlisted(p.id) ? "Wishlisted" : "Move to Wishlist"}</span>
                            </button>
                            <button className="pcc-util-btn" onClick={() => setDeleteTargetId(id)} aria-label="Remove product from cart">
                              <Trash2 size={16} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {recommendedProducts.length > 0 && (
                <motion.div 
                  className="cart-recommendations"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="cr-header">
                    <h2>Frequently Bought Together</h2>
                  </div>
                  <div className="cr-carousel">
                    {recommendedProducts.map((rp) => {
                      const hasDiscount = rp.mrp > rp.price;
                      const discountPercent = hasDiscount ? Math.round(((rp.mrp - rp.price) / rp.mrp) * 100) : 0;
                      return (
                        <div className="cr-card" key={rp.id}>
                          <Link to={`/product/${rp.id}`} className="cr-img">
                            <img 
                              src={rp.img || (rp.images && rp.images[0]) || "/images/product-5mukhi.jpg"} 
                              alt={rp.name}
                              onError={(e) => { e.target.src = "/images/product-5mukhi.jpg"; }}
                             loading="lazy" />
                            {hasDiscount && <span className="cr-badge">{discountPercent}% OFF</span>}
                          </Link>
                          <div className="cr-info">
                            <h4>{rp.name}</h4>
                            <div className="cr-price-row">
                              <span>{money(rp.price)}</span>
                              {hasDiscount && <del>{money(rp.mrp)}</del>}
                            </div>
                            <button 
                              className="cr-add-btn" 
                              onClick={() => {
                                add(rp.id, 1);
                                emitToast(`${rp.name} added to cart`, "success");
                              }}
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="cart-right-col">
              <motion.div 
                initial={{opacity: 0, x: 20}} 
                animate={{opacity: 1, x: 0}} 
                transition={{delay: 0.3}}
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
              </motion.div>
            </div>
          </div>
        )}

        {/* Mobile Sticky CTA */}
        {cart.length > 0 && (
          <div className="cart-mobile-sticky">
            <div className="cms-info">
              <span className="cms-label">Total</span>
              <span className="cms-price">{money(finalTotal)}</span>
              {totalSavings > 0 && <span className="cms-savings">Saved {money(totalSavings)}</span>}
            </div>
            <button className="primary-btn" onClick={handleCheckout}>
              Checkout →
            </button>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deleteTargetId}
          title="Remove Item"
          message="Are you sure you want to remove this item from your cart?"
          confirmText="Remove"
          onConfirm={confirmRemove}
          onClose={() => setDeleteTargetId(null)}
        />
      </main>
    </Shell>
  );
}
