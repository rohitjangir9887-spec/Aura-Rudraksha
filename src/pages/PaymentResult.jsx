import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { AlertCircle, ShieldCheck, Truck, RefreshCw, Loader2 } from "lucide-react";
import { db } from "../lib/db";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { OrderSuccessAnimation } from "../components/checkout/OrderSuccessAnimation";

export function PaymentResult() {
  const { clear } = useCart();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = (searchParams.get("status") || searchParams.get("payment_status") || "processing").toLowerCase();
  const orderId = searchParams.get("orderId") || searchParams.get("order_id") || searchParams.get("id") || searchParams.get("udf1");
  const txnid = searchParams.get("txnid") || searchParams.get("txnId") || searchParams.get("transaction_id");
  const reason = searchParams.get("reason") || searchParams.get("error") || searchParams.get("message");
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    // Clear pending payment state when returning to result page
    sessionStorage.removeItem("aura_pending_txnid");
    sessionStorage.removeItem("aura_pending_orderId");

    const verify = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        const res = await db.verifyPayment(orderId, txnid);
        if (res?.success && res.data) {
          setOrder(res.data);
          
          // Auto-redirect for SUCCESS after a delay
          if (res.data.paymentStatus === "Paid" && (status === "success" || status === "processing")) {
            clear(); // Clear cart only on confirmed success
            setTimeout(() => {
               navigate(`/account/orders/${orderId}`, { replace: true });
            }, 6000);
          }
        }
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
  }, [orderId, txnid, navigate, status]);

  const handleRetry = async () => {
    if (!orderId) return;
    setRetrying(true);
    try {
      const res = await db.retryPayment(orderId);
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
        window.history.replaceState(null, "", "/account/orders");
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

  const isSuccess = order?.paymentStatus === "Paid" || status === "success";

  if (isSuccess) {
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
              <Link to={`/account/orders/${orderNum}`} className="primary-btn" style={{ padding: "12px 24px", fontSize: "14px", textDecoration: "none" }}>
                View Order Details
              </Link>
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  // Failed or Cancelled
  const isCancelled = status === "cancelled";

  return (
    <Shell>
      <main className="page" style={{ paddingBottom: "80px", maxWidth: "680px", margin: "0 auto", paddingTop: "30px" }}>
        <div className="card" style={{ background: "#fffdf9", border: "1.5px solid #fecaca", borderRadius: "16px", padding: "36px 20px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <AlertCircle size={36} />
          </div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", fontWeight: "700", color: "#991b1b", margin: "0 0 8px" }}>
            {isCancelled ? "Payment Cancelled" : "Payment Incomplete"}
          </h1>
          <p style={{ fontSize: "14px", color: "#4a3528", margin: "0 0 10px", lineHeight: "1.5" }}>
            {isCancelled 
              ? "Your payment was cancelled. Your order is safely saved in your account." 
              : "The payment session could not be completed. Your order is safely saved."}
          </p>
          {reason && (
            <div style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#b91c1c", margin: "12px auto 24px", maxWidth: "480px" }}>
              <b>Reason:</b> {decodeURIComponent(reason)}
            </div>
          )}
          {orderId && (
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "24px" }}>
              <button type="button" disabled={retrying} onClick={handleRetry} style={{ background: retrying ? "#a05b38" : "linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)", color: "#ffffff", border: "none", borderRadius: "10px", padding: "13px 26px", fontSize: "14.5px", fontWeight: "700", cursor: retrying ? "wait" : "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 14px rgba(165, 77, 43, 0.3)" }}>
                {retrying ? <><Loader2 size={16} className="animate-spin" /><span>Connecting...</span></> : <><RefreshCw size={16} /><span>Retry Payment</span></>}
              </button>
              <button type="button" onClick={() => navigate(`/account/orders/${orderId}`, { replace: true })} className="outline-btn" style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9" }}>
                View Order Details
              </button>
            </div>
          )}
          {!orderId && (
            <div style={{ marginTop: "24px" }}>
              <button type="button" onClick={() => navigate("/cart", { replace: true })} className="primary-btn" style={{ padding: "12px 20px", fontSize: "14px" }}>
                Return to Cart
              </button>
            </div>
          )}
        </div>
      </main>
    </Shell>
  );
}
