import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { AlertCircle, ShieldCheck, RefreshCw, Loader2, Clock, Award, Sparkles, Home, ShoppingBag } from "lucide-react";
import { SacredPujaCertificateModal } from "../components/SacredPujaCertificateModal";
import { db } from "../lib/db";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { OrderSuccessAnimation } from "../components/checkout/OrderSuccessAnimation";
import { trackMetaPurchase, trackMetaPageView, hasSensitiveQueryParams } from "../lib/metaPixel";

const SENSITIVE_PAYMENT_URL_PARAMS = [
  "guestToken",
  "guest_token",
  "txnid",
  "txnId",
  "transaction_id",
  "reason",
  "error",
  "message",
  "email",
  "phone",
  "oobCode",
  "apiKey"
];

export function PaymentResult() {
  const { clear } = useCart();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const status = (searchParams.get("status") || searchParams.get("payment_status") || "processing").toLowerCase();
  const urlOrderId = searchParams.get("orderId") || searchParams.get("order_id") || searchParams.get("id") || searchParams.get("udf1") || "";
  const urlTxnid = searchParams.get("txnid") || searchParams.get("txnId") || searchParams.get("transaction_id") || "";

  const initialOrderIdRef = useRef((() => {
    const rawId = urlOrderId || (typeof window !== "undefined" ? sessionStorage.getItem("aura_last_payment_orderId") || "" : "");
    return (rawId && !rawId.startsWith("TXN_")) ? rawId : (rawId || urlTxnid);
  })());
  const orderId = initialOrderIdRef.current;

  const initialTxnidRef = useRef((() => {
    if (urlTxnid) return urlTxnid;
    if (urlOrderId && urlOrderId.startsWith("TXN_")) return urlOrderId;
    if (typeof window !== "undefined" && orderId) {
      return sessionStorage.getItem(`aura_order_txnid_${orderId}`) || localStorage.getItem(`aura_order_txnid_${orderId}`) || sessionStorage.getItem("aura_pending_txnid") || "";
    }
    return "";
  })());
  const txnid = initialTxnidRef.current;

  const initialGuestTokenRef = useRef((() => {
    const qTok = searchParams.get("guestToken") || searchParams.get("guest_token") || "";
    if (qTok) return qTok;
    if (typeof window !== "undefined") {
      return (orderId ? (sessionStorage.getItem(`aura_order_token_${orderId}`) || localStorage.getItem(`aura_order_token_${orderId}`)) : "") ||
        sessionStorage.getItem("aura_guest_token") ||
        localStorage.getItem("aura_guest_token") ||
        "";
    }
    return "";
  })());
  const guestToken = initialGuestTokenRef.current;

  const safeDecodeReason = (val) => {
    if (!val) return "";
    try { return decodeURIComponent(val); } catch (_) { return String(val); }
  };
  const initialReasonRef = useRef(
    safeDecodeReason(searchParams.get("reason") || searchParams.get("error") || searchParams.get("message") || "")
  );
  const reason = initialReasonRef.current;

  if (typeof window !== "undefined") {
    try {
      if (orderId) sessionStorage.setItem("aura_last_payment_orderId", orderId);
      if (guestToken) {
        sessionStorage.setItem("aura_guest_token", guestToken);
        localStorage.setItem("aura_guest_token", guestToken);
        if (orderId) {
          sessionStorage.setItem(`aura_order_token_${orderId}`, guestToken);
          localStorage.setItem(`aura_order_token_${orderId}`, guestToken);
        }
      }
      if (txnid && orderId) {
        sessionStorage.setItem(`aura_order_txnid_${orderId}`, txnid);
        localStorage.setItem(`aura_order_txnid_${orderId}`, txnid);
      }
    } catch (_) {}
  }

  const initialOrder = (() => {
    const stateOrder = location?.state?.order;
    if (stateOrder && (!orderId || stateOrder.id === orderId || stateOrder.orderId === orderId || stateOrder.orderNumber === orderId)) {
      return stateOrder;
    }
    try {
      const cachedRaw = sessionStorage.getItem("aura_last_confirmed_order");
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (parsed && (!orderId || parsed.id === orderId || parsed.orderId === orderId || parsed.orderNumber === orderId)) {
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  })();

  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const [retrying, setRetrying] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const verifyAttempted = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearPendingOrderState = () => {
    try {
      sessionStorage.removeItem("aura_pending_txnid");
      sessionStorage.removeItem("aura_pending_orderId");
      sessionStorage.removeItem("aura_pending_timestamp");
      sessionStorage.removeItem("aura_buy_now_intent");
      sessionStorage.removeItem("aura_just_confirmed_redirect_home");
    } catch (_) {}
  };

  const handleGoHome = (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    clearPendingOrderState();
    try {
      sessionStorage.removeItem("aura_last_payment_orderId");
    } catch (_) {}
    try {
      navigate("/", { replace: true });
    } catch (_) {}
    setTimeout(() => {
      if (typeof window !== "undefined" && (window.location.pathname !== "/" || isMountedRef.current)) {
        window.location.replace("/");
      }
    }, 60);
  };

  const handleGoShop = (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    clearPendingOrderState();
    try {
      navigate("/shop", { replace: true });
    } catch (_) {}
    setTimeout(() => {
      if (typeof window !== "undefined" && (window.location.pathname !== "/shop" || isMountedRef.current)) {
        window.location.replace("/shop");
      }
    }, 60);
  };

  // Scrub sensitive tokens/transaction IDs/error text from the URL bar before firing Meta Pixel events
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (hasSensitiveQueryParams(window.location.search)) {
        const cleanParams = new URLSearchParams(window.location.search);
        SENSITIVE_PAYMENT_URL_PARAMS.forEach((k) => cleanParams.delete(k));
        const cleanSearch = cleanParams.toString();
        const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ""}`;
        window.history.replaceState(window.history.state, "", cleanUrl);
      }
      trackMetaPageView();
    } catch (_) {}
  }, []);

  const clearRef = useRef(clear);
  clearRef.current = clear;

  useEffect(() => {
    // Clear pending payment state when returning to result page
    sessionStorage.removeItem("aura_pending_txnid");
    sessionStorage.removeItem("aura_pending_orderId");

    if (verifyAttempted.current) return;

    if (initialOrder) {
      const isInitialConfirmed =
        initialOrder.paymentStatus === "Paid" ||
        initialOrder.paymentStatus === "COD" ||
        (initialOrder.paymentMethod || "").toLowerCase().includes("cod") ||
        (initialOrder.paymentMode || "").toLowerCase() === "cod";
      if (isInitialConfirmed && initialOrder.status !== "Cancelled") {
        try {
          const oId = initialOrder.orderNumber || initialOrder.id || initialOrder._id || orderId;
          const gTok = initialOrder.guestToken || guestToken;
          if (typeof window !== "undefined" && gTok) {
            sessionStorage.setItem("aura_guest_token", gTok);
            localStorage.setItem("aura_guest_token", gTok);
            if (oId) {
              sessionStorage.setItem(`aura_order_token_${oId}`, gTok);
              localStorage.setItem(`aura_order_token_${oId}`, gTok);
            }
          }
          sessionStorage.removeItem("aura_buy_now_intent");
          clearRef.current?.();
          trackMetaPurchase(initialOrder);
        } catch (_) {}
        setLoading(false);
        verifyAttempted.current = true;
        return;
      }
    }

    const verify = async () => {
      if (!orderId && !txnid) {
        setLoading(false);
        return;
      }
      try {
        let res = await db.verifyPayment(orderId || txnid, txnid || orderId, guestToken);
        const checkIsPaidOrCod = (ord) => {
          if (!ord) return false;
          if (ord.paymentStatus === "Paid") return true;
          const isCod =
            ord.paymentStatus === "COD" ||
            (ord.paymentMethod || "").toLowerCase().includes("cod") ||
            (ord.paymentMode || "").toLowerCase() === "cod";
          return isCod && ord.status !== "Cancelled";
        };

        // If query param indicated success or processing, but server state transition is mid-flight, poll quickly
        if (!checkIsPaidOrCod(res?.data) && (status === "success" || status === "processing")) {
          const delays = [500, 1000]; // drastically reduced wait times
          for (const delay of delays) {
            await new Promise((r) => setTimeout(r, delay));
            res = await db.verifyPayment(orderId || txnid, txnid || orderId, guestToken);
            if (checkIsPaidOrCod(res?.data)) break;
          }
        }

        if (res?.success && res.data) {
          setOrder(res.data);
          const oId = res.data.orderNumber || res.data.id || res.data._id || orderId;
          const gTok = res.data.guestToken || guestToken;
          const tId = res.data.txnid || txnid;
          if (typeof window !== "undefined") {
            if (gTok) {
              sessionStorage.setItem("aura_guest_token", gTok);
              localStorage.setItem("aura_guest_token", gTok);
              if (oId) {
                sessionStorage.setItem(`aura_order_token_${oId}`, gTok);
                localStorage.setItem(`aura_order_token_${oId}`, gTok);
              }
            }
            if (tId && oId) {
              sessionStorage.setItem(`aura_order_txnid_${oId}`, tId);
              localStorage.setItem(`aura_order_txnid_${oId}`, tId);
            }
          }
          // Clear cart and fire Meta Pixel Purchase once verified as Paid or Confirmed COD
          if (checkIsPaidOrCod(res.data)) {
            try {
              sessionStorage.removeItem("aura_buy_now_intent");
              clearRef.current?.();
              trackMetaPurchase(res.data);
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error("Verification failed:", err);
      } finally {
        setLoading(false);
      }
    };
    
    verifyAttempted.current = true;
    verify();
  }, [orderId, txnid, guestToken, status]);

  // Reset retrying state if user presses browser Back button from PayU after clicking Retry
  useEffect(() => {
    const onPageShow = () => {
      setRetrying(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Authoritative server-verified payment, COD order, or confirmed gateway return
  const isCodOrder =
    order?.paymentStatus === "COD" ||
    (order?.paymentMethod || "").toLowerCase().includes("cod") ||
    (order?.paymentMode || "").toLowerCase() === "cod" ||
    (searchParams.get("mode") || "").toLowerCase() === "cod";
  const isVerifiedSuccess =
    order?.paymentStatus === "Paid" || (isCodOrder && order?.status !== "Cancelled");
  const isConfirmedBoundaryTarget =
    isVerifiedSuccess || status === "success" || isCodOrder;

  // Safe navigation on Back button so user ALWAYS lands cleanly on Home ("/") from confirmation page
  const isConfirmedBoundaryRef = useRef(isConfirmedBoundaryTarget);
  useEffect(() => {
    isConfirmedBoundaryRef.current = isConfirmedBoundaryTarget;
    if (isConfirmedBoundaryTarget && typeof window !== "undefined") {
      try {
        sessionStorage.setItem("aura_just_confirmed_redirect_home", String(Date.now()));
      } catch (_) {}
    }
  }, [isConfirmedBoundaryTarget]);

  const guardPushedRef = useRef(false);
  useEffect(() => {
    if (!orderId && !txnid) return;

    const pushHomeBackBoundary = () => {
      try {
        if (!window.history.state?.auraPaymentSuccess) {
          const cleanParams = new URLSearchParams(window.location.search);
          SENSITIVE_PAYMENT_URL_PARAMS.forEach((k) => cleanParams.delete(k));
          const cleanSearch = cleanParams.toString();
          const cleanCurrentUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ""}`;
          const prevIdx = typeof window.history.state?.idx === "number" ? window.history.state.idx : 0;

          window.history.replaceState(
            { idx: prevIdx, key: "aura-home-boundary", usr: null, auraSafeNav: true, page: "home" },
            "",
            "/"
          );
          window.history.pushState(
            {
              idx: prevIdx + 1,
              key: `aura-pr-${orderId || txnid || "ok"}`,
              usr: location?.state || null,
              auraPaymentSuccess: true,
              orderId: orderId || txnid || "ok"
            },
            "",
            cleanCurrentUrl
          );
        }
      } catch (_) {}
    };

    if (!guardPushedRef.current && isConfirmedBoundaryRef.current) {
      guardPushedRef.current = true;
      pushHomeBackBoundary();
    }

    // Reinforce history boundary once after any real user gesture (counters Chrome History Manipulation Intervention on PayU redirects)
    const onFirstGesture = () => {
      if (isConfirmedBoundaryRef.current && !window.history.state?.auraPaymentSuccess) {
        pushHomeBackBoundary();
      }
    };
    window.addEventListener("pointerdown", onFirstGesture, { once: true, passive: true });
    window.addEventListener("touchstart", onFirstGesture, { once: true, passive: true });

    const handlePopState = () => {
      setTimeout(() => {
        if (!isMountedRef.current && window.location.pathname === "/") return;
        if (isConfirmedBoundaryRef.current) {
          clearPendingOrderState();
          try {
            navigate("/", { replace: true });
          } catch (_) {}
          setTimeout(() => {
            if (typeof window !== "undefined" && (window.location.pathname !== "/" || isMountedRef.current)) {
              window.location.replace("/");
            }
          }, 60);
        } else {
          navigate("/checkout", { replace: true });
        }
      }, 0);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("touchstart", onFirstGesture);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [orderId, txnid, isConfirmedBoundaryTarget, location?.state, navigate]);

  const handleRetry = async () => {
    const targetOrderId = order?.orderNumber || order?.id || orderId;
    if (!targetOrderId) return;
    setRetrying(true);
    try {
      const effectiveGuestTok = guestToken || order?.guestToken || sessionStorage.getItem("aura_guest_token") || localStorage.getItem("aura_guest_token") || "";
      const res = await db.retryPayment(targetOrderId, txnid || order?.txnid || "", effectiveGuestTok);
      if (res?.success && res.data?.paymentUrl && res.data?.params) {
        const { paymentUrl, params } = res.data;
        const retryTxnid = res.data.txnid || params?.txnid || "";
        const retryGuestTok = res.data.guestToken || effectiveGuestTok;
        try {
          sessionStorage.setItem("aura_pending_orderId", targetOrderId);
          if (retryTxnid) sessionStorage.setItem("aura_pending_txnid", retryTxnid);
          if (retryGuestTok) {
            sessionStorage.setItem("aura_guest_token", retryGuestTok);
            localStorage.setItem("aura_guest_token", retryGuestTok);
          }
          sessionStorage.setItem("aura_pending_timestamp", String(Date.now()));
        } catch (_) {}

        const form = document.createElement("form");
        form.method = "POST";
        form.action = paymentUrl;
        form.style.display = "none";
        Object.entries(params).forEach(([k, v]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = v !== undefined && v !== null ? String(v) : "";
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      } else {
        emitToast(res?.message || "Payment retry failed.", "error");
        setRetrying(false);
      }
    } catch (err) {
      console.error(err);
      emitToast("An error occurred while retrying the payment.", "error");
      setRetrying(false);
    }
  };

  const handleRecheck = async () => {
    if (!orderId) return;
    setRechecking(true);
    try {
      const res = await db.verifyPayment(orderId, txnid, guestToken);
      if (res?.success && res.data) {
        setOrder(res.data);
        const oId = res.data.orderNumber || res.data.id || res.data._id || orderId;
        const gTok = res.data.guestToken || guestToken;
        const tId = res.data.txnid || txnid;
        if (typeof window !== "undefined") {
          if (gTok) {
            sessionStorage.setItem("aura_guest_token", gTok);
            localStorage.setItem("aura_guest_token", gTok);
            if (oId) {
              sessionStorage.setItem(`aura_order_token_${oId}`, gTok);
              localStorage.setItem(`aura_order_token_${oId}`, gTok);
            }
          }
          if (tId && oId) {
            sessionStorage.setItem(`aura_order_txnid_${oId}`, tId);
            localStorage.setItem(`aura_order_txnid_${oId}`, tId);
          }
        }
        if (res.data.paymentStatus === "Paid" || status === "success") {
          try {
            sessionStorage.removeItem("aura_buy_now_intent");
            clear();
            trackMetaPurchase(res.data);
          } catch (_) {}
          emitToast("Payment confirmed successfully!", "success");
        } else {
          emitToast("Payment is still processing with gateway. Please wait a moment.", "info");
        }
      }
    } catch (err) {
      console.error("Recheck verification error:", err);
      emitToast("Unable to verify payment status. Please try again.", "error");
    } finally {
      setRechecking(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "80px", maxWidth: "640px", margin: "0 auto", paddingTop: "60px", textAlign: "center" }}>
           <Loader2 size={36} className="animate-spin mx-auto" style={{ color: "#a54d2b" }} />
           <p style={{ marginTop: "16px", color: "#4a3528" }}>Verifying your transaction securely...</p>
        </main>
      </Shell>
    );
  }

  // Graceful handling for missing or malformed URL parameters
  if (!orderId && !txnid) {
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "80px", maxWidth: "680px", margin: "0 auto", paddingTop: "30px" }}>
          <div className="card" style={{ background: "#fffdf9", border: "1.5px solid #fed7aa", borderRadius: "16px", padding: "36px 20px", textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fff7ed", color: "#c2410c", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertCircle size={36} />
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#ffedd5", color: "#9a3412", padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", marginBottom: "12px" }}>
              Payment Session Notice
            </div>
            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "30px", fontWeight: "700", color: "#7c2d12", margin: "0 0 8px" }}>
              No Active Transaction Found
            </h1>
            <p style={{ fontSize: "14.5px", color: "#4a3528", margin: "0 auto 20px", maxWidth: "520px", lineHeight: "1.6" }}>
              No recent payment session or transaction ID was found for this link. If you were attempting to place an order, you can review your cart or explore our sacred Rudraksha catalog.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "16px" }}>
              <Link to="/" onClick={handleGoHome} className="primary-btn" style={{ padding: "12px 24px", fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Home size={15} /> Back to Home
              </Link>
              <Link to="/shop" onClick={handleGoShop} className="outline-btn" style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9", textDecoration: "none" }}>
                Explore Rudraksha Catalog
              </Link>
              <Link to="/cart" className="outline-btn" style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9", textDecoration: "none" }}>
                View Cart
              </Link>
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  if (isVerifiedSuccess) {
    const orderNum = order?.orderNumber || order?.id || orderId;
    const finalTxnid = order?.txnid || txnid || "Verified";
    const effectiveGuestToken = guestToken || order?.guestToken || "";
    const effectiveTxnid = (txnid && txnid !== orderNum) ? txnid : (order?.txnid || "");
    const orderDetailParams = new URLSearchParams();
    if (effectiveGuestToken) orderDetailParams.set("guestToken", effectiveGuestToken);
    if (effectiveTxnid) orderDetailParams.set("txnid", effectiveTxnid);
    const orderDetailQuery = orderDetailParams.toString() ? `?${orderDetailParams.toString()}` : "";
    const orderDetailLink = `/account/orders/${orderNum}${orderDetailQuery}`;

    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "120px", maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px 0", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleGoHome}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#fffdf9",
                border: "1.5px solid #d6c5b3",
                borderRadius: "10px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#4a3223",
                cursor: "pointer",
                position: "relative",
                zIndex: 20
              }}
            >
              <Home size={15} /> Back to Home
            </button>
            <button
              type="button"
              onClick={handleGoShop}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#fdf5ef",
                border: "1px solid #e5d8cc",
                borderRadius: "10px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8c2b10",
                cursor: "pointer",
                position: "relative",
                zIndex: 20
              }}
            >
              <ShoppingBag size={14} /> Continue Shopping
            </button>
          </div>
          <div style={{ textAlign: "center", padding: "24px 16px 32px" }}>
            <OrderSuccessAnimation orderNum={orderNum} txnid={isCodOrder ? "COD-CONFIRMED" : finalTxnid} />
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#eef6f0", color: "#166534", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", marginBottom: "12px" }}>
              <ShieldCheck size={14} />{" "}
              {isCodOrder
                ? "Cash on Delivery (COD) Confirmed • Pay at Doorstep"
                : "PayU Payment Verified & Paid"}
            </div>
            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "36px", fontWeight: "700", color: "#2b170d", margin: "0 0 8px" }}>
              Sacred Order Confirmed!
            </h1>
            <p style={{ fontSize: "15px", color: "#2b170d", margin: "0 0 20px" }}>
              Thank you! Your sacred order <b>#{orderNum}</b> has been securely received and confirmed
              {isCodOrder ? " via Cash on Delivery (COD)." : "."}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", position: "relative", zIndex: 20 }}>
              <Link to={orderDetailLink} className="primary-btn" style={{ padding: "12px 24px", fontSize: "14px", textDecoration: "none" }}>
                Go to My Order (View Order Details)
              </Link>
              <button
                type="button"
                onClick={handleGoHome}
                className="outline-btn"
                style={{
                  padding: "12px 20px",
                  fontSize: "14px",
                  background: "#ffffff",
                  border: "1.5px solid #d6c5b3",
                  color: "#4a3223",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer"
                }}
              >
                <Home size={15} /> Back to Home
              </button>
              <button
                type="button"
                onClick={handleGoShop}
                className="outline-btn"
                style={{
                  padding: "12px 20px",
                  fontSize: "14px",
                  background: "#fffdf9",
                  border: "1.5px solid #e5d8cc",
                  color: "#6b4730",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer"
                }}
              >
                <ShoppingBag size={15} /> Continue Shopping
              </button>
              <button
                type="button"
                onClick={() => setCertModalOpen(true)}
                className="outline-btn"
                style={{
                  padding: "12px 20px",
                  fontSize: "14px",
                  background: "#fdf8ee",
                  border: "1.5px solid #d4af37",
                  color: "#8c6b16",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer"
                }}
              >
                <Award size={15} /> View Consecration Certificate
              </button>
            </div>
          </div>
        </main>
        <SacredPujaCertificateModal
          isOpen={certModalOpen}
          onClose={() => setCertModalOpen(false)}
          order={order}
        />
      </Shell>
    );
  }

  // If status parameter or order status explicitly indicates cancellation or failure,
  // do not treat as pending verification.
  const isExplicitCancelOrFailed = 
    status === "cancelled" || 
    status === "failed" || 
    order?.paymentStatus === "Cancelled" || 
    order?.paymentStatus === "Failed";

  // Pending Verification: when transaction was initiated or redirected back with success/processing,
  // but gateway or bank server confirmation is still pending. Never show false "Payment Failed" or "Incomplete".
  const isPendingVerification = !isVerifiedSuccess && !isExplicitCancelOrFailed && (
    order?.paymentStatus === "Pending" ||
    order?.paymentStatus === "Payment Pending" ||
    order?.paymentStatus === "Processing" ||
    status === "processing" ||
    status === "success"
  );

  if (isPendingVerification) {
    const orderNum = order?.orderNumber || order?.id || orderId;
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "120px", maxWidth: "680px", margin: "0 auto", paddingTop: "30px" }}>
          <div className="card" style={{ background: "#fffdf9", border: "1.5px solid #fef3c7", borderRadius: "16px", padding: "36px 20px", textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Clock size={36} />
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fef3c7", color: "#92400e", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", marginBottom: "12px" }}>
              <RefreshCw size={13} className={rechecking ? "animate-spin" : ""} /> Payment Verification In Progress
            </div>
            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", fontWeight: "700", color: "#78350f", margin: "0 0 8px" }}>
              Confirming Your Payment
            </h1>
            <p style={{ fontSize: "14px", color: "#4a3528", margin: "0 auto 16px", maxWidth: "520px", lineHeight: "1.5" }}>
              Your transaction was initiated with PayU. We are currently awaiting final confirmation from the banking network. If the amount was debited from your account, your sacred order <b>#{orderNum}</b> is safe and will be confirmed shortly.
            </p>
            {orderId && (
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "24px" }}>
                <button
                  type="button"
                  disabled={rechecking}
                  onClick={handleRecheck}
                  style={{
                    background: rechecking ? "#a05b38" : "linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "13px 26px",
                    fontSize: "14.5px",
                    fontWeight: "700",
                    cursor: rechecking ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(165, 77, 43, 0.3)"
                  }}
                >
                  {rechecking ? <><Loader2 size={16} className="animate-spin" /><span>Checking Status...</span></> : <><RefreshCw size={16} /><span>Check Status Again</span></>}
                </button>
                <button
                  type="button"
                  disabled={retrying}
                  onClick={handleRetry}
                  className="outline-btn"
                  style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9" }}
                >
                  {retrying ? <><Loader2 size={15} className="animate-spin" /><span>Connecting...</span></> : <><RefreshCw size={15} /><span>Retry Payment with PayU</span></>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const oNum = order?.orderNumber || order?.id || orderId;
                    const gTok = guestToken || order?.guestToken || "";
                    const tId = (txnid && txnid !== oNum) ? txnid : (order?.txnid || "");
                    const qParams = new URLSearchParams();
                    if (gTok) qParams.set("guestToken", gTok);
                    if (tId) qParams.set("txnid", tId);
                    const qStr = qParams.toString() ? `?${qParams.toString()}` : "";
                    navigate(`/account/orders/${oNum}${qStr}`, { replace: true });
                  }}
                  className="outline-btn"
                  style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9" }}
                >
                  View Order Details
                </button>
                <Link
                  to="/"
                  onClick={handleGoHome}
                  className="outline-btn"
                  style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Home size={15} /> Back to Home
                </Link>
              </div>
            )}
          </div>
        </main>
      </Shell>
    );
  }

  // Failed or Cancelled
  const isCancelled = status === "cancelled" || order?.paymentStatus === "Cancelled" || order?.status === "Cancelled";

  return (
    <Shell>
      <main className="page" style={{ paddingBottom: "120px", maxWidth: "680px", margin: "0 auto", paddingTop: "30px" }}>
        <div className="card" style={{ background: "#fffdf9", border: "1.5px solid #fecaca", borderRadius: "16px", padding: "36px 20px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <AlertCircle size={36} />
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fee2e2", color: "#991b1b", padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", marginBottom: "12px" }}>
            {isCancelled ? "Order Cancelled • Payment Not Done" : "Payment Incomplete"}
          </div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", fontWeight: "700", color: "#991b1b", margin: "0 0 8px" }}>
            {isCancelled ? "भुगतान पूरा नहीं हुआ (Payment Cancelled)" : "Payment Not Completed"}
          </h1>
          <p style={{ fontSize: "14.5px", color: "#4a3528", margin: "0 auto 14px", maxWidth: "520px", lineHeight: "1.6" }}>
            {isCancelled 
              ? "आपने पेमेंट स्क्रीन से वापस (Back/Cancel) आने का विकल्प चुना या भुगतान अधूरा रह गया। आपके बैंक खाते से कोई राशि नहीं कटी है और आपका कार्ट सुरक्षित है। आप नीचे दिए गए बटन से तुरंत दोबारा पेमेंट कर सकते हैं।" 
              : "पेमेंट गेटवे के साथ भुगतान पूरा नहीं हो सका। यदि आपके खाते से राशि नहीं कटी है, तो आप नीचे दिए गए बटन से तुरंत दोबारा प्रयास (Retry) कर सकते हैं।"}
          </p>
          {reason && (
            <div style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#b91c1c", margin: "12px auto 24px", maxWidth: "480px" }}>
              <b>Reason:</b> {reason}
            </div>
          )}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "24px" }}>
            {orderId && (
              <button
                type="button"
                disabled={retrying}
                onClick={handleRetry}
                className="primary-btn"
                style={{
                  padding: "13px 26px",
                  fontSize: "14.5px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: retrying ? "wait" : "pointer"
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
                    <span>Retry Payment Now (दोबारा पेमेंट करें)</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/checkout", { replace: true })}
              className="outline-btn"
              style={{ padding: "12px 20px", fontSize: "14px", fontWeight: "700", background: "#fffdf9" }}
            >
              Back to Checkout (चेकआउट पर वापस जाएं)
            </button>
            <button 
              type="button" 
              onClick={handleGoShop} 
              className="outline-btn" 
              style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9" }}
            >
              Explore Rudraksha Catalog (दुकान देखें)
            </button>
            {orderId && (
              <button 
                type="button" 
                onClick={() => {
                  const oNum = order?.orderNumber || order?.id || orderId;
                  const gTok = guestToken || order?.guestToken || "";
                  const tId = (txnid && txnid !== oNum) ? txnid : (order?.txnid || "");
                  const qParams = new URLSearchParams();
                  if (gTok) qParams.set("guestToken", gTok);
                  if (tId) qParams.set("txnid", tId);
                  const qStr = qParams.toString() ? `?${qParams.toString()}` : "";
                  navigate(`/account/orders/${oNum}${qStr}`, { replace: true });
                }} 
                className="outline-btn" 
                style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9" }}
              >
                View Order Details
              </button>
            )}
            <Link
              to="/"
              onClick={handleGoHome}
              className="outline-btn"
              style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Home size={15} /> Back to Home
            </Link>
          </div>
        </div>
      </main>
    </Shell>
  );
}
