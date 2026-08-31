import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shell } from "../../components/Shell";
import { db } from "../../lib/db";
import { authClient } from "../../lib/authClient";
import { 
  ChevronLeft, Package, CreditCard, ChevronRight, 
  Sparkles, Search, Truck, LogIn, Clock, ShieldCheck, 
  ExternalLink, ArrowRight, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuraAISupportAssistant } from "../../components/AuraAISupportAssistant";

export function getOrderProducts(o) {
  return db.normalizeOrderItems(o);
}

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentUser, setCurrentUser] = useState(() => authClient.getUser());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Quick track input for guests
  const [trackInput, setTrackInput] = useState("");
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check initial user and listen for auth updates without redirecting
    const user = authClient.getUser();
    setCurrentUser(user);
    loadOrders(user);

    const unsubscribe = authClient.onAuthStateChanged((u) => {
      setCurrentUser(u);
      loadOrders(u);
    });
    return () => unsubscribe();
  }, []);

  async function loadOrders(user = null) {
    setLoading(true);
    setLoadError("");
    try {
      const authUser = user || authClient.getUser();
      if (!authUser || authUser.isAnonymous) {
        // Not logged in - strictly 0 orders to show
        setOrders([]);
        setLoading(false);
        return;
      }

      const res = await db.getMyOrders();
      if (res?.success && Array.isArray(res.data)) {
        const sorted = [...res.data].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
        setOrders(sorted);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Error loading orders:", err);
      setOrders([]);
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

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase().trim();
    const idMatch = String(o.id || "").toLowerCase().includes(q);
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
            className="back-btn" 
            onClick={() => navigate("/account")} 
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
            <ChevronLeft size={16} /> Back to Account
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

        {/* Guest / Non-logged in State */}
        {!currentUser || currentUser.isAnonymous ? (
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
                state={{ from: "/account/orders" }}
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
          <>
            {/* Quick Order Lookup Form for logged in users */}
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
                    onChange={(e) => setTrackInput(e.target.value)}
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

            {/* Orders List / State Handling */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '10px 0' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ height: 130, borderRadius: 12, background: '#f5ede3', animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            ) : loadError ? (
              <div className="empty" style={{ textAlign: 'center', padding: '60px 20px', background: '#fffdf9', borderRadius: 12, border: '1px solid #eee1cf' }}>
                <Package size={48} style={{ color: '#d9c6b3', marginBottom: 15 }} />
                <p style={{ fontSize: 14, color: '#806f62', marginBottom: 18 }}>{loadError}</p>
                <button onClick={() => loadOrders(currentUser)} style={{ padding: '12px 25px', borderRadius: 8, border: 'none', background: '#a54d2b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Try Again
                </button>
              </div>
            ) : orders.length === 0 ? (
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
                <h3 style={{ fontSize: 20, color: '#2b170d', marginBottom: 8, fontFamily: 'Cormorant Garamond, serif' }}>
                  No Orders Placed Yet
                </h3>
                <p style={{ fontSize: 13, color: '#806f62', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.5 }}>
                  You have not placed any orders yet with your account. Explore our authentic Nepal and Indonesian Rudraksha collection.
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Filter Tabs if multiple orders */}
                {orders.length > 2 && (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {["all", "Processing", "Shipped", "Delivered", "Cancelled"].map(st => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: statusFilter === st ? '1px solid #a54d2b' : '1px solid #ebdccb',
                          background: statusFilter === st ? '#a54d2b' : '#fff',
                          color: statusFilter === st ? '#fff' : '#5c483b',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {st === "all" ? "All Orders" : st}
                      </button>
                    ))}
                  </div>
                )}

                {filteredOrders.map(o => {
                  const parsedItems = getOrderProducts(o);
                  const totalItems = parsedItems.reduce((acc, curr) => acc + (curr.qty || curr.quantity || 1), 0);
                  const uniqueProducts = parsedItems.length;
                  const isCancelled = o.status === 'Cancelled';
                  const isDelivered = o.status === 'Delivered';
                  
                  return (
                    <motion.div 
                      onClick={() => navigate(`/account/orders/${o.id}`)} 
                      key={o.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      style={{ 
                        cursor: 'pointer',
                        background: '#fff', 
                        border: '1px solid #eee1cf', 
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s'
                      }}
                    >
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
                          <b style={{ fontSize: 14, color: '#2b170d', display: 'block' }}>{o.id}</b>
                          <span style={{ fontSize: 12, color: '#806f62' }}>
                            {new Date(o.date || o.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ display: 'block', fontSize: 15, color: '#a54d2b' }}>
                            ₹{(o.finalAmount || o.amount || o.total || 0).toLocaleString('en-IN')}
                          </strong>
                          <span className={`status ${isCancelled ? 'error' : isDelivered ? 'success' : 'pending'}`} style={{
                            background: isCancelled ? '#ffebee' : isDelivered ? '#e5f6ea' : '#fff3e0',
                            color: isCancelled ? '#c62828' : isDelivered ? '#1d9450' : '#b85d25',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'inline-block',
                            marginTop: 2
                          }}>
                            {o.status || "Confirmed"}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ display: 'flex', position: 'relative' }}>
                              {parsedItems.slice(0, 3).map((prod, idx) => {
                                const imgSrc = prod.img || prod.image || db.getOrderItemImage(prod) || "/images/product-5mukhi.jpg";
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
                              <b style={{ fontSize: 13, color: '#2b170d', display: 'block' }}>
                                {parsedItems[0]?.name ? (
                                  parsedItems.length > 1 ? `${parsedItems[0].name} (+${parsedItems.length - 1} more)` : parsedItems[0].name
                                ) : (
                                  `${uniqueProducts} Product${uniqueProducts > 1 ? 's' : ''} • ${totalItems} Item${totalItems > 1 ? 's' : ''}`
                                )}
                              </b>
                              <div style={{ fontSize: 11, color: '#806f62', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                                <CreditCard size={12} /> {o.paymentMethod || 'Online Payment'} • {totalItems} Item{totalItems > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Link 
                              to={`/track-order?id=${o.id}`} 
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

                            <Link 
                              to={`/account/orders/${o.id}`} 
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
