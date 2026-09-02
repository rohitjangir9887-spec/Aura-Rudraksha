import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { 
  Eye, Truck, Search, ArrowLeft, CheckCircle2, Clock, 
  Package, ShoppingBag, X, Save, ExternalLink, Link2, 
  Sparkles, Copy, Check, Calendar, AlertCircle, RefreshCcw,
  ShieldCheck, Loader2
} from "lucide-react";
import "./admin-pages.css";
import { getOrderProducts } from "../account/Orders";

const POPULAR_COURIERS = [
  { id: "delhivery", name: "Delhivery", urlTpl: (awb) => `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}` },
  { id: "bluedart", name: "Blue Dart", urlTpl: (awb) => `https://www.bluedart.com/tracking?trackNumber=${encodeURIComponent(awb)}` },
  { id: "dtdc", name: "DTDC Express", urlTpl: (awb) => `https://www.dtdc.in/tracking/shipment-tracking.asp?trkType=awb&strCnno=${encodeURIComponent(awb)}` },
  { id: "indiapost", name: "India Post (Speed Post)", urlTpl: (awb) => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx` },
  { id: "shiprocket", name: "Shiprocket", urlTpl: (awb) => `https://shiprocket.co/tracking/${encodeURIComponent(awb)}` },
  { id: "ekart", name: "Ekart Logistics", urlTpl: (awb) => `https://ekartlogistics.com/shipmenttrack/${encodeURIComponent(awb)}` },
  { id: "shadowfax", name: "Shadowfax", urlTpl: (awb) => `https://tracker.shadowfax.in/#/track?awb=${encodeURIComponent(awb)}` },
  { id: "xpressbees", name: "XpressBees", urlTpl: (awb) => `https://www.xpressbees.com/track?isawb=Yes&trackid=${encodeURIComponent(awb)}` },
  { id: "ecomexpress", name: "Ecom Express", urlTpl: (awb) => `https://ecomexpress.in/tracking/?awb=${encodeURIComponent(awb)}` },
  { id: "trackon", name: "Trackon Couriers", urlTpl: (awb) => `https://trackon.in/Tracking/MultiTracking?pin=${encodeURIComponent(awb)}` },
  { id: "dhl", name: "DHL Express", urlTpl: (awb) => `https://www.dhl.com/in-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(awb)}` },
  { id: "fedex", name: "FedEx India", urlTpl: (awb) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(awb)}` },
  { id: "other", name: "Other / Custom Courier", urlTpl: null }
];

export function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  
  // Shipping & Tracking State
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [autoMarkShipped, setAutoMarkShipped] = useState(true);
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Refund Management State
  const [refundModal, setRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);

  const handleOpenRefund = (order) => {
    const total = Number(order.finalAmount || order.amount || 0);
    const already = Number(order.amountRefunded || 0);
    const remaining = Math.max(0, total - already);
    setRefundAmount(String(remaining));
    setRefundReason("Customer Cancellation / Return");
    setRefundModal(true);
  };

  const handleProcessRefund = async () => {
    if (!viewing) return;
    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      emitToast("Please enter a valid refund amount greater than 0", "error");
      return;
    }
    const total = Number(viewing.finalAmount || viewing.amount || 0);
    const already = Number(viewing.amountRefunded || 0);
    const remaining = total - already;
    if (amt > remaining + 0.01) {
      emitToast(`Cannot refund more than remaining balance of ₹${remaining.toLocaleString()}`, "error");
      return;
    }

    setIsRefunding(true);
    try {
      const res = await db.processRefund(viewing.id, {
        refundAmount: amt,
        reason: refundReason || "Admin Initiated Refund"
      });
      if (res?.success) {
        emitToast(`PayU Refund of ₹${amt.toLocaleString()} processed successfully!`, "success");
        setRefundModal(false);
        await load();
        if (res.data) {
          setViewing(db.normalizeOrder(res.data));
        } else {
          const updatedTotalRefunded = already + amt;
          const isFull = updatedTotalRefunded >= (total - 0.01);
          setViewing(prev => prev ? {
            ...prev,
            amountRefunded: updatedTotalRefunded,
            paymentStatus: isFull ? "Refunded" : "Partially Refunded",
            status: isFull ? "Cancelled" : prev.status,
            refundDetails: res.refund || { amount: amt, status: "Success", reason: refundReason }
          } : null);
        }
      } else {
        throw new Error(res?.message || "Failed to process PayU refund");
      }
    } catch (err) {
      emitToast(err.message || "PayU Refund execution failed", "error");
    } finally {
      setIsRefunding(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = onStoreUpdate(() => load());
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = orders;
    if (searchTerm) {
      result = result.filter(o => 
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.trackingNumber || o.trackingId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.courierName || o.carrier || o.courier || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "All") {
      result = result.filter(o => o.status === statusFilter);
    }
    setFilteredOrders(result);
  }, [searchTerm, statusFilter, orders]);

  const load = async () => {
    try {
      // Fetch live orders from MongoDB
      await db.fetchOrders();
    } catch (_) {}
    // Sort orders from newest to oldest
    const list = [...db.getOrders()].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    setOrders(list);
    setFilteredOrders(list);
    setLoading(false);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    const o = orders.find(x => String(x.id) === String(id));
    if(o) {
      const payload = { status: newStatus, orderStatus: newStatus };
      if (newStatus === "Cancelled" && o.status !== "Cancelled") {
        payload.cancelledAt = new Date().toISOString();
        payload.cancelReason = "Cancelled by Admin";
        payload.cancelledBy = "Admin";
        payload.paymentStatus = "Refunded";
      }
      try {
        const res = await db.updateOrder(id, payload);
        if (!res?.success) throw new Error(res?.message || "Update failed");
        emitToast(`Order #${id} status updated to ${newStatus}`, "success");
        load();
        if(viewing && String(viewing.id) === String(id)) {
          setViewing({ ...o, ...payload });
        }
      } catch (err) {
        emitToast(err.message || "Failed to update order status", "error");
      }
    }
  };

  const handleCourierSelect = (e) => {
    const selected = e.target.value;
    setCourierName(selected);
    
    // Auto-generate URL if AWB is entered
    if (trackingNumber.trim()) {
      const match = POPULAR_COURIERS.find(c => c.name.toLowerCase() === selected.toLowerCase());
      if (match && match.urlTpl) {
        setTrackingUrl(match.urlTpl(trackingNumber.trim()));
      }
    }
  };

  const handleAutoGenerateLink = () => {
    const awb = trackingNumber.trim();
    if (!awb) {
      emitToast("Please enter an AWB / Tracking Number first", "error");
      return;
    }
    const match = POPULAR_COURIERS.find(c => 
      c.name.toLowerCase().includes(courierName.toLowerCase()) || 
      courierName.toLowerCase().includes(c.name.toLowerCase())
    );
    if (match && match.urlTpl) {
      const url = match.urlTpl(awb);
      setTrackingUrl(url);
      emitToast(`Direct tracking URL generated for ${match.name}!`, "success");
    } else {
      const fallbackUrl = `https://www.google.com/search?q=track+${encodeURIComponent(courierName || 'courier')}+${encodeURIComponent(awb)}`;
      setTrackingUrl(fallbackUrl);
      emitToast("Generated search tracking link", "info");
    }
  };

  const handleSaveTracking = async () => {
    if (!viewing) return;
    setIsUpdatingTracking(true);
    try {
      const awb = trackingNumber.trim();
      const courier = courierName.trim();
      const link = trackingUrl.trim();
      const est = estimatedDelivery.trim();

      const updateData = {
        trackingNumber: awb,
        trackingId: awb,
        courierName: courier,
        carrier: courier,
        courier: courier,
        trackingUrl: link,
        shippingLink: link,
        estimatedDelivery: est,
        estimatedDeliveryDate: est
      };

      // Auto update status to Shipped if order is currently pending/confirmed/processing
      if (autoMarkShipped && awb && (viewing.status === "Pending" || viewing.status === "Confirmed" || viewing.status === "Processing")) {
        updateData.status = "Shipped";
        updateData.orderStatus = "Shipped";
      }

      const res = await db.updateOrder(viewing.id, updateData);
      if (!res?.success) throw new Error(res?.message || "Update failed");
      
      const updatedViewing = { ...viewing, ...updateData };
      setViewing(updatedViewing);
      load();
      emitToast("Shipping tracking link & courier details saved successfully!", "success");
    } catch (err) {
      emitToast(err.message || "Failed to save tracking details", "error");
    } finally {
      setIsUpdatingTracking(false);
    }
  };

  const handleCopyLink = () => {
    if (!trackingUrl) return;
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    emitToast("Tracking link copied to clipboard!", "success");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openOrderDetails = (order) => {
    setViewing(order);
    setTrackingNumber(order.trackingNumber || order.trackingId || "");
    setCourierName(order.courierName || order.carrier || order.courier || "Delhivery");
    setTrackingUrl(order.trackingUrl || order.shippingLink || "");
    setEstimatedDelivery(order.estimatedDelivery || order.estimatedDeliveryDate || "");
    setAutoMarkShipped(order.status !== "Delivered" && order.status !== "Cancelled");
  };

  const statuses = ["Pending", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];

  if (loading) return <AdminLayout><div className="admin-loading">Loading store orders...</div></AdminLayout>;

  if (viewing) {
    const currentStatusIdx = statuses.indexOf(viewing.status);
    const parsedItems = getOrderProducts(viewing);
    const isCancelled = viewing.status === "Cancelled";

    return (
      <AdminLayout>
        <button className="admin-back-link" onClick={() => setViewing(null)}>
          <ArrowLeft size={16} /> Back to Orders
        </button>
        <div className="admin-page-header">
          <div>
            <h1>Order #{viewing.id}</h1>
            <p className="admin-page-subtitle">Placed on {new Date(viewing.date).toLocaleString('en-IN')}</p>
          </div>
          <div>
            <select 
              value={viewing.status} 
              onChange={(e) => handleUpdateStatus(viewing.id, e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #dcd1c6', fontWeight: 600, background: '#fff', fontSize: 13 }}
            >
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {isCancelled && viewing.cancelReason && (
          <div style={{background: '#fff0ed', color: '#c62828', padding: '16px', borderRadius: 12, marginBottom: 20, fontSize: 13, border: '1px solid #ffcdd2'}}>
            <b>Cancellation Reason ({viewing.cancelledBy}):</b> {viewing.cancelReason}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          
          <div className="admin-card" style={{margin: 0}}>
            <h2 style={{ fontSize: 16, margin: '0 0 15px', color: '#2b170d', borderBottom: '1px solid #f0ebe4', paddingBottom: 10 }}>Customer & Address</h2>
            <div style={{ fontSize: '13px', color: '#3b322c', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 5px' }}><b>Name:</b> {viewing.customerName || 'Customer'}</p>
              <p style={{ margin: '0 0 5px' }}><b>Email:</b> {viewing.customerEmail || 'N/A'}</p>
              <p style={{ margin: '0 0 15px' }}><b>Phone:</b> {viewing.phone || 'N/A'}</p>
              <p style={{ margin: '0 0 5px', color: '#806f62', fontWeight: 600 }}>Shipping Address:</p>
              <p style={{ margin: 0, paddingLeft: 10, borderLeft: '2px solid #e8e0d8' }}>{viewing.address || 'Address not provided'}</p>
            </div>
          </div>

          <div className="admin-card" style={{margin: 0}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0ebe4', paddingBottom: 10, marginBottom: 15 }}>
              <h2 style={{ fontSize: 16, margin: 0, color: '#2b170d' }}>Payment & Summary</h2>
              {viewing.paymentStatus === 'Paid' && (
                <button
                  type="button"
                  onClick={() => handleOpenRefund(viewing)}
                  style={{
                    background: '#fdf2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <RefreshCcw size={12} /> Issue PayU Refund
                </button>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#665a51', lineHeight: '1.8' }}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Payment Gateway</span>
                <b>{viewing.paymentMethod || 'PayU Hosted Gateway'}</b>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Payment Status</span>
                <b style={{color: viewing.paymentStatus === 'Paid' ? '#1d9450' : (viewing.paymentStatus === 'Refunded' ? '#991b1b' : (isCancelled ? '#c62828' : '#d97706'))}}>
                  {viewing.paymentStatus || (isCancelled ? 'Refunded / Void' : 'Pending')}
                </b>
              </div>
              {viewing.txnid && (
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>PayU Txn ID</span>
                  <code style={{ fontFamily: 'monospace', fontSize: 11, background: '#f5f0eb', padding: '1px 5px', borderRadius: 4 }}>{viewing.txnid}</code>
                </div>
              )}
              {viewing.mihpayid && (
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>PayU Reference</span>
                  <code style={{ fontFamily: 'monospace', fontSize: 11, background: '#f5f0eb', padding: '1px 5px', borderRadius: 4 }}>{viewing.mihpayid}</code>
                </div>
              )}
              {viewing.paymentMode && (
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>Payment Mode</span>
                  <b>{viewing.paymentMode}</b>
                </div>
              )}
              {viewing.amountRefunded > 0 && (
                <div style={{display: 'flex', justifyContent: 'space-between', color: '#991b1b', fontWeight: 600}}>
                  <span>Amount Refunded</span>
                  <span>-₹{Number(viewing.amountRefunded).toLocaleString()}</span>
                </div>
              )}
              {Array.isArray(viewing.refundHistory) && viewing.refundHistory.length > 0 ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '10px', marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>
                    PayU Refund History ({viewing.refundHistory.length}):
                  </div>
                  {viewing.refundHistory.map((ref, idx) => (
                    <div key={idx} style={{ fontSize: 11, color: '#7f1d1d', borderTop: idx > 0 ? '1px dashed #fecaca' : 'none', paddingTop: idx > 0 ? 4 : 0, marginTop: idx > 0 ? 4 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <b>₹{Number(ref.amount).toLocaleString()}</b>
                        <span>{ref.date ? new Date(ref.date).toLocaleDateString() : 'Recent'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#991b1b' }}>
                        ID: <code style={{ fontFamily: 'monospace' }}>{ref.refundId || ref.refundToken}</code> {ref.reason ? `• ${ref.reason}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (viewing.refundDetails && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 6, padding: '6px 10px', marginTop: 6, fontSize: 11, color: '#991b1b' }}>
                  <b>PayU Refund Processed:</b> ₹{viewing.refundDetails.refundAmount || viewing.refundDetails.amount || (viewing.finalAmount || viewing.amount)}
                  {viewing.refundDetails.payuRefundId && <div>Refund ID: <code>{viewing.refundDetails.payuRefundId}</code></div>}
                </div>
              ))}
              <hr style={{border: 0, borderTop: '1px solid #f0ebe4', margin: '10px 0'}} />
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Subtotal</span>
                <span>₹{(viewing.subtotal || viewing.amount).toLocaleString()}</span>
              </div>
              {viewing.couponDiscount > 0 && (
                <div style={{display: 'flex', justifyContent: 'space-between', color: '#d64b2e'}}>
                  <span>Coupon ({viewing.couponCode})</span>
                  <span>-₹{viewing.couponDiscount.toLocaleString()}</span>
                </div>
              )}
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Shipping</span>
                <span>{viewing.shipping > 0 ? `₹${viewing.shipping}` : 'Free'}</span>
              </div>
              <hr style={{border: 0, borderTop: '1px dashed #dcd1c6', margin: '10px 0'}} />
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#2b170d'}}>
                <span>Total</span>
                <span>₹{(viewing.finalAmount || viewing.amount).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Shipping & Tracking Card with Courier Selection & Direct Link */}
        <div className="admin-card" style={{ marginBottom: '20px', border: '1px solid #ecdac7', background: '#fffcf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid #f0ebe4', paddingBottom: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, margin: 0, color: '#2b170d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="#a54d2b" /> Courier Dispatch & Live Tracking Link
            </h2>
            {viewing.trackingUrl && (
              <a 
                href={viewing.trackingUrl} 
                target="_blank" 
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#a54d2b',
                  background: '#fcf4ed',
                  border: '1px solid #ebdccb',
                  padding: '5px 12px',
                  borderRadius: 6,
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={13} /> Test Live Tracking Link ↗
              </a>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            
            {/* Courier Selection */}
            <div className="admin-form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Courier Partner / Company</span>
                <span style={{ fontSize: 11, color: '#806f62', fontWeight: 400 }}>Select or type custom</span>
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select 
                  value={POPULAR_COURIERS.some(c => c.name === courierName) ? courierName : "custom"} 
                  onChange={(e) => {
                    if (e.target.value !== "custom") {
                      handleCourierSelect(e);
                    }
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #dcd1c6',
                    fontSize: 13,
                    background: '#fff',
                    flex: '0 0 160px'
                  }}
                >
                  <option value="" disabled>Select Courier</option>
                  {POPULAR_COURIERS.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="custom">Custom Company...</option>
                </select>
                <input 
                  placeholder="e.g. Delhivery, Blue Dart, DTDC" 
                  value={courierName} 
                  onChange={(e) => setCourierName(e.target.value)} 
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #dcd1c6', fontSize: 13 }}
                />
              </div>
            </div>

            {/* AWB Tracking Number */}
            <div className="admin-form-group">
              <label style={{ fontWeight: 600 }}>AWB / Consignment Tracking Number</label>
              <input 
                placeholder="e.g. 143245678901 or BD987654321IN" 
                value={trackingNumber} 
                onChange={(e) => {
                  setTrackingNumber(e.target.value);
                  const match = POPULAR_COURIERS.find(c => c.name.toLowerCase() === courierName.toLowerCase());
                  if (match && match.urlTpl && e.target.value.trim()) {
                    setTrackingUrl(match.urlTpl(e.target.value.trim()));
                  }
                }}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #dcd1c6', fontSize: 13, fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Shipping Link / Tracking URL input with auto-generate */}
          <div className="admin-form-group" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <Link2 size={15} color="#a54d2b" /> Customer Direct Tracking URL / Shipping Link
              </label>
              <button 
                type="button" 
                onClick={handleAutoGenerateLink}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a54d2b',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: '2px 6px'
                }}
              >
                <Sparkles size={13} /> Auto-Generate Link
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                placeholder="https://www.delhivery.com/track/package/..." 
                value={trackingUrl} 
                onChange={(e) => setTrackingUrl(e.target.value)} 
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #dcd1c6',
                  fontSize: 13,
                  background: '#fff'
                }}
              />
              {trackingUrl && (
                <>
                  <button 
                    type="button" 
                    onClick={handleCopyLink}
                    title="Copy Tracking Link"
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #dcd1c6',
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: '#5c483b'
                    }}
                  >
                    {copiedLink ? <Check size={14} color="#1d9450" /> : <Copy size={14} />}
                  </button>
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open Link in New Tab"
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #ebdccb',
                      background: '#fdf5ec',
                      color: '#a54d2b',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    <ExternalLink size={14} /> Open
                  </a>
                </>
              )}
            </div>
            <small style={{ color: '#806f62', marginTop: 4, display: 'block', fontSize: 11 }}>
              Customers will see a 1-click <b>"Track on {courierName || 'Courier'} Website"</b> button on their Order Details and Track Order page.
            </small>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: 16 }}>
            {/* Estimated Delivery */}
            <div className="admin-form-group">
              <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} color="#806f62" /> Estimated Delivery (Optional)
              </label>
              <input 
                placeholder="e.g. 5 Sept 2026 or 3-5 business days" 
                value={estimatedDelivery} 
                onChange={(e) => setEstimatedDelivery(e.target.value)} 
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #dcd1c6', fontSize: 13 }}
              />
            </div>

            {/* Auto mark as Shipped */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#2b170d', fontWeight: 600 }}>
                <input 
                  type="checkbox" 
                  checked={autoMarkShipped} 
                  onChange={(e) => setAutoMarkShipped(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#a54d2b', cursor: 'pointer' }}
                />
                Automatically update status to "Shipped"
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid #f0ebe4' }}>
            <button 
              type="button" 
              className="admin-btn" 
              onClick={handleSaveTracking}
              disabled={isUpdatingTracking}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 600,
                background: '#a54d2b',
                color: '#fff',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              <Save size={15} /> {isUpdatingTracking ? "Saving & Notifying..." : "Save Shipping & Tracking Details"}
            </button>
          </div>
        </div>

        <div className="admin-card">
          <h2 style={{ fontSize: 16, margin: '0 0 15px', color: '#2b170d', borderBottom: '1px solid #f0ebe4', paddingBottom: 10 }}>Order Items</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {parsedItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <img src={item.img || '/images/product-5mukhi.jpg'} alt={item.name} style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover', border: '1px solid #e8e0d8' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#2b170d' }}>{item.name}</h4>
                  <div style={{ fontSize: '12px', color: '#806f62' }}>₹{item.price.toLocaleString()} × {item.qty}</div>
                </div>
                <b style={{ fontSize: '15px', color: '#2b170d' }}>₹{(item.price * item.qty).toLocaleString()}</b>
              </div>
            ))}
          </div>
        </div>

        {/* PayU Refund Modal */}
        {refundModal && viewing && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 480,
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid #ebdccb'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: '#2b170d', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={20} color="#a54d2b" /> Process PayU Live Refund
                </h3>
                <button 
                  type="button" 
                  onClick={() => setRefundModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#806f62' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: 13, color: '#665a51', margin: '0 0 16px', lineHeight: 1.5 }}>
                Initiate a live server-to-server refund request to PayU for Order <b>#{viewing.id}</b>.
                The amount will be credited back to the customer's source account (UPI / Card / Netbanking).
              </p>

              <div style={{ background: '#fdf8f4', border: '1px solid #ebdccb', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Order Total:</span>
                  <b>₹{Number(viewing.finalAmount || viewing.amount || 0).toLocaleString()}</b>
                </div>
                {viewing.amountRefunded > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#991b1b' }}>
                    <span>Already Refunded:</span>
                    <b>-₹{Number(viewing.amountRefunded).toLocaleString()}</b>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#166534', fontWeight: 700 }}>
                  <span>Remaining Refundable:</span>
                  <span>₹{Math.max(0, Number(viewing.finalAmount || viewing.amount || 0) - Number(viewing.amountRefunded || 0)).toLocaleString()}</span>
                </div>
                {viewing.txnid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>PayU Txn ID:</span>
                    <code style={{ fontFamily: 'monospace' }}>{viewing.txnid}</code>
                  </div>
                )}
                {viewing.mihpayid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>PayU Reference:</span>
                    <code style={{ fontFamily: 'monospace' }}>{viewing.mihpayid}</code>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#2b170d' }}>
                    Refund Amount (₹)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const rem = Math.max(0, Number(viewing.finalAmount || viewing.amount || 0) - Number(viewing.amountRefunded || 0));
                      setRefundAmount(String(rem));
                    }}
                    style={{ background: 'none', border: 'none', color: '#a54d2b', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Max (Full Remaining)
                  </button>
                </div>
                <input 
                  type="number"
                  step="any"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #dcd1c6',
                    fontSize: 14,
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2b170d', marginBottom: 6 }}>
                  Reason for Refund
                </label>
                <input 
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer requested cancellation / damaged goods"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #dcd1c6',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  disabled={isRefunding}
                  onClick={() => setRefundModal(false)}
                  style={{
                    background: '#f4ece5',
                    border: '1px solid #dcd1c6',
                    padding: '10px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#665a51'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRefunding}
                  onClick={handleProcessRefund}
                  style={{
                    background: '#991b1b',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isRefunding ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {isRefunding ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
                  {isRefunding ? "Communicating with PayU..." : "Execute PayU Live Refund"}
                </button>
              </div>
            </div>
          </div>
        )}

      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Link to="/admin" className="admin-back-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      <div className="admin-page-header">
        <div>
          <h1>Customer Orders</h1>
          <p className="admin-page-subtitle">{orders.length} total orders recorded</p>
        </div>
      </div>

      <div className="admin-mobile-toolbar">
        <div className="admin-search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by Order ID, customer name, AWB or courier..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="admin-filter-chips">
          {["All", ...statuses].map(st => (
            <button 
              key={st} 
              className={`admin-filter-chip ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="admin-empty">No orders found.</div>
      ) : (
        <>
        {/* Desktop Orders Table */}
        <div className="admin-table-container desktop-only" style={{ marginBottom: 20 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Shipping & Courier</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const hasTracking = o.trackingNumber || o.trackingId;
                const courier = o.courierName || o.carrier || o.courier;
                const link = o.trackingUrl || o.shippingLink;

                return (
                  <tr key={o.id}>
                    <td><b>#{o.id}</b></td>
                    <td>
                      <b>{o.customerName || 'Guest'}</b>
                      <small style={{ display: 'block', color: '#806f62' }}>{o.customerEmail || o.phone || ''}</small>
                    </td>
                    <td><small>{new Date(o.date || o.createdAt).toLocaleDateString()}</small></td>
                    <td><b>₹{(o.finalAmount || o.amount || 0).toLocaleString()}</b></td>
                    <td>
                      <span className={`admin-badge ${o.paymentStatus === 'Paid' || o.paymentStatus === 'Refunded' ? 'success' : 'warning'}`}>
                        {o.paymentStatus || 'Pending'}
                      </span>
                    </td>
                    <td>
                      {hasTracking ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#2b170d', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Truck size={12} color="#a54d2b" /> {courier || 'Express'}
                          </span>
                          <span style={{ fontSize: 11, color: '#806f62', fontFamily: 'monospace' }}>
                            {hasTracking}
                          </span>
                          {link && (
                            <a 
                              href={link} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ fontSize: 10, color: '#a54d2b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2, textDecoration: 'none' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={10} /> Track Live ↗
                            </a>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#a08f82', fontStyle: 'italic' }}>
                          Not dispatched yet
                        </span>
                      )}
                    </td>
                    <td>
                      <select
                        value={o.status}
                        onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '600',
                          border: '1px solid #dcd1c6',
                          background: o.status === 'Cancelled' ? '#ffebee' : o.status === 'Pending' ? '#fff8e1' : o.status === 'Delivered' ? '#e5f6ea' : '#e3f2fd',
                          color: o.status === 'Cancelled' ? '#c62828' : o.status === 'Pending' ? '#d97706' : o.status === 'Delivered' ? '#1d9450' : '#1565c0',
                          outline: 'none'
                        }}
                      >
                        {statuses.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="admin-btn secondary" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => openOrderDetails(o)}>
                        <Eye size={13} /> {hasTracking ? "Edit" : "Ship / View"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="admin-mobile-cards">
          {filteredOrders.map(o => {
            const hasTracking = o.trackingNumber || o.trackingId;
            const courier = o.courierName || o.carrier || o.courier;
            const link = o.trackingUrl || o.shippingLink;

            return (
              <div key={o.id} className="admin-mobile-card">
                <div className="mobile-card-top">
                  <div>
                    <span className="mobile-card-title">Order #{o.id}</span>
                    <div className="mobile-card-sub">{o.customerName || 'Guest Customer'} • {new Date(o.date).toLocaleDateString()}</div>
                  </div>
                  <select 
                    value={o.status} 
                    onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      border: '1px solid #dcd1c6',
                      background: o.status === 'Cancelled' ? '#ffebee' : o.status === 'Pending' ? '#fff8e1' : o.status === 'Delivered' ? '#e5f6ea' : '#e3f2fd',
                      color: o.status === 'Cancelled' ? '#c62828' : o.status === 'Pending' ? '#d97706' : o.status === 'Delivered' ? '#1d9450' : '#1565c0',
                      outline: 'none'
                    }}
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {hasTracking && (
                  <div style={{ background: '#fdfbf7', border: '1px solid #ebdccb', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 11, color: '#806f62', display: 'block' }}>Courier: <b>{courier || 'Express'}</b></span>
                      <strong style={{ fontSize: 12, color: '#a54d2b', fontFamily: 'monospace' }}>{hasTracking}</strong>
                    </div>
                    {link && (
                      <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#a54d2b', fontWeight: 600, textDecoration: 'none', background: '#fff', border: '1px solid #ebdccb', padding: '4px 8px', borderRadius: 4 }}>
                        Track ↗
                      </a>
                    )}
                  </div>
                )}

                <div className="mobile-card-body">
                  <div>
                    <small style={{ color: '#806f62', display: 'block', fontSize: '11px' }}>Order Amount</small>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#2b170d' }}>₹{(o.finalAmount || o.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="mobile-card-actions">
                    <button className="admin-btn secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openOrderDetails(o)}>
                      <Eye size={14} /> {hasTracking ? "Edit" : "Ship"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </AdminLayout>
  );
}
