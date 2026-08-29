import React, { useState, useEffect } from "react";
import { AdminLayout } from "../../components/AdminLayout";
import { db } from "../../lib/db";
import { BarChart3, Sparkles, ShoppingBag, Globe, TrendingUp } from "lucide-react";
import "./admin-pages.css";

export function AdminAnalytics() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadData() {
      // Real events only: visits & product views are recorded from actual
      // customer page loads; revenue is computed from real orders.
      const [analytics, orders] = await Promise.all([
        db.fetchAnalytics(),
        db.fetchOrders()
      ]);
      const realOrders = db.getOrders() || [];
      const validOrders = realOrders.filter(o => o.status !== 'Cancelled');
      
      const rev = validOrders.reduce((sum, o) => sum + (Number(o.finalAmount) || Number(o.amount) || 0), 0);
      
      // Breakdown by channel source
      const auraAiOrders = validOrders.filter(o => o.orderSource === 'aura_ai' || o.source === 'aura_ai');
      const webOrders = validOrders.filter(o => !(o.orderSource === 'aura_ai' || o.source === 'aura_ai'));

      const auraAiRevenue = auraAiOrders.reduce((sum, o) => sum + (Number(o.finalAmount) || Number(o.amount) || 0), 0);
      const webRevenue = webOrders.reduce((sum, o) => sum + (Number(o.finalAmount) || Number(o.amount) || 0), 0);

      setStats({
        visits: analytics.visits || 0,
        productViews: analytics.productViews || 0,
        totalOrders: realOrders.length,
        conversion: analytics.visits ? ((realOrders.length / analytics.visits) * 100).toFixed(1) : "0.0",
        revenue: rev,
        auraAiOrdersCount: auraAiOrders.length,
        auraAiRevenue,
        webOrdersCount: webOrders.length,
        webRevenue,
        auraSharePercent: validOrders.length > 0 ? ((auraAiOrders.length / validOrders.length) * 100).toFixed(1) : "0.0",
        hasData: (analytics.visits || 0) > 0 || (analytics.productViews || 0) > 0 || realOrders.length > 0
      });
    }
    loadData();
  }, []);

  if (!stats) return <AdminLayout><div className="admin-loading">Loading analytics...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <div>
          <h1>Analytics & Sales Channels</h1>
          <p className="admin-page-subtitle">Live business performance and sales channel attribution recorded in real-time.</p>
        </div>
      </div>

      {!stats.hasData && (
        <div className="admin-card" style={{ marginBottom: 20, background: '#fffdf9', border: '1px dashed #dcd1c6', color: '#806f62', fontSize: 13, padding: '14px 16px' }}>
          📊 <b>No analytics data yet.</b> Values below are real counters starting at 0 - they will grow as customers visit the store, view products and place orders.
        </div>
      )}

      {/* KPI Cards */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px'}}>
        <div className="admin-card" style={{display: 'flex', flexDirection: 'column', gap: 5}}>
          <small style={{color: '#806f62'}}>Total Page Views</small>
          <b style={{fontSize: 24, color: '#2b170d'}}>{stats.visits}</b>
        </div>
        <div className="admin-card" style={{display: 'flex', flexDirection: 'column', gap: 5}}>
          <small style={{color: '#806f62'}}>Product Views</small>
          <b style={{fontSize: 24, color: '#2b170d'}}>{stats.productViews}</b>
        </div>
        <div className="admin-card" style={{display: 'flex', flexDirection: 'column', gap: 5}}>
          <small style={{color: '#806f62'}}>Conversion Rate</small>
          <b style={{fontSize: 24, color: '#2b170d'}}>{stats.conversion}%</b>
        </div>
        <div className="admin-card" style={{display: 'flex', flexDirection: 'column', gap: 5}}>
          <small style={{color: '#806f62'}}>Total Orders</small>
          <b style={{fontSize: 24, color: '#2b170d'}}>{stats.totalOrders}</b>
        </div>
        <div className="admin-card" style={{display: 'flex', flexDirection: 'column', gap: 5}}>
          <small style={{color: '#806f62'}}>Total Revenue</small>
          <b style={{fontSize: 24, color: '#166534'}}>₹{stats.revenue.toLocaleString()}</b>
        </div>
      </div>

      {/* Order Attribution Breakdown: Web vs Aura AI */}
      <div className="admin-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', color: '#7a320c', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
          <TrendingUp size={18} /> Sales Channel Attribution
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {/* Web Storefront Channel */}
          <div style={{ background: '#fffdf9', border: '1.5px solid #e8dac9', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: '700', color: '#3b322c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={16} color="#7a320c" /> Web Storefront Checkout
              </span>
              <span className="admin-badge" style={{ fontSize: '11px', padding: '2px 8px' }}>Standard</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
              <div>
                <small style={{ color: '#806f62', display: 'block' }}>Orders</small>
                <b style={{ fontSize: '20px', color: '#2b170d' }}>{stats.webOrdersCount}</b>
              </div>
              <div style={{ textAlign: 'right' }}>
                <small style={{ color: '#806f62', display: 'block' }}>Revenue</small>
                <b style={{ fontSize: '20px', color: '#166534' }}>₹{stats.webRevenue.toLocaleString()}</b>
              </div>
            </div>
          </div>

          {/* Aura AI Chat Channel */}
          <div style={{ background: 'linear-gradient(135deg, #fffcf4 0%, #fef8eb 100%)', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: '700', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="#d97706" /> Aura AI Assistant Orders
              </span>
              <span className="admin-badge warning" style={{ fontSize: '11px', padding: '2px 8px', background: '#fef3c7', color: '#92400e' }}>
                {stats.auraSharePercent}% Share
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
              <div>
                <small style={{ color: '#806f62', display: 'block' }}>AI Orders</small>
                <b style={{ fontSize: '20px', color: '#92400e' }}>{stats.auraAiOrdersCount}</b>
              </div>
              <div style={{ textAlign: 'right' }}>
                <small style={{ color: '#806f62', display: 'block' }}>AI Revenue</small>
                <b style={{ fontSize: '20px', color: '#166534' }}>₹{stats.auraAiRevenue.toLocaleString()}</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{textAlign: 'center', padding: '40px 20px', color: '#806f62'}}>
        <BarChart3 size={40} style={{color: '#e8e0d8', marginBottom: 12}} />
        <p style={{ margin: 0, fontSize: '13px' }}>Real-time analytics graphs automatically refresh as customer sessions and orders stream in.</p>
      </div>
    </AdminLayout>
  );
}
