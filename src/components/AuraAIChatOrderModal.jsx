import React, { useState, useEffect } from "react";
import { 
  Package, 
  Tag, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  ChevronRight, 
  CreditCard, 
  Truck, 
  Sparkles, 
  MapPin, 
  User, 
  Phone, 
  Plus, 
  Minus,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/db";
import { authClient } from "../lib/authClient";
import { emitToast } from "../context/ToastContext";
import { createCashfreeCheckoutSession, openCashfreeCheckout } from "../lib/cashfreeClient";

export function AuraAIChatOrderModal({ 
  product, 
  isOpen, 
  onClose, 
  onOrderSuccess,
  prefilledCoupon = "" 
}) {
  const [qty, setQty] = useState(1);
  const [couponCode, setCouponCode] = useState(prefilledCoupon || "");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD"); // "COD" | "UPI" | "Online"
  
  // Delivery details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [orderComplete, setOrderComplete] = useState(null);

  // Available coupons from db
  const [availableCoupons, setAvailableCoupons] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      setOrderComplete(null);
      setErrorMsg("");
      return;
    }

    // Load available coupons
    try {
      const allCoupons = db.getCoupons ? db.getCoupons() : [];
      setAvailableCoupons(allCoupons.filter(c => c.active !== false));
    } catch (_) {}

    // Load user pre-fills
    const u = authClient.getUser();
    if (u) {
      if (u.displayName) setName(u.displayName);
      if (u.email && !phone) {
        // try to fetch profile phone
        db.getCustomerMe().then(res => {
          if (res?.success && res.data) {
            if (res.data.name) setName(res.data.name);
            if (res.data.phone) setPhone(res.data.phone);
            if (Array.isArray(res.data.addresses) && res.data.addresses.length > 0) {
              const def = res.data.addresses.find(a => a.isDefault) || res.data.addresses[0];
              if (def) {
                setAddress(def.street || def.address || "");
                setCity(def.city || "");
                setPincode(def.pincode || def.zip || "");
              }
            }
          }
        }).catch(() => {});
      }
    }

    if (prefilledCoupon) {
      applyCoupon(prefilledCoupon);
    }
  }, [isOpen, prefilledCoupon]);

  if (!isOpen || !product) return null;

  const unitPrice = Number(product.price) || 0;
  const unitMrp = Number(product.comparePrice || product.mrp || Math.round(unitPrice * 1.35));
  const subtotal = unitPrice * qty;
  const mrpTotal = unitMrp * qty;
  const mrpSavings = Math.max(0, mrpTotal - subtotal);

  // Calculate discount
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "percentage") {
      discountAmount = Math.round((subtotal * appliedCoupon.discount) / 100);
      if (appliedCoupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, appliedCoupon.maxDiscount);
      }
    } else {
      discountAmount = Math.min(appliedCoupon.discount || 0, subtotal);
    }
  }

  const finalAmount = Math.max(0, subtotal - discountAmount);

  const applyCoupon = (codeToApply) => {
    setCouponError("");
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) {
      setAppliedCoupon(null);
      return;
    }

    const found = availableCoupons.find(c => c.code.toUpperCase() === code);
    if (found) {
      if (found.minOrder && subtotal < found.minOrder) {
        setCouponError(`Minimum order amount of ₹${found.minOrder} required for ${code}`);
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon(found);
      setCouponCode(found.code);
      setCouponError("");
    } else {
      // Allow general fallback codes
      if (code === "SHRAWAN200") {
        setAppliedCoupon({ code: "SHRAWAN200", discount: 200, type: "flat" });
        setCouponCode("SHRAWAN200");
      } else if (code === "AURA100") {
        setAppliedCoupon({ code: "AURA100", discount: 100, type: "flat" });
        setCouponCode("AURA100");
      } else if (code === "MAHADEV10") {
        setAppliedCoupon({ code: "MAHADEV10", discount: 10, type: "percentage" });
        setCouponCode("MAHADEV10");
      } else {
        setCouponError(`Coupon code "${code}" is invalid or expired.`);
        setAppliedCoupon(null);
      }
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter recipient name for delivery.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setErrorMsg("Please enter a valid 10-digit delivery mobile number.");
      return;
    }
    if (!address.trim() || address.length < 5) {
      setErrorMsg("Please enter a complete delivery address.");
      return;
    }
    if (!pincode.trim() || pincode.length < 6) {
      setErrorMsg("Please enter a valid 6-digit postal PIN code.");
      return;
    }

    setSubmitting(true);
    try {
      const u = authClient.getUser();
      const customerEmail = u?.email || localStorage.getItem("user_email") || `${phone.replace(/\D/g, "")}@auracustomer.in`;
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || name.trim();
      const lastName = nameParts.slice(1).join(" ") || "Customer";

      const sessionData = await createCashfreeCheckoutSession({
        lines: [{ id: product.id, qty }],
        shippingAddress: {
          name: name.trim(),
          firstName,
          lastName,
          phone: phone.trim(),
          email: customerEmail,
          address: address.trim(),
          city: city.trim() || "India",
          pincode: pincode.trim(),
          state: "India"
        },
        couponCode: appliedCoupon?.code || couponCode || "",
        notes: "Placed via Aura AI Chat Assistant",
        source: "aura_ai"
      });

      if (!sessionData?.paymentSessionId) {
        throw new Error(sessionData?.message || "Could not create Cashfree payment session.");
      }

      emitToast("Launching Cashfree Secure Gateway...", "info");
      await openCashfreeCheckout({
        paymentSessionId: sessionData.paymentSessionId,
        mode: sessionData.environment || "production",
        redirectTarget: "_self"
      });
    } catch (err) {
      console.error("Aura AI Chat Order Error:", err);
      setErrorMsg(err.message || "Could not complete order. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="aura-ai-order-modal-backdrop" onClick={onClose}>
        <motion.div 
          className="aura-ai-order-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="aura-ai-order-modal-header">
            <div className="aura-ai-order-modal-title">
              <Sparkles size={16} className="aura-ai-order-sparkle" />
              <span>Aura AI Instant Order</span>
            </div>
            <button 
              onClick={onClose} 
              className="aura-ai-order-modal-close"
              aria-label="Close order window"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="aura-ai-order-modal-body">
            {orderComplete ? (
              <div className="aura-ai-order-success-view">
                <div className="aura-ai-order-success-icon">
                  <CheckCircle2 size={44} />
                </div>
                <h3>Order Confirmed with Blessings! 🙏</h3>
                <p className="aura-ai-order-id-tag">
                  Order ID: <b>#{orderComplete.id || orderComplete.orderId}</b>
                </p>
                <div className="aura-ai-order-success-box">
                  <div className="aura-ai-order-success-item">
                    <span>Item:</span>
                    <strong>{product.name} (x{qty})</strong>
                  </div>
                  <div className="aura-ai-order-success-item">
                    <span>Total Amount:</span>
                    <strong className="aura-ai-gold-text">₹{finalAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="aura-ai-order-success-item">
                    <span>Payment:</span>
                    <span>{paymentMethod === "COD" ? "Cash on Delivery (COD)" : paymentMethod}</span>
                  </div>
                  <div className="aura-ai-order-success-item">
                    <span>Delivery to:</span>
                    <span>{address}, {city} - {pincode}</span>
                  </div>
                </div>

                <div className="aura-ai-order-badge-row">
                  <span><ShieldCheck size={12} /> Lab Certified</span>
                  <span><Sparkles size={12} /> Vedic Energized</span>
                  <span><Truck size={12} /> Dispatches in 24h</span>
                </div>

                <button 
                  onClick={onClose} 
                  className="aura-ai-order-btn-primary"
                  style={{ marginTop: 14 }}
                >
                  Continue Chatting with Aura AI
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder}>
                {/* Product Summary Row */}
                <div className="aura-ai-order-prod-row">
                  <div className="aura-ai-order-prod-thumb">
                    <img 
                      src={product.image || product.img || product.images?.[0] || "/images/product-5mukhi.jpg"} 
                      alt={product.name} 
                      onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                    />
                  </div>
                  <div className="aura-ai-order-prod-meta">
                    <h4>{product.name}</h4>
                    <div className="aura-ai-order-prod-price-line">
                      <span className="aura-ai-order-cur-price">₹{unitPrice.toLocaleString('en-IN')}</span>
                      {unitMrp > unitPrice && (
                        <span className="aura-ai-order-mrp-price">₹{unitMrp.toLocaleString('en-IN')}</span>
                      )}
                      <span className="aura-ai-order-free-ship">Free Sacred Packaging</span>
                    </div>
                  </div>

                  {/* Qty Stepper */}
                  <div className="aura-ai-order-qty-stepper">
                    <button 
                      type="button" 
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={12} />
                    </button>
                    <span>{qty}</span>
                    <button 
                      type="button" 
                      onClick={() => setQty(Math.min(10, qty + 1))}
                      aria-label="Increase quantity"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* Coupons Section */}
                <div className="aura-ai-order-section">
                  <div className="aura-ai-order-coupon-wrap">
                    <div className="aura-ai-order-coupon-input">
                      <Tag size={14} className="aura-ai-order-tag" />
                      <input 
                        type="text" 
                        placeholder="Have a coupon code?" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      />
                      <button 
                        type="button"
                        onClick={() => applyCoupon(couponCode)}
                        className="aura-ai-order-apply-btn"
                      >
                        {appliedCoupon ? "Update" : "Apply"}
                      </button>
                    </div>

                    {appliedCoupon && (
                      <div className="aura-ai-order-applied-chip">
                        <span>✓ <b>{appliedCoupon.code}</b> applied (-₹{discountAmount})</span>
                        <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}>
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <div className="aura-ai-order-coupon-err">
                        <AlertCircle size={12} /> {couponError}
                      </div>
                    )}

                    {/* Quick coupon suggestions if none applied */}
                    {!appliedCoupon && availableCoupons.length > 0 && (
                      <div className="aura-ai-order-quick-coupons">
                        <span className="aura-ai-order-suggest-label">Suggestions:</span>
                        {availableCoupons.slice(0, 2).map((c, ci) => (
                          <button 
                            key={ci}
                            type="button"
                            onClick={() => applyCoupon(c.code)}
                            className="aura-ai-order-coupon-chip"
                          >
                            {c.code} ({c.type === "percentage" ? `${c.discount}% OFF` : `₹${c.discount} OFF`})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="aura-ai-order-section">
                  <div className="aura-ai-order-section-title">
                    <MapPin size={13} /> Delivery Details
                  </div>
                  <div className="aura-ai-order-grid-2">
                    <div className="aura-ai-order-field">
                      <input 
                        type="text" 
                        required 
                        placeholder="Full Name *" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                      />
                    </div>
                    <div className="aura-ai-order-field">
                      <input 
                        type="tel" 
                        required 
                        placeholder="10-digit Mobile *" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="aura-ai-order-field" style={{ marginTop: 6 }}>
                    <input 
                      type="text" 
                      required 
                      placeholder="House / Flat / Street Address *" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                    />
                  </div>
                  <div className="aura-ai-order-grid-2" style={{ marginTop: 6 }}>
                    <div className="aura-ai-order-field">
                      <input 
                        type="text" 
                        placeholder="City / Town" 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                      />
                    </div>
                    <div className="aura-ai-order-field">
                      <input 
                        type="text" 
                        required 
                        placeholder="PIN Code *" 
                        value={pincode} 
                        onChange={(e) => setPincode(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="aura-ai-order-section">
                  <div className="aura-ai-order-section-title">
                    <CreditCard size={13} /> Secure Payment Gateway
                  </div>
                  <div style={{ padding: "12px", background: "#fdf8f4", border: "1.5px solid #b85d25", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <strong style={{ fontSize: "13px", color: "#2b170d" }}>Cashfree PG (Instant Checkout)</strong>
                      <span style={{ fontSize: "10px", color: "#166534", background: "#eef6f0", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>✓ 100% Encrypted</span>
                    </div>
                    <small style={{ fontSize: "11px", color: "#806f62" }}>
                      Pay via UPI (GPay/PhonePe/Paytm), Cards, Net Banking & Wallets
                    </small>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="aura-ai-order-summary-box">
                  <div className="aura-ai-order-summary-row">
                    <span>Item Total ({qty} item{qty > 1 ? "s" : ""})</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {mrpSavings > 0 && (
                    <div className="aura-ai-order-summary-row aura-ai-green">
                      <span>MRP Savings</span>
                      <span>-₹{mrpSavings.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="aura-ai-order-summary-row aura-ai-green">
                      <span>Coupon Discount ({appliedCoupon?.code})</span>
                      <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="aura-ai-order-summary-row">
                    <span>Sacred Packaging & Energization</span>
                    <span className="aura-ai-green">FREE</span>
                  </div>
                  <div className="aura-ai-order-summary-total">
                    <span>To Pay</span>
                    <strong>₹{finalAmount.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {errorMsg && (
                  <div className="aura-ai-order-error-banner">
                    <AlertCircle size={14} /> {errorMsg}
                  </div>
                )}

                {/* Submit Action Button */}
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="aura-ai-order-btn-primary"
                >
                  {submitting ? "Launching Gateway..." : `Pay via Cashfree • ₹${finalAmount.toLocaleString('en-IN')}`}
                </button>

                <div className="aura-ai-order-guarantee">
                  <ShieldCheck size={12} /> 100% Original Himalayan Beads • Government Lab Certified • 7-Day Easy Return
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
