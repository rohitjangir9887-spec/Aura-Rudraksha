import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { AlertCircle, ShieldCheck, RefreshCw, Loader2, Clock } from "lucide-react";
import { db } from "../lib/db";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { OrderSuccessAnimation } from "../components/checkout/OrderSuccessAnimation";

export function PaymentResult() {
  const { clear } = useCart();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = (searchParams.get("status") || searchParams.get("payment_status") || "processing").toLowerCase();
  const rawOrderId = searchParams.get("orderId") || searchParams.get("order_id") || searchParams.get("id") || searchParams.get("udf1") || "";
  const rawTxnid = searchParams.get("txnid") || searchParams.get("txnId") || searchParams.get("transaction_id") || "";
  const txnid = rawTxnid || (rawOrderId && rawOrderId.startsWith("TXN_") ? rawOrderId : "");
  const orderId = (rawOrderId && !rawOrderId.startsWith("TXN_")) ? rawOrderId : (rawOrderId || txnid);
  const guestToken = searchParams.get("guestToken") || searchParams.get("guest_token") || "";
  const rawReason = searchParams.get("reason") || searchParams.get("error") || searchParams.get("message") || "";
  
  const safeDecodeReason = (val) => {
    if (!val) return "";
    try { return decodeURIComponent(val); } catch (_) { return String(val); }
  };
  const reason = safeDecodeReason(rawReason);
  
  if (guestToken) {
    try {
      sessionStorage.setItem("aura_guest_token", guestToken);
      localStorage.setItem("aura_guest_token", guestToken);
    } catch (_) {}
  }
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    // Clear pending payment state when returning to result page
    sessionStorage.removeItem("aura_pending_txnid");
    sessionStorage.removeItem("aura_pending_orderId");

    const verify = async () => {
      if (!orderId && !txnid) {
        setLoading(false);
        return;
      }
      try {
        let res = await db.verifyPayment(orderId || txnid, txnid || orderId, guestToken);
        // If query param indicated success or processing, but server state transition is mid-flight, poll quickly
        if (res?.data?.paymentStatus !== "Paid" && (status === "success" || status === "processing")) {
          const delays = [500, 1000]; // drastically reduced wait times
          for (const delay of delays) {
            await new Promise((r) => setTimeout(r, delay));
            res = await db.verifyPayment(orderId || txnid, txnid || orderId, guestToken);
            if (res?.data?.paymentStatus === "Paid") break;
          }
        }

        if (res?.success && res.data) {
          setOrder(res.data);
        }
        // Once user reaches PaymentResult for an order, clear the cart unconditionally
        try {
          clear();
        } catch (_) {}
      } catch (err) {
        console.error("Verification failed:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (!verifyAttempted.current) {
       verifyAttempted.current = true;
       verify();
    }
  }, [orderId, txnid, guestToken, clear, status]);

  // Authoritative server-verified payment success
  const isVerifiedSuccess = order?.paymentStatus === "Paid";

  // Safe navigation on Back button without corrupting React Router history
  useEffect(() => {
    if (!isVerifiedSuccess || (!orderId && !txnid)) return;

    const handlePopState = () => {
      navigate("/", { replace: true });
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isVerifiedSuccess, orderId, txnid, navigate]);

  const handleRetry = async () => {
    if (!orderId) return;
    setRetrying(true);
    try {
      const res = await db.retryPayment(orderId, txnid || "", guestToken || "");
      if (res?.success && res.data?.paymentUrl && res.data?.params) {
        const { paymentUrl, params } = res.data;
        const form = document.createElement("form");
        form.method = "POST";
        form.action = paymentUrl;
        form.style.display = "none";
        Object.entries(params).forEach(([k, v]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = v;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        
        // Use replaceState to clear this result page from history before redirecting to PayU
        window.history.replaceState(null, "", guestToken ? "/checkout" : "/account/orders");
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
        if (res.data.paymentStatus === "Paid" || status === "success") {
          clear();
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
              <Link to="/shop" className="primary-btn" style={{ padding: "12px 24px", fontSize: "14px", textDecoration: "none" }}>
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
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "80px", maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <OrderSuccessAnimation orderNum={orderNum} txnid={finalTxnid} />
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#eef6f0", color: "#166534", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", marginBottom: "12px" }}>
              <ShieldCheck size={14} /> PayU Payment Verified & Paid
            </div>
            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "36px", fontWeight: "700", color: "#2b170d", margin: "0 0 8px" }}>
              Sacred Order Confirmed!
            </h1>
            <p style={{ fontSize: "15px", color: "#2b170d", margin: "0 0 20px" }}>
              Thank you! Your sacred order <b>#{orderNum}</b> has been securely received. Redirecting to your order details...
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to={`/account/orders/${orderNum}${guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : ""}`} className="primary-btn" style={{ padding: "12px 24px", fontSize: "14px", textDecoration: "none" }}>
                View Order Details
              </Link>
            </div>
          </div>
        </main>
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
        <main className="page" style={{ paddingBottom: "80px", maxWidth: "680px", margin: "0 auto", paddingTop: "30px" }}>
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
                  onClick={() => navigate(`/account/orders/${orderId}${guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : ""}`, { replace: true })}
                  className="outline-btn"
                  style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9" }}
                >
                  View Order Details
                </button>
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
      <main className="page" style={{ paddingBottom: "80px", maxWidth: "680px", margin: "0 auto", paddingTop: "30px" }}>
        <div className="card" style={{ background: "#fffdf9", border: "1.5px solid #fecaca", borderRadius: "16px", padding: "36px 20px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <AlertCircle size={36} />
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fee2e2", color: "#991b1b", padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", marginBottom: "12px" }}>
            {isCancelled ? "Order Cancelled • Payment Not Done" : "Payment Incomplete"}
          </div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", fontWeight: "700", color: "#991b1b", margin: "0 0 8px" }}>
            {isCancelled ? "भुगतान नहीं हुआ — आर्डर कैंसिल" : "Payment Not Completed"}
          </h1>
          <p style={{ fontSize: "14.5px", color: "#4a3528", margin: "0 auto 14px", maxWidth: "520px", lineHeight: "1.6" }}>
            {isCancelled 
              ? "आपका भुगतान पूरा नहीं हुआ था, इसलिए यह आर्डर कैंसिल कर दिया गया है। आपके बैंक खाते से कोई राशि नहीं कटी है। आप नीचे दिए गए बटन से पवित्र रुद्राक्ष संग्रह देख सकते हैं या नया आर्डर कर सकते हैं।" 
              : "The payment session could not be completed with the payment gateway. No funds were debited."}
          </p>
          {reason && (
            <div style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#b91c1c", margin: "12px auto 24px", maxWidth: "480px" }}>
              <b>Reason:</b> {reason}
            </div>
          )}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "24px" }}>
            <button 
              type="button" 
              onClick={() => navigate("/shop", { replace: true })} 
              className="primary-btn" 
              style={{ padding: "13px 26px", fontSize: "14.5px", fontWeight: "700" }}
            >
              Explore Rudraksha Catalog (दुकान देखें)
            </button>
            {orderId && (
              <button 
                type="button" 
                onClick={() => navigate(`/account/orders/${orderId}${guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : ""}`, { replace: true })} 
                className="outline-btn" 
                style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9" }}
              >
                View Order Details
              </button>
            )}
          </div>
        </div>
      </main>
    </Shell>
  );
}
