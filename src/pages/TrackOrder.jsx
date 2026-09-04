import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { 
  PackageSearch, Truck, CheckCircle2, Clock, 
  MapPin, ShieldCheck, ArrowRight, Flame, 
  Sparkles, Phone, MessageCircle, AlertCircle,
  ExternalLink, Copy, CheckCheck
} from "lucide-react";
import { db } from "../lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { emitToast } from "../context/ToastContext";

export function TrackOrder() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("id") || searchParams.get("order") || "";

  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [copiedAwb, setCopiedAwb] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (searchVal) => {
    const rawTerm = (searchVal !== undefined ? searchVal : query).trim();
    if (!rawTerm) return;

    setIsSearching(true);
    setSearched(true);
    setOrderResult(null);

    try {
      // 1. Call dedicated public tracking endpoint
      const trackRes = await db.trackOrder(rawTerm);
      if (trackRes?.success && trackRes.data) {
        setOrderResult(trackRes.data);
        return;
      }

      // 2. Direct lookup fallback for authenticated users
      const singleRes = await db.getOrder(rawTerm);
      if (singleRes?.success && singleRes.data) {
        setOrderResult(singleRes.data);
        return;
      }

      setOrderResult(null);
    } catch (err) {
      console.error("Tracking search error:", err);
      setOrderResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const getTimelineSteps = (order) => {
    if (order.timeline && order.timeline.length > 0) {
      return order.timeline;
    }

    const isDelivered = order.status === "Delivered";
    const isShipped = order.status === "Shipped" || isDelivered;
    const isProcessing = order.status === "Processing" || isShipped;

    return [
      { title: "Order Confirmed & Placed", date: new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN"), done: true },
      { title: "Temple Prana Pratishtha Consecration", date: "Consecrated with Gangajal", done: isProcessing },
      { title: "Lab X-Ray Verification & Certification", date: "Certified Authentic", done: isProcessing },
      { title: "Dispatched via Express Air", date: order.trackingNumber ? `AWB: ${order.trackingNumber}` : "In Transit", done: isShipped, current: isShipped && !isDelivered },
      { title: "Delivered & Blessed", date: isDelivered ? "Delivered" : "Expected in 2-4 days", done: isDelivered, current: isDelivered }
    ];
  };

  return (
    <Shell>
      <div className="track-order-page" style={{ background: "#fdfbf7", minHeight: "100vh", padding: "40px 16px 80px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#fcf4ed",
              border: "1px solid #ebdccb",
              borderRadius: "30px",
              padding: "5px 14px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#a54d2b",
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              marginBottom: "10px"
            }}>
              <PackageSearch size={13} /> Live Dispatch & Consecration Tracking
            </div>
            <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "34px", color: "#2b170d", margin: "0 0 10px" }}>
              Track Your Sacred Order
            </h1>
            <p style={{ color: "#7d6d62", fontSize: "14px", maxWidth: "540px", margin: "0 auto" }}>
              Enter your Order ID (e.g. AUR-1001) or the mobile number used during checkout to view live status.
            </p>
          </div>

          {/* Search Box */}
          <div style={{
            background: "#ffffff",
            padding: "20px 24px",
            borderRadius: "14px",
            border: "1px solid #ebdccb",
            boxShadow: "0 4px 18px rgba(43, 23, 13, 0.04)",
            marginBottom: "32px"
          }}>
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
              style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
            >
              <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
                <input 
                  type="text"
                  placeholder="Order ID (e.g. AUR-1001) or 10-digit Phone"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1.5px solid #dcc5ad",
                    fontSize: "14px",
                    color: "#2b170d",
                    outline: "none",
                    background: "#fdfaf6"
                  }}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                style={{
                  background: "#a54d2b",
                  color: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 0.2s"
                }}
              >
                {isSearching ? "Locating..." : <>Track Order <ArrowRight size={15} /></>}
              </button>
            </form>
          </div>

          {/* Results Container */}
          <AnimatePresence mode="wait">
            {searched && orderResult && (
              <motion.div
                key="found"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #ebdccb",
                  boxShadow: "0 8px 30px rgba(43, 23, 13, 0.06)",
                  padding: "28px 24px",
                  marginBottom: "24px"
                }}
              >
                {/* Top Status Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid #f2e6da", paddingBottom: "18px", marginBottom: "22px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#806f62", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>ORDER REFERENCE</span>
                    <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "24px", color: "#2b170d", margin: "2px 0 0" }}>
                      {orderResult.id}
                    </h2>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: orderResult.status === "Delivered" ? "#edfbf0" : "#fcf4ed",
                      border: `1px solid ${orderResult.status === "Delivered" ? "#b7ebc5" : "#ebdccb"}`,
                      color: orderResult.status === "Delivered" ? "#16a34a" : "#a54d2b",
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontSize: "12.5px",
                      fontWeight: 700
                    }}>
                      <Clock size={14} /> Status: {orderResult.status || "In Transit"}
                    </span>
                    {orderResult.estimatedDelivery && (
                      <span style={{ display: "block", fontSize: "12px", color: "#7d6d62", marginTop: "4px" }}>
                        Est. Delivery: <strong>{orderResult.estimatedDelivery}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Carrier & Tracking Code Bar */}
                {(() => {
                  const courier = orderResult.courierName || orderResult.carrier || orderResult.courier || "DTDC / Delhivery Express";
                  const trackingNum = orderResult.trackingNumber || orderResult.trackingId;
                  const trackingUrl = orderResult.trackingUrl || orderResult.shippingLink;

                  return (
                    <div style={{
                      background: "linear-gradient(135deg, #fcf7f0 0%, #f7eee4 100%)",
                      padding: "16px 20px",
                      borderRadius: "12px",
                      border: "1px solid #e8dac9",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginBottom: "28px"
                    }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ background: '#fdf3ea', padding: '8px', borderRadius: '8px', border: '1px solid #ebdccb' }}>
                            <Truck size={22} color="#a54d2b" />
                          </div>
                          <div>
                            <span style={{ fontSize: "11px", color: "#7d6d62", display: "block" }}>Courier Partner</span>
                            <strong style={{ fontSize: "14px", color: "#2b170d" }}>{courier}</strong>
                          </div>
                        </div>

                        {trackingNum && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "11px", color: "#7d6d62", display: "block" }}>Airway Bill (AWB)</span>
                              <strong style={{ fontSize: "13.5px", color: "#a54d2b", fontFamily: "monospace", letterSpacing: "0.5px" }}>{trackingNum}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(trackingNum);
                                setCopiedAwb(true);
                                emitToast("Tracking number copied!", "success");
                                setTimeout(() => setCopiedAwb(false), 2000);
                              }}
                              title="Copy Tracking Number"
                              style={{
                                background: '#fff',
                                border: '1px solid #ebdccb',
                                padding: '6px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: '#a54d2b'
                              }}
                            >
                              {copiedAwb ? <CheckCheck size={14} color="#1d9450" /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Direct Courier Website Tracking Link Button */}
                      {(trackingUrl || trackingNum) && (
                        <div style={{ borderTop: '1px dashed #ebdccb', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                          <a
                            href={trackingUrl || `https://www.google.com/search?q=track+${encodeURIComponent(courier)}+${encodeURIComponent(trackingNum)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#a54d2b',
                              color: '#ffffff',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              boxShadow: '0 2px 5px rgba(165, 77, 43, 0.2)'
                            }}
                          >
                            <ExternalLink size={13} /> Track Package on {courier} Official Portal ↗
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Timeline */}
                <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "20px", color: "#2b170d", marginBottom: "16px" }}>
                  Sanctification & Delivery Progress
                </h3>

                <div style={{ position: "relative", paddingLeft: "28px", marginBottom: "28px" }}>
                  {/* Vertical Line */}
                  <div style={{
                    position: "absolute",
                    left: "11px",
                    top: "8px",
                    bottom: "16px",
                    width: "2px",
                    background: "#ebdccb"
                  }} />

                  {getTimelineSteps(orderResult).map((step, idx) => (
                    <div key={idx} style={{ position: "relative", marginBottom: "20px" }}>
                      {/* Step Circle */}
                      <div style={{
                        position: "absolute",
                        left: "-28px",
                        top: "2px",
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: step.done ? "#a54d2b" : "#ffffff",
                        border: step.done ? "none" : "2px solid #ebdccb",
                        display: "grid",
                        placeItems: "center",
                        color: "#ffffff"
                      }}>
                        {step.done && <CheckCircle2 size={13} strokeWidth={2.5} />}
                      </div>

                      <div>
                        <strong style={{ fontSize: "14px", color: step.done ? "#2b170d" : "#8c7d72", display: "block" }}>
                          {step.title}
                        </strong>
                        <span style={{ fontSize: "12px", color: "#7d6d62" }}>
                          {step.date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Items Preview */}
                {orderResult.items && orderResult.items.length > 0 && (
                  <div style={{ borderTop: "1px solid #f2e6da", paddingTop: "18px", marginTop: "18px" }}>
                    <h4 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", color: "#806f62", marginBottom: "12px" }}>
                      Enclosed Sacred Artifacts
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {orderResult.items.map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fdfbf7", padding: "10px 14px", borderRadius: "8px", border: "1px solid #f2e6da" }}>
                          <span style={{ fontSize: "13.5px", color: "#2b170d", fontWeight: 600 }}>
                            {item.name || item.title} <span style={{ color: "#806f62", fontWeight: 400 }}>× {item.quantity || 1}</span>
                          </span>
                          <strong style={{ fontSize: "13.5px", color: "#a54d2b" }}>
                            ₹{Number(item.price || item.total || 0).toLocaleString("en-IN")}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {searched && !orderResult && (
              <motion.div
                key="notfound"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #ebdccb",
                  padding: "32px 24px",
                  textAlign: "center",
                  marginBottom: "24px"
                }}
              >
                <AlertCircle size={36} color="#c89b3c" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "22px", color: "#2b170d", margin: "0 0 6px" }}>
                  Order Not Found
                </h3>
                <p style={{ fontSize: "13.5px", color: "#7d6d62", maxWidth: "480px", margin: "0 auto 18px", lineHeight: 1.5 }}>
                  We couldn't locate an active order for "{query}". Please double check your order number or phone number.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <a 
                    href="https://wa.me/919672996531?text=Namaste%20I%20need%20help%20tracking%20my%20order"
                    target="_blank" 
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#20a95a",
                      color: "#ffffff",
                      padding: "9px 18px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      textDecoration: "none"
                    }}
                  >
                    <MessageCircle size={15} /> WhatsApp Support
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Assistance Box */}
          <div style={{
            background: "linear-gradient(135deg, #fbf7f0 0%, #f4eae0 100%)",
            border: "1px solid #dcc5ad",
            borderRadius: "14px",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px"
          }}>
            <div>
              <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "#2b170d", margin: "0 0 2px" }}>
                Need Dispatch or Delivery Help?
              </h4>
              <p style={{ fontSize: "12.5px", color: "#7d6d62", margin: 0 }}>
                Our dispatch desk is available 7 days a week from 9 AM to 8 PM IST.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <a 
                href="tel:+919672996531" 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#ffffff",
                  color: "#2b170d",
                  border: "1px solid #ebdccb",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  textDecoration: "none"
                }}
              >
                <Phone size={14} color="#a54d2b" /> Call Helpdesk
              </a>
              <Link 
                to="/contact" 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#a54d2b",
                  color: "#ffffff",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  textDecoration: "none"
                }}
              >
                Contact Us
              </Link>
            </div>
          </div>

        </div>
      </div>
    </Shell>
  );
}
