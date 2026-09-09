import { getProductPrimaryImage, getProductGalleryImages } from "../../lib/imageUtils";
import { getProductRoute } from "../../lib/routes";
import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ChevronLeft, Check, Package, MapPin, CreditCard, RotateCcw, 
  X, Edit3, MessageCircle, AlertCircle, Truck, ExternalLink, 
  Copy, CheckCheck, Link2, Calendar, ShieldCheck, RefreshCw, Zap, Lock, Loader2, Star,
  CheckCircle2, MessageSquare
} from "lucide-react";
import { OrderMessages } from "../../components/OrderMessages";
import { Shell } from "../../components/Shell";
import { db } from "../../lib/db";
import { authClient } from "../../lib/authClient";
import { emitToast } from "../../context/ToastContext";
import { useCart } from "../../hooks/useCart";
import { OrderSummaryCard } from "../../components/checkout/OrderSummaryCard";
import { WriteReviewModal } from "../../components/reviews/WriteReviewModal";

function formatDetailDate(raw, opts) {
  if (!raw) return "Recently";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString("en-IN", opts || { day: "numeric", month: "long", year: "numeric" });
  } catch (_) {
    return "Recently";
  }
}

export function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { add } = useCart();

  const searchParams = new URLSearchParams(location.search);
  const guestToken = searchParams.get("guestToken") || searchParams.get("guest_token") || "";
  const txnid = searchParams.get("txnid") || searchParams.get("txnId") || "";

  if (guestToken) {
    try {
      sessionStorage.setItem("aura_guest_token", guestToken);
      localStorage.setItem("aura_guest_token", guestToken);
    } catch (_) {}
  }
  
  // Try to grab from synchronous local cache first for instant 0ms rendering
  const [order, setOrder] = useState(() => {
    try {
      const cached = db.getCachedMyOrders();
      const match = (cached || []).find(o => String(o.id) === String(id) || String(o.orderNumber) === String(id));
      return match ? db.normalizeOrder(match) : null;
    } catch (_) {
      return null;
    }
  });
  
  // Modals state
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  
  const [editAddressModal, setEditAddressModal] = useState(false);
  const [editAddressForm, setEditAddressForm] = useState(() => order?.address || "");
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);

  const handlePayuRetry = async () => {
    const targetOrderId = order?.orderNumber || order?.id || order?._id || id;
    if (!targetOrderId) return;
    setRetryingPayment(true);
    try {
      const effectiveGuestToken = guestToken || order?.guestToken || "";
      const effectiveTxnid = txnid || order?.txnid || "";
      const res = await db.retryPayment(targetOrderId, effectiveTxnid, effectiveGuestToken);
      if (res?.success && res.data?.paymentUrl && res.data?.params) {
        emitToast("Redirecting to PayU Secure Gateway...", "info");
        const form = document.createElement("form");
        form.method = "POST";
        form.action = res.data.paymentUrl;
        form.style.display = "none";
        Object.entries(res.data.params).forEach(([key, val]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = val !== undefined && val !== null ? String(val) : "";
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error(res?.message || "Could not generate PayU payment retry session");
      }
    } catch (err) {
      setRetryingPayment(false);
      emitToast(err.message || "Failed to retry PayU payment", "error");
    }
  };

  const [loading, setLoading] = useState(() => !order);
  const [loadError, setLoadError] = useState("");
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchOrder() {
      if (!order) setLoading(true);
      setLoadError("");
      setIsNotFound(false);
      try {
        const res = await db.getOrder(id, guestToken, txnid);
        if (!isMounted) return;
        if (res?.success && res.data) {
          const normalized = db.normalizeOrder(res.data);
          setOrder(normalized);
          setEditAddressForm(normalized.address || "");
        } else if (res?.notFound || res?.status === 404) {
          if (!order) {
            setIsNotFound(true);
            setOrder(null);
          }
        } else {
          if (!order) {
            setLoadError(res?.message || "Failed to load order details.");
            setOrder(null);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading order details:", err);
        if (!order) {
          setLoadError("Network connection error. Please check your internet.");
          setOrder(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchOrder();

    const unsubscribe = authClient.onAuthStateChanged(() => {
      if (isMounted) fetchOrder();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [id, guestToken, txnid, navigate]);
  
  async function loadOrder() {
    setLoading(true);
    setLoadError("");
    setIsNotFound(false);
    try {
      const res = await db.getOrder(id, guestToken, txnid);
      if (res?.success && res.data) {
        const normalized = db.normalizeOrder(res.data);
        setOrder(normalized);
        setEditAddressForm(normalized.address || "");
      } else if (res?.notFound || res?.status === 404) {
        setIsNotFound(true);
        setOrder(null);
      } else {
        setLoadError(res?.message || "Failed to load order details.");
        setOrder(null);
      }
    } catch (err) {
      console.error("Error loading order details:", err);
      setLoadError("Network connection error. Please check your internet.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <main className="page" style={{ maxWidth: 850, margin: "0 auto", padding: "40px 16px 80px" }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ height: 28, width: 120, background: '#f4ece5', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
          </div>
          <div style={{ height: 90, background: '#ffffff', border: '1px solid #eee1cf', borderRadius: 14, marginBottom: 20, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 220, background: '#ffffff', border: '1px solid #eee1cf', borderRadius: 14, marginBottom: 20, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 180, background: '#ffffff', border: '1px solid #eee1cf', borderRadius: 14, animation: 'pulse 1.5s infinite' }} />
        </main>
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell>
        <main className="page" style={{ maxWidth: 600, margin: "60px auto 100px", padding: "0 16px", textAlign: "center" }}>
          <div style={{
            background: "#fff",
            border: "1px solid #fecaca",
            borderRadius: 16,
            padding: "40px 24px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)"
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#fee2e2",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              color: "#dc2626"
            }}>
              <AlertCircle size={28} />
            </div>
            <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 26, color: "#991b1b", marginBottom: 8 }}>
              Unable to Load Order
            </h2>
            <p style={{ fontSize: 13, color: "#806f62", marginBottom: 24, lineHeight: 1.6 }}>
              {loadError}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={loadOrder} className="primary-btn" style={{ padding: "10px 20px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <RefreshCw size={14} /> Try Again
              </button>
              <button onClick={() => navigate("/", { replace: true })} className="outline-btn" style={{ padding: "10px 20px", fontSize: 13, background: "#fff" }}>
                Back to Home
              </button>
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  if (isNotFound || !order) {
    return (
      <Shell>
        <main className="page" style={{ maxWidth: 600, margin: "60px auto 100px", padding: "0 16px", textAlign: "center" }}>
          <div style={{
            background: "#fff",
            border: "1px solid #eee1cf",
            borderRadius: 16,
            padding: "40px 24px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)"
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#fdf5ec",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              color: "#b85d25"
            }}>
              <Package size={28} />
            </div>
            <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 26, color: "#2b170d", marginBottom: 8 }}>
              Order Not Found
            </h2>
            <p style={{ fontSize: 13, color: "#806f62", marginBottom: 24, lineHeight: 1.6 }}>
              We could not find details for order <strong>{id}</strong>. Please verify the ID or search using our live tracker.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/account/orders" className="primary-btn" style={{ padding: "10px 20px", textDecoration: "none", fontSize: 13 }}>
                View All Orders
              </Link>
              <Link to="/track-order" className="outline-btn" style={{ padding: "10px 20px", textDecoration: "none", fontSize: 13, background: "#fff" }}>
                Track Order
              </Link>
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  const statuses = ["Pending", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered"];
  const currentStatusIdx = statuses.indexOf(order.status);
  const isCancelled = order.status === "Cancelled";
  
  const canCancel = !isCancelled && currentStatusIdx < 3; 
  const canEditAddress = !isCancelled && currentStatusIdx < 3; 

  const parsedItems = db.normalizeOrderItems(order);

  const handleCancelOrder = async () => {
    if (!cancelReason) {
      emitToast("Please select a cancellation reason", "error");
      return;
    }
    if (cancelReason === "Other" && !otherReason.trim()) {
      emitToast("Please specify the reason", "error");
      return;
    }

    const finalReason = cancelReason === "Other" ? otherReason : cancelReason;
    
    const updated = {
      ...order,
      status: "Cancelled",
      cancelledAt: new Date().toISOString(),
      cancelReason: finalReason,
      cancelledBy: "Customer"
    };
    
    try {
      await db.updateOrder(order.id, updated);
      setOrder(updated);
      setCancelModal(false);
      emitToast("Order cancelled successfully", "success");
    } catch (err) {
      emitToast(err.message || "Failed to cancel order", "error");
    }
  };

  const handleUpdateAddress = async () => {
    if (!editAddressForm.trim()) {
      emitToast("Address cannot be empty", "error");
      return;
    }
    
    const updated = {
      ...order,
      address: editAddressForm.trim()
    };
    
    try {
      await db.updateOrder(order.id, updated);
      setOrder(updated);
      setEditAddressModal(false);
      emitToast("Shipping address updated successfully", "success");
    } catch (err) {
      emitToast(err.message || "Failed to update address", "error");
    }
  };

  const handleReorder = () => {
    let addedCount = 0;
    const allProducts = db.getProducts();
    
    parsedItems.forEach(item => {
      const p = allProducts.find(x => String(x.id) === String(item.id));
      if (p && p.stock > 0 && p.status !== "Draft") {
        add(item.id, item.qty);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      emitToast(`Added ${addedCount} product(s) to your cart`, "success");
      navigate("/cart");
    } else {
      emitToast("Products are currently out of stock", "error");
    }
  };

  return (
    <Shell>
      <main className="page" style={{ maxWidth: 850, margin: '0 auto', paddingBottom: 80 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <button 
            type="button" 
            className="back-btn" 
            onClick={() => navigate("/", { replace: true })} 
            style={{
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              display: 'inline-flex', 
              gap: 5, 
              alignItems: 'center', 
              color: '#a54d2b', 
              fontSize: 13, 
              fontWeight: 600,
              padding: 0
            }}
          >
            <ChevronLeft size={16}/> Back to Home
          </button>

          <Link 
            to="/account/orders" 
            style={{ 
              display: 'inline-flex', 
              gap: 5, 
              alignItems: 'center', 
              textDecoration: 'none', 
              color: '#806f62', 
              fontSize: 12.5, 
              fontWeight: 600 
            }}
          >
            View All Orders <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
          </Link>
        </div>
        
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 15, marginBottom: 25}}>
          <div  >
            <h1 style={{fontFamily: 'Cormorant Garamond, serif', fontSize: 30, margin: '0 0 5px', color: '#2b170d'}}>
              Order <span style={{fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums'}}>{order.id}</span>
            </h1>
            <p style={{color: '#806f62', fontSize: 13}}>Placed on {formatDetailDate(order.date || order.createdAt, {day: 'numeric', month: 'long', year: 'numeric'})}</p>
          </div>
          
          <div style={{display: 'flex', gap: 10}}>
            {isCancelled ? (
              <span style={{background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                <X size={16} /> Cancelled
              </span>
            ) : order.paymentStatus === "Failed" ? (
              <span style={{background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                <X size={16} /> Payment Failed
              </span>
            ) : (
              <span style={{background: '#e5f6ea', color: '#1d9450', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                <Check size={16} /> {order.status}
              </span>
            )}
          </div>
        </div>
        
        {isCancelled && order.cancelReason && (
          <div style={{background: '#fff0ed', color: '#c62828', padding: '16px', borderRadius: 12, marginBottom: 16, fontSize: 13, border: '1px solid #ffcdd2'}}>
            <b>Cancellation Reason:</b> {order.cancelReason}
          </div>
        )}

        {/* Refund Status & Customer Message Green Banner */}
        {(Number(order.amountRefunded || 0) > 0 || order.refundNotes || order.refundNote || order.refundStatus === 'Refunded' || order.refundStatus === 'Refund Processing' || order.refundStatus === 'Refund Initiated' || order.paymentStatus === 'Refunded' || order.paymentStatus === 'Partially Refunded') && (
          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '14px',
            padding: '18px 20px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(22, 101, 52, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <CheckCircle2 size={24} color="#15803d" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#14532d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ✓ रिफंड सूचना व अपडेट / Refund Confirmation & Details
                  </h4>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: '#dcfce7',
                    color: '#166534',
                    border: '1px solid #bbf7d0'
                  }}>
                    {order.refundStatus || (order.paymentStatus === 'Refunded' ? 'Refunded' : 'Refund Processing')}
                  </span>
                </div>

                {Number(order.amountRefunded || 0) > 0 && (
                  <p style={{ margin: '0 0 8px', fontSize: '13.5px', color: '#166534', fontWeight: 600 }}>
                    रिफंड की गई कुल राशि: <b style={{ fontSize: '15px', color: '#15803d' }}>₹{Number(order.amountRefunded).toLocaleString('en-IN')}</b>
                  </p>
                )}

                {/* Green SMS / Admin Note Box */}
                {(order.refundNotes || order.refundNote || order.refundDetails?.notes || order.refundDetails?.reason || order.cancelReason) && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px 14px',
                    background: '#ffffff',
                    borderRadius: '10px',
                    border: '1.5px solid #86efac',
                    fontSize: '13px',
                    color: '#14532d',
                    lineHeight: '1.55',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MessageSquare size={13} color="#15803d" />
                      सपोर्ट / एडमिन नोट (SMS / Note):
                    </div>
                    {order.refundNotes || order.refundNote || order.refundDetails?.notes || order.refundDetails?.reason || order.cancelReason}
                  </div>
                )}

                <div style={{ fontSize: '11.5px', color: '#166534', marginTop: '8px' }}>
                  यह रिफंड आपके मूल भुगतान खाते (PayU UPI / Card / Bank) में 1-3 व्यावसायिक दिनों में क्रेडिट कर दिया जाता है।
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* PayU Payment Details & Retry Banner */}
        <div 
           
           
          
          style={{
            background: order.paymentStatus === "Paid" ? "#f2f8f3" : (order.paymentStatus === "Failed" ? "#fef2f2" : "#fdf8f4"),
            border: `1.5px solid ${order.paymentStatus === "Paid" ? "#cbe6d2" : (order.paymentStatus === "Failed" ? "#fecaca" : "#ebdccb")}`,
            borderRadius: "14px",
            padding: "16px 18px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <ShieldCheck size={18} color={order.paymentStatus === "Paid" ? "#166534" : "#b85d25"} />
              <span style={{ 
                fontSize: "14px", 
                fontWeight: "700", 
                color: order.paymentStatus === "Paid" ? "#166534" : (order.paymentStatus === "Failed" ? "#991b1b" : "#2b170d") 
              }}>
                {order.paymentStatus === "Paid" 
                  ? "PayU Live Payment Confirmed" 
                  : (order.paymentStatus === "Failed" ? "PayU Payment Incomplete" : "PayU Payment Pending")}
              </span>
              <span 
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: order.paymentStatus === "Paid" ? "#dcfce7" : (order.paymentStatus === "Failed" ? "#fee2e2" : "#fef3c7"),
                  color: order.paymentStatus === "Paid" ? "#166534" : (order.paymentStatus === "Failed" ? "#991b1b" : "#b45309")
                }}
              >
                {order.paymentStatus || "Pending"}
              </span>
            </div>

            <div style={{ fontSize: "12px", color: "#665a51", display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "4px" }}>
              <span>Method: <b>PayU Hosted Checkout</b></span>
              {order.txnid && (
                <span>Merchant Txn ID: <code style={{ fontFamily: "monospace", background: "#ffffff", padding: "1px 5px", borderRadius: "4px", border: "1px solid #e8dac9" }}>{order.txnid}</code></span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  PayU Payment ID:
                  {order.mihpayid ? (
                    <code 
                      onClick={() => {
                        navigator.clipboard.writeText(order.mihpayid);
                        emitToast("PayU Payment ID copied to clipboard!", "success");
                      }}
                      title="Click to copy"
                      style={{ fontFamily: "monospace", background: "#ffffff", padding: "1px 5px", borderRadius: "4px", border: "1px solid #e8dac9", cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                    >
                      {order.mihpayid} <Copy size={10} />
                    </code>
                  ) : (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>N/A (Not Captured)</span>
                  )}
                </span>
              {order.paymentMode && (
                <span>Mode: <b>{order.paymentMode}</b></span>
              )}
              {(order.paymentDetails?.verifiedAt || (order.paymentStatus === "Paid" && (order.date || order.createdAt))) && (
                <span>Paid Date: <b>{formatDetailDate(order.paymentDetails?.verifiedAt || order.date || order.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</b></span>
              )}
            </div>

            {/* Refund history / status banner */}
            {order.amountRefunded > 0 && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 8, fontSize: 12, color: '#1e40af' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>PayU Refund Processed:</span>
                  <span>-₹{Number(order.amountRefunded).toLocaleString('en-IN')} ({order.paymentStatus})</span>
                </div>
                {Array.isArray(order.refundHistory) && order.refundHistory.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: '#3b82f6' }}>
                    {order.refundHistory.map((r, idx) => (
                      <div key={idx}>• Ref ID: <code>{r.refundId || r.refundToken}</code> — ₹{Number(r.amount).toLocaleString('en-IN')} on {formatDetailDate(r.date)}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* If unpaid, provide live Retry PayU button */}
          {order?.paymentStatus !== "Paid" && order?.paymentStatus !== "Refunded" && order?.status !== "Cancelled" && (
            <button
              type="button"
              id="btn-order-retry-payu"
              disabled={retryingPayment}
              onClick={handlePayuRetry}
              style={{
                background: retryingPayment ? "#a05b38" : "linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 18px",
                fontSize: "13.5px",
                fontWeight: "700",
                cursor: retryingPayment ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 3px 10px rgba(165, 77, 43, 0.25)"
              }}
            >
              {retryingPayment ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Connecting to PayU...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={15} />
                  <span>Complete Payment with PayU</span>
                </>
              )}
            </button>
          )}
        </div>

        {!isCancelled && (
          <div className="timeline-container"    style={{
            background: '#fffdf9',
            border: '1px solid #eee1cf',
            borderRadius: 15,
            padding: '25px 20px',
            marginBottom: 30,
            overflowX: 'auto',
            position: 'relative'
          }}>
            <div className="timeline" style={{ minWidth: 500, margin: 0, position: 'relative' }}>
              {statuses.map((x, i) => {
                const passed = currentStatusIdx >= i;
                const active = currentStatusIdx === i;
                return (
                  <div 
                    className={passed ? "active" : ""} 
                    key={x} 
                    
                    
                    
                  >
                    <motion.span 
                      whileHover={{ scale: 1.15 }}
                      animate={active ? { scale: [1, 1.1, 1], boxShadow: ["0 0 0 0px rgba(165,77,43,0.3)", "0 0 0 8px rgba(165,77,43,0)", "0 0 0 0px rgba(165,77,43,0)"] } : {}}
                      transition={active ? { repeat: Infinity, duration: 2 } : {}}
                      style={{
                        background: passed ? '#a54d2b' : '#f4ece5',
                        color: passed ? '#fff' : '#a29286',
                        boxShadow: active ? '0 0 0 4px #fdf5ef' : 'none'
                      }}
                    >
                      {passed ? "✓" : i+1}
                    </motion.span>
                    <b style={{color: active ? '#2b170d' : '#a29286', fontSize: 11, fontWeight: active ? '700' : '600'}}>{x}</b>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 30}}>
          <div style={{background: '#fff', border: '1px solid #eee1cf', borderRadius: 15, overflow: 'hidden'}}   >
            <h2 style={{fontSize: 18, fontFamily: 'Cormorant Garamond, serif', padding: '18px 20px', margin: 0, borderBottom: '1px solid #eee1cf', background: '#fdfbf7', color: '#2b170d'}}>
              Order Items ({parsedItems.reduce((acc, curr) => acc + curr.qty, 0)} items)
            </h2>
            <div style={{display: 'flex', flexDirection: 'column'}}>
              {parsedItems.map((item, i) => {
                const productExists = db.getProduct(item.id);
                const itemTotal = (item.price || 0) * (item.qty || 1);
                const isDelivered = order.status === "Delivered";

                return (
                  <div key={i} style={{
                    display: 'flex', 
                    gap: 16, 
                    padding: '20px', 
                    borderBottom: i !== parsedItems.length - 1 ? '1px solid #eee1cf' : 'none',
                    alignItems: 'center',
                    background: '#fff',
                    transition: 'background 0.2s'
                  }}>
                    <Link to={productExists ? `/product/${item.id}` : '#'} style={{ display: 'block', textDecoration: 'none', cursor: productExists ? 'pointer' : 'default' }}>
                      <div style={{width: 75, height: 75, borderRadius: 10, background: '#fdfbf7', border: '1px solid #eee1cf', overflow: 'hidden', flexShrink: 0, display: 'grid', placeItems: 'center'}}>
                        <img src={getProductPrimaryImage(item) || db.getOrderItemImage(item)} alt={item.name} loading="lazy" decoding="async" style={{width: '100%', height: '100%', objectFit: 'contain', padding: 4}} />
                      </div>
                    </Link>
                    <div style={{flex: 1}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap'}}>
                        <Link to={productExists ? `/product/${item.id}` : '#'} style={{ textDecoration: 'none', color: 'inherit', cursor: productExists ? 'pointer' : 'default' }}>
                          <h3 style={{margin: '0 0 4px', fontSize: 16, color: '#2b170d', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600}}>{item.name}</h3>
                        </Link>
                        {!productExists && (
                          <span style={{fontSize: 10, background: '#f4ece5', color: '#806f62', padding: '3px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4}}>
                            <AlertCircle size={10} /> Product no longer available
                          </span>
                        )}
                        {isDelivered && (
                          <button 
                            type="button"
                            onClick={() => setReviewModalProduct(item)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: '#fcf4ed',
                              border: '1px solid #ebdccb',
                              color: '#a54d2b',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Star size={13} fill="#d97706" color="#d97706" /> Post Review
                          </button>
                        )}
                      </div>
                      <p style={{margin: '0 0 8px', fontSize: 12, color: '#806f62'}}>Quantity: <b>{item.qty}</b></p>
                      
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10}}>
                        <span style={{fontSize: 12, color: '#736257'}}>
                          Unit Price: ₹{(item.price || 0).toLocaleString('en-IN')} {item.qty > 1 ? `× ${item.qty}` : ''}
                        </span>
                        <strong style={{fontSize: 15, color: '#a54d2b'}}>
                          Item Total: ₹{itemTotal.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20}}>
          {/* Order Summary */}
          <div   >
            <OrderSummaryCard 
              lines={parsedItems}
              cartItemCount={parsedItems.reduce((acc, curr) => acc + curr.qty, 0)}
              subtotal={order.subtotal || order.amount || 0}
              totalMrp={order.totalMrp || ((order.subtotal || order.amount || 0) + (order.productDiscount || 0))}
              productSavings={order.productDiscount || 0}
              appliedCoupon={order.couponCode ? { code: order.couponCode } : null}
              couponDiscount={order.couponDiscount || 0}
              shippingFee={order.shipping || 0}
              finalTotal={order.finalAmount || order.amount || 0}
              isReceipt={true}
              order={order}
            />
          </div>

          {/* Shipping Info */}
          <div style={{background: '#fffdf9', border: '1px solid #eee1cf', borderRadius: 15, padding: '20px'}}   >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
              <h2 style={{fontSize: 18, fontFamily: 'Cormorant Garamond, serif', margin: 0, color: '#2b170d'}}>Shipping Details</h2>
              {canEditAddress && (
                <button 
                  onClick={() => setEditAddressModal(true)}
                  style={{background: 'none', border: 'none', color: '#a54d2b', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '4px 8px'}}
                >
                  <Edit3 size={12} /> Edit
                </button>
              )}
            </div>
            
            <div style={{fontSize: 13, color: '#665a51', lineHeight: 1.6}}>
              <p style={{margin: '0 0 5px', color: '#2b170d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                <MapPin size={14} color="#a54d2b" /> {order.customerName || "Valued Customer"}
              </p>
              <p style={{margin: '0 0 10px', paddingLeft: 20}}>
                {order.address || "No address specified"}
              </p>
              <p style={{margin: 0, paddingLeft: 20}}>
                <b>Phone:</b> {order.phone || order.customerPhone || 'Not provided'}<br/>
                <b>Email:</b> {order.customerEmail || 'Not provided'}
              </p>
            </div>

            {/* Shipping & Tracking Information Section (ONLY show if NOT cancelled AND shipping details were added by admin) */}
            {(() => {
              const isCancelled = String(order.status || "").toLowerCase() === "cancelled";
              const trackingNumber = (order.trackingNumber || order.trackingId || "").trim();
              const courier = (order.courierName || order.carrier || order.courier || "").trim();
              const directLink = (order.trackingUrl || order.shippingLink || "").trim();
              const estDate = (order.estimatedDelivery || order.estimatedDeliveryDate || "").trim();

              // Hide completely on cancelled orders or if admin hasn't added courier/tracking info
              if (isCancelled || (!trackingNumber && !courier && !directLink)) {
                return null;
              }

              const displayCourier = courier || "Assigned Courier";

              return (
                <div style={{
                  background: '#fcf8f3',
                  border: '1px solid #ebdccb',
                  borderRadius: 12,
                  padding: '16px',
                  marginTop: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#2b170d', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Truck size={16} color="#a54d2b" /> Dispatched via {displayCourier}
                    </span>
                    <span style={{ fontSize: 11, background: '#e5f6ea', color: '#1d9450', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                      In Transit
                    </span>
                  </div>

                  {trackingNumber && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      border: '1px solid #e8decb',
                      padding: '8px 12px',
                      borderRadius: 8,
                      marginBottom: 10
                    }}>
                      <div>
                        <span style={{ fontSize: 11, color: '#806f62', display: 'block' }}>AWB / Consignment No.</span>
                        <strong style={{ fontSize: 13, color: '#2b170d', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                          {trackingNumber}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(trackingNumber);
                          setCopiedAwb(true);
                          emitToast("Tracking AWB copied to clipboard!", "success");
                          setTimeout(() => setCopiedAwb(false), 2000);
                        }}
                        style={{
                          background: '#fdf5ef',
                          border: '1px solid #ebdccb',
                          color: '#a54d2b',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {copiedAwb ? <CheckCheck size={13} /> : <Copy size={13} />}
                        {copiedAwb ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}

                  {estDate && (
                    <div style={{ fontSize: 12, color: '#665a51', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <Calendar size={13} color="#a54d2b" />
                      <span>Estimated Delivery: <b>{estDate}</b></span>
                    </div>
                  )}

                  {/* Direct Tracking CTA Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {directLink ? (
                      <a
                        href={directLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 6,
                          background: '#a54d2b',
                          color: '#ffffff',
                          padding: '10px 14px',
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 2px 6px rgba(165, 77, 43, 0.25)'
                        }}
                      >
                        <ExternalLink size={14} /> Track on {displayCourier} Official Website ↗
                      </a>
                    ) : (
                      <a
                        href={`https://www.google.com/search?q=track+${encodeURIComponent(courier || 'courier')}+${encodeURIComponent(trackingNumber)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 6,
                          background: '#a54d2b',
                          color: '#ffffff',
                          padding: '10px 14px',
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={14} /> Track Shipment Online ({displayCourier}) ↗
                      </a>
                    )}

                    <Link
                      to={`/track-order?id=${order.id}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        background: '#ffffff',
                        border: '1px solid #ebdccb',
                        color: '#5c483b',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none'
                      }}
                    >
                      View Vedic Consecration & Timeline
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap'}}   >
          <button 
            onClick={handleReorder}
            className="primary-btn" 
            style={{flex: 1, minWidth: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px'}}
          >
            <RotateCcw size={16} /> Buy Again
          </button>
          
          {canCancel && (
            <button 
              onClick={() => setCancelModal(true)}
              style={{flex: 1, minWidth: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px', background: '#fff', border: '1px solid #d64b2e', color: '#d64b2e', borderRadius: 8, fontWeight: 600, cursor: 'pointer'}}
            >
              <X size={16} /> Cancel Order
            </button>
          )}

          <a 
            href={`https://wa.me/919672996531?text=Hello, I need help with my order ${order.id}`}
            target="_blank" rel="noopener noreferrer"
            style={{flex: 1, minWidth: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px', background: '#fff', border: '1px solid #e8e0d8', color: '#2b170d', borderRadius: 8, fontWeight: 600, cursor: 'pointer', textDecoration: 'none'}}
          >
            <MessageCircle size={16} color="#20a95a" /> Contact Support
          </a>
        </div>
        
      </main>

      {/* Cancel Order Modal */}
        {cancelModal && (
          <div className="lightbox-overlay" style={{display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000}}>
            <div 
               
               
              
              style={{background: '#fff', padding: 30, borderRadius: 16, width: '100%', maxWidth: 450, position: 'relative'}}
            >
              <button onClick={() => setCancelModal(false)} style={{position: 'absolute', right: 15, top: 15, background: 'none', border: 'none', cursor: 'pointer', color: '#806f62'}}>
                <X size={20} />
              </button>
              <h2 style={{margin: '0 0 15px', fontFamily: 'Cormorant Garamond', fontSize: 24, color: '#2b170d'}}>Cancel Order?</h2>
              <p style={{fontSize: 13, color: '#806f62', marginBottom: 20}}>Are you sure you want to cancel order {order.id}? Please select a reason:</p>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20}}>
                {["Ordered by mistake", "Found a better price", "Changed my mind", "Delivery taking too long", "Product no longer required", "Other"].map(reason => (
                  <label key={reason} style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', padding: '10px 15px', border: '1px solid', borderColor: cancelReason === reason ? '#a54d2b' : '#eee1cf', borderRadius: 8, background: cancelReason === reason ? '#fdf5ef' : '#fff', transition: 'all 0.2s'}}>
                    <input 
                      type="radio" 
                      name="cancel_reason" 
                      value={reason} 
                      checked={cancelReason === reason} 
                      onChange={(e) => setCancelReason(e.target.value)} 
                      style={{accentColor: '#a54d2b'}}
                    />
                    {reason}
                  </label>
                ))}
              </div>
              
              {cancelReason === "Other" && (
                <textarea 
                  placeholder="Please specify your reason..." 
                  value={otherReason} 
                  onChange={(e) => setOtherReason(e.target.value)}
                  style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #dcd1c6', marginBottom: 20, fontSize: 13, minHeight: 80, outline: 'none', resize: 'vertical', boxSizing: 'border-box'}}
                />
              )}
              
              <div style={{display: 'flex', gap: 10}}>
                <button onClick={() => setCancelModal(false)} style={{flex: 1, padding: 12, borderRadius: 8, border: '1px solid #dcd1c6', background: '#fff', color: '#665a51', fontWeight: 600, cursor: 'pointer'}}>
                  Keep Order
                </button>
                <button onClick={handleCancelOrder} style={{flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#d64b2e', color: '#fff', fontWeight: 600, cursor: 'pointer'}}>
                  Cancel Order
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Edit Address Modal */}
        {editAddressModal && (
          <div className="lightbox-overlay" style={{display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000}}>
            <div 
               
               
              
              style={{background: '#fff', padding: 30, borderRadius: 16, width: '100%', maxWidth: 450, position: 'relative'}}
            >
              <button onClick={() => setEditAddressModal(false)} style={{position: 'absolute', right: 15, top: 15, background: 'none', border: 'none', cursor: 'pointer', color: '#806f62'}}>
                <X size={20} />
              </button>
              <h2 style={{margin: '0 0 15px', fontFamily: 'Cormorant Garamond', fontSize: 24, color: '#2b170d'}}>Change Shipping Address</h2>
              <p style={{fontSize: 13, color: '#806f62', marginBottom: 20}}>Update the delivery address for this order.</p>
              
              <textarea 
                value={editAddressForm} 
                onChange={(e) => setEditAddressForm(e.target.value)}
                style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #dcd1c6', marginBottom: 20, fontSize: 14, minHeight: 100, outline: 'none', resize: 'vertical', boxSizing: 'border-box'}}
              />
              
              <button onClick={handleUpdateAddress} className="primary-btn" style={{width: '100%', padding: 14}}>
                Save Changes
              </button>
            </div>
          </div>
        )}

      {/* Post Review Modal for Delivered Items */}
      <WriteReviewModal
        isOpen={Boolean(reviewModalProduct)}
        onClose={() => setReviewModalProduct(null)}
        product={reviewModalProduct}
        orderId={order?.id || order?.orderNumber}
        onSuccess={() => {
          db.fetchMyOrders(true).catch(() => {});
        }}
      />
      
    </Shell>
  );
}
