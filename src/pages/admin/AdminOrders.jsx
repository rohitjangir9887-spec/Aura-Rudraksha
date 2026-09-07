import { getProductPrimaryImage, getProductGalleryImages } from "../../lib/imageUtils";
import { getProductRoute } from "../../lib/routes";
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { 
  Eye, Truck, Search, ArrowLeft, CheckCircle2, Clock, 
  Package, ShoppingBag, X, Save, ExternalLink, Link2, 
  Sparkles, Copy, Check, Calendar, AlertCircle, RefreshCcw,
  ShieldCheck, Loader2, Filter, DollarSign, RotateCcw,
  CheckCircle, XCircle, ArrowUpDown, ChevronDown,
  Mail, Lock, Key, ShieldAlert, Zap
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
  const [orders, setOrders] = useState(() => {
    const list = [...(db.getOrders() || [])].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    return list;
  });
  const [loading, setLoading] = useState(() => (db.getOrders() || []).length === 0);
  const [viewing, setViewing] = useState(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("All"); // "All", "Today", "Yesterday", "7days", "month", "custom"
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [productFilter, setProductFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All"); // "All", "Paid", "Pending", "Failed", "Refunded", "COD"
  const [statusFilter, setStatusFilter] = useState("All"); // Fulfillment status

  // PayU Sync State
  const [syncingOrderId, setSyncingOrderId] = useState(null);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  
  // Shipping & Tracking State
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [autoMarkShipped, setAutoMarkShipped] = useState(true);
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Instant Refund Management State
  const [refundModal, setRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);

  useEffect(() => {
    load();
    const unsub = onStoreUpdate(() => {
      const list = [...(db.getOrders() || [])].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
      setOrders(list);
    });
    return () => unsub();
  }, []);

  const load = async () => {
    if ((db.getOrders() || []).length === 0) {
      setLoading(true);
    }
    try {
      await db.fetchOrders();
    } catch (_) {}
    const list = [...(db.getOrders() || [])].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    setOrders(list);
    setLoading(false);
  };

  const getPayuRef = (o) => {
    if (o.mihpayid) return o.mihpayid;
    if (o.paymentAttempts && o.paymentAttempts.length > 0) {
      for (let i = o.paymentAttempts.length - 1; i >= 0; i--) {
        if (o.paymentAttempts[i].mihpayid) return o.paymentAttempts[i].mihpayid;
      }
    }
    return null;
  };

  // Extract all unique products across catalog and order items
  const availableProducts = useMemo(() => {
    const map = new Map();
    try {
      (db.getProducts() || []).forEach(p => {
        if (p?.name) map.set(p.name.trim().toLowerCase(), p.name.trim());
      });
    } catch (_) {}
    orders.forEach(o => {
      const items = db.normalizeOrderItems(o);
      items.forEach(it => {
        if (it?.name) map.set(it.name.trim().toLowerCase(), it.name.trim());
      });
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  // Live filtered orders
  const filteredOrders = useMemo(() => {
    let result = orders;

    // 1. Date Filter
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const now = new Date();

    if (dateFilter === "Today") {
      result = result.filter(o => new Date(o.date || o.createdAt).toDateString() === todayStr);
    } else if (dateFilter === "Yesterday") {
      result = result.filter(o => new Date(o.date || o.createdAt).toDateString() === yesterdayStr);
    } else if (dateFilter === "7days") {
      result = result.filter(o => new Date(o.date || o.createdAt) >= sevenDaysAgo);
    } else if (dateFilter === "month") {
      result = result.filter(o => {
        const d = new Date(o.date || o.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (dateFilter === "custom") {
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        result = result.filter(o => new Date(o.date || o.createdAt) >= start);
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        result = result.filter(o => new Date(o.date || o.createdAt) <= end);
      }
    }

    // 2. Product Filter
    if (productFilter !== "All") {
      result = result.filter(o => {
        const items = db.normalizeOrderItems(o);
        return items.some(it => 
          (it?.name || "").toLowerCase().includes(productFilter.toLowerCase()) ||
          String(it?.id || "") === String(productFilter)
        );
      });
    }

    // 3. Payment Status Filter
    if (paymentFilter !== "All") {
      if (paymentFilter === "Paid") {
        result = result.filter(o => o.paymentStatus === "Paid");
      } else if (paymentFilter === "Pending") {
        result = result.filter(o => (o.paymentStatus === "Pending" || !o.paymentStatus) && o.status !== "Cancelled");
      } else if (paymentFilter === "Failed") {
        result = result.filter(o => 
          o.paymentStatus === "Failed" || 
          (o.paymentAttempts && o.paymentAttempts.some(a => a.status === "failure" || a.status === "failed" || a.payuStatus === "failure"))
        );
      } else if (paymentFilter === "Refunded") {
        result = result.filter(o => 
          o.paymentStatus === "Refunded" || 
          o.paymentStatus === "Partially Refunded" || 
          Number(o.amountRefunded || 0) > 0 ||
          Boolean(o.refundDetails) ||
          (Array.isArray(o.refundHistory) && o.refundHistory.length > 0)
        );
      } else if (paymentFilter === "COD") {
        result = result.filter(o => 
          (o.paymentMethod || "").toLowerCase().includes("cod") || 
          (o.paymentMode || "").toLowerCase().includes("cod")
        );
      }
    }

    // 4. Order Status Filter
    if (statusFilter !== "All") {
      result = result.filter(o => o.status === statusFilter);
    }

    // 5. Multi-field Search Query
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(o => {
        // Order ID / Number
        if (String(o.id || "").toLowerCase().includes(term)) return true;
        if (String(o.orderNumber || "").toLowerCase().includes(term)) return true;
        if (String(o.orderId || "").toLowerCase().includes(term)) return true;

        // Customer Name, Email, Phone
        if ((o.customerName || "").toLowerCase().includes(term)) return true;
        if ((o.customerEmail || "").toLowerCase().includes(term)) return true;
        if ((o.phone || o.customerPhone || "").toLowerCase().includes(term)) return true;

        // PayU Transactions & Mihpayid
        if ((o.txnid || "").toLowerCase().includes(term)) return true;
        if ((getPayuRef(o) || "").toLowerCase().includes(term)) return true;
        if ((o.bankRefNum || "").toLowerCase().includes(term)) return true;
        if (Array.isArray(o.paymentAttempts)) {
          for (const att of o.paymentAttempts) {
            if ((att.txnid || "").toLowerCase().includes(term)) return true;
            if ((att.mihpayid || "").toLowerCase().includes(term)) return true;
            if ((att.bankRefNum || "").toLowerCase().includes(term)) return true;
          }
        }

        // Product Names
        const items = db.normalizeOrderItems(o);
        for (const it of items) {
          if ((it?.name || "").toLowerCase().includes(term)) return true;
          if (String(it?.id || "").toLowerCase().includes(term)) return true;
        }

        // Shipping Tracking AWB & Courier & Address
        if ((o.trackingNumber || o.trackingId || "").toLowerCase().includes(term)) return true;
        if ((o.courierName || o.carrier || o.courier || "").toLowerCase().includes(term)) return true;
        if ((o.address || "").toLowerCase().includes(term)) return true;

        return false;
      });
    }

    return result;
  }, [orders, dateFilter, customStartDate, customEndDate, productFilter, paymentFilter, statusFilter, searchTerm]);

  // Quick Metrics Calculation
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    let totalRevenue = 0;
    let todayOrdersCount = 0;
    let todayRevenue = 0;
    let pendingCount = 0;
    let pendingRevenue = 0;
    let refundedCount = 0;
    let refundedAmount = 0;

    orders.forEach(o => {
      const amt = Number(o.finalAmount || o.amount || 0);
      const isPaid = o.paymentStatus === "Paid";
      const isToday = new Date(o.date || o.createdAt).toDateString() === todayStr;

      if (isPaid) {
        totalRevenue += amt;
      }
      if (isToday) {
        todayOrdersCount++;
        if (isPaid) todayRevenue += amt;
      }
      if ((o.paymentStatus === "Pending" || !o.paymentStatus) && o.status !== "Cancelled") {
        pendingCount++;
        pendingRevenue += amt;
      }
      if (o.paymentStatus === "Refunded" || o.paymentStatus === "Partially Refunded" || Number(o.amountRefunded || 0) > 0) {
        refundedCount++;
        refundedAmount += Number(o.amountRefunded || amt);
      }
    });

    return {
      totalCount: orders.length,
      filteredCount: filteredOrders.length,
      totalRevenue,
      todayOrdersCount,
      todayRevenue,
      pendingCount,
      pendingRevenue,
      refundedCount,
      refundedAmount
    };
  }, [orders, filteredOrders]);

  // Single Order Live PayU Status Check
  const handleSyncPayu = async (orderId, e) => {
    if (e) e.stopPropagation();
    setSyncingOrderId(orderId);
    try {
      const res = await db.syncPayuOrder(orderId);
      if (res?.success) {
        const orderData = res.order || res.data;
        const pStatus = orderData?.paymentStatus || "Updated";
        emitToast(`PayU Status synced: ${pStatus} (mihpayid: ${orderData?.mihpayid || 'N/A'})`, "success");
        await load();
        if (viewing && (String(viewing.id) === String(orderId) || String(viewing.orderId) === String(orderId))) {
          if (orderData) setViewing(db.normalizeOrder(orderData));
        }
      } else {
        throw new Error(res?.message || "Could not sync with PayU");
      }
    } catch (err) {
      emitToast(err.message || "PayU Live Sync failed", "error");
    } finally {
      setSyncingOrderId(null);
    }
  };

  // Bulk Sync all Pending Orders with PayU API
  const handleBulkSyncPayu = async () => {
    const pendingList = orders.filter(o => o.paymentStatus !== "Paid" && o.paymentStatus !== "Refunded" && o.status !== "Cancelled");
    if (pendingList.length === 0) {
      emitToast("No pending orders found to sync with PayU.", "info");
      return;
    }
    setIsBulkSyncing(true);
    let convertedPaid = 0;
    for (const ord of pendingList) {
      try {
        const res = await db.syncPayuOrder(ord.id);
        if (res?.success && res.order?.paymentStatus === "Paid") {
          convertedPaid++;
        }
      } catch (_) {}
    }
    await load();
    setIsBulkSyncing(false);
    emitToast(`PayU Sync complete! Checked ${pendingList.length} orders (${convertedPaid} converted to Paid).`, "success");
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setDateFilter("All");
    setCustomStartDate("");
    setCustomEndDate("");
    setProductFilter("All");
    setPaymentFilter("All");
    setStatusFilter("All");
    emitToast("Filters reset to default view", "info");
  };

  const handleOpenRefund = (order) => {
    const total = Number(order.finalAmount || order.amount || 0);
    const already = Number(order.amountRefunded || 0);
    const remaining = Math.max(0, total - already);
    setRefundAmount(String(remaining));
    setRefundReason("Customer Cancellation / Return");
    setRefundModal(true);
  };

  const handleExecuteInstantRefund = async () => {
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
      emitToast(`Cannot refund more than remaining balance of ₹${remaining.toLocaleString('en-IN')}`, "error");
      return;
    }

    setIsRefunding(true);
    try {
      const res = await db.processRefund(viewing.id, {
        refundAmount: amt,
        reason: refundReason || "Admin Initiated Instant Refund"
      });
      if (res?.success) {
        emitToast(`Instant PayU Refund of ₹${amt.toLocaleString('en-IN')} processed successfully!`, "success");
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
            refundDetails: res.refund || { amount: amt, status: "Success", reason: refundReason, timestamp: new Date().toISOString() }
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

  const handleUpdateStatus = async (id, newStatus) => {
    const o = orders.find(x => String(x.id) === String(id));
    if (o) {
      const payload = { status: newStatus, orderStatus: newStatus };
      if (newStatus === "Cancelled" && o.status !== "Cancelled") {
        payload.cancelledAt = new Date().toISOString();
        payload.cancelReason = "Cancelled by Admin";
        payload.cancelledBy = "Admin";
      }
      try {
        const res = await db.updateOrder(id, payload);
        if (!res?.success) throw new Error(res?.message || "Update failed");
        emitToast(`Order #${id} status updated to ${newStatus}`, "success");
        load();
        if (viewing && String(viewing.id) === String(id)) {
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

  const ALLOWED_ORDER_TRANSITIONS = {
    "Payment Pending": ["Confirmed", "Processing", "Shipped", "Cancelled"],
    "Pending": ["Confirmed", "Processing", "Shipped", "Cancelled"],
    "Confirmed": ["Processing", "Shipped", "Cancelled"],
    "Processing": ["Shipped", "Cancelled"],
    "Shipped": ["Out for Delivery", "Delivered", "Cancelled"],
    "Out for Delivery": ["Delivered", "Cancelled"],
    "Delivered": [],
    "Cancelled": []
  };

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
            <p className="admin-page-subtitle">Placed on {new Date(viewing.date || viewing.createdAt).toLocaleString('en-IN')}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="payu-verify-action-btn"
              onClick={(e) => handleSyncPayu(viewing.id, e)}
              disabled={syncingOrderId === viewing.id}
              style={{ padding: '8px 14px', fontSize: 12 }}
              title="Query live PayU server-to-server API"
            >
              {syncingOrderId === viewing.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              {syncingOrderId === viewing.id ? "Checking PayU..." : "Verify with PayU Live API"}
            </button>
            <select 
              value={viewing.status} 
              onChange={(e) => handleUpdateStatus(viewing.id, e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #dcd1c6', fontWeight: 600, background: '#fff', fontSize: 13 }}
            >
              {statuses.map(s => {
                const currentStatus = viewing.status || "Pending";
                const isValid = s === currentStatus || (ALLOWED_ORDER_TRANSITIONS[currentStatus] || []).includes(s);
                return <option key={s} value={s} disabled={!isValid}>{s}</option>;
              })}
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
              <p style={{ margin: '0 0 15px' }}><b>Phone:</b> {viewing.phone || viewing.customerPhone || 'N/A'}</p>
              <p style={{ margin: '0 0 5px', color: '#806f62', fontWeight: 600 }}>Shipping Address:</p>
              <p style={{ margin: 0, paddingLeft: 10, borderLeft: '2px solid #e8e0d8' }}>{viewing.address || 'Address not provided'}</p>
            </div>
          </div>

          <div className="admin-card" style={{margin: 0}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0ebe4', paddingBottom: 10, marginBottom: 15 }}>
              <h2 style={{ fontSize: 16, margin: 0, color: '#2b170d' }}>Payment & Summary</h2>
              {((viewing.paymentStatus === 'Paid' || viewing.paymentStatus === 'Partially Refunded') && (Number(viewing.finalAmount || viewing.amount || 0) > Number(viewing.amountRefunded || 0))) && (
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
                  <Zap size={12} /> Issue Instant Refund
                </button>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#665a51', lineHeight: '1.8' }}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Payment Gateway</span>
                <b>{viewing.paymentMethod || 'PayU Hosted Gateway'}</b>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span>Payment Status</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`payu-status-tag ${viewing.paymentStatus === 'Paid' ? 'success' : viewing.paymentStatus === 'Refunded' || viewing.paymentStatus === 'Partially Refunded' ? 'refunded' : viewing.paymentStatus === 'Failed' ? 'failed' : 'pending'}`}>
                    {viewing.paymentStatus || 'Pending'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleSyncPayu(viewing.id, e)}
                    disabled={syncingOrderId === viewing.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a54d2b', padding: 0 }}
                    title="Check PayU Status"
                  >
                    <RefreshCcw size={12} className={syncingOrderId === viewing.id ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>
              {viewing.txnid && (
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>Merchant Txn ID</span>
                  <code style={{ fontFamily: 'monospace', fontSize: 11, background: '#f5f0eb', padding: '1px 5px', borderRadius: 4 }}>{viewing.txnid}</code>
                </div>
              )}
              {getPayuRef(viewing) && (
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>PayU Payment ID</span>
                  <code 
                    onClick={() => {
                      navigator.clipboard.writeText(getPayuRef(viewing));
                      emitToast("PayU Payment ID copied to clipboard!", "success");
                    }}
                    style={{ fontFamily: 'monospace', fontSize: 11, background: '#f5f0eb', padding: '1px 5px', borderRadius: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Click to copy"
                  >
                    {getPayuRef(viewing)} <Copy size={10} />
                  </code>
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
                    PayU Refund Activity History ({viewing.refundHistory.length}):
                  </div>
                  {viewing.refundHistory.map((ref, idx) => (
                    <div key={idx} style={{ fontSize: 11, color: '#7f1d1d', borderTop: idx > 0 ? '1px dashed #fecaca' : 'none', paddingTop: idx > 0 ? 6 : 0, marginTop: idx > 0 ? 6 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <b style={{ color: '#991b1b', fontSize: 12 }}>₹{Number(ref.amount).toLocaleString('en-IN')}</b>
                        <span style={{ fontSize: 10, color: '#78350f', background: '#fef3c7', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                          {ref.date || ref.timestamp ? new Date(ref.date || ref.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                        </span>
                      </div>
                      <div style={{ fontSize: 10.5, color: '#4b5563', marginTop: 2 }}>
                        {ref.reason ? `Reason: ${ref.reason}` : 'Admin Refund'}
                      </div>
                      {(ref.refundId || ref.refundToken || ref.payuRefundId) && (
                        <div style={{ fontSize: 9.5, color: '#6b7280', marginTop: 1 }}>
                          Ref ID: <code style={{ fontFamily: 'monospace' }}>{ref.refundId || ref.refundToken || ref.payuRefundId}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (viewing.refundDetails && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 6, padding: '8px 10px', marginTop: 6, fontSize: 11, color: '#991b1b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <b>PayU Refund: ₹{Number(viewing.refundDetails.refundAmount || viewing.refundDetails.amount || (viewing.finalAmount || viewing.amount)).toLocaleString('en-IN')}</b>
                    <span style={{ fontSize: 10, color: '#78350f', background: '#fef3c7', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                      {viewing.refundDetails.timestamp || viewing.refundDetails.date ? new Date(viewing.refundDetails.timestamp || viewing.refundDetails.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                    </span>
                  </div>
                  {viewing.refundDetails.payuRefundId && <div>Refund ID: <code style={{ fontFamily: 'monospace' }}>{viewing.refundDetails.payuRefundId}</code></div>}
                </div>
              ))}

              <hr style={{border: 0, borderTop: '1px solid #f0ebe4', margin: '10px 0'}} />
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Subtotal</span>
                <span>₹{(viewing.subtotal || viewing.amount || 0).toLocaleString()}</span>
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
                <span>₹{(viewing.finalAmount || viewing.amount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Courier Dispatch & Tracking Card */}
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
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #dcd1c6',
                    fontSize: 13,
                    background: '#fff'
                  }}
                >
                  <option value="" disabled>-- Select Courier --</option>
                  {POPULAR_COURIERS.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="custom">Other (Custom Courier)</option>
                </select>
                <input 
                  placeholder="Courier name" 
                  value={courierName} 
                  onChange={(e) => setCourierName(e.target.value)}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #dcd1c6', fontSize: 13 }}
                />
              </div>
            </div>

            {/* AWB / Tracking Number */}
            <div className="admin-form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>AWB / Tracking Number</span>
                <button 
                  type="button" 
                  onClick={handleAutoGenerateLink}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a54d2b',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: 0
                  }}
                >
                  <Sparkles size={11} /> Auto-Generate Link
                </button>
              </label>
              <input 
                placeholder="e.g. 142389102431 or DTDC98124" 
                value={trackingNumber} 
                onChange={(e) => {
                  setTrackingNumber(e.target.value);
                  const selectedCourierObj = POPULAR_COURIERS.find(c => c.name.toLowerCase() === courierName.toLowerCase());
                  if (selectedCourierObj && selectedCourierObj.urlTpl && e.target.value.trim()) {
                    setTrackingUrl(selectedCourierObj.urlTpl(e.target.value.trim()));
                  }
                }}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #dcd1c6', fontSize: 13, fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Tracking URL */}
          <div className="admin-form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span>Direct Courier Tracking URL (Customer Clickable)</span>
              {trackingUrl && <span style={{ fontSize: 11, color: '#1d9450' }}>✓ Active Tracking Link Ready</span>}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input 
                placeholder="https://www.delhivery.com/track/package/..." 
                value={trackingUrl} 
                onChange={(e) => setTrackingUrl(e.target.value)} 
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #dcd1c6', fontSize: 13 }}
              />
              {trackingUrl && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    title="Copy Link"
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #dcd1c6',
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: 16 }}>
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
              <Save size={15} /> {isUpdatingTracking ? "Saving..." : "Save Shipping Details"}
            </button>
          </div>
        </div>

        {/* Order Items */}
        <div className="admin-card">
          <h2 style={{ fontSize: 16, margin: '0 0 15px', color: '#2b170d', borderBottom: '1px solid #f0ebe4', paddingBottom: 10 }}>Order Items ({parsedItems.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {parsedItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <img src={getProductPrimaryImage(item)} alt={item.name} style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'contain', border: '1px solid #e8e0d8', background: '#faf7f2' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#2b170d' }}>{item.name}</h4>
                  <div style={{ fontSize: '12px', color: '#806f62' }}>₹{Number(item.price || 0).toLocaleString()} × {item.qty || 1}</div>
                </div>
                <b style={{ fontSize: '15px', color: '#2b170d' }}>₹{(Number(item.price || 0) * (item.qty || 1)).toLocaleString()}</b>
              </div>
            ))}
          </div>
        </div>

        {/* PayU Instant Refund Modal */}
        {refundModal && viewing && (
          <div className="admin-refund-modal-backdrop">
            <div className="admin-refund-modal-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: '#2b170d', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={20} color="#a54d2b" /> Process Instant Refund
                </h3>
                <button 
                  type="button" 
                  disabled={isRefunding}
                  onClick={() => setRefundModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#806f62' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: 13, color: '#665a51', margin: '0 0 16px', lineHeight: 1.5 }}>
                Initiate a live instant refund to PayU for Order <b>#{viewing.id}</b>.
                The amount will be credited back directly to the customer's source payment account (UPI / Card / Netbanking).
              </p>

              <div style={{ background: '#fdf8f4', border: '1px solid #ebdccb', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Order Total:</span>
                  <b>₹{Number(viewing.finalAmount || viewing.amount || 0).toLocaleString('en-IN')}</b>
                </div>
                {Number(viewing.amountRefunded || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#991b1b' }}>
                    <span>Already Refunded:</span>
                    <b>-₹{Number(viewing.amountRefunded).toLocaleString('en-IN')}</b>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#166534', fontWeight: 700 }}>
                  <span>Remaining Refundable:</span>
                  <span>₹{Math.max(0, Number(viewing.finalAmount || viewing.amount || 0) - Number(viewing.amountRefunded || 0)).toLocaleString('en-IN')}</span>
                </div>
                {viewing.txnid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Merchant Txn ID:</span>
                    <code style={{ fontFamily: 'monospace' }}>{viewing.txnid}</code>
                  </div>
                )}
                {getPayuRef(viewing) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>PayU Payment ID:</span>
                    <code style={{ fontFamily: 'monospace' }}>{getPayuRef(viewing)}</code>
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
                    disabled={isRefunding}
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
                  disabled={isRefunding}
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

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2b170d', marginBottom: 6 }}>
                  Reason for Refund
                </label>
                <input 
                  type="text"
                  disabled={isRefunding}
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

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Zap size={18} color="#15803d" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.45 }}>
                  <b>Instant Execution:</b> The refund request will be processed immediately with PayU without any waiting timer or delay.
                </div>
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
                  disabled={isRefunding || !refundAmount || Number(refundAmount) <= 0}
                  onClick={handleExecuteInstantRefund}
                  style={{
                    background: '#15803d',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isRefunding ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(21, 128, 61, 0.25)'
                  }}
                >
                  {isRefunding ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  {isRefunding ? "Processing Refund..." : "⚡ Issue Instant Refund"}
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
          <p className="admin-page-subtitle">Showing {filteredOrders.length} of {orders.length} total orders recorded</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-btn secondary"
            onClick={handleBulkSyncPayu}
            disabled={isBulkSyncing}
            style={{ padding: '8px 14px', fontSize: 12 }}
            title="Check status of all pending orders with PayU"
          >
            {isBulkSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            {isBulkSyncing ? "Syncing with PayU..." : "⚡ Sync Pending with PayU"}
          </button>
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="admin-orders-stats-grid">
        <div className="admin-orders-stat-card stat-today">
          <span className="admin-stat-label">
            <span>Today's Orders</span>
            <Calendar size={14} color="#6366f1" />
          </span>
          <span className="admin-stat-value">{stats.todayOrdersCount}</span>
          <span className="admin-stat-sub">Revenue: ₹{stats.todayRevenue.toLocaleString()}</span>
        </div>

        <div className="admin-orders-stat-card stat-paid">
          <span className="admin-stat-label">
            <span>Paid Revenue (Verified)</span>
            <CheckCircle2 size={14} color="#16a34a" />
          </span>
          <span className="admin-stat-value">₹{stats.totalRevenue.toLocaleString()}</span>
          <span className="admin-stat-sub">From settled payments</span>
        </div>

        <div className="admin-orders-stat-card stat-pending">
          <span className="admin-stat-label">
            <span>Pending Payments</span>
            <Clock size={14} color="#d97706" />
          </span>
          <span className="admin-stat-value">{stats.pendingCount}</span>
          <span className="admin-stat-sub">₹{stats.pendingRevenue.toLocaleString()} in checkout</span>
        </div>

        <div className="admin-orders-stat-card stat-refunded">
          <span className="admin-stat-label">
            <span>Refunded Amount</span>
            <RotateCcw size={14} color="#dc2626" />
          </span>
          <span className="admin-stat-value">₹{stats.refundedAmount.toLocaleString()}</span>
          <span className="admin-stat-sub">{stats.refundedCount} orders refunded</span>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar */}
      <div className="admin-orders-filter-card">
        {/* Row 1: Universal Search & Quick Action Buttons */}
        <div className="admin-orders-filter-row">
          <div className="admin-search-wrapper">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by Order ID, customer name, phone, email, Txn ID, PayU mihpayid, product..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="admin-search-clear" onClick={() => setSearchTerm("")} title="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          {(searchTerm || dateFilter !== "All" || productFilter !== "All" || paymentFilter !== "All" || statusFilter !== "All") && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                color: '#991b1b',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <RotateCcw size={12} /> Reset Filters
            </button>
          )}
        </div>

        {/* Row 2: Date Filter Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#806f62', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Date Filter (Order Timing):
          </div>
          <div className="admin-date-pills">
            {[
              { id: "All", label: "All Time" },
              { id: "Today", label: "Today (आज)" },
              { id: "Yesterday", label: "Yesterday (कल)" },
              { id: "7days", label: "Last 7 Days" },
              { id: "month", label: "This Month" },
              { id: "custom", label: "Custom Range..." }
            ].map(df => (
              <button
                key={df.id}
                type="button"
                className={`admin-date-pill ${dateFilter === df.id ? 'active' : ''}`}
                onClick={() => setDateFilter(df.id)}
              >
                {df.label}
              </button>
            ))}
          </div>

          {dateFilter === "custom" && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#665a51', fontWeight: 600 }}>From:</span>
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={e => setCustomStartDate(e.target.value)} 
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #dcd1c6', fontSize: 12 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#665a51', fontWeight: 600 }}>To:</span>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={e => setCustomEndDate(e.target.value)} 
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #dcd1c6', fontSize: 12 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Dropdown Filters (Product, Payment Status, Order Status) */}
        <div className="admin-orders-filter-row" style={{ borderTop: '1px solid #f4ece4', paddingTop: 12 }}>
          {/* Product Filter */}
          <div className="admin-filter-select-group">
            <label>Product:</label>
            <select
              className="admin-filter-select"
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
            >
              <option value="All">All Products ({availableProducts.length})</option>
              {availableProducts.map(pName => (
                <option key={pName} value={pName}>{pName}</option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="admin-filter-select-group">
            <label>Payment:</label>
            <select
              className="admin-filter-select"
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
            >
              <option value="All">All Payments</option>
              <option value="Paid">✓ Paid / Received (Success)</option>
              <option value="Pending">⏳ Pending (Unpaid)</option>
              <option value="Failed">✗ Failed / Aborted</option>
              <option value="Refunded">↩ Refunded / Refund Processing</option>
              <option value="COD">💵 Cash on Delivery (COD)</option>
            </select>
          </div>

          {/* Fulfillment Status Filter */}
          <div className="admin-filter-select-group">
            <label>Fulfillment:</label>
            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {statuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="admin-empty">
          <Package size={36} color="#a08f82" style={{ margin: '0 auto 12px', display: 'block' }} />
          <b>No orders found matching current filter criteria.</b>
          <p style={{ fontSize: 12, color: '#806f62', marginTop: 6 }}>Try clearing search keywords or selecting "All Time".</p>
          <button 
            type="button" 
            className="admin-btn secondary" 
            onClick={handleResetFilters}
            style={{ marginTop: 10, fontSize: 12 }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
        {/* Desktop Orders Table */}
        <div className="admin-table-container desktop-only" style={{ marginBottom: 20 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Products</th>
                <th>Amount</th>
                <th>Payment & PayU</th>
                <th>Shipping</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const hasTracking = o.trackingNumber || o.trackingId;
                const courier = o.courierName || o.carrier || o.courier;
                const link = o.trackingUrl || o.shippingLink;
                const items = db.normalizeOrderItems(o);
                const payuRef = getPayuRef(o);
                const isPaid = o.paymentStatus === "Paid";
                const isRefunded = o.paymentStatus === "Refunded" || o.paymentStatus === "Partially Refunded" || Number(o.amountRefunded || 0) > 0;

                return (
                  <tr key={o.id}>
                    <td>
                      <b>#{o.id}</b>
                      {o.txnid && (
                        <small style={{ display: 'block', color: '#806f62', fontFamily: 'monospace', fontSize: 10 }}>
                          Txn: {o.txnid.slice(-8)}
                        </small>
                      )}
                    </td>
                    <td>
                      <b>{o.customerName || 'Guest'}</b>
                      <small style={{ display: 'block', color: '#806f62' }}>{o.phone || o.customerPhone || o.customerEmail || ''}</small>
                    </td>
                    <td>
                      <small style={{ fontWeight: 600 }}>{new Date(o.date || o.createdAt).toLocaleDateString()}</small>
                      <small style={{ display: 'block', color: '#806f62', fontSize: 10 }}>
                        {new Date(o.date || o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </td>
                    <td>
                      <div style={{ maxWidth: 180, fontSize: 12, lineHeight: 1.3 }}>
                        {items.slice(0, 2).map((it, idx) => (
                          <div key={idx} style={{ color: '#2b170d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            • {it.name} <span style={{ color: '#806f62' }}>({it.qty}x)</span>
                          </div>
                        ))}
                        {items.length > 2 && (
                          <small style={{ color: '#a54d2b', fontWeight: 600 }}>+{items.length - 2} more item(s)</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <b>₹{(o.finalAmount || o.amount || 0).toLocaleString()}</b>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`payu-status-tag ${isPaid ? 'success' : isRefunded ? 'refunded' : o.paymentStatus === 'Failed' ? 'failed' : 'pending'}`}>
                            {isRefunded ? `Refunded ₹${Number(o.amountRefunded || o.finalAmount || o.amount).toLocaleString()}` : (o.paymentStatus || 'Pending')}
                          </span>
                          <button
                            type="button"
                            className="payu-verify-action-btn"
                            onClick={(e) => handleSyncPayu(o.id, e)}
                            disabled={syncingOrderId === o.id}
                            title="Live PayU Status Check"
                          >
                            <RefreshCcw size={10} className={syncingOrderId === o.id ? "animate-spin" : ""} />
                            {syncingOrderId === o.id ? "Syncing..." : "PayU"}
                          </button>
                        </div>
                        {payuRef && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#806f62' }}>
                            <span>mihpayid:</span>
                            <code 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(payuRef);
                                emitToast("PayU ID copied!", "success");
                              }}
                              title="Click to copy PayU Payment ID"
                              style={{ fontFamily: 'monospace', cursor: 'pointer', background: '#f5f0eb', padding: '1px 4px', borderRadius: 2 }}
                            >
                              {payuRef}
                            </code>
                          </div>
                        )}
                      </div>
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
                          Not dispatched
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
                        {statuses.map(st => {
                          const currentStatus = o.status || "Pending";
                          const isValid = st === currentStatus || (ALLOWED_ORDER_TRANSITIONS[currentStatus] || []).includes(st);
                          return <option key={st} value={st} disabled={!isValid}>{st}</option>;
                        })}
                      </select>
                    </td>
                    <td>
                      <button className="admin-btn secondary" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => openOrderDetails(o)}>
                        <Eye size={13} /> {hasTracking ? "Edit" : "View"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Orders Cards */}
        <div className="admin-mobile-cards">
          {filteredOrders.map(o => {
            const hasTracking = o.trackingNumber || o.trackingId;
            const courier = o.courierName || o.carrier || o.courier;
            const link = o.trackingUrl || o.shippingLink;
            const items = db.normalizeOrderItems(o);
            const payuRef = getPayuRef(o);
            const isPaid = o.paymentStatus === "Paid";
            const isRefunded = o.paymentStatus === "Refunded" || o.paymentStatus === "Partially Refunded" || Number(o.amountRefunded || 0) > 0;

            return (
              <div key={o.id} className="admin-mobile-card">
                <div className="mobile-card-top">
                  <div>
                    <span className="mobile-card-title">Order #{o.id}</span>
                    <div className="mobile-card-sub">
                      {o.customerName || 'Guest Customer'} • {new Date(o.date || o.createdAt).toLocaleDateString()}
                    </div>
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
                    {statuses.map(s => {
                      const currentStatus = o.status || "Pending";
                      const isValid = s === currentStatus || (ALLOWED_ORDER_TRANSITIONS[currentStatus] || []).includes(s);
                      return <option key={s} value={s} disabled={!isValid}>{s}</option>;
                    })}
                  </select>
                </div>

                {/* Items preview */}
                <div style={{ fontSize: 12, color: '#665a51', background: '#fdfbf7', padding: '6px 10px', borderRadius: 6 }}>
                  {items.map((it, idx) => (
                    <div key={idx}>• {it.name} ({it.qty}x)</div>
                  ))}
                </div>

                {hasTracking && (
                  <div style={{ background: '#fdfbf7', border: '1px solid #ebdccb', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`payu-status-tag ${isPaid ? 'success' : isRefunded ? 'refunded' : o.paymentStatus === 'Failed' ? 'failed' : 'pending'}`} style={{ fontSize: 10 }}>
                          {isRefunded ? `Refunded ₹${Number(o.amountRefunded || o.finalAmount || o.amount).toLocaleString()}` : (o.paymentStatus || 'Pending')}
                        </span>
                        <button
                          type="button"
                          className="payu-verify-action-btn"
                          onClick={(e) => handleSyncPayu(o.id, e)}
                          disabled={syncingOrderId === o.id}
                          style={{ padding: '2px 6px', fontSize: 10 }}
                        >
                          <RefreshCcw size={10} className={syncingOrderId === o.id ? "animate-spin" : ""} />
                          PayU
                        </button>
                      </div>
                      {payuRef && (
                        <div style={{ fontSize: 10, color: '#806f62' }}>
                          PayU ID: <code style={{ fontFamily: 'monospace' }}>{payuRef}</code>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mobile-card-actions">
                    <button className="admin-btn secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openOrderDetails(o)}>
                      <Eye size={14} /> View
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