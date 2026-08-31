import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  ChevronLeft, Check, Package, MapPin, CreditCard, RotateCcw, 
  X, Edit3, MessageCircle, AlertCircle, Truck, ExternalLink, 
  Copy, CheckCheck, Link2, Calendar
} from "lucide-react";
import { Shell } from "../../components/Shell";
import { db } from "../../lib/db";
import { authClient } from "../../lib/authClient";
import { motion, AnimatePresence } from "framer-motion";
import { emitToast } from "../../context/ToastContext";
import { useCart } from "../../hooks/useCart";
import { OrderSummaryCard } from "../../components/checkout/OrderSummaryCard";

export function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { add } = useCart();
  const [order, setOrder] = useState(null);
  
  // Modals state
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  
  const [editAddressModal, setEditAddressModal] = useState(false);
  const [editAddressForm, setEditAddressForm] = useState("");
  const [copiedAwb, setCopiedAwb] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadOrder();
    const unsubscribe = authClient.onAuthStateChanged(() => {
      loadOrder();
    });
    return () => unsubscribe();
  }, [id]);
  
  async function loadOrder() {
    setLoading(true);
    setLoadError("");
    try {
      const res = await db.getOrder(id);
      if (res?.success && res.data) {
        const normalized = db.normalizeOrder(res.data);
        setOrder(normalized);
        setEditAddressForm(normalized.address || "");
      } else {
        setLoadError(res?.message || "Order not found");
      }
    } catch (err) {
      console.error("Error loading order details:", err);
      setLoadError("Could not load order details");
    } finally {
      setLoading(false);
    }
  }

    

  if (loading) {
    return (
      <Shell>
        <main className="page" style={{ maxWidth: 850, margin: "0 auto", padding: "40px 16px 80px" }}>
          <div style={{ height: 32, width: 140, background: '#f4ece5', borderRadius: 8, marginBottom: 20 }} />
          <div style={{ height: 200, background: '#f8f4ef', borderRadius: 12, marginBottom: 20 }} />
          <div style={{ height: 160, background: '#f8f4ef', borderRadius: 12 }} />
        </main>
      </Shell>
    );
  }

  if (!order || loadError) {
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
        
        <Link className="back-btn" to="/account/orders" style={{marginBottom: 20, display: 'inline-flex', gap: 5, alignItems: 'center', textDecoration: 'none', color: '#a54d2b', fontSize: 13, fontWeight: 600}}>
          <ChevronLeft size={16}/> Back to Orders
        </Link>
        
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 15, marginBottom: 25}}>
          <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}>
            <h1 style={{fontFamily: 'Cormorant Garamond, serif', fontSize: 30, margin: '0 0 5px', color: '#2b170d'}}>
              Order <span style={{fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums'}}>{order.id}</span>
            </h1>
            <p style={{color: '#806f62', fontSize: 13}}>Placed on {new Date(order.date).toLocaleDateString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
          </motion.div>
          
          <div style={{display: 'flex', gap: 10}}>
            {isCancelled ? (
              <span style={{background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                <X size={16} /> Cancelled
              </span>
            ) : (
              <span style={{background: '#e5f6ea', color: '#1d9450', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>
                <Check size={16} /> {order.status}
              </span>
            )}
          </div>
        </div>
        
        {isCancelled && order.cancelReason && (
          <div style={{background: '#fff0ed', color: '#c62828', padding: '16px', borderRadius: 12, marginBottom: 30, fontSize: 13, border: '1px solid #ffcdd2'}}>
            <b>Cancellation Reason:</b> {order.cancelReason}
          </div>
        )}
        
        {!isCancelled && (
          <motion.div className="timeline-container" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}} style={{
            background: '#fffdf9',
            border: '1px solid #eee1cf',
            borderRadius: 15,
            padding: '25px 20px',
            marginBottom: 30,
            overflowX: 'auto'
          }}>
            <div className="timeline" style={{ minWidth: 500, margin: 0 }}>
              {statuses.map((x, i) => {
                const passed = currentStatusIdx >= i;
                const active = currentStatusIdx === i;
                return (
                  <div className={passed ? "active" : ""} key={x} style={{opacity: (currentStatusIdx === -1 && i > 0) ? 0.4 : 1}}>
                    <span style={{
                      background: passed ? '#a54d2b' : '#f4ece5',
                      color: passed ? '#fff' : '#a29286',
                      boxShadow: active ? '0 0 0 4px #fdf5ef' : 'none'
                    }}>{passed ? "✓" : i+1}</span>
                    <b style={{color: active ? '#2b170d' : '#a29286', fontSize: 11}}>{x}</b>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Order Items */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 30}}>
          <motion.div style={{background: '#fff', border: '1px solid #eee1cf', borderRadius: 15, overflow: 'hidden'}} initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.15}}>
            <h2 style={{fontSize: 18, fontFamily: 'Cormorant Garamond, serif', padding: '18px 20px', margin: 0, borderBottom: '1px solid #eee1cf', background: '#fdfbf7', color: '#2b170d'}}>
              Order Items ({parsedItems.reduce((acc, curr) => acc + curr.qty, 0)} items)
            </h2>
            <div style={{display: 'flex', flexDirection: 'column'}}>
              {parsedItems.map((item, i) => {
                const productExists = db.getProduct(item.id);
                const itemTotal = (item.price || 0) * (item.qty || 1);
                
                const cardContent = (
                  <div style={{
                    display: 'flex', 
                    gap: 16, 
                    padding: '20px', 
                    borderBottom: i !== parsedItems.length - 1 ? '1px solid #eee1cf' : 'none',
                    alignItems: 'center',
                    background: '#fff',
                    transition: 'background 0.2s'
                  }}>
                    <div style={{width: 75, height: 75, borderRadius: 10, background: '#fdfbf7', border: '1px solid #eee1cf', overflow: 'hidden', flexShrink: 0, display: 'grid', placeItems: 'center'}}>
                      <img src={item.img || db.getOrderItemImage(item)} alt={item.name} loading="lazy" style={{width: '100%', height: '100%', objectFit: 'contain', padding: 4}} />
                    </div>
                    <div style={{flex: 1}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10}}>
                        <h3 style={{margin: '0 0 4px', fontSize: 16, color: '#2b170d', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600}}>{item.name}</h3>
                        {!productExists && (
                          <span style={{fontSize: 10, background: '#f4ece5', color: '#806f62', padding: '3px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4}}>
                            <AlertCircle size={10} /> Product no longer available
                          </span>
                        )}
                      </div>
                      <p style={{margin: '0 0 8px', fontSize: 12, color: '#806f62'}}>Quantity: <b>{item.qty}</b></p>
                      
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
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

                return productExists ? (
                  <Link key={i} to={`/product/${item.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    {cardContent}
                  </Link>
                ) : (
                  <div key={i}>
                    {cardContent}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20}}>
          {/* Order Summary */}
          <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
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
          </motion.div>

          {/* Shipping Info */}
          <motion.div style={{background: '#fffdf9', border: '1px solid #eee1cf', borderRadius: 15, padding: '20px'}} initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.25}}>
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

            {/* Shipping & Tracking Information Section */}
            {(() => {
              const trackingNumber = order.trackingNumber || order.trackingId;
              const courier = order.courierName || order.carrier || order.courier;
              const directLink = order.trackingUrl || order.shippingLink;
              const estDate = order.estimatedDelivery || order.estimatedDeliveryDate;

              if (trackingNumber || directLink) {
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
                        <Truck size={16} color="#a54d2b" /> Dispatched via {courier || 'Express Courier'}
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
                          <ExternalLink size={14} /> Track on {courier || 'Courier'} Official Website ↗
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
                          <ExternalLink size={14} /> Track Shipment Online ↗
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
              }

              if (!isCancelled && currentStatusIdx >= 1) {
                return (
                  <div style={{background: '#f8f4ee', padding: '12px 15px', borderRadius: 8, marginTop: 15, fontSize: 11.5, color: '#806f62', lineHeight: 1.5}}>
                    <Truck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} color="#a54d2b" />
                    Courier dispatch details and live tracking link will be uploaded here once packed and handed over to our express logistics partner.
                  </div>
                );
              }

              return null;
            })()}
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div style={{display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap'}} initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}}>
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
        </motion.div>
        
      </main>

      {/* Cancel Order Modal */}
      <AnimatePresence>
        {cancelModal && (
          <div className="lightbox-overlay" style={{display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000}}>
            <motion.div 
              initial={{scale: 0.95, opacity: 0}} 
              animate={{scale: 1, opacity: 1}} 
              exit={{scale: 0.95, opacity: 0}}
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Address Modal */}
      <AnimatePresence>
        {editAddressModal && (
          <div className="lightbox-overlay" style={{display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000}}>
            <motion.div 
              initial={{scale: 0.95, opacity: 0}} 
              animate={{scale: 1, opacity: 1}} 
              exit={{scale: 0.95, opacity: 0}}
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </Shell>
  );
}
