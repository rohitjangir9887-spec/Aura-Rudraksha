import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  X, 
  Sparkles, 
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/db";
import { authClient } from "../lib/authClient";
import { ProductDetails } from "./aura-ai-order-modal/ProductDetails";
import { CouponSection } from "./aura-ai-order-modal/CouponSection";
import { DeliveryForm } from "./aura-ai-order-modal/DeliveryForm";
import { PaymentMethod } from "./aura-ai-order-modal/PaymentMethod";
import { OrderSummary } from "./aura-ai-order-modal/OrderSummary";
import { SuccessView } from "./aura-ai-order-modal/SuccessView";

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
  const [paymentMethod, setPaymentMethod] = useState("PAYU");
  
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

  const applyCoupon = async (codeToApply) => {
    setCouponError("");
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) {
      setAppliedCoupon(null);
      return;
    }

    // First check in-memory / cache
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
      return;
    }

    // Validate with server
    try {
      const res = await db.validateCoupon(code, subtotal);
      if (res?.success && res.data) {
        setAppliedCoupon(res.data);
        setCouponCode(res.data.code || code);
        setCouponError("");
      } else {
        setCouponError(res?.message || `Coupon code "${code}" is invalid or expired.`);
        setAppliedCoupon(null);
      }
    } catch (_) {
      setCouponError(`Coupon code "${code}" is invalid or expired.`);
      setAppliedCoupon(null);
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

      // Save buy-now intent in session storage so checkout seamlessly resumes
      const buyNowPayload = {
        lines: [
          {
            id: product.id,
            name: product.name,
            price: unitPrice,
            qty: qty,
            img: product.image || product.img || product.images?.[0] || ""
          }
        ],
        couponCode: appliedCoupon ? appliedCoupon.code : "",
        prefillShipping: {
          fullName: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim() || "India",
          pincode: pincode.trim(),
          email: customerEmail
        }
      };

      try {
        sessionStorage.setItem("aura_buy_now_intent", JSON.stringify(buyNowPayload));
      } catch (_) {}

      // Initiate authoritative payment
      const paymentIntentPayload = {
        amount: finalAmount,
        customer: {
          name: name.trim(),
          email: customerEmail,
          phone: phone.trim()
        },
        shippingAddress: {
          fullName: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim() || "India",
          pincode: pincode.trim()
        },
        items: buyNowPayload.lines,
        coupon: appliedCoupon ? appliedCoupon.code : null,
        orderSource: "aura_ai",
        notes: "Placed via Aura AI Chat Assistant"
      };

      const payRes = await db.initiatePayment(paymentIntentPayload);

      if (payRes?.success && payRes.data?.payuUrl && payRes.data?.params) {
        // Redirect/submit to PayU gateway form
        const { payuUrl, params } = payRes.data;
        const form = document.createElement("form");
        form.method = "POST";
        form.action = payuUrl;
        form.style.display = "none";

        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = k;
            input.value = String(v);
            form.appendChild(input);
          }
        });

        document.body.appendChild(form);
        form.submit();
        return;
      }

      // If direct checkout fallback or mock gateway
      if (payRes?.success && payRes.data?.orderId) {
        window.location.href = `/checkout?buyNow=1&orderId=${encodeURIComponent(payRes.data.orderId)}`;
      } else {
        window.location.href = "/checkout?buyNow=1";
      }
    } catch (err) {
      console.error("Aura AI Chat Order Payment Error:", err);
      window.location.href = "/checkout?buyNow=1";
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
              <SuccessView
                orderComplete={orderComplete}
                product={product}
                qty={qty}
                finalAmount={finalAmount}
                address={address}
                city={city}
                pincode={pincode}
                onClose={onClose}
              />
            ) : (
              <form onSubmit={handlePlaceOrder} className="aura-ai-order-form">

                {/* Product Summary Row */}
                <ProductDetails
                  product={product}
                  unitPrice={unitPrice}
                  unitMrp={unitMrp}
                  qty={qty}
                  setQty={setQty}
                />

                {/* Coupons Section */}
                <CouponSection
                  couponCode={couponCode}
                  setCouponCode={setCouponCode}
                  applyCoupon={applyCoupon}
                  appliedCoupon={appliedCoupon}
                  setAppliedCoupon={setAppliedCoupon}
                  discountAmount={discountAmount}
                  couponError={couponError}
                  availableCoupons={availableCoupons}
                />

                {/* Delivery Information */}
                <DeliveryForm
                  name={name} setName={setName}
                  phone={phone} setPhone={setPhone}
                  address={address} setAddress={setAddress}
                  city={city} setCity={setCity}
                  pincode={pincode} setPincode={setPincode}
                />

                {/* Payment Method */}
                <PaymentMethod />

                {/* Price Breakdown */}
                <OrderSummary
                  qty={qty}
                  subtotal={subtotal}
                  mrpSavings={mrpSavings}
                  discountAmount={discountAmount}
                  appliedCoupon={appliedCoupon}
                  finalAmount={finalAmount}
                />

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
                  {submitting ? "Placing Sacred Order..." : `Confirm & Place Order • ₹${finalAmount.toLocaleString('en-IN')}`}
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
