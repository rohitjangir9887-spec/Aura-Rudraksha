import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shell } from "../../components/Shell";
import { db } from "../../lib/db";
import { authClient } from "../../lib/authClient";
import { ChevronLeft, Package, CreditCard, ChevronRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { AuraAISupportAssistant } from "../../components/AuraAISupportAssistant";

export function getOrderProducts(o) {
  return db.normalizeOrderItems(o);
}

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = authClient.onAuthStateChanged((user) => {
      if (!user || user.isAnonymous) {
        navigate("/login", { state: { from: location.pathname } });
      } else {
        loadOrders();
      }
    });
    return () => unsubscribe();
  }, [navigate, location]);
  
  async function loadOrders() {
      setLoading(true);
      setLoadError("");
      try {
        const res = await db.getMyOrders();
        if (res?.success && Array.isArray(res.data)) {
          // Sort by date descending
          const sorted = [...res.data].sort((a, b) => new Date(b.date) - new Date(a.date));
          setOrders(sorted);
        } else if (res?.status === 401) {
          navigate("/login", { state: { from: "/account/orders" } });
        } else {
          setOrders([]);
          setLoadError("We could not load your orders right now. Please try again.");
        }
      } catch (err) {
        setOrders([]);
        setLoadError("We could not load your orders right now. Please try again.");
      } finally {
        setLoading(false);
      }
    }



  return (
    <Shell>
      <main className="page" style={{ maxWidth: 850, margin: '0 auto', paddingBottom: 60 }}>
        <button className="back-btn" onClick={() => navigate("/account")} style={{background: 'none', border: 'none', color: '#a54d2b', cursor: 'pointer', marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600}}>
          <ChevronLeft size={16} /> Back to Account
        </button>
        <h1 style={{ marginBottom: 20, fontFamily: 'Cormorant Garamond, serif', fontSize: 32, color: '#2b170d' }}>My Orders & Purchase History</h1>
        
        {/* Aura AI In-Page Order Assistant */}
        <div style={{ marginBottom: 25 }}>
          <AuraAISupportAssistant defaultTopic="orders" compact={true} />
        </div>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '10px 0' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 120, borderRadius: 12, background: '#f5ede3', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : loadError ? (
          <div className="empty" style={{ textAlign: 'center', padding: '60px 20px', background: '#fffdf9', borderRadius: 12, border: '1px solid #eee1cf' }}>
            <Package size={48} style={{ color: '#d9c6b3', marginBottom: 15 }} />
            <p style={{ fontSize: 14, color: '#806f62', marginBottom: 18 }}>{loadError}</p>
            <button onClick={loadOrders} style={{ padding: '12px 25px', borderRadius: 8, border: 'none', background: '#a54d2b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty" style={{textAlign: 'center', padding: '60px 20px', background: '#fffdf9', borderRadius: 12, border: '1px solid #eee1cf'}}>
            <Package size={48} style={{color: '#d9c6b3', marginBottom: 15}} />
            <p style={{fontSize: 14, color: '#806f62', marginBottom: 20}}>You haven't placed any orders yet.</p>
            <Link to="/shop" className="primary-btn" style={{display: 'inline-block', padding: '12px 25px', borderRadius: 8}}>Start Shopping</Link>
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
            {orders.map(o => {
              const parsedItems = getOrderProducts(o);
              const totalItems = parsedItems.reduce((acc, curr) => acc + curr.qty, 0);
              const uniqueProducts = parsedItems.length;
              
              const isCancelled = o.status === 'Cancelled';
              
              return (
                <motion.div onClick={() => navigate(`/account/orders/${o.id}`)} key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ cursor: 'pointer',
                  background: '#fff', 
                  border: '1px solid #eee1cf', 
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{
                    padding: '16px 20px', 
                    background: '#fdfbf7', 
                    borderBottom: '1px solid #eee1cf',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 15
                  }}>
                    <div>
                      <b style={{fontSize: 15, color: '#2b170d', display: 'block'}}>{o.id}</b>
                      <span style={{fontSize: 12, color: '#806f62'}}>{new Date(o.date).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <strong style={{display: 'block', fontSize: 16, color: '#a54d2b'}}>₹{(o.finalAmount || o.amount || 0).toLocaleString('en-IN')}</strong>
                      <span className={`status ${isCancelled ? 'error' : 'success'}`} style={{
                        background: isCancelled ? '#ffebee' : '#e5f6ea',
                        color: isCancelled ? '#c62828' : '#1d9450',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        display: 'inline-block',
                        marginTop: 4
                      }}>{o.status}</span>
                    </div>
                  </div>
                  
                  <div style={{padding: '20px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15}}>
                      
                      <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
                        <div style={{display: 'flex', position: 'relative'}}>
                          {parsedItems.slice(0, 3).map((prod, idx) => {
                            const exists = db.getProduct(prod.id);
                            const imgContent = (
                              <div key={idx} style={{
                                width: 50, 
                                height: 50, 
                                borderRadius: 8, 
                                border: '2px solid #fff',
                                background: '#f4ece5',
                                zIndex: 3 - idx,
                                overflow: 'hidden',
                                position: 'relative',
                                marginLeft: idx > 0 ? -15 : 0
                              }}>
                                <img src={prod.img || db.getOrderItemImage(prod)} style={{width: '100%', height: '100%', objectFit: 'contain', padding: 2}} alt={prod.name} />
                              </div>
                            );
                            return (<Link key={idx} to={`/account/orders/${o.id}`} title={`View Order`}>{imgContent}</Link>);
                          })}
                          {parsedItems.length > 3 && (
                            <div style={{
                              width: 50, 
                              height: 50, 
                              borderRadius: 8, 
                              border: '2px solid #fff',
                              background: '#fdfbf7',
                              zIndex: 0,
                              marginLeft: -15,
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
                          <b style={{fontSize: 13, color: '#2b170d', display: 'block'}}>{uniqueProducts} Product{uniqueProducts > 1 ? 's' : ''} • {totalItems} Item{totalItems > 1 ? 's' : ''}</b>
                          <div style={{fontSize: 11, color: '#806f62', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4}}>
                            <CreditCard size={12} /> {o.paymentMethod || 'Online Payment'}
                          </div>
                        </div>
                      </div>
                      
                      <Link to={`/account/orders/${o.id}`} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 18px',
                        background: '#fff',
                        border: '1px solid #a54d2b',
                        color: '#a54d2b',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}>
                        View Order <ChevronRight size={14} />
                      </Link>
                      
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </Shell>
  );
}
