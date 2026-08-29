import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { Eye, Truck, Search, ArrowLeft, CheckCircle2, Clock, Package, ShoppingBag, X, Save } from "lucide-react";
import "./admin-pages.css";
import { getOrderProducts } from "../account/Orders";

export function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);

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
        o.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSaveTracking = async () => {
    if (!viewing) return;
    setIsUpdatingTracking(true);
    try {
      const res = await db.updateOrder(viewing.id, {
        trackingNumber: trackingNumber.trim(),
        courierName: courierName.trim()
      });
      if (!res?.success) throw new Error(res?.message || "Update failed");
      setViewing({ ...viewing, trackingNumber: trackingNumber.trim(), courierName: courierName.trim() });
      load();
      emitToast("Shipment tracking details saved successfully!", "success");
    } catch (err) {
      emitToast(err.message || "Failed to save tracking details", "error");
    } finally {
      setIsUpdatingTracking(false);
    }
  };

  const openOrderDetails = (order) => {
    setViewing(order);
    setTrackingNumber(order.trackingNumber || "");
    setCourierName(order.courierName || "");
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
            <h2 style={{ fontSize: 16, margin: '0 0 15px', color: '#2b170d', borderBottom: '1px solid #f0ebe4', paddingBottom: 10 }}>Payment & Summary</h2>
            <div style={{ fontSize: '13px', color: '#665a51', lineHeight: '1.8' }}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Payment Method</span>
                <b>{viewing.paymentMethod || 'Online Payment'}</b>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Payment Status</span>
                <b style={{color: isCancelled ? '#c62828' : '#1d9450'}}>{viewing.paymentStatus || (isCancelled ? 'Refunded / Void' : 'Paid')}</b>
              </div>
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

        {/* Shipping & Tracking Card */}
        <div className="admin-card" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: 16, margin: '0 0 15px', color: '#2b170d', borderBottom: '1px solid #f0ebe4', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={18} color="#a54d2b" /> Shipment & Tracking Information
          </h2>
          <div className="admin-form-row" style={{ gap: '15px' }}>
            <div className="admin-form-group">
              <label>Courier Service / Partner</label>
              <input 
                placeholder="e.g. BlueDart, DTDC, India Post" 
                value={courierName} 
                onChange={(e) => setCourierName(e.target.value)} 
              />
            </div>
            <div className="admin-form-group">
              <label>AWB / Tracking Number</label>
              <input 
                placeholder="e.g. BD987654321IN" 
                value={trackingNumber} 
                onChange={(e) => setTrackingNumber(e.target.value)} 
              />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="admin-btn" 
              onClick={handleSaveTracking}
              disabled={isUpdatingTracking}
            >
              <Save size={15} /> {isUpdatingTracking ? "Saving..." : "Update Tracking Details"}
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
            placeholder="Search by Order ID, customer name or email..." 
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
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
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
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-mobile-cards">
          {filteredOrders.map(o => (
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
              <div className="mobile-card-body">
                <div>
                  <small style={{ color: '#806f62', display: 'block', fontSize: '11px' }}>Order Amount</small>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#2b170d' }}>₹{(o.finalAmount || o.amount || 0).toLocaleString()}</span>
                </div>
                <div className="mobile-card-actions">
                  <button className="admin-btn secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openOrderDetails(o)}>
                    <Eye size={14} /> Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </AdminLayout>
  );
}
