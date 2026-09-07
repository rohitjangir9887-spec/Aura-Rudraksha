import { getProductPrimaryImage, getProductGalleryImages } from "../../lib/imageUtils";
import { getProductRoute } from "../../lib/routes";
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Shell } from "../../components/Shell";
import { db, onStoreUpdate } from "../../lib/db";
import { authClient } from "../../lib/authClient";
import { 
  ChevronLeft, Package, CreditCard, ChevronRight, 
  Search, Truck, LogIn, Clock, ArrowRight, RefreshCw, Loader2,
  CheckCircle2, XCircle, RotateCcw, MessageCircle, AlertCircle
} from "lucide-react";
import { AuraAISupportAssistant } from "../../components/AuraAISupportAssistant";
import { emitToast } from "../../context/ToastContext";

export function getOrderProducts(o) {
  return db.normalizeOrderItems(o);
}

function OrdersSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <div style={{
        background: "#ffffff",
        border: "1px solid #ebdccb",
        borderRadius: 12,
        padding: "16px",
        height: 52,
        animation: "pulse 1.6s infinite ease-in-out"
      }} />
      <div style={{
        background: "#ffffff",
        border: "1px solid #ebdccb",
        borderRadius: 12,
        padding: "18px",
        height: 80,
        animation: "pulse 1.6s infinite ease-in-out"
      }} />
      {[1, 2, 3].map((idx) => (
        <div 
          key={idx} 
          style={{
            background: "#ffffff",
            border: "1px solid #eee1cf",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            animation: "pulse 1.6s infinite ease-in-out"
          }}
        >
          <div style={{
            padding: "14px 20px",
            background: "#fdfbf7",
            borderBottom: "1px solid #eee1cf",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 140, height: 18, background: "#f4ece5", borderRadius: 4 }} />
              <div style={{ width: 90, height: 14, background: "#f8f4ef", borderRadius: 4 }} />
            </div>
            <div style={{ width: 80, height: 20, background: "#f4ece5", borderRadius: 4 }} />
          </div>
          <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, background: "#f4ece5", borderRadius: 8 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ width: 220, height: 16, background: "#f4ece5", borderRadius: 4 }} />
                <div style={{ width: 130, height: 12, background: "#f8f4ef", borderRadius: 4 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 80, height: 34, background: "#f4ece5", borderRadius: 6 }} />
              <div style={{ width: 90, height: 34, background: "#f4ece5", borderRadius: 6 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Orders() {
  const [currentUser, setCurrentUser] = useState(() => authClient.getUser());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [retryingOrderId, setRetryingOrderId] = useState(null);
  const [trackInput, setTrackInput] = useState("");
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Trap Browser Back to always navigate to Home ("/")
    window.history.pushState({ auraOrderView: true }, "", window.location.href);

    const handlePopState = () => {
      navigate("/", { replace: true });
    };

    window.addEventListener("popstate", handlePopState);

    let isMounted = true;

    async function initAuthAndOrders() {
      setLoading(true);
      setLoadError("");
      
      let user = authClient.getUser();
      if (!user) {
        user = await authClient.getCurrentUserAsync();
      }
      if (!isMounted) return;
      setCurrentUser(user);

      if (!user || user.isAnonymous) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        const res = await db.getMyOrders();
        if (!isMounted) return;
        if (res?.success && Array.isArray(res.data)) {
          const sorted = [...res.data].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
          setOrders(sorted);
          setLoadError("");
        } else {
          setOrders([]);
          setLoadError(res?.message || "Failed to load your orders from server.");
        }
      } catch (err) {
        if (!isMounted) return;
        setOrders([]);
        setLoadError("Network error while loading your orders.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuthAndOrders();

    const unsubscribeAuth = authClient.onAuthStateChanged((u) => {
      if (!isMounted) return;
      setCurrentUser(u);
      if (u && !u.isAnonymous) {
        loadOrders(u);
      } else {
        setOrders([]);
        setLoading(false);
      }
    });

    const unsubscribeStore = onStoreUpdate(() => {
      if (!isMounted) return;
      const u = authClient.getUser();
      if (u && !u.isAnonymous) {
        loadOrders(u);
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener("popstate", handlePopState);
      unsubscribeAuth();
      unsubscribeStore();
    };
  }, [navigate]);

  async function loadOrders(user = null) {
    const authUser = user || authClient.getUser();
    if (!authUser || authUser.isAnonymous) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");
    try {
      const res = await db.getMyOrders();
      if (res?.success && Array.isArray(res.data)) {
        const sorted = [...res.data].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
        setOrders(sorted);
        setLoadError("");
      } else {
        setOrders([]);
        setLoadError(res?.message || "Failed to load orders. Please try again.");
      }
    } catch (err) {
      console.error("Error loading orders:", err);
      setOrders([]);
      setLoadError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleQuickTrack = (e) => {
    e.preventDefault();
    const val = trackInput.trim();
    if (!val) return;
    navigate(`/track-order?id=${encodeURIComponent(val)}`);
  };

  const handlePayuRetry = async (e, orderId) => {
    e.stopPropagation();
    if (!orderId) return;
    setRetryingOrderId(orderId);
    try {
      const res = await db.retryPayment(orderId);
      if (res?.success && res.data?.paymentUrl && res.data?.params) {
        emitToast("Connecting to PayU Secure Gateway...", "info");
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
        throw new Error(res?.message || "Could not generate PayU payment session");
      }
    } catch (err) {
      setRetryingOrderId(null);
      emitToast(err.message || "Failed to retry PayU payment", "error");
    }
  };

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase().trim();
    const idMatch = String(o.id || o.orderNumber || "").toLowerCase().includes(q);
    const itemMatch = (o.items || []).some(item => (item.name || "").toLowerCase().includes(q));
    const statusMatch = statusFilter === "all" || (o.status || "").toLowerCase() === statusFilter.toLowerCase();
    
    if (q) {
      return (idMatch || itemMatch) && statusMatch;
    }
    return statusMatch;
  });

  return (
    <Shell>
      <main className="page" style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 80, minHeight: '80vh' }}>
        
        {/* Navigation & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          <button 
            type="button"
            className="back-btn" 
            onClick={() => navigate("/", { replace: true })} 
            style={{
              background: 'none', 
              border: 'none', 
              color: '#a54d2b', 
              cursor: 'pointer', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 5, 
              fontSize: 13, 
              fontWeight: 600,
              padding: '6px 0'
            }}
          >
            <ChevronLeft size={16} /> Back to Home
          </button>

          <Link
            to="/track-order"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#a54d2b',
              textDecoration: 'none',
              background: '#fcf4ed',
              border: '1px solid #ebdccb',
              padding: '6px 12px',
              borderRadius: 20
            }}
          >
            <Truck size={14} /> Live Courier Tracker <ArrowRight size={12} />
          </Link>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, color: '#2b170d', margin: 0 }}>
            My Orders & Purchase History
          </h1>
          <p style={{ fontSize: 13, color: '#806f62', marginTop: 4 }}>
            Track live dispatch status, download Vedic consecration certificates, and manage delivery details.
          </p>
        </div>

        {/* 1. SKELETON LOADING STATE: Shown while initial or background auth/API request is pending */}
        {loading ? (
          <OrdersSkeleton />
        ) : !currentUser || currentUser.isAnonymous ? (
          /* 2. GUEST / NON-LOGGED IN STATE */
          <div style={{
            background: '#fff',
            border: '1px solid #eee1cf',
            borderRadius: 16,
            padding: '36px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            marginBottom: 28
          }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#fdf5ec',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              color: '#a54d2b'
            }}>
              <LogIn size={26} />
            </div>
            
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: '#2b170d', margin: '0 0 8px' }}>
              Sign In to View Your Orders
            </h2>
            <p style={{ fontSize: 13, color: '#806f62', maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.6 }}>
              You are currently browsing as a guest. Sign in to your account to view your past purchases, download Vedic consecration certificates, and check real-time order delivery updates.
            </p>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
              <Link
                to="/login"
                state={{ from: location.pathname + location.search + location.hash }}
                className="primary-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 28px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <LogIn size={15} /> Sign In to Your Account
              </Link>
            </div>

            <div style={{
              borderTop: '1px dashed #ebdccb',
              paddingTop: 24,
              maxWidth: 540,
              margin: '0 auto',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Truck size={16} style={{ color: '#a54d2b' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2b170d' }}>
                  Have an Order ID or tracking number?
                </span>
              </div>
              <form onSubmit={handleQuickTrack} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input 
                  type="text"
                  placeholder="Enter Order ID (e.g. ORD-1001)"
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #ebdccb',
                    fontSize: 13,
                    background: '#fdfbf7'
                  }}
                />
                <button
                  type="submit"
                  className="outline-btn"
                  style={{ padding: '10px 20px', fontSize: 13, background: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Search size={14} /> Search Order
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* 3. LOGGED-IN STATE */
          <>
            {/* Quick Order Lookup Form */}
            <div style={{
              background: '#fff',
              border: '1px solid #eee1cf',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 20,
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <form onSubmit={handleQuickTrack} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a08f82' }} />
                  <input 
                    type="text"
                    placeholder="Search by Order ID or item name..."
                    value={trackInput}
                    onChange={(e) => {
                      setTrackInput(e.target.value);
                      setSearchQuery(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: 8,
                      border: '1px solid #ebdccb',
                      fontSize: 13,
                      background: '#fdfbf7'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ padding: '9px 18px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Truck size={14} /> Track ID
                </button>
              </form>
            </div>

            {/* Aura AI In-Page Order Assistant */}
            <div style={{ marginBottom: 24 }}>
              <AuraAISupportAssistant defaultTopic="orders" compact={true} />
            </div>

            {/* 4. ERROR STATE */}
            {loadError ? (
              <div className="empty" style={{ textAlign: 'center', padding: '60px 20px', background: '#fffdf9', borderRadius: 12, border: '1px solid #fecaca' }}>
                <AlertCircle size={44} style={{ color: '#dc2626', marginBottom: 15 }} />
                <h3 style={{ fontSize: 18, color: '#991b1b', marginBottom: 6, fontWeight: 700 }}>Unable to Load Orders</h3>
                <p style={{ fontSize: 13, color: '#806f62', marginBottom: 20, maxWidth: 440, margin: '0 auto 20px' }}>{loadError}</p>
                <button 
                  onClick={() => loadOrders(currentUser)} 
                  style={{ 
                    padding: '10px 24px', 
                    borderRadius: 8, 
                    border: 'none', 
                    background: '#a54d2b', 
                    color: '#fff', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <RefreshCw size={14} /> Try Again
                </button>
              </div>
            ) : orders.length === 0 ? (
              /* 5. AUTHENTIC ZERO ORDERS EMPTY STATE */
              <div className="empty" style={{ textAlign: 'center', padding: '60px 20px', background: '#fffdf9', borderRadius: 12, border: '1px solid #eee1cf' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#f7efe6',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                  color: '#b85d25'
                }}>
                  <Package size={32} />
                </div>
                <h3 style={{ fontSize: 22, color: '#2b170d', marginBottom: 8, fontFamily: 'Cormorant Garamond, serif' }}>
                  No Orders Placed Yet
                </h3>
                <p style={{ fontSize: 13.5, color: '#806f62', maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.6 }}>
                  You have not placed any orders yet with your account. Explore our authentic Nepal and Indonesian Rudraksha collection with Vedic consecration.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link to="/shop" className="primary-btn" style={{ padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 13 }}>
                    Explore Rudraksha Catalog
                  </Link>
                  <Link to="/track-order" className="outline-btn" style={{ padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 13, background: '#fff' }}>
                    Track with Order ID
                  </Link>
                </div>
              </div>
            ) : (
              /* 6. REAL ORDERS LIST */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Filter Tabs */}
                {orders.length > 2 && (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {["all", "Processing", "Shipped", "Delivered", "Cancelled"].map(st => (
                      <motion.button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: statusFilter === st ? '1px solid #a54d2b' : '1px solid #ebdccb',
                          background: statusFilter === st ? '#a54d2b' : '#fff',
                          color: statusFilter === st ? '#fff' : '#5c483b',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: statusFilter === st ? '0 3px 10px rgba(165,77,43,0.25)' : 'none'
                        }}
                      >
                        {st === "all" ? "All Orders" : st}
                      </motion.button>
                    ))}
                  </div>
                )}

                {filteredOrders.map((o) => {
                  const parsedItems = getOrderProducts(o);
                  const totalItems = parsedItems.reduce((acc, curr) => acc + (curr.qty || curr.quantity || 1), 0);
                  const uniqueProducts = parsedItems.length;
                  const isCancelled = o.status === 'Cancelled';
                  const isDelivered = o.status === 'Delivered';
                  
                  const isPaid = o.paymentStatus === "Paid";
                  const isFailed = o.paymentStatus === "Failed";
                  const isPending = !isPaid && !isFailed && (o.paymentStatus === "Pending" || !o.paymentStatus);
                  const isRefunded = o.paymentStatus === "Refunded" || o.paymentStatus === "Partially Refunded" || (o.amountRefunded > 0);
                  const paymentDate = o.paymentDetails?.verifiedAt || (isPaid ? o.date : null);
                  const isRetrying = retryingOrderId === (o.orderNumber || o.id);

                  return (
                    <motion.div 
                      onClick={() => navigate(`/account/orders/${o.orderNumber || o.id}`)} 
                      key={o.orderNumber || o.id} 
                      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(184, 93, 37, 0.12)', borderColor: '#a54d2b' }}
                      whileTap={{ scale: 0.992 }}
                      style={{ 
                        cursor: 'pointer',
                        background: '#fff', 
                        border: '1px solid #eee1cf', 
                        borderRadius: 14,
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Card Header: Order ID, Date & Total */}
                      <div style={{
                        padding: '14px 20px', 
                        background: '#fdfbf7', 
                        borderBottom: '1px solid #eee1cf',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <b style={{ fontSize: 14, color: '#2b170d', fontFamily: 'monospace', letterSpacing: '0.3px' }}>
                              {o.orderNumber || o.id}
                            </b>
                            <span style={{ fontSize: 12, color: '#806f62' }}>
                              • Placed on {new Date(o.date || o.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          
                          {/* Payment Meta: Method, TxnID & Payment Date */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 4, fontSize: 11.5, color: '#6b5c51' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <CreditCard size={12} color="#a54d2b" /> PayU Hosted Checkout
                            </span>
                            {o.txnid && (
                              <span>Txn: <code style={{ fontFamily: 'monospace', background: '#f5eee6', padding: '1px 4px', borderRadius: 3 }}>{o.txnid}</code></span>
                            )}
                            {o.mihpayid && (
                              <span>PayU Ref: <code style={{ fontFamily: 'monospace', background: '#f5eee6', padding: '1px 4px', borderRadius: 3 }}>{o.mihpayid}</code></span>
                            )}
                            {paymentDate && (
                              <span>Paid on: {new Date(paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ display: 'block', fontSize: 16, color: '#a54d2b' }}>
                            ₹{(o.finalAmount || o.amount || o.total || 0).toLocaleString('en-IN')}
                          </strong>
                          
                          {/* Payment Status Badge */}
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 4 }}>
                            {isPaid && (
                              <span style={{
                                background: '#e5f6ea',
                                color: '#166534',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10.5,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                <CheckCircle2 size={11} /> Payment Successful
                              </span>
                            )}
                            {isPending && !isCancelled && (
                              <span style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10.5,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                <Clock size={11} /> Payment Verification Pending
                              </span>
                            )}
                            {isFailed && !isCancelled && (
                              <span style={{
                                background: '#fee2e2',
                                color: '#991b1b',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10.5,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                <XCircle size={11} /> Payment Incomplete
                              </span>
                            )}
                            {isRefunded && (
                              <span style={{
                                background: '#f0f4ff',
                                color: '#3730a3',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10.5,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                <RotateCcw size={11} /> {o.paymentStatus === 'Refunded' ? 'Refunded' : `Partially Refunded (₹${Number(o.amountRefunded || 0).toLocaleString()})`}
                              </span>
                            )}
                            <span className={`status ${isCancelled ? 'error' : isDelivered ? 'success' : 'pending'}`} style={{
                              background: isCancelled ? '#ffebee' : isDelivered ? '#e5f6ea' : '#fff3e0',
                              color: isCancelled ? '#c62828' : isDelivered ? '#1d9450' : '#b85d25',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10.5,
                              fontWeight: 700,
                              display: 'inline-block'
                            }}>
                              {o.status || "Confirmed"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Card Body: Items & Actions */}
                      <div style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ display: 'flex', position: 'relative' }}>
                              {parsedItems.slice(0, 3).map((prod, idx) => {
                                const imgSrc = getProductPrimaryImage(prod) || db.getOrderItemImage(prod);
                                return (
                                  <div key={idx} style={{
                                    width: 48, 
                                    height: 48, 
                                    borderRadius: 8, 
                                    border: '2px solid #fff',
                                    background: '#f4ece5',
                                    zIndex: 3 - idx,
                                    overflow: 'hidden',
                                    position: 'relative',
                                    marginLeft: idx > 0 ? -12 : 0,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                                  }}>
                                    <img 
                                      src={imgSrc} 
                                      loading="lazy"
                                      decoding="async"
                                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} 
                                      alt={prod.name || "Rudraksha"} 
                                    />
                                  </div>
                                );
                              })}
                              {parsedItems.length > 3 && (
                                <div style={{
                                  width: 48, 
                                  height: 48, 
                                  borderRadius: 8, 
                                  border: '2px solid #fff',
                                  background: '#fdfbf7',
                                  zIndex: 0,
                                  marginLeft: -12,
                                  display: 'grid',
                                  placeItems: 'center',
                                  fontSize: 11,
                                  color: '#806f62',
                                  fontWeight: 600
                                }}>
                                  +{parsedItems.length - 3}
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <b style={{ fontSize: 13.5, color: '#2b170d', display: 'block' }}>
                                {parsedItems[0]?.name ? (
                                  parsedItems.length > 1 ? `${parsedItems[0].name} (+${parsedItems.length - 1} more)` : parsedItems[0].name
                                ) : (
                                  `${uniqueProducts} Product${uniqueProducts > 1 ? 's' : ''} • ${totalItems} Item${totalItems > 1 ? 's' : ''}`
                                )}
                              </b>
                              <div style={{ fontSize: 11.5, color: '#806f62', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <span>Total: {totalItems} Item{totalItems > 1 ? 's' : ''}</span>
                                {o.address && <span>• Ship to: {o.address.slice(0, 24)}...</span>}
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions: Retry Payment / Track / Details */}
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* PayU Retry Button for Pending/Failed Orders */}
                            {(isPending || isFailed) && !isCancelled && (
                              <button
                                type="button"
                                disabled={isRetrying}
                                onClick={(e) => handlePayuRetry(e, o.orderNumber || o.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '8px 14px',
                                  background: isRetrying ? '#8a3c1c' : 'linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: isRetrying ? 'wait' : 'pointer',
                                  boxShadow: '0 2px 6px rgba(165, 77, 43, 0.25)'
                                }}
                              >
                                {isRetrying ? (
                                  <>
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Connecting...</span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw size={13} />
                                    <span>Retry Payment</span>
                                  </>
                                )}
                              </button>
                            )}

                            {!isCancelled && (o.trackingNumber || o.trackingId || o.courierName || o.carrier || o.trackingUrl || o.shippingLink) && (
                              <Link 
                                to={`/track-order?id=${o.orderNumber || o.id}`} 
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '8px 14px',
                                  background: '#fcf4ed',
                                  border: '1px solid #ebdccb',
                                  color: '#a54d2b',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textDecoration: 'none'
                                }}
                              >
                                <Truck size={13} /> Track
                              </Link>
                            )}

                            {isDelivered && parsedItems.length > 0 && (
                              <Link
                                to={`${getProductRoute(parsedItems[0])}#write-review`}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '8px 14px',
                                  background: '#fff',
                                  border: '1px solid #ebdccb',
                                  color: '#a54d2b',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textDecoration: 'none'
                                }}
                              >
                                <MessageCircle size={13} /> Review
                              </Link>
                            )}

                            <Link 
                              to={`/account/orders/${o.orderNumber || o.id}`} 
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '8px 16px',
                                background: '#fff',
                                border: '1px solid #a54d2b',
                                color: '#a54d2b',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: 'none'
                              }}
                            >
                              Details <ChevronRight size={13} />
                            </Link>
                          </div>
                          
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </Shell>
  );
}
