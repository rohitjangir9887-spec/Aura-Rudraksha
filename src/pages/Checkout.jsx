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
import { fireConfetti } from "../lib/confetti";

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
import {
  initMetaPixel,
  trackMetaInitiateCheckout,
  trackMetaPurchase,
  getAdAttribution
} from "../lib/metaPixel";
// Helper to immediately resolve saved delivery address from local cache with 0ms lag
function getInitialCheckoutAddress() {
  try {
    const user = authClient.getUser();
    const cachedAddrs = db.getCachedAddresses?.() || [];
    let defaultAddr = null;
    if (Array.isArray(cachedAddrs) && cachedAddrs.length > 0) {
      defaultAddr = cachedAddrs.find(a => a.isDefault) || cachedAddrs[0];
    }
    const cachedMe = db.getCachedCustomerMe?.() || {};
    const fullName = (cachedMe?.name && cachedMe.name !== "Customer" && cachedMe.name !== "Aura Devotee") 
      ? cachedMe.name 
      : (user?.displayName || (user?.email ? user.email.split("@")[0].replace(/[._0-9]+/g, ' ') : ""));
    const nameParts = fullName.trim().split(/\s+/);
    const autoFirstName = nameParts[0] || "";
    const autoLastName = nameParts.slice(1).join(" ") || "";
    const autoEmail = cachedMe?.email || user?.email || "";
    const autoPhone = cachedMe?.phone || user?.phoneNumber || "";

    if (defaultAddr && (defaultAddr.address || defaultAddr.city)) {
      const addrNameParts = (defaultAddr.name || fullName).trim().split(/\s+/);
      const resolvedAddr = {
        ...defaultAddr,
        firstName: defaultAddr.firstName || addrNameParts[0] || autoFirstName,
        lastName: defaultAddr.lastName || addrNameParts.slice(1).join(" ") || autoLastName,
        phone: defaultAddr.phone || autoPhone,
        email: defaultAddr.email || autoEmail,
        isDefault: true
      };
      return {
        savedAddr: resolvedAddr,
        usingSaved: true,
        initialFormData: {
          id: resolvedAddr.id || null,
          firstName: resolvedAddr.firstName,
          lastName: resolvedAddr.lastName,
          phone: resolvedAddr.phone,
          email: resolvedAddr.email,
          address: resolvedAddr.address || "",
          landmark: resolvedAddr.landmark || "",
          locality: resolvedAddr.locality || "",
          pincode: resolvedAddr.pincode || "",
          city: resolvedAddr.city || "",
          state: resolvedAddr.state || "",
          isDefault: true
        },
        hasCachedData: true
      };
    }

    if (cachedMe && cachedMe.address) {
      const resolvedAddr = {
        id: null,
        firstName: autoFirstName,
        lastName: autoLastName,
        phone: autoPhone,
        email: autoEmail,
        address: cachedMe.address || "",
        landmark: "",
        locality: "",
        pincode: cachedMe.pincode || "",
        city: cachedMe.city || "",
        state: cachedMe.state || "",
        isDefault: true
      };
      return {
        savedAddr: resolvedAddr,
        usingSaved: true,
        initialFormData: resolvedAddr,
        hasCachedData: true
      };
    }

    return {
      savedAddr: null,
      usingSaved: false,
      initialFormData: {
        firstName: autoFirstName,
        lastName: autoLastName,
        phone: autoPhone,
        email: autoEmail,
        address: "",
        landmark: "",
        locality: "",
        pincode: "",
        city: "",
        state: "",
        isDefault: true
      },
      hasCachedData: false
    };
  } catch (_) {
    return {
      savedAddr: null,
      usingSaved: false,
      initialFormData: {
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        address: "",
        landmark: "",
        locality: "",
        pincode: "",
        city: "",
        state: "",
        isDefault: true
      },
      hasCachedData: false
    };
  }
}

export function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleBackNavigation = () => {
    if (window.history && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/cart");
    }
  };


  const [products, setProducts] = useState(() => db.getProducts());
  const [activeOffer, setActiveOffer] = useState(() => db.getActiveOffer());
  const [availableCoupons, setAvailableCoupons] = useState(() => 
    db.getCoupons().filter(c => c && c.status === "Active" && c.showOnCart !== false)
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

  const initialAddrState = useMemo(() => getInitialCheckoutAddress(), []);

  // Form State
  const [formData, setFormData] = useState(() => initialAddrState.initialFormData);
  const [formErrors, setFormErrors] = useState({});

  // Saved Address State
  const [savedAddress, setSavedAddress] = useState(() => initialAddrState.savedAddr);
  const [usingSavedAddress, setUsingSavedAddress] = useState(() => initialAddrState.usingSaved);
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
  const [isUserDataLoading, setIsUserDataLoading] = useState(() => {
    const user = authClient.getUser();
    if (!user || user.isAnonymous) return false;
    return !initialAddrState.hasCachedData;
  });
  const [storeSettings, setStoreSettings] = useState(() => db.getSettings?.() || {});
  const enableCod = storeSettings?.enableCod !== false;
  const enableOnlinePayment = storeSettings?.enableOnlinePayment !== false;
  const codFeeSetting = Number(storeSettings?.codFee) || 0;

  // Payment method state: both ONLINE and COD are enabled by default; user can switch freely
  const [paymentMethod, setPaymentMethod] = useState(() => {
    const initialSettings = db.getSettings?.() || {};
    if (initialSettings.enableOnlinePayment === false && initialSettings.enableCod !== false) {
      return "COD";
    }
    return "ONLINE";
  });

  // Keep selected paymentMethod valid if admin toggles one off
  useEffect(() => {
    if (paymentMethod === "ONLINE" && !enableOnlinePayment && enableCod) {
      setPaymentMethod("COD");
    } else if (paymentMethod === "COD" && !enableCod && enableOnlinePayment) {
      setPaymentMethod("ONLINE");
    }
  }, [enableOnlinePayment, enableCod, paymentMethod]);

  // PayU Redirect Modal State
  const [payuModalOpen, setPayuModalOpen] = useState(false);
  const [paymentState, setPaymentState] = useState("IDLE"); // IDLE, INITIATING, REDIRECTING, PAYU_ACTIVE, PENDING, CANCELLED, FAILED
  const [isStatusPolling, setIsStatusPolling] = useState(false);
  const [payuTimeout, setPayuTimeout] = useState(false);
  const [payuError, setPayuError] = useState(null);
  const [lastUnpaidOrder, setLastUnpaidOrder] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const oId = sessionStorage.getItem("aura_pending_orderId");
      const tId = sessionStorage.getItem("aura_pending_txnid");
      const gTok = sessionStorage.getItem("aura_guest_token") || localStorage.getItem("aura_guest_token");
      if (oId) return { orderId: oId, txnid: tId || "", guestToken: gTok || "" };
    } catch (_) {}
    return null;
  });
  const isRedirectingRef = useRef(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    db.fetchSettings?.().then(res => {
      if (mounted && res) {
        setStoreSettings(res);
        if (res.metaPixelEnabled !== false && res.metaPixelId) {
          initMetaPixel(res.metaPixelId);
        }
      }
    }).catch(() => {});
    const onSettingsSync = (e) => {
      if (mounted && e?.detail) setStoreSettings(e.detail);
    };
    window.addEventListener("aura:store:settings:synced", onSettingsSync);
    window.addEventListener("aura:store:settings:updated", onSettingsSync);
    return () => {
      mounted = false;
      window.removeEventListener("aura:store:settings:synced", onSettingsSync);
      window.removeEventListener("aura:store:settings:updated", onSettingsSync);
    };
  }, []);

  // Determine active checkout items (Buy Now intent vs normal cart lines)
  const buyNowIntentStr = typeof window !== "undefined" ? sessionStorage.getItem("aura_buy_now_intent") : null;
  const buyNowLines = useMemo(() => {
    if (!buyNowIntentStr) return null;
    try {
      const parsed = JSON.parse(buyNowIntentStr);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) return parsed.lines;
    } catch (_) {}
    return null;
  }, [buyNowIntentStr]);

  const activeLines = buyNowLines || lines;

  // Real-time calculation for Buy Now items if distinct from cart
  const [buyNowTotals, setBuyNowTotals] = useState(() => {
    try {
      if (buyNowLines && buyNowLines.length > 0 && db && typeof db.calculateCartSync === "function") {
        const calc = db.calculateCartSync(buyNowLines, couponCode);
        return calc?.data || null;
      }
    } catch (_) {}
    return null;
  });

  useEffect(() => {
    try {
      if (buyNowLines && buyNowLines.length > 0 && db && typeof db.calculateCartSync === "function") {
        const calc = db.calculateCartSync(buyNowLines, appliedCoupon?.code || couponCode);
        if (calc?.success && calc.data) {
          setBuyNowTotals(calc.data);
          return;
        }
      }
    } catch (_) {}
    setBuyNowTotals(null);
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
  const activeCodFee = subtotal > 0 && paymentMethod === "COD" && enableCod ? codFeeSetting : 0;
  const finalTotal = effectiveTotals.finalTotal + activeCodFee;
  const totalSavings = effectiveTotals.totalSavings;

  // Fire Meta Pixel InitiateCheckout event once when checkout page loads with items
  const initiateTrackedRef = useRef(false);
  useEffect(() => {
    if (!initiateTrackedRef.current && effectiveLines.length > 0 && finalTotal > 0) {
      initiateTrackedRef.current = true;
      trackMetaInitiateCheckout({
        lines: effectiveLines,
        total: finalTotal
      });
    }
  }, [effectiveLines, finalTotal]);

  // Detect Unresolved Payment Attempt (Back button from PayU / bfcache restoration)
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleReturnFromGateway = async (isBfCache = false) => {
      const pendingOrderId = sessionStorage.getItem("aura_pending_orderId");
      const pendingTxnid = sessionStorage.getItem("aura_pending_txnid");
      const pendingGuestToken = sessionStorage.getItem("aura_guest_token") || localStorage.getItem("aura_guest_token") || "";

      // Always unlock UI submission states if returning via browser Back button
      if (isBfCache || isRedirectingRef.current || pendingOrderId) {
        isRedirectingRef.current = false;
        isSubmittingRef.current = false;
        setLoading(false);
        setRetrying(false);
      }

      if (!pendingOrderId || isVerifyingRef.current) return;
      isVerifyingRef.current = true;

      try {
        const res = await db.verifyPayment(pendingOrderId, pendingTxnid || pendingOrderId, pendingGuestToken);
        const pStatus = res?.data?.paymentStatus;

        if (pStatus === "Paid") {
          sessionStorage.removeItem("aura_pending_orderId");
          sessionStorage.removeItem("aura_pending_txnid");
          sessionStorage.removeItem("aura_pending_timestamp");
          sessionStorage.removeItem("aura_buy_now_intent");
          try { clear(); } catch (_) {}
          const gQuery = pendingGuestToken ? `&guestToken=${encodeURIComponent(pendingGuestToken)}` : "";
          navigate(`/payment-result?status=success&orderId=${encodeURIComponent(pendingOrderId)}&txnid=${encodeURIComponent(pendingTxnid || "")}${gQuery}`, { replace: true });
          return;
        }

        // User pressed Back from PayU before completing payment
        sessionStorage.removeItem("aura_pending_orderId");
        sessionStorage.removeItem("aura_pending_txnid");
        sessionStorage.removeItem("aura_pending_timestamp");

        setLastUnpaidOrder({
          orderId: pendingOrderId,
          txnid: pendingTxnid || "",
          guestToken: pendingGuestToken
        });
        setPaymentState("CANCELLED");
        setPayuModalOpen(true);
      } catch (_) {
        sessionStorage.removeItem("aura_pending_orderId");
        sessionStorage.removeItem("aura_pending_txnid");
        sessionStorage.removeItem("aura_pending_timestamp");
        setLastUnpaidOrder({
          orderId: pendingOrderId,
          txnid: pendingTxnid || "",
          guestToken: pendingGuestToken
        });
        setPaymentState("CANCELLED");
        setPayuModalOpen(true);
      } finally {
        isVerifyingRef.current = false;
      }
    };

    const onPageShow = (e) => {
      if (e.persisted || sessionStorage.getItem("aura_pending_orderId")) {
        handleReturnFromGateway(true);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && sessionStorage.getItem("aura_pending_orderId")) {
        const ts = Number(sessionStorage.getItem("aura_pending_timestamp") || 0);
        if (!ts || Date.now() - ts > 1200) {
          handleReturnFromGateway(false);
        }
      }
    };

    // Check on initial mount if user navigated back to /checkout
    if (sessionStorage.getItem("aura_pending_orderId")) {
      handleReturnFromGateway(false);
    }

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [clear, navigate]);

  useEffect(() => {
    setProducts(db.getProducts());
    setActiveOffer(db.getActiveOffer());
    setAvailableCoupons(db.getCoupons().filter(c => c && c.status === "Active" && c.showOnCart !== false));

    async function loadUserData() {
      const user = authClient.getUser();
      if (typeof window !== "undefined" && user && !user.isAnonymous) {
        try {
          if (!initialAddrState.hasCachedData && !savedAddress) {
            setIsUserDataLoading(true);
          }
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
            const resolvedAddr = {
              ...chosenAddr,
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
            };
            setSavedAddress(resolvedAddr);
            setUsingSavedAddress(true);
            setFormData(prev => ({
              ...prev,
              id: resolvedAddr.id,
              firstName: resolvedAddr.firstName || prev.firstName,
              lastName: resolvedAddr.lastName || prev.lastName,
              phone: resolvedAddr.phone || prev.phone,
              email: resolvedAddr.email || prev.email,
              address: resolvedAddr.address || prev.address,
              landmark: resolvedAddr.landmark || prev.landmark,
              locality: resolvedAddr.locality || prev.locality,
              pincode: resolvedAddr.pincode || prev.pincode,
              city: resolvedAddr.city || prev.city,
              state: resolvedAddr.state || prev.state,
              isDefault: true
            }));
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
        fireConfetti({
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
    if (savedAddress) {
      const addrNameParts = (savedAddress.name || "").trim().split(/\s+/);
      setFormData(prev => ({
        ...prev,
        id: savedAddress.id || prev.id || null,
        firstName: savedAddress.firstName || addrNameParts[0] || prev.firstName || "",
        lastName: savedAddress.lastName || addrNameParts.slice(1).join(" ") || prev.lastName || "",
        phone: savedAddress.phone || prev.phone || "",
        email: savedAddress.email || prev.email || "",
        address: savedAddress.address || prev.address || "",
        landmark: savedAddress.landmark || prev.landmark || "",
        locality: savedAddress.locality || prev.locality || "",
        pincode: savedAddress.pincode || prev.pincode || "",
        city: savedAddress.city || prev.city || "",
        state: savedAddress.state || prev.state || "",
        isDefault: savedAddress.isDefault !== undefined ? savedAddress.isDefault : true
      }));
    }
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
    if (dataToSave.email?.trim() && !emailRegex.test(dataToSave.email.trim())) {
      triggerHaptic("warning");
      emitToast("Please enter a valid email address or leave it blank", "error");
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
        email: (dataToSave.email || "").trim().toLowerCase(),
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
    if (current.email?.trim() && !emailRegex.test(current.email.trim())) {
      errors.email = "Please enter a valid email address or leave it blank";
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
    form.submit();
  };

  // Live Order Submission Flow (Supports both Cash on Delivery (COD) & PayU Online Payment)
  const executeOrderSubmission = async () => {
    const isCodOrder = paymentMethod === "COD" && enableCod;

    setLoading(true);
    if (!isCodOrder) {
      setPayuModalOpen(true);
      setPaymentState("INITIATING");
      setPayuTimeout(false);
      setPayuError(null);
    }

    const currentForm = getLatestFormData(formData);
    const { firstName, lastName, phone, email, address, landmark, locality, pincode, city, state } = currentForm;
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPhone = phone.trim();

    const addressObj = {
      id: currentForm.id || savedAddress?.id || null,
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
      // Fire and forget, don't block order/payment flow
      db.saveAddress(addressObj).catch(() => {});
    }

    const fullName = `${addressObj.firstName} ${addressObj.lastName}`.trim();
    const fullAddressString = `${addressObj.address}${addressObj.landmark ? `, ${addressObj.landmark}` : ''}, ${addressObj.city}, ${addressObj.state} - ${addressObj.pincode}`;

    const linesToProcess = (activeLines && activeLines.length > 0) ? activeLines : effectiveLines;

    const unresolvable = linesToProcess.find(line => !resolveCartProduct(products, line));
    if (unresolvable) {
      setLoading(false);
      setPayuModalOpen(false);
      isSubmittingRef.current = false;
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
        variant: line.variant || p.selectedVariant || p.variant || "",
        size: line.size || p.size || "",
        origin: p.origin || (p.isIndonesian ? "Java / Indonesia" : "Nepal"),
        isIndonesian: !!p.isIndonesian,
        isCustomMala: !!p.isCustomMala || !!line.isCustomMala,
        ...(p.customMala || line.customMala ? { customMala: p.customMala || line.customMala } : {}),
        ...(Array.isArray(p.customMalaItems) && p.customMalaItems.length > 0
          ? { customMalaItems: p.customMalaItems }
          : Array.isArray(line.customMalaItems) && line.customMalaItems.length > 0
            ? { customMalaItems: line.customMalaItems }
            : {}),
        ...(p.customDescription || line.customDescription ? { customDescription: p.customDescription || line.customDescription } : {}),
        img: getProductPrimaryImage(p)
      };
    });

    const adAttribution = getAdAttribution();

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
      snapshotItems: snapshotItems,
      orderSource: adAttribution ? "meta_ads" : "website",
      adAttribution: adAttribution || null
    };

    // --- BRANCH 1: CASH ON DELIVERY (COD) ---
    if (isCodOrder) {
      try {
        const codOrderPayload = {
          ...paymentPayload,
          paymentMethod: "Cash on Delivery (COD)",
          paymentMode: "COD",
          paymentStatus: "COD",
          status: "Confirmed",
          subtotal,
          mrpTotal: totalMrp,
          productSavings,
          couponDiscount,
          discountAmount: couponDiscount,
          shippingFee,
          codFee: activeCodFee,
          amount: finalTotal,
          total: finalTotal,
          finalAmount: finalTotal
        };

        const savedOrder = await db.saveOrder(codOrderPayload);
        const createdOrderId = savedOrder?.id || savedOrder?.orderId || savedOrder?.orderNumber || "";
        const createdGuestToken = savedOrder?.guestToken || sessionStorage.getItem("aura_guest_token") || "";

        try {
          sessionStorage.removeItem("aura_buy_now_intent");
          sessionStorage.removeItem("aura_pending_orderId");
          sessionStorage.removeItem("aura_pending_txnid");
          sessionStorage.removeItem("aura_pending_timestamp");
        } catch (_) {}

        clear();
        triggerHaptic("success");
        trackMetaPurchase(savedOrder);
        emitToast("Cash on Delivery (COD) Order Confirmed!", "success");

        const gQuery = createdGuestToken ? `&guestToken=${encodeURIComponent(createdGuestToken)}` : "";
        navigate(`/payment-result?status=success&mode=cod&orderId=${encodeURIComponent(createdOrderId)}${gQuery}`, {
          replace: true
        });
        return;
      } catch (err) {
        triggerHaptic("warning");
        emitToast(err?.message || "Could not place COD order. Please try again.", "error");
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }
    }

    // --- BRANCH 2: ONLINE PAYMENT (PayU Gateway) ---
    try {
      const res = await db.initiatePayment(paymentPayload);

      if (res?.success && res.data?.paymentUrl && res.data?.params) {
        const createdOrderId = res.data.orderId || res.data.params?.udf1 || "";
        const createdTxnid = res.data.txnid || res.data.params?.txnid || "";
        const createdGuestToken = res.data.guestToken || "";
        try {
          if (createdGuestToken) {
            sessionStorage.setItem("aura_guest_token", createdGuestToken);
            localStorage.setItem("aura_guest_token", createdGuestToken);
            if (createdOrderId) {
              sessionStorage.setItem(`aura_order_token_${createdOrderId}`, createdGuestToken);
              localStorage.setItem(`aura_order_token_${createdOrderId}`, createdGuestToken);
            }
          }
          if (createdOrderId) {
            sessionStorage.setItem("aura_pending_orderId", createdOrderId);
          }
          if (createdTxnid) {
            sessionStorage.setItem("aura_pending_txnid", createdTxnid);
            if (createdOrderId) {
              sessionStorage.setItem(`aura_order_txnid_${createdOrderId}`, createdTxnid);
              localStorage.setItem(`aura_order_txnid_${createdOrderId}`, createdTxnid);
            }
          }
          sessionStorage.setItem("aura_pending_timestamp", String(Date.now()));
        } catch (_) {}

        setLastUnpaidOrder({
          orderId: createdOrderId,
          txnid: createdTxnid,
          guestToken: createdGuestToken
        });
        setPaymentState("REDIRECTING");
        // Keep cart intact until payment is confirmed so pressing Back from PayU never loses items
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

  // Retry Payment on failed/cancelled order
  const handleRetryPayment = async (orderIdToRetry) => {
    const targetOrderId = orderIdToRetry || lastUnpaidOrder?.orderId;
    if (!targetOrderId) {
      await executeOrderSubmission();
      return;
    }
    triggerHaptic("medium");
    setRetrying(true);
    setPaymentState("INITIATING");
    setPayuModalOpen(true);
    setPayuTimeout(false);
    setPayuError(null);

    try {
      const storedGuestToken = lastUnpaidOrder?.guestToken || sessionStorage.getItem("aura_guest_token") || localStorage.getItem("aura_guest_token") || "";
      const res = await db.retryPayment(targetOrderId, lastUnpaidOrder?.txnid || "", storedGuestToken);

      if (res?.success && res.data?.paymentUrl && res.data?.params) {
        const retryTxnid = res.data.txnid || res.data.params?.txnid || "";
        const retryGuestToken = res.data.guestToken || storedGuestToken;
        try {
          sessionStorage.setItem("aura_pending_orderId", targetOrderId);
          if (retryTxnid) sessionStorage.setItem("aura_pending_txnid", retryTxnid);
          if (retryGuestToken) {
            sessionStorage.setItem("aura_guest_token", retryGuestToken);
            localStorage.setItem("aura_guest_token", retryGuestToken);
          }
          sessionStorage.setItem("aura_pending_timestamp", String(Date.now()));
        } catch (_) {}
        setLastUnpaidOrder({
          orderId: targetOrderId,
          txnid: retryTxnid,
          guestToken: retryGuestToken
        });
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

          {/* 4. PAYMENT SECTION (Online Payment & Cash on Delivery - COD) */}
          <CheckoutCompactPayment
            finalTotal={finalTotal}
            loading={loading}
            onPayNow={handlePlaceOrder}
            disabled={effectiveLines.length === 0 || subtotal === 0}
            totalSavings={totalSavings}
            paymentMethod={paymentMethod}
            onSelectPaymentMethod={(method) => {
              triggerHaptic("selection");
              setPaymentMethod(method);
            }}
            enableCod={enableCod}
            enableOnlinePayment={enableOnlinePayment}
            codFee={codFeeSetting}
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


        {/* Unpaid Order Quick Retry Banner when user closed modal after pressing Back from PayU */}
        {lastUnpaidOrder?.orderId && !payuModalOpen && (
          <div
            style={{
              marginTop: "14px",
              padding: "14px 16px",
              borderRadius: "14px",
              background: "#fffbeb",
              border: "1.5px solid #fde68a",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertCircle size={20} color="#d97706" />
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#92400e" }}>
                  पिछला पेमेंट अधूरा रहा (Order #{lastUnpaidOrder.orderId})
                </div>
                <div style={{ fontSize: "12px", color: "#78350f" }}>
                  आपका कार्ट सुरक्षित है। आप तुरंत दोबारा पेमेंट कर सकते हैं या नीचे डिटेल्स बदलकर नया आर्डर कर सकते हैं।
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRetryPayment(lastUnpaidOrder.orderId)}
              disabled={retrying || loading}
              style={{
                background: "linear-gradient(135deg, #b85d25 0%, #8c2b10 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "9px 16px",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <RefreshCw size={14} /> Retry Payment (दोबारा पेमेंट करें)
            </button>
          </div>
        )}

        {/* Full-Screen PayU Gateway Transition Loading Overlay */}
        <PayuRedirectModal
          isOpen={payuModalOpen}
          state={paymentState}
          amount={finalTotal}
          orderId={lastUnpaidOrder?.orderId}
          errorMsg={payuError}
          timeoutOccurred={payuTimeout}
          onRetry={() => {
            if (lastUnpaidOrder?.orderId) {
              handleRetryPayment(lastUnpaidOrder.orderId);
            } else {
              executeOrderSubmission();
            }
          }}
          onClose={() => {
            setPayuModalOpen(false);
            setPaymentState("IDLE");
            setPayuError(null);
            setLoading(false);
            setRetrying(false);
            isSubmittingRef.current = false;
            isRedirectingRef.current = false;
          }}
        />
      </main>
    </Shell>
  );
}
