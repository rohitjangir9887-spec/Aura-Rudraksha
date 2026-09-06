import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { Eye, Search, User, Mail, Phone, Calendar, ArrowLeft, ShoppingBag, MapPin, Clock, CreditCard, DollarSign } from "lucide-react";
import "./admin-pages.css";

export function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    load();
    const unsub = onStoreUpdate(() => load());
    return () => unsub();
  }, []);

  const load = async () => {
    try {
      // Live customers from MongoDB (admin endpoint)
      await Promise.all([db.fetchCustomers(), db.fetchOrders()]);
    } catch (_) {}
    const custs = db.getCustomers();
    const ords = db.getOrders();
    setCustomers(custs);
    setFilteredCustomers(custs);
    setOrders(ords);
    setLoading(false);
  };

  useEffect(() => {
    if (searchTerm) {
      setFilteredCustomers(customers.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
      ));
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  if (loading) return <AdminLayout><div className="admin-loading">Loading customers directory...</div></AdminLayout>;

  if (viewing) {
    const vEmail = (viewing.email || "").toLowerCase();
    const vPhone = (viewing.phone || "").trim();

    const customerOrders = orders.filter(o => {
      const oEmail = (o.customerEmail || "").toLowerCase();
      const oPhone = (o.phone || "").trim();
      return (vEmail && oEmail === vEmail) || (vPhone && oPhone === vPhone);
    });

    return (
      <AdminLayout>
        <button className="admin-back-link" onClick={() => setViewing(null)}>
          <ArrowLeft size={16} /> Back to Customers
        </button>

        <div className="admin-page-header">
          <div>
            <h1>{viewing.name}</h1>
            <p className="admin-page-subtitle">Customer Profile & Purchase Analytics</p>
          </div>
        </div>

        {/* PROFILE HEADER CARD */}
        <div className="admin-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid #f0ebe4' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fdf0e8', color: '#a54d2b', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: 22 }}>
              {viewing.name?.charAt(0) || 'C'}
            </div>
            <div>
              <b style={{ fontSize: 18, color: '#2b170d', display: 'block' }}>{viewing.name}</b>
              <div style={{ fontSize: 12, color: '#806f62', display: 'flex', gap: '12px', marginTop: '2px' }}>
                <span>📅 Joined: {viewing.firstSeen ? new Date(viewing.firstSeen).toLocaleDateString() : "Recent"}</span>
                <span>👀 Visits: {viewing.visits || 1}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', fontSize: '13px' }}>
            <div>
              <small style={{ color: '#806f62', display: 'block' }}>Email Address</small>
              <span style={{ fontWeight: '600', color: '#2b170d' }}>{viewing.email || 'N/A (Phone User)'}</span>
            </div>
            <div>
              <small style={{ color: '#806f62', display: 'block' }}>Phone / WhatsApp</small>
              <span style={{ fontWeight: '600', color: '#2b170d' }}>{viewing.phone || 'N/A'}</span>
            </div>
            <div>
              <small style={{ color: '#806f62', display: 'block' }}>Total Orders</small>
              <b style={{ fontSize: '15px', color: '#a54d2b' }}>{customerOrders.length} Orders</b>
            </div>
            <div>
              <small style={{ color: '#806f62', display: 'block' }}>Total Money Spent</small>
              <b style={{ fontSize: '16px', color: '#166534' }}>₹{(viewing.totalSpent || 0).toLocaleString()}</b>
            </div>
          </div>

          {viewing.address && (
            <div style={{ background: '#fdfbf7', padding: '12px', borderRadius: '8px', border: '1px solid #f0ebe4', marginTop: '15px', fontSize: '12px', color: '#5a4032' }}>
              <b style={{ display: 'block', marginBottom: '2px', color: '#2b170d' }}>📍 Shipping Address:</b>
              {viewing.address}
            </div>
          )}
        </div>

        {/* METRICS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div className="admin-card" style={{ padding: '14px', textAlign: 'center' }}>
            <small style={{ color: '#806f62', fontSize: '11px', display: 'block' }}>Total Orders</small>
            <b style={{ fontSize: '20px', color: '#2b170d' }}>{customerOrders.length}</b>
          </div>
          <div className="admin-card" style={{ padding: '14px', textAlign: 'center' }}>
            <small style={{ color: '#806f62', fontSize: '11px', display: 'block' }}>Total Lifetime Spent</small>
            <b style={{ fontSize: '20px', color: '#166534' }}>₹{(viewing.totalSpent || 0).toLocaleString()}</b>
          </div>
          <div className="admin-card" style={{ padding: '14px', textAlign: 'center' }}>
            <small style={{ color: '#806f62', fontSize: '11px', display: 'block' }}>Average Order Value</small>
            <b style={{ fontSize: '20px', color: '#a54d2b' }}>₹{(viewing.avgOrderValue || 0).toLocaleString()}</b>
          </div>
        </div>

        {/* ORDER HISTORY */}
        <div className="admin-card">
          <h2 style={{ fontSize: 16, margin: '0 0 15px', color: '#2b170d' }}>Customer Order History</h2>
          {customerOrders.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', fontSize: 13, margin: 0 }}>No past orders recorded for this customer.</p>
          ) : (
            <div className="admin-mobile-cards">
              {customerOrders.map(o => (
                <div key={o.id} className="admin-mobile-card">
                  <div className="mobile-card-top">
                    <div>
                      <span className="mobile-card-title">Order #{o.id}</span>
                      <div className="mobile-card-sub">{new Date(o.date).toLocaleString()}</div>
                    </div>
                    <span className="admin-badge info">{o.status}</span>
                  </div>

                  <div className="mobile-card-body">
                    <div>
                      <small style={{ color: '#806f62', display: 'block', fontSize: '11px' }}>Amount Paid</small>
                      <span style={{ fontWeight: '700', color: '#166534', fontSize: '15px' }}>
                        ₹{(o.amount || o.finalAmount || 0).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#806f62' }}>
                      Items: <b>{o.items ? o.items.length : 1}</b>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          <h1>Customers Analytics</h1>
          <p className="admin-page-subtitle">{customers.length} store customers recorded</p>
        </div>
      </div>

      <div className="admin-mobile-toolbar">
        <div className="admin-search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search customers by name, phone or email..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {filteredCustomers.length === 0 ? (
        <div className="admin-empty">No customers found matching your search.</div>
      ) : (
        <>
        {/* Desktop Customers Table */}
        <div className="admin-table-container desktop-only" style={{ marginBottom: 20 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email / Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Last Activity</th>
                <th>Orders</th>
                <th>Spent</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => (
                <tr key={c.id}>
                  <td>
                    <b>{c.name || 'Customer'}</b>
                    {c.address && <small style={{ display: 'block', color: '#806f62' }}>{c.address}</small>}
                  </td>
                  <td>
                    {c.email && <span style={{ display: 'block' }}>{c.email}</span>}
                    {c.phone && <small style={{ color: '#806f62' }}>{c.phone}</small>}
                  </td>
                  <td>
                    <span className={`admin-badge ${c.role === 'admin' ? 'info' : ''}`}>{c.role === 'admin' ? 'Admin' : 'Customer'}</span>
                  </td>
                  <td>
                    <span className={`admin-badge ${c.status === 'Active' ? 'success' : 'info'}`}>{c.status || 'Active'}</span>
                  </td>
                  <td><small>{c.joined || c.firstSeen ? new Date(c.joined || c.firstSeen).toLocaleDateString() : '—'}</small></td>
                  <td><small>{c.lastSeen ? new Date(c.lastSeen).toLocaleDateString() : '—'}</small></td>
                  <td><b>{c.totalOrders || 0}</b></td>
                  <td><b>₹{(c.totalSpent || 0).toLocaleString()}</b></td>
                  <td>
                    <button className="admin-btn secondary" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => setViewing(c)}>
                      <Eye size={13} /> Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-mobile-cards">
          {filteredCustomers.map(c => (
            <div key={c.id} className="admin-mobile-card">
              <div className="mobile-card-top">
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fdf0e8', color: '#a54d2b', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                    {c.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <span className="mobile-card-title">{c.name}</span>
                    <div className="mobile-card-sub">
                      {c.phone ? `📞 ${c.phone}` : ''} {c.email ? `• ✉️ ${c.email}` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#806f62', marginTop: '2px' }}>
                      👀 Visits: <b>{c.visits || 1}</b> • Last Visit: {c.lastSeen ? new Date(c.lastSeen).toLocaleDateString() : 'Recent'}
                    </div>
                  </div>
                </div>

                <button 
                  className="admin-btn secondary" 
                  style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }} 
                  onClick={() => setViewing(c)}
                >
                  <Eye size={14} /> Profile
                </button>
              </div>

              <div className="mobile-card-body" style={{ background: '#fdfbf7', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f0ebe4', marginTop: '10px' }}>
                <div>
                  <small style={{ color: '#806f62', fontSize: '11px', display: 'block' }}>Total Orders</small>
                  <b style={{ fontSize: '14px', color: '#2b170d' }}>{c.totalOrders || 0} Orders</b>
                </div>

                <div>
                  <small style={{ color: '#806f62', fontSize: '11px', display: 'block' }}>Total Spent</small>
                  <b style={{ fontSize: '15px', color: '#166534' }}>₹{(c.totalSpent || 0).toLocaleString()}</b>
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


