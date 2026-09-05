import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { money } from "../data";
import { db } from "../lib/db";
import { authClient } from "../lib/authClient";
import { ConfirmModal } from "../components/ConfirmModal";
import { 
  CheckCircle2, 
  ChevronLeft, 
  Truck, 
  Lock, 
  ArrowRight, 
  Loader2, 
  ShoppingBag,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// Modular Checkout Components
import { CheckoutTopOffer } from "../components/checkout/CheckoutTopOffer";
import { CheckoutTrustStrip } from "../components/checkout/CheckoutTrustStrip";
import { CheckoutSavingsCard } from "../components/checkout/CheckoutSavingsCard";
import { CheckoutAddressCard } from "../components/checkout/CheckoutAddressCard";
import { CheckoutItemsReview } from "../components/checkout/CheckoutItemsReview";
import { CheckoutPriceSummary } from "../components/checkout/CheckoutPriceSummary";
import { CheckoutPaymentMethod } from "../components/checkout/CheckoutPaymentMethod";
import { CheckoutCompactPriceList } from "../components/checkout/CheckoutCompactPriceList";
import { CheckoutCompactPayment } from "../components/checkout/CheckoutCompactPayment";
import { CheckoutReassurance } from "../components/checkout/CheckoutReassurance";
import { CheckoutStickyFooter } from "../components/checkout/CheckoutStickyFooter";
import { CheckoutAuthModal } from "../components/checkout/CheckoutAuthModal";
import { OrderSuccessAnimation } from "../components/checkout/OrderSuccessAnimation";
import { PlaceOrderButton } from "../components/checkout/PlaceOrderButton";
import { PayuRedirectModal } from "../components/checkout/PayuRedirectModal";

export function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const successParam = searchParams.get("success");
  const failedParam = searchParams.get("failed");
  const txnidParam = searchParams.get("txnid");
  const reasonParam = searchParams.get("reason");

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
    totals: cartTotals,
    subtotal: cartSubtotal,
    totalMrp: cartTotalMrp,
    productSavings: cartProductSavings,
    couponDiscount: cartCouponDiscount,
    shipping: cartShippingFee,
    finalTotal: cartFinalTotal,
    totalSavings: cartTotalSavings,
    applyCoupon,
    removeCoupon
  } = useCart();

  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    locality: "",
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

  // Authoritative server-side verification state
  const [verifyingPayment, setVerifyingPayment] = useState(Boolean(successParam));
  const [verificationError, setVerificationError] = useState("");
  const [isUserDataLoading, setIsUserDataLoading] = useState(() => Boolean(authClient.getUser() && !authClient.getUser().isAnonymous));
  const [storeSettings, setStoreSettings] = useState(() => db.getSettings?.() || {});

  // PayU Redirect Modal State
  const [payuModalOpen, setPayuModalOpen] = useState(false);
  const [payuTimeout, setPayuTimeout] = useState(false);
  const [payuError, setPayuError] = useState(null);
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    db.fetchSettings?.().then(res => {
      if (mounted && res) {
        setStoreSettings(res);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Determine active checkout items (Buy Now intent vs normal cart lines)
  const buyNowIntentStr = typeof window !== "undefined" ? sessionStorage.getItem("aura_buy_now_intent") : null;
  const buyNowLines = useMemo(() => {
    if (!buyNowIntentStr) return null;
    try {
      const parsed = JSON.parse(buyNowIntentStr);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_) {}
    return null;
  }, [buyNowIntentStr]);

  const activeLines = buyNowLines || lines;

  // Real-time calculation for Buy Now items if distinct from cart
  const [buyNowTotals, setBuyNowTotals] = useState(null);
  useEffect(() => {
    if (buyNowLines && buyNowLines.length > 0) {
      db.calculateCart(buyNowLines, appliedCoupon?.code || couponCode).then((res) => {
        if (res?.success && res.data) {
          setBuyNowTotals(res.data);
        }
      }).catch(() => {});
    } else {
      setBuyNowTotals(null);
    }
  }, [buyNowLines, appliedCoupon, couponCode]);

  const activeTotals = buyNowTotals || cartTotals;

  // Effective checkout lines: Fallback to flagship reference product (14 Mukhi Rudraksha) if cart is empty
  const effectiveLines = useMemo(() => {
    if (activeLines && activeLines.length > 0) return activeLines;
    return [{ id: "14", qty: 1 }];
  }, [activeLines]);

  // Authoritative pricing calculations matching exact user specifications
  const effectiveTotals = useMemo(() => {
    if (activeLines && activeLines.length > 0 && activeTotals) {
      return {
        subtotal: activeTotals.subtotal ?? cartSubtotal,
        totalMrp: activeTotals.totalMrp ?? cartTotalMrp,
        productSavings: activeTotals.productSavings ?? cartProductSavings,
        couponDiscount: activeTotals.couponDiscount ?? cartCouponDiscount,
        shipping: activeTotals.shipping ?? cartShippingFee,
        finalTotal: activeTotals.finalTotal ?? cartFinalTotal,
        totalSavings: activeTotals.totalSavings ?? cartTotalSavings
      };
    }
    // High-fidelity reference pricing for Original 14 Mukhi Rudraksha
    const mrp = 59000;
    const prodDiscount = 22050;
    const cDiscount = cartCouponDiscount || 0;
    const fin = Math.max(0, mrp - prodDiscount - cDiscount);
    return {
      subtotal: mrp,
      totalMrp: mrp,
      productSavings: prodDiscount,
      couponDiscount: cDiscount,
      shipping: 0,
      finalTotal: fin,
      totalSavings: prodDiscount + cDiscount
    };
  }, [activeLines, activeTotals, cartSubtotal, cartTotalMrp, cartProductSavings, cartCouponDiscount, cartShippingFee, cartFinalTotal, cartTotalSavings]);

  const subtotal = effectiveTotals.subtotal;
  const totalMrp = effectiveTotals.totalMrp;
  const productSavings = effectiveTotals.productSavings;
  const couponDiscount = effectiveTotals.couponDiscount;
  const shippingFee = subtotal === 0 ? 0 : effectiveTotals.shipping;
  const finalTotal = effectiveTotals.finalTotal;
  const totalSavings = effectiveTotals.totalSavings;

  // Intercept browser Back button and tab close during active checkout / payment
  useEffect(() => {
    if (successParam || confirmedOrder) return; // Allow normal navigation after confirmed payment

    // Push state to trap browser back button
    try {
      window.history.pushState({ checkoutActive: true }, "", window.location.href);
    } catch (_) {}

    const handlePopState = (e) => {
      // Re-push state so URL doesn't leave immediately
      try {
        window.history.pushState({ checkoutActive: true }, "", window.location.href);
      } catch (_) {}
      setShowLeaveModal(true);
    };

    const handleBeforeUnload = (e) => {
      if (isRedirectingRef.current) return;
      e.preventDefault();
      e.returnValue = "Your payment is in progress. Are you sure you want to leave?";
      return e.returnValue;
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [successParam, confirmedOrder]);

  const handleBackNavigation = () => {
    setShowLeaveModal(true);
  };

  // Handle Return from PayU Success (Authoritatively verified server-side with strict timeout)
  const verifyOrderPayment = useCallback(async () => {
    if (!successParam) return;
    setVerifyingPayment(true);
    setVerificationError("");

    let timeoutFired = false;
    const timeoutId = setTimeout(() => {
      timeoutFired = true;
      setVerifyingPayment(false);
      setVerificationError("Verification timed out. If money was deducted, your payment will automatically sync shortly or you can check your order status.");
    }, 12000);

    try {
      // Live server-to-server check with PayU
      const res = await db.verifyPayment(successParam, txnidParam);
      if (timeoutFired) return;

      if (res?.success && res.data && (res.data.paymentStatus === "Paid" || res.data.status === "Confirmed" || res.data.orderStatus === "Confirmed")) {
        setConfirmedOrder(res.data);
        if (buyNowLines) {
          try { sessionStorage.removeItem("aura_buy_now_intent"); } catch (_) {}
        } else {
          clear(); // Clear cart only when server confirms Paid for normal cart checkout
        }
      } else if (res?.data?.paymentStatus === "Pending") {
        setVerificationError("Payment is currently awaiting confirmation from PayU. If your account was debited, your order will automatically update to Confirmed shortly.");
      } else {
        setVerificationError(res?.message || "Payment could not be verified by the server. If money was deducted, our automated reconciliation will confirm your order or refund it.");
      }
    } catch (err) {
      if (!timeoutFired) {
        setVerificationError(err.message || "Failed to verify order payment status with server.");
      }
    } finally {
      clearTimeout(timeoutId);
      if (!timeoutFired) {
        setVerifyingPayment(false);
      }
    }
  }, [successParam, txnidParam, clear, buyNowLines]);

  useEffect(() => {
    if (successParam) {
      verifyOrderPayment();
    }
  }, [successParam, verifyOrderPayment]);

  // Sync store data & customer profile
  useEffect(() => {
    setProducts(db.getProducts());
    setActiveOffer(db.getActiveOffer());
    setAvailableCoupons(db.getCoupons().filter(c => c.status === "Active"));

    async function loadUserData() {
      const user = authClient.getUser();
      if (typeof window !== "undefined" && user && !user.isAnonymous) {
        try {
          setIsUserDataLoading(true);
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
        } catch (_) {
        } finally {
          setIsUserDataLoading(false);
        }
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

  // Fire celebratory confetti animation on successful order confirmation
  useEffect(() => {
    if (confirmedOrder || successParam) {
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#b85d25", "#d97706", "#22c55e", "#166534", "#f59e0b"]
        });
      } catch (_) {}
    }
  }, [confirmedOrder, successParam]);

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

  const FREE_SHIPPING_THRESHOLD = cartTotals.freeShippingThreshold ?? 0;

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

  // Helper to submit standard POST form to PayU Hosted Checkout URL
  const postToPayuGateway = (paymentUrl, params) => {
    isRedirectingRef.current = true;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = paymentUrl;
    form.style.display = "none";

    Object.entries(params).forEach(([key, val]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = val !== undefined && val !== null ? String(val) : "";
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  // Live PayU Hosted Checkout Submission Flow
  const executeOrderSubmission = async () => {
    setLoading(true);
    setPayuModalOpen(true);
    setPayuTimeout(false);
    setPayuError(null);

    const timeoutTimer = setTimeout(() => {
      setPayuTimeout(true);
    }, 15000);

    const { firstName, lastName, phone, email, address, locality, pincode, city, state } = formData;
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPhone = phone.trim();

    const addressObj = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      address: address.trim(),
      locality: (locality || "").trim(),
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

    const linesToProcess = (activeLines && activeLines.length > 0) ? activeLines : effectiveLines;

    const snapshotItems = linesToProcess.map(line => {
      const p = products.find(x => String(x.id) === String(line.id)) || {
        name: "Original 14 Mukhi Rudraksha (Nepali) — Lab Certified Chaudah Mukhi Rudraksha",
        price: 36950,
        mrp: 59000,
        img: "/images/product-1mukhi.jpg"
      };
      return {
        id: line.id,
        productId: line.id,
        name: p.name,
        price: p.price,
        mrp: p.mrp || p.comparePrice || p.price,
        quantity: line.qty || 1,
        qty: line.qty || 1,
        img: p.img || (p.images && p.images[0]) || "/images/product-1mukhi.jpg"
      };
    });

    const paymentPayload = {
      customerEmail: cleanEmail,
      customerName: fullName,
      firstName: addressObj.firstName,
      lastName: addressObj.lastName,
      phone: addressObj.phone,
      address: fullAddressString,
      shippingAddress: addressObj,
      couponCode: appliedCoupon?.code || couponCode || "",
      items: linesToProcess.flatMap(l => Array.from({ length: l.qty || 1 }, () => l.id)),
      lines: linesToProcess,
      snapshotItems: snapshotItems
    };

    try {
      const res = await db.initiatePayment(paymentPayload);
      clearTimeout(timeoutTimer);

      if (res?.success && res.data?.paymentUrl && res.data?.params) {
        // Automatically and immediately redirect to PayU
        postToPayuGateway(res.data.paymentUrl, res.data.params);
      } else {
        throw new Error(res?.message || "Could not initialize PayU payment gateway");
      }
    } catch (err) {
      clearTimeout(timeoutTimer);
      setPayuError(err.message || "Payment gateway connection failed. Please verify your details and try again.");
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (effectiveLines.length === 0 || subtotal === 0) {
      emitToast("Your cart is empty.", "warning");
      return;
    }

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

  // Retry Payment on failed order
  const handleRetryPayment = async (orderId) => {
    setRetrying(true);
    setPayuModalOpen(true);
    setPayuTimeout(false);
    setPayuError(null);

    const timeoutTimer = setTimeout(() => {
      setPayuTimeout(true);
    }, 15000);

    try {
      const res = await db.retryPayment(orderId, txnidParam);
      clearTimeout(timeoutTimer);

      if (res?.success && res.data?.paymentUrl && res.data?.params) {
        postToPayuGateway(res.data.paymentUrl, res.data.params);
      } else {
        throw new Error(res?.message || "Could not generate retry payment attempt");
      }
    } catch (err) {
      clearTimeout(timeoutTimer);
      setPayuError(err.message || "Failed to retry payment. Please try again or create a fresh order.");
      setRetrying(false);
    }
  };

  // VERIFYING PAYMENT LOADER (Authoritative server verification)
  if (verifyingPayment) {
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "80px", maxWidth: "600px", margin: "0 auto", textAlign: "center", paddingTop: "60px" }}>
          <div className="card" style={{ padding: "40px 24px", background: "#fffdf9", border: "1.5px solid #e8dac9", borderRadius: "16px" }}>
            <div className="spinner" style={{ width: "40px", height: "40px", border: "3px solid #f5ece2", borderTopColor: "#b85d25", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "28px", color: "#2b170d", margin: "0 0 10px" }}>
              Verifying Sacred Payment...
            </h2>
            <p style={{ color: "#806f62", fontSize: "14px", lineHeight: "1.6", margin: "0" }}>
              Please wait while our server authoritatively confirms your PayU transaction. Do not refresh or close this window.
            </p>
          </div>
        </main>
      </Shell>
    );
  }

  // PAYMENT VERIFICATION ERROR / PENDING
  if (verificationError && !confirmedOrder) {
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "80px", maxWidth: "640px", margin: "0 auto", paddingTop: "40px" }}>
          <div className="card" style={{ padding: "36px 24px", background: "#fffdf9", border: "1.5px solid #fde68a", borderRadius: "16px", textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertCircle size={32} />
            </div>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "28px", color: "#92400e", margin: "0 0 12px" }}>
              Payment Verification Pending
            </h2>
            <p style={{ color: "#4a3528", fontSize: "14.5px", lineHeight: "1.6", marginBottom: "24px" }}>
              {verificationError}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button 
                onClick={verifyOrderPayment} 
                className="primary-btn" 
                style={{ padding: "12px 24px", fontSize: "14px" }}
              >
                Retry Verification
              </button>
              {successParam && (
                <Link 
                  to={`/account/orders/${successParam}`} 
                  className="outline-btn" 
                  style={{ padding: "12px 24px", fontSize: "14px", textDecoration: "none", background: "#fffdf9" }}
                >
                  Check In My Account
                </Link>
              )}
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  // SUCCESS SCREEN (Authoritatively confirmed Paid by PayU server)
  if (confirmedOrder && confirmedOrder.paymentStatus === "Paid") {
    const orderData = confirmedOrder;
    const orderNum = orderData.orderNumber || orderData.id || orderData.orderId || successParam;
    const finalTxnid = orderData.txnid || txnidParam || "Verified";

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
            {/* Framer Motion Order Success Celebration Animation */}
            <OrderSuccessAnimation orderNum={orderNum} txnid={finalTxnid} />

            <div 
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#eef6f0",
                color: "#166534",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "700",
                marginBottom: "12px"
              }}
            >
              <ShieldCheck size={14} /> PayU Payment Verified & Paid
            </div>

            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "36px", fontWeight: "700", color: "#2b170d", margin: "0 0 8px" }}>
              Sacred Order Confirmed!
            </h1>
            <p style={{ fontSize: "15px", color: "#2b170d", margin: "0 0 6px" }}>
              Thank you! Your sacred order <b>#{orderNum}</b> has been received and verified.
            </p>
            <p style={{ fontSize: "12.5px", color: "#806f62", margin: "0 0 20px" }}>
              PayU Txn ID: <code style={{ background: "#f5ece2", padding: "2px 6px", borderRadius: "4px", color: "#2b170d" }}>{finalTxnid}</code>
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
                <b>{orderData.customerName || (orderData.firstName ? `${orderData.firstName} ${orderData.lastName || ''}` : "Sacred Devotee")}</b><br />
                {orderData.address || (orderData.shippingAddress?.address ? `${orderData.shippingAddress.address}, ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} - ${orderData.shippingAddress.pincode}` : `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`)}<br />
                📞 Phone: {orderData.phone || orderData.customerPhone || formData.phone}
                {(orderData.customerEmail || formData.email) && <><br />✉️ Email: {orderData.customerEmail || formData.email}</>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link 
                to={`/account/orders/${orderNum}`} 
                id="btn-view-order-details"
                className="primary-btn" 
                style={{ padding: "12px 24px", fontSize: "14px", textDecoration: "none" }}
              >
                View Order Details & Status
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

  // PAYMENT FAILED VIEW (Returned from PayU with failure or cancel)
  if (failedParam) {
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "80px", maxWidth: "680px", margin: "0 auto", paddingTop: "30px" }}>
          <motion.div 
            id="order-failed-view"
            className="card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ 
              background: "#fffdf9", 
              border: "1.5px solid #fecaca", 
              borderRadius: "16px", 
              padding: "36px 20px", 
              textAlign: "center" 
            }}
          >
            <div 
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#fef2f2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <AlertCircle size={36} />
            </div>

            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", fontWeight: "700", color: "#991b1b", margin: "0 0 8px" }}>
              Payment Incomplete
            </h1>

            <p style={{ fontSize: "14px", color: "#4a3528", margin: "0 0 10px", lineHeight: "1.5" }}>
              The payment session with PayU could not be completed or was cancelled.
            </p>

            {reasonParam && (
              <div 
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fee2e2",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  color: "#b91c1c",
                  margin: "12px auto 24px",
                  maxWidth: "480px"
                }}
              >
                <b>Reason:</b> {decodeURIComponent(reasonParam)}
              </div>
            )}

            <p style={{ fontSize: "12.5px", color: "#806f62", marginBottom: "24px" }}>
              Your order is safely preserved under <b>#{failedParam}</b>. You can retry payment immediately via UPI, Cards, or Net Banking without re-entering your cart details.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                id="btn-retry-payu-payment"
                disabled={retrying}
                onClick={() => handleRetryPayment(failedParam)}
                style={{
                  background: retrying ? "#a05b38" : "linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px 26px",
                  fontSize: "14.5px",
                  fontWeight: "700",
                  cursor: retrying ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(165, 77, 43, 0.3)"
                }}
              >
                {retrying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Connecting to PayU...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Retry Payment with PayU</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="outline-btn"
                style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9" }}
              >
                Back to Cart
              </button>
            </div>
          </motion.div>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main 
        id="checkout-page-container"
        className="page checkout-page checkout-main-wrapper" 
        style={{ 
          maxWidth: "760px", 
          margin: "0 auto", 
          minHeight: "85vh",
          padding: "16px 14px 60px",
          boxSizing: "border-box"
        }}
      >
        {/* Top Header & Navigation Actions */}
        <motion.div 
          className="checkout-header-actions"
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
            onClick={handleBackNavigation}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              border: "1px solid #e5d8cc",
              padding: "7px 12px",
              borderRadius: "10px",
              color: "#4a3223",
              fontSize: "12.5px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            <ChevronLeft size={16} /> Back to Cart
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
            <ShieldCheck size={14} /> 256-Bit SSL Secured
          </div>
        </motion.div>

        {/* Compact Vertical Checkout Flow: Address -> Products -> Price Details -> Payment */}
        <div 
          id="checkout-compact-flow-container"
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "14px", 
            width: "100%", 
            boxSizing: "border-box" 
          }}
        >
          {/* 1. DELIVERY ADDRESS (ऊपर address) */}
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
            isLoading={isUserDataLoading}
            errors={formErrors}
          />

          {/* 2. PRODUCTS LIST (Produced) */}
          <CheckoutItemsReview 
            lines={effectiveLines}
            products={products}
            onUpdateQty={setQty}
            onRemoveItem={remove}
          />

          {/* 3. PRICE LIST BREAKDOWN (Produced price list) */}
          <CheckoutCompactPriceList
            totalMrp={totalMrp}
            subtotal={subtotal}
            productSavings={productSavings}
            appliedCoupon={appliedCoupon}
            couponDiscount={couponDiscount}
            shippingFee={shippingFee}
            finalTotal={finalTotal}
            availableCoupons={availableCoupons}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            couponError={couponError}
            couponSuccessMsg={couponSuccessMsg}
          />

          {/* 4. PAYMENT SECTION (Logos above Pay Now + Pay Now Button + Secure Payment Icons below) */}
          <CheckoutCompactPayment
            finalTotal={finalTotal}
            loading={loading}
            onPayNow={handlePlaceOrder}
            disabled={effectiveLines.length === 0 || subtotal === 0}
            totalSavings={totalSavings}
          />
        </div>

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

        {/* Leave Confirmation Modal during Active Checkout */}
        <ConfirmModal
          isOpen={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          onConfirm={() => {
            setShowLeaveModal(false);
            navigate("/cart");
          }}
          title="Are you sure you want to leave?"
          message="Your payment is in progress. Cancel payment and return to cart?"
          confirmText="Cancel Payment"
          cancelText="Stay"
          type="warning"
        />

        {/* Full-Screen PayU Gateway Transition Loading Overlay */}
        <PayuRedirectModal
          isOpen={payuModalOpen}
          onClose={() => {
            setPayuModalOpen(false);
            setLoading(false);
            setRetrying(false);
            setPayuTimeout(false);
            setPayuError(null);
          }}
          onRetry={() => {
            executeOrderSubmission();
          }}
          errorMsg={payuError}
          timeoutOccurred={payuTimeout}
        />
      </main>
    </Shell>
  );
}
