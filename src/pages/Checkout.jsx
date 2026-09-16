import { getProductPrimaryImage, getProductGalleryImages } from "../lib/imageUtils";
import { getProductRoute } from "../lib/routes";
import { resolveCartProduct } from "../lib/productResolver";
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
import { triggerHaptic } from "../lib/haptics";

export function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleBackNavigation = () => {
    if (window.history && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };


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

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    landmark: "",
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
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Local coupon form input state & messages
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccessMsg, setCouponSuccessMsg] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Authoritative server-side verification state
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [isUserDataLoading, setIsUserDataLoading] = useState(() => Boolean(authClient.getUser() && !authClient.getUser().isAnonymous));
  const [storeSettings, setStoreSettings] = useState(() => db.getSettings?.() || {});

  // PayU Redirect Modal State
  const [payuModalOpen, setPayuModalOpen] = useState(false);
  const [paymentState, setPaymentState] = useState("IDLE"); // IDLE, INITIATING, REDIRECTING, PAYU_ACTIVE, PENDING
  const [isStatusPolling, setIsStatusPolling] = useState(false);
  const [payuTimeout, setPayuTimeout] = useState(false);
  const [payuError, setPayuError] = useState(null);
  const isRedirectingRef = useRef(false);
  const isSubmittingRef = useRef(false);

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

  // Effective checkout lines: Return empty array if cart is empty
  const effectiveLines = useMemo(() => {
    if (activeLines && activeLines.length > 0) return activeLines;
    return [];
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
    // Zeroed pricing for empty cart
    return {
      subtotal: 0,
      totalMrp: 0,
      productSavings: 0,
      couponDiscount: 0,
      shipping: 0,
      finalTotal: 0,
      totalSavings: 0
    };
  }, [activeLines, activeTotals, cartSubtotal, cartTotalMrp, cartProductSavings, cartCouponDiscount, cartShippingFee, cartFinalTotal, cartTotalSavings]);

  const subtotal = effectiveTotals.subtotal;
  const totalMrp = effectiveTotals.totalMrp;
  const productSavings = effectiveTotals.productSavings;
  const couponDiscount = effectiveTotals.couponDiscount;
  const shippingFee = subtotal === 0 ? 0 : effectiveTotals.shipping;
  const finalTotal = effectiveTotals.finalTotal;
  const totalSavings = effectiveTotals.totalSavings;

  // Detect Unresolved Payment Attempt (Back from PayU)


  const isVerifyingRef = useRef(false);
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
              id: chosenAddr.id || null,
              firstName: chosenAddr.firstName || addrNameParts[0] || autoFirstName,
              lastName: chosenAddr.lastName || addrNameParts.slice(1).join(" ") || autoLastName,
              phone: chosenAddr.phone || autoPhone,
              email: chosenAddr.email || autoEmail,
              address: chosenAddr.address || "",
              landmark: chosenAddr.landmark || "",
              locality: chosenAddr.locality || "",
              pincode: chosenAddr.pincode || "",
              city: chosenAddr.city || "",
              state: chosenAddr.state || "",
              isDefault: chosenAddr.isDefault ?? true
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
    if (confirmedOrder) {
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#b85d25", "#d97706", "#22c55e", "#166534", "#f59e0b"]
        });
      } catch (_) {}
    }
  }, [confirmedOrder]);

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
      const addrNameParts = (savedAddress.name || "").trim().split(/\s+/);
      setFormData({
        id: savedAddress.id || null,
        firstName: savedAddress.firstName || addrNameParts[0] || "",
        lastName: savedAddress.lastName || addrNameParts.slice(1).join(" ") || "",
        phone: savedAddress.phone || "",
        email: savedAddress.email || "",
        address: savedAddress.address || "",
        landmark: savedAddress.landmark || "",
        locality: savedAddress.locality || "",
        pincode: savedAddress.pincode || "",
        city: savedAddress.city || "",
        state: savedAddress.state || "",
        isDefault: true
      });
      setUsingSavedAddress(true);
      triggerHaptic("selection");
      emitToast("Loaded default saved address", "info");
    }
  };

  const handleUseDifferentAddress = () => {
    triggerHaptic("selection");
    setUsingSavedAddress(false);
    setFormData(prev => ({
      ...prev,
      id: null,
      address: "",
      landmark: "",
      locality: "",
      pincode: "",
      city: "",
      state: "",
      isDefault: true
    }));
  };

  const getLatestFormData = (baseData) => {
    const mapping = {
      firstName: ["input-firstName", "firstName", "given-name"],
      lastName: ["input-lastName", "lastName", "family-name"],
      phone: ["input-phone", "phone", "tel"],
      email: ["input-email", "email", "email"],
      address: ["input-address", "address", "street-address"],
      landmark: ["input-landmark", "landmark"],
      pincode: ["input-pincode", "pincode", "postal-code"],
      city: ["input-city", "city", "address-level2"],
      state: ["input-state", "state", "address-level1"],
    };
    const current = { ...(baseData || {}) };
    for (const [key, targets] of Object.entries(mapping)) {
      let el = null;
      for (const t of targets) {
        el = document.getElementById(t) || document.querySelector(`[name="${t}"]`) || document.querySelector(`[autocomplete*="${t}"]`);
        if (el && el.value) break;
      }
      if (el && typeof el.value === "string") {
        const val = el.value.trim();
        if (val) {
          current[key] = val;
        }
      }
    }

    // Secondary fallbacks for email if still missing
    if (!current.email || !String(current.email).trim()) {
      const userProf = db.getUserProfile ? db.getUserProfile() : null;
      const fallbackEmail = userProf?.email || authClient?.currentUser?.email || "";
      if (fallbackEmail) {
        current.email = fallbackEmail.trim();
      }
    }

    return current;
  };

  const handleEditAddress = () => {
    triggerHaptic("selection");
    setUsingSavedAddress(false);
  };

  // Explicit Save / Update Address Handler
  const handleSaveEditedAddress = async (customFormData = null) => {
    const dataToSave = getLatestFormData(customFormData || formData);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!dataToSave.firstName?.trim()) {
      triggerHaptic("warning");
      emitToast("First Name is required", "error");
      return false;
    }
    if (!dataToSave.lastName?.trim()) {
      triggerHaptic("warning");
      emitToast("Last Name is required", "error");
      return false;
    }
    if (!dataToSave.phone?.trim() || dataToSave.phone.trim().length < 10) {
      triggerHaptic("warning");
      emitToast("Valid 10-digit mobile number is required", "error");
      return false;
    }
    if (!dataToSave.email?.trim() || !emailRegex.test(dataToSave.email.trim())) {
      triggerHaptic("warning");
      emitToast("Valid email address is required for order receipt & payment", "error");
      return false;
    }
    if (!dataToSave.address?.trim()) {
      triggerHaptic("warning");
      emitToast("Full delivery address is required", "error");
      return false;
    }
    if (!dataToSave.pincode?.trim() || dataToSave.pincode.trim().length !== 6) {
      triggerHaptic("warning");
      emitToast("Valid 6-digit Pincode is required", "error");
      return false;
    }
    if (!dataToSave.city?.trim() || !dataToSave.state?.trim()) {
      triggerHaptic("warning");
      emitToast("City and State are required", "error");
      return false;
    }

    setFormData(dataToSave);
    setIsSavingAddress(true);
    try {
      const addressObj = {
        id: dataToSave.id || savedAddress?.id || ("ADDR-" + Date.now()),
        firstName: dataToSave.firstName.trim(),
        lastName: dataToSave.lastName.trim(),
        name: `${dataToSave.firstName.trim()} ${dataToSave.lastName.trim()}`,
        phone: dataToSave.phone.trim(),
        email: dataToSave.email.trim().toLowerCase(),
        address: dataToSave.address.trim(),
        landmark: (dataToSave.landmark || "").trim(),
        locality: (dataToSave.locality || "").trim(),
        pincode: dataToSave.pincode.trim(),
        city: dataToSave.city.trim(),
        state: dataToSave.state.trim(),
        isDefault: true
      };

      const res = await db.saveAddress(addressObj);
      if (res?.success) {
        let updatedAddr = addressObj;
        if (Array.isArray(res.data) && res.data.length > 0) {
          updatedAddr = res.data.find(a => String(a.id) === String(addressObj.id)) || res.data.find(a => a.isDefault) || res.data[0];
        }
        setSavedAddress(updatedAddr);
        setUsingSavedAddress(true);
        setFormData({
          id: updatedAddr.id || addressObj.id,
          firstName: updatedAddr.firstName || addressObj.firstName,
          lastName: updatedAddr.lastName || addressObj.lastName,
          phone: updatedAddr.phone || addressObj.phone,
          email: updatedAddr.email || addressObj.email,
          address: updatedAddr.address || addressObj.address,
          landmark: updatedAddr.landmark || addressObj.landmark,
          locality: updatedAddr.locality || addressObj.locality,
          pincode: updatedAddr.pincode || addressObj.pincode,
          city: updatedAddr.city || addressObj.city,
          state: updatedAddr.state || addressObj.state,
          isDefault: true
        });
        triggerHaptic("success");
        emitToast("Delivery address updated and saved successfully!", "success");
        return true;
      } else {
        throw new Error(res?.message || "Failed to save address");
      }
    } catch (err) {
      triggerHaptic("warning");
      console.error("Error saving address:", err);
      emitToast("Error saving address: " + (err?.message || "Please try again"), "error");
      return false;
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Synchronized Coupon Application
  const handleApplyCoupon = async (codeToApply) => {
    setCouponError("");
    setCouponSuccessMsg("");
    const code = (codeToApply || couponInput).trim().toUpperCase();

    if (!code) {
      triggerHaptic("warning");
      setCouponError("Please enter a valid coupon code");
      emitToast("Please enter a coupon code", "warning");
      return;
    }

    setValidatingCoupon(true);

    try {
      const res = await applyCoupon(code);
      if (res.valid) {
        triggerHaptic("success");
        setCouponInput("");
        setCouponSuccessMsg(res.message || `Coupon '${code}' applied successfully!`);
        emitToast(res.message || `Coupon '${code}' applied!`, "success");
      } else {
        triggerHaptic("warning");
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
      triggerHaptic("warning");
      setCouponError(err.message || "Could not validate coupon");
      emitToast(err.message || "Could not validate coupon", "error");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    triggerHaptic("light");
    removeCoupon();
    setCouponInput("");
    setCouponError("");
    setCouponSuccessMsg("");
    emitToast("Coupon removed", "info");
  };

  const FREE_SHIPPING_THRESHOLD = cartTotals.freeShippingThreshold ?? 0;

  // Validate form fields
  const validateForm = () => {
    const current = getLatestFormData(formData);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors = {};
    if (!current.firstName?.trim()) errors.firstName = "First name is required";
    if (!current.lastName?.trim()) errors.lastName = "Last name is required";
    if (!current.phone?.trim() || current.phone.trim().length < 10) {
      errors.phone = "Valid 10-digit phone number is required";
    }
    if (!current.email?.trim()) {
      errors.email = "Email address is required";
    } else if (!emailRegex.test(current.email.trim())) {
      errors.email = "Please enter a valid email address";
    }
    if (!current.address?.trim()) errors.address = "Full address is required";
    if (!current.pincode?.trim() || current.pincode.trim().length < 6) {
      errors.pincode = "Valid 6-digit pincode is required";
    }
    if (!current.city?.trim()) errors.city = "City is required";
    if (!current.state?.trim()) errors.state = "State is required";

    setFormErrors(errors);
    if (Object.keys(errors).length === 0) {
      setFormData(current);
      return true;
    }
    return false;
  };

  // Helper to submit standard POST form to PayU Hosted Checkout URL
  const postToPayuGateway = (paymentUrl, params) => {
    setPaymentState("PAYU_ACTIVE");
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
    window.history.replaceState({ auraSafeNav: true, page: "home" }, "", "/");
    form.submit();
  };

  // Live PayU Hosted Checkout Submission Flow
  const executeOrderSubmission = async () => {
    setLoading(true);
    setPayuModalOpen(true);
    setPaymentState("INITIATING");
    setPayuTimeout(false);
    setPayuError(null);

    const currentForm = getLatestFormData(formData);
    const { firstName, lastName, phone, email, address, landmark, locality, pincode, city, state } = currentForm;
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPhone = phone.trim();

    const addressObj = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      address: address.trim(),
      landmark: (landmark || "").trim(),
      locality: (locality || "").trim(),
      pincode: pincode.trim(),
      city: city.trim(),
      state: state.trim()
    };

    // Save address in background if user checked it
    if (saveAddressCheck) {
      // Fire and forget, don't block payment redirect
      db.saveAddress(addressObj).catch(() => {});
    }

    const fullName = `${addressObj.firstName} ${addressObj.lastName}`.trim();
    const fullAddressString = `${addressObj.address}${addressObj.landmark ? `, ${addressObj.landmark}` : ''}, ${addressObj.city}, ${addressObj.state} - ${addressObj.pincode}`;

    const linesToProcess = (activeLines && activeLines.length > 0) ? activeLines : effectiveLines;

    const unresolvable = linesToProcess.find(line => !resolveCartProduct(products, line));
    if (unresolvable) {
      setLoading(false);
      setPayuModalOpen(false);
      emitToast("One or more items in your cart could not be verified. Please review your cart.", "error");
      return;
    }

    const snapshotItems = linesToProcess.map(line => {
      const p = resolveCartProduct(products, line);
      return {
        id: line.id,
        productId: p.productId || p.id || line.id,
        name: p.name,
        price: p.price,
        mrp: p.mrp || p.comparePrice || p.price,
        quantity: line.qty || 1,
        qty: line.qty || 1,
        variant: line.variant || p.selectedVariant || "",
        size: line.size || "",
        origin: p.origin || (p.isIndonesian ? "Java / Indonesia" : "Nepal"),
        isIndonesian: !!p.isIndonesian,
        img: getProductPrimaryImage(p)
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

      if (res?.success && res.data?.paymentUrl && res.data?.params) {
        if (res.data?.guestToken) {
          try {
            sessionStorage.setItem("aura_guest_token", res.data.guestToken);
            localStorage.setItem("aura_guest_token", res.data.guestToken);
          } catch (_) {}
        }
        setPaymentState("REDIRECTING");
        // Clear cart immediately upon order creation so products do not linger in cart
        try {
          clear();
        } catch (_) {}
        // Automatically and immediately redirect to PayU
        postToPayuGateway(res.data.paymentUrl, res.data.params);
      } else {
        throw new Error(res?.message || "Could not initialize PayU payment gateway");
      }
    } catch (err) {
      setPayuError(err.message || "Payment gateway connection failed. Please verify your details and try again.");
      setPaymentState("FAILED");
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    if (loading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (effectiveLines.length === 0) {
      triggerHaptic("warning");
      emitToast("Your cart is empty.", "warning");
      isSubmittingRef.current = false;
      return;
    }

    if (!validateForm()) {
      triggerHaptic("warning");
      emitToast("Please fill in all required shipping details correctly.", "warning");
      const el = document.getElementById("checkout-address-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      isSubmittingRef.current = false;
      return;
    }

    triggerHaptic("medium");
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
    triggerHaptic("medium");
    setRetrying(true);
    setPaymentState("INITIATING");
    setPayuModalOpen(true);
    setPayuTimeout(false);
    setPayuError(null);



    try {
      const res = await db.retryPayment(orderId, null);

      if (res?.success && res.data?.paymentUrl && res.data?.params) {
        setPaymentState("REDIRECTING");
        postToPayuGateway(res.data.paymentUrl, res.data.params);
      } else {
        throw new Error(res?.message || "Could not generate retry payment attempt");
      }
    } catch (err) {
      setPayuError(err.message || "Failed to retry payment. Please try again or create a fresh order.");
      setPaymentState("FAILED");
      setRetrying(false);
    }
  };

   
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
        <div 
          className="checkout-header-actions"
          
          
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
        </div>

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
            onSaveAddress={handleSaveEditedAddress}
            isSavingAddress={isSavingAddress}
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
          {authModalOpen && (
            <CheckoutAuthModal 
              isOpen={authModalOpen}
              onClose={() => setAuthModalOpen(false)}
              onSuccess={handleAuthSuccess}
            />
          )}


        {/* Full-Screen PayU Gateway Transition Loading Overlay */}
        <PayuRedirectModal
          isOpen={payuModalOpen}
          state={paymentState}
          amount={finalTotal}
          errorMsg={payuError}
          timeoutOccurred={payuTimeout}
        />
      </main>
    </Shell>
  );
}
