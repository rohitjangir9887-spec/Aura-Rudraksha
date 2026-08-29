import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { money } from "../data";
import { db } from "../lib/db";
import { authClient } from "../lib/authClient";
import { 
  CheckCircle2, 
  ChevronLeft, 
  Truck, 
  Lock, 
  ArrowRight, 
  Loader2, 
  ShoppingBag,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Modular Checkout Components
import { CheckoutTopOffer } from "../components/checkout/CheckoutTopOffer";
import { CheckoutTrustStrip } from "../components/checkout/CheckoutTrustStrip";
import { CheckoutSavingsCard } from "../components/checkout/CheckoutSavingsCard";
import { CheckoutAddressCard } from "../components/checkout/CheckoutAddressCard";
import { CheckoutItemsReview } from "../components/checkout/CheckoutItemsReview";
import { CheckoutPriceSummary } from "../components/checkout/CheckoutPriceSummary";
import { CheckoutPaymentMethod } from "../components/checkout/CheckoutPaymentMethod";
import { CheckoutReassurance } from "../components/checkout/CheckoutReassurance";
import { CheckoutStickyFooter } from "../components/checkout/CheckoutStickyFooter";
import { CheckoutAuthModal } from "../components/checkout/CheckoutAuthModal";

export function Checkout() {
  const [products, setProducts] = useState(() => db.getProducts());
  const [activeOffer, setActiveOffer] = useState(() => db.getActiveOffer());
  const [availableCoupons, setAvailableCoupons] = useState(() => 
    db.getCoupons().filter(c => c.status === "Active")
  );

  const { 
    cart, 
    lines, 
    setQty, 
    add, 
    remove, 
    clear,
    couponCode,
    appliedCoupon,
    couponStatus,
    totals,
    subtotal,
    totalMrp,
    productSavings,
    couponDiscount,
    shipping: shippingFee,
    finalTotal,
    totalSavings,
    applyCoupon,
    removeCoupon
  } = useCart();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    pincode: "",
    city: "",
    state: ""
  });
  const [formErrors, setFormErrors] = useState({});

  // Saved Address State
  const [savedAddress, setSavedAddress] = useState(null);
  const [usingSavedAddress, setUsingSavedAddress] = useState(false);
  const [saveAddressCheck, setSaveAddressCheck] = useState(true);

  // Local coupon form input state & messages
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccessMsg, setCouponSuccessMsg] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState("cod");

  // Redirect if cart is empty
  useEffect(() => {
    if (lines.length === 0 && !success) {
      navigate("/cart");
    }
  }, [lines.length, success, navigate]);

  // Sync store data & customer profile
  useEffect(() => {
    setProducts(db.getProducts());
    setActiveOffer(db.getActiveOffer());
    setAvailableCoupons(db.getCoupons().filter(c => c.status === "Active"));

    async function loadUserData() {
      const user = authClient.getUser();
      if (typeof window !== "undefined" && user && !user.isAnonymous) {
        try {
          const [addrRes, meRes] = await Promise.all([
            db.getAddresses(),
            db.getCustomerMe()
          ]);

          const customer = meRes?.data || {};
          const addresses = addrRes?.data || customer.addresses || [];

          const fullName = (customer.name && customer.name !== "Customer" && customer.name !== "Aura Devotee") 
            ? customer.name 
            : (user?.displayName || (user?.email ? user.email.split("@")[0].replace(/[._0-9]+/g, ' ') : ""));
          const nameParts = fullName.trim().split(/\s+/);
          const autoFirstName = nameParts[0] || "";
          const autoLastName = nameParts.slice(1).join(" ") || "";
          const autoEmail = customer.email || user?.email || "";
          const autoPhone = customer.phone || user?.phoneNumber || "";

          let chosenAddr = null;
          if (Array.isArray(addresses) && addresses.length > 0) {
            chosenAddr = addresses.find(a => a.isDefault) || addresses[0];
          } else if (customer.address) {
            chosenAddr = {
              firstName: autoFirstName,
              lastName: autoLastName,
              phone: autoPhone,
              email: autoEmail,
              address: customer.address || "",
              pincode: customer.pincode || "",
              city: customer.city || "",
              state: customer.state || ""
            };
          }

          if (chosenAddr && (chosenAddr.address || chosenAddr.city)) {
            const addrNameParts = (chosenAddr.name || fullName).trim().split(/\s+/);
            setSavedAddress(chosenAddr);
            setUsingSavedAddress(true);
            setFormData({
              firstName: chosenAddr.firstName || addrNameParts[0] || autoFirstName,
              lastName: chosenAddr.lastName || addrNameParts.slice(1).join(" ") || autoLastName,
              phone: chosenAddr.phone || autoPhone,
              email: chosenAddr.email || autoEmail,
              address: chosenAddr.address || "",
              pincode: chosenAddr.pincode || "",
              city: chosenAddr.city || "",
              state: chosenAddr.state || ""
            });
          } else {
            setFormData(prev => ({
              ...prev,
              firstName: autoFirstName || prev.firstName,
              lastName: autoLastName || prev.lastName,
              email: autoEmail || prev.email,
              phone: autoPhone || prev.phone
            }));
          }
        } catch (_) {}
      }
    }

    loadUserData();

    const unsubscribe = authClient.onAuthStateChanged((user) => {
      if (user && !user.isAnonymous) {
        loadUserData();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleUseSavedAddress = () => {
    if (savedAddress) {
      setFormData(savedAddress);
      setUsingSavedAddress(true);
      emitToast("Loaded default saved address", "info");
    }
  };

  const handleUseDifferentAddress = () => {
    setUsingSavedAddress(false);
    setFormData(prev => ({
      ...prev,
      address: "",
      pincode: "",
      city: "",
      state: ""
    }));
  };

  const handleEditAddress = () => {
    setUsingSavedAddress(false);
  };

  // Synchronized Coupon Application
  const handleApplyCoupon = async (codeToApply) => {
    setCouponError("");
    setCouponSuccessMsg("");
    const code = (codeToApply || couponInput).trim().toUpperCase();

    if (!code) {
      setCouponError("Please enter a valid coupon code");
      emitToast("Please enter a coupon code", "warning");
      return;
    }

    setValidatingCoupon(true);

    try {
      const res = await applyCoupon(code);
      if (res.valid) {
        setCouponInput("");
        setCouponSuccessMsg(res.message || `Coupon '${code}' applied successfully!`);
        emitToast(res.message || `Coupon '${code}' applied!`, "success");
      } else {
        setCouponSuccessMsg("");
        setCouponError(res.message || `Coupon '${code}' is invalid or expired.`);
        if (res.status === "EXPIRED") {
          emitToast(res.message || `Coupon '${code}' is expired.`, "error");
        } else if (res.status === "NOT_ELIGIBLE") {
          emitToast(res.message || `Cart not eligible for coupon '${code}'.`, "warning");
        } else {
          emitToast(res.message || `Coupon '${code}' is invalid.`, "error");
        }
      }
    } catch (err) {
      setCouponError(err.message || "Could not validate coupon");
      emitToast(err.message || "Could not validate coupon", "error");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponInput("");
    setCouponError("");
    setCouponSuccessMsg("");
    emitToast("Coupon removed", "info");
  };

  const FREE_SHIPPING_THRESHOLD = 499;

  // Validate form fields
  const validateForm = () => {
    const errors = {};
    if (!formData.firstName?.trim()) errors.firstName = "First name is required";
    if (!formData.lastName?.trim()) errors.lastName = "Last name is required";
    if (!formData.phone?.trim() || formData.phone.trim().length < 10) {
      errors.phone = "Valid 10-digit phone number is required";
    }
    if (!formData.address?.trim()) errors.address = "Full address is required";
    if (!formData.pincode?.trim() || formData.pincode.trim().length < 6) {
      errors.pincode = "Valid 6-digit pincode is required";
    }
    if (!formData.city?.trim()) errors.city = "City is required";
    if (!formData.state?.trim()) errors.state = "State is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submission Flow
  const executeOrderSubmission = async () => {
    setLoading(true);

    const { firstName, lastName, phone, email, address, pincode, city, state } = formData;
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPhone = phone.trim();

    const addressObj = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      address: address.trim(),
      pincode: pincode.trim(),
      city: city.trim(),
      state: state.trim()
    };

    // Save address in background if user checked it
    if (saveAddressCheck) {
      try {
        await db.saveAddress(addressObj);
      } catch (_) {}
    }

    const fullName = `${addressObj.firstName} ${addressObj.lastName}`.trim();
    const fullAddressString = `${addressObj.address}, ${addressObj.city}, ${addressObj.state} - ${addressObj.pincode}`;

    const snapshotItems = lines.map(line => {
      const p = products.find(x => String(x.id) === String(line.id));
      return {
        id: line.id,
        productId: line.id,
        name: p ? p.name : "Sacred Rudraksha Item",
        price: p ? p.price : 0,
        mrp: p ? (p.mrp || p.comparePrice || p.price) : 0,
        quantity: line.qty,
        qty: line.qty,
        img: p ? (p.img || (p.images && p.images[0])) : null
      };
    });

    const orderObj = {
      customerEmail: cleanEmail,
      customerName: fullName,
      firstName: addressObj.firstName,
      lastName: addressObj.lastName,
      phone: addressObj.phone,
      address: fullAddressString,
      shippingAddress: addressObj,
      couponCode: appliedCoupon?.code || couponCode || "",
      paymentMethod: paymentMethod === "cod" ? "Cash on Delivery (COD)" : "Online Payment",
      items: cart,
      lines: lines,
      snapshotItems: snapshotItems,
      status: "Confirmed"
    };

    try {
      const savedOrder = await db.saveOrder(orderObj);
      setSuccess(savedOrder.id || savedOrder.orderId);
      setLoading(false);
      emitToast(`Order #${savedOrder.id || savedOrder.orderId} placed successfully!`, "success");
      clear();
    } catch (err) {
      setLoading(false);
      emitToast(err.message || "Could not place order. Please check your details and retry.", "error");
    }
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    if (!lines.length || loading) return;

    if (!validateForm()) {
      emitToast("Please fill in all required shipping details correctly.", "warning");
      const el = document.getElementById("checkout-address-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Require Firebase authenticated session before placing order
    const isUserSignedIn = authClient.isSignedIn();
    const currentUser = authClient.getUser();

    if (!isUserSignedIn || (currentUser && currentUser.isAnonymous)) {
      setAuthModalOpen(true);
      return;
    }

    await executeOrderSubmission();
  };

  const handleAuthSuccess = async (authUser) => {
    setAuthModalOpen(false);
    if (authUser?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: authUser.email }));
    }
    await executeOrderSubmission();
  };

  // SUCCESS SCREEN
  if (success) {
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "80px", maxWidth: "680px", margin: "0 auto" }}>
          <motion.div 
            id="order-success-view"
            className="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center", padding: "40px 16px" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#eef6f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <CheckCircle2 size={48} color="#20a95a" />
            </motion.div>

            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "36px", fontWeight: "700", color: "#2b170d", margin: "0 0 8px" }}>
              Order Confirmed & Placed!
            </h1>
            <p style={{ fontSize: "15px", color: "#2b170d", margin: "0 0 6px" }}>
              Thank you! Your sacred order <b>#{success}</b> has been received.
            </p>
            <p style={{ fontSize: "12.5px", color: "#806f62", margin: "0 0 24px" }}>
              You will receive real-time dispatch and tracking updates on WhatsApp.
            </p>

            {/* Delivery Destination Box */}
            <div 
              style={{
                background: "#fffdf9",
                border: "1px solid #e8dac9",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "left",
                marginBottom: "24px",
                fontSize: "13px"
              }}
            >
              <div style={{ fontWeight: "700", color: "#2b170d", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <Truck size={16} color="#b85d25" /> Delivery Destination:
              </div>
              <div style={{ color: "#4a3528", lineHeight: "1.6" }}>
                <b>{formData.firstName} {formData.lastName}</b><br />
                {formData.address}, {formData.city}, {formData.state} - <b>{formData.pincode}</b><br />
                📞 Phone: {formData.phone}
                {formData.email && <><br />✉️ Email: {formData.email}</>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link 
                to={`/account/orders/${success}`} 
                id="btn-view-order-details"
                className="primary-btn" 
                style={{ padding: "12px 24px", fontSize: "14px", textDecoration: "none" }}
              >
                View Order Details
              </Link>
              <Link 
                to="/shop" 
                id="btn-continue-shopping"
                className="outline-btn" 
                style={{ padding: "12px 24px", fontSize: "14px", textDecoration: "none", background: "#fffdf9" }}
              >
                Continue Exploring
              </Link>
            </div>
          </motion.div>
        </main>
      </Shell>
    );
  }

  // EMPTY CART SCREEN
  if (lines.length === 0) {
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "80px", textAlign: "center", paddingTop: "60px" }}>
          <div style={{ maxWidth: "420px", margin: "0 auto", padding: "20px" }}>
            <ShoppingBag size={48} color="#b85d25" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", color: "#2b170d", margin: "0 0 8px" }}>
              Your cart is empty
            </h2>
            <p style={{ fontSize: "13px", color: "#806f62", marginBottom: "20px" }}>
              Please add sacred Rudraksha beads or malas to your cart before proceeding to checkout.
            </p>
            <Link to="/shop" className="primary-btn" style={{ padding: "12px 24px", fontSize: "14px", textDecoration: "none" }}>
              Explore Collection
            </Link>
          </div>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main 
        id="checkout-page-container"
        className="page" 
        style={{ 
          maxWidth: "760px", 
          margin: "0 auto", 
          padding: "16px 14px 100px",
          minHeight: "85vh"
        }}
      >
        {/* Navigation & Brand Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <button 
            type="button"
            id="btn-back-to-cart"
            onClick={() => navigate("/cart")}
            style={{
              background: "none",
              border: "none",
              color: "#b85d25",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 0"
            }}
          >
            <ChevronLeft size={18} /> Back to Cart
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#166534", fontWeight: "700" }}>
            <Lock size={12} /> 256-Bit SSL Checkout
          </div>
        </div>

        {/* 1. Promotional Offer Bar */}
        {activeOffer && activeOffer.status === "Active" && (
          <CheckoutTopOffer 
            activeOffer={activeOffer} 
            onApplyCoupon={handleApplyCoupon} 
          />
        )}

        {/* Page Title */}
        <div style={{ marginBottom: "14px" }}>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", fontWeight: "700", color: "#2b170d", margin: "0 0 2px" }}>
            Checkout
          </h1>
          <p style={{ fontSize: "12px", color: "#806f62", margin: 0 }}>
            Fast & Safe Sacred Rudraksha Order Dispatch
          </p>
        </div>

        {/* 2. Trust Strip */}
        <CheckoutTrustStrip />

        {/* 3. Savings / Offer Card */}
        <CheckoutSavingsCard 
          totalMrp={totalMrp}
          subtotal={subtotal}
          totalSavings={productSavings}
          couponDiscount={couponDiscount}
          freeShippingThreshold={FREE_SHIPPING_THRESHOLD}
        />

        {/* 4. Shipping Address (Card 1) */}
        <CheckoutAddressCard 
          formData={formData}
          onInputChange={handleInputChange}
          savedAddress={savedAddress}
          usingSavedAddress={usingSavedAddress}
          onUseSavedAddress={handleUseSavedAddress}
          onUseDifferentAddress={handleUseDifferentAddress}
          onEditAddress={handleEditAddress}
          saveAddressCheck={saveAddressCheck}
          onToggleSaveAddressCheck={setSaveAddressCheck}
          errors={formErrors}
        />

        {/* 5. Review Your Items (Card 2) */}
        <CheckoutItemsReview 
          lines={lines}
          products={products}
          onUpdateQty={setQty}
          onRemoveItem={remove}
        />

        {/* 6. Order Summary */}
        <CheckoutPriceSummary 
          totalMrp={totalMrp}
          subtotal={subtotal}
          productSavings={productSavings}
          appliedCoupon={appliedCoupon}
          couponDiscount={couponDiscount}
          shippingFee={shippingFee}
          finalTotal={finalTotal}
          lines={lines}
          products={products}
          onApplyCoupon={handleApplyCoupon}
          onRemoveCoupon={handleRemoveCoupon}
          couponError={couponError}
          couponSuccessMsg={couponSuccessMsg}
          onCheckout={handlePlaceOrder}
          ctaText={`Place Order • ${money(finalTotal)}`}
          isCheckoutPage={true}
          loading={loading}
        />

        {/* 7. Payment Method (Card 3) */}
        <CheckoutPaymentMethod 
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
        />

        {/* 8. Final Reassurance */}
        <CheckoutReassurance />

        {/* 9. In-page Main Place Order CTA (Always Visible & Prominent) */}
        <div id="checkout-main-place-order-section" style={{ marginTop: "18px", marginBottom: "24px" }}>
          <button
            type="button"
            id="btn-place-order-main"
            disabled={loading}
            onClick={handlePlaceOrder}
            className="primary-btn"
            style={{
              width: "100%",
              padding: "16px 20px",
              fontSize: "17px",
              fontWeight: "700",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              background: "linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)",
              boxShadow: "0 6px 20px rgba(165, 77, 43, 0.35)",
              border: "none",
              color: "#ffffff",
              cursor: loading ? "wait" : "pointer"
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Processing Order...</span>
              </>
            ) : (
              <>
                <span>Place Order • {money(finalTotal)}</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
          
          <div style={{ textAlign: "center", marginTop: "10px", fontSize: "12px", color: "#6e5d50", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <Lock size={13} color="#166534" />
            <span>Clicking "Place Order" securely registers your order & dispatches from Nepal</span>
          </div>
        </div>

        {/* 10. Sticky Bottom CTA */}
        <CheckoutStickyFooter 
          finalTotal={finalTotal}
          totalSavings={totalSavings}
          loading={loading}
          onPlaceOrder={handlePlaceOrder}
        />

        {/* In-Page Guest Authentication Modal */}
        <AnimatePresence>
          {authModalOpen && (
            <CheckoutAuthModal 
              isOpen={authModalOpen}
              onClose={() => setAuthModalOpen(false)}
              onSuccess={handleAuthSuccess}
            />
          )}
        </AnimatePresence>
      </main>
    </Shell>
  );
}
