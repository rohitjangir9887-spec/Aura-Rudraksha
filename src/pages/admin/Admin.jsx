import React, { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "../../components/AdminLayout";
import { motion } from "framer-motion";
import { db, onStoreUpdate } from "../../lib/db";
import { auraAiClient } from "../../lib/auraAiClient";
import { getPuterMediaStatus, signInToPuter } from "../../lib/imageUtils";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../../components/ConfirmModal";
import { emitToast } from "../../context/ToastContext";
import {
  ShoppingBag, DollarSign, Users, Boxes, Clock, Eye, Plus, Megaphone,
  TicketPercent, ChevronRight, TrendingUp, Sparkles, RefreshCw, CheckCircle2,
  MessageSquare, Database, WifiOff, Cloud, HardDrive, Video, Image as ImageIcon
} from "lucide-react";

export function Admin() {
  const getInitialStats = () => {
    const products = db.getProducts() || [];
    const orders = db.getOrders() || [];
    const customers = db.getCustomers() || [];
    const analytics = db.getAnalytics ? db.getAnalytics() : { visits: 0 };
    const revenue = orders
      .filter(o => o.status !== "Cancelled")
      .reduce((sum, o) => sum + (Number(o.finalAmount) || Number(o.amount) || 0), 0);
    const pending = orders.filter(o => o.status === "Pending").length;
    const completed = orders.filter(o => o.status === "Delivered").length;
    return {
      totalOrders: orders.length,
      revenue,
      totalCustomers: customers.length,
      totalProducts: products.length,
      pendingOrders: pending,
      completedOrders: completed,
      views: analytics.visits || 0,
      aiConversations: 0,
      hasData: orders.length > 0 || (analytics.visits || 0) > 0
    };
  };

  const [stats, setStats] = useState(getInitialStats);
  const [recentOrders, setRecentOrders] = useState(() => (db.getOrders() || []).slice(0, 5));
  const [mediaStats, setMediaStats] = useState({
    serverStorage: "Checking",
    imagesCount: 0,
    videosCount: 0,
    lastUpload: null
  });
  const [genericUploading, setGenericUploading] = useState(false);
  const [genericProgress, setGenericProgress] = useState(0);
  const [genericUrl, setGenericUrl] = useState("");
  const [genericError, setGenericError] = useState("");
  const [genericPreview, setGenericPreview] = useState("");
  const [genericType, setGenericType] = useState(""); // "image" | "video"

  const handleGenericUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setGenericUploading(true);
    setGenericProgress(10);
    setGenericUrl("");
    setGenericError("");

    // Preview setup
    const objUrl = URL.createObjectURL(file);
    setGenericPreview(objUrl);
    setGenericType(file.type.startsWith("video/") ? "video" : "image");

    try {
      const url = await uploadMedia(file, (progress) => {
        setGenericProgress(progress);
      });
      if (url) {
        setGenericUrl(url);
        emitToast("Media uploaded and registered successfully in MongoDB!", "success");
        // Force refresh stats
        const statsRes = await fetch("/api/upload/stats").then(res => res.json()).catch(() => ({}));
        if (statsRes.success) {
          setMediaStats({
            serverStorage: statsRes.serverStorage,
            imagesCount: statsRes.imagesCount,
            videosCount: statsRes.videosCount,
            lastUpload: statsRes.lastUpload
          });
        }
      } else {
        throw new Error("Uploader did not return a valid URL");
      }
    } catch (err) {
      setGenericError(err.message || "Failed to process media upload");
      emitToast(err.message || "Failed to process media upload", "error");
    } finally {
      setGenericUploading(false);
    }
  };

  const [topProducts, setTopProducts] = useState(() => (db.getProducts() || []).slice(0, 5));
  const [dbStatus, setDbStatus] = useState("unknown");
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const mountedRef = useRef(true);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    setFetchError(null);
    try {
      // Fresh live data from MongoDB with individual resilient catch handlers
      const [productsRes, ordersRes, customersRes, analyticsRes, aiMetricsRes] = await Promise.allSettled([
        db.fetchProducts().catch(() => db.getProducts()),
        db.fetchOrders().catch(() => db.getOrders()),
        db.fetchCustomers().catch(() => db.getCustomers()),
        db.fetchAnalytics().catch(() => ({ visits: 0 })),
        auraAiClient.getAnalytics().catch(() => ({ totalConvos: 0 }))
      ]);

      if (!mountedRef.current) return;

      const realProducts = (productsRes.status === "fulfilled" && Array.isArray(productsRes.value)) ? productsRes.value : (db.getProducts() || []);
      const realOrders = (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) ? ordersRes.value : (db.getOrders() || []);
      const realCustomers = (customersRes.status === "fulfilled" && Array.isArray(customersRes.value)) ? customersRes.value : (db.getCustomers() || []);
      const analytics = (analyticsRes.status === "fulfilled" && analyticsRes.value) ? analyticsRes.value : { visits: 0 };
      const aiMetrics = (aiMetricsRes.status === "fulfilled" && aiMetricsRes.value) ? aiMetricsRes.value : { totalConvos: 0 };

      const revenue = realOrders
        .filter(o => o.status !== "Cancelled")
        .reduce((sum, o) => sum + (Number(o.finalAmount) || Number(o.amount) || 0), 0);

      const pending = realOrders.filter(o => o.status === "Pending").length;
      const completed = realOrders.filter(o => o.status === "Delivered").length;

      setStats({
        totalOrders: realOrders.length,
        revenue,
        totalCustomers: realCustomers.length,
        totalProducts: realProducts.length,
        pendingOrders: pending,
        completedOrders: completed,
        views: analytics.visits || 0,
        aiConversations: aiMetrics?.totalConvos || 0,
        hasData: realOrders.length > 0 || (analytics.visits || 0) > 0
      });

      setRecentOrders([...realOrders]
        .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))
        .slice(0, 5));
      setTopProducts(realProducts.slice(0, 5));

      // Fetch real media statistics from MongoDB
      const mediaStatsRes = await fetch("/api/upload/stats")
        .then(res => res.json())
        .catch(() => ({ success: false }));
      if (mediaStatsRes.success) {
        setMediaStats({
          serverStorage: mediaStatsRes.serverStorage,
          imagesCount: mediaStatsRes.imagesCount,
          videosCount: mediaStatsRes.videosCount,
          lastUpload: mediaStatsRes.lastUpload
        });
      }
    } catch (err) {
      console.warn("[Admin] Dashboard refresh notice:", err?.message || err);
      setFetchError(err?.message || "Could not synchronize some dashboard metrics.");
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    refreshDashboard();
    db.checkDbHealth().then(h => setDbStatus(h.connected ? "connected" : "disconnected")).catch(() => setDbStatus("disconnected"));
    // Keep the dashboard live when the store changes (other admin tabs / other devices)
    const unsub = onStoreUpdate(() => {
      refreshDashboard();
    });
    return () => unsub();
  }, [refreshDashboard]);

  const connected = dbStatus === "connected";

  const quickActions = [
    { title: "Add Product", path: "/admin/products?add=1", icon: <Plus size={18} />, bg: "#fdf0e8", color: "#a54d2b" },
    { title: "Orders", path: "/admin/orders", icon: <ShoppingBag size={18} />, bg: "#eef7f2", color: "#1d9450" },
    { title: "Home Banners", path: "/admin/banners", icon: <Megaphone size={18} />, bg: "#f0f4ff", color: "#2563eb" },
    { title: "Coupons", path: "/admin/coupons", icon: <TicketPercent size={18} />, bg: "#fff8e1", color: "#d97706" },
  ];

  const statItems = [
    { label: "Revenue", value: `₹${stats.revenue.toLocaleString()}`, icon: <DollarSign size={18}/>, color: '#1d9450', bg: '#e5f6ea' },
    { label: "Total Orders", value: stats.totalOrders, icon: <ShoppingBag size={18}/>, color: '#a54d2b', bg: '#fdf0e8' },
    { label: "Pending Orders", value: stats.pendingOrders, icon: <Clock size={18}/>, color: '#d97706', bg: '#fff8e1' },
    { label: "Total Customers", value: stats.totalCustomers, icon: <Users size={18}/>, color: '#2563eb', bg: '#eff6ff' },
    { label: "Active Products", value: stats.totalProducts, icon: <Boxes size={18}/>, color: '#7c3aed', bg: '#f3e8ff' },
    { label: "Total Visits", value: stats.views, icon: <Eye size={18}/>, color: '#0891b2', bg: '#ecfeff' },
    { label: "AI Conversations", value: stats.aiConversations, icon: <MessageSquare size={18}/>, color: '#9333ea', bg: '#f5f3ff' },
    { label: "Completed Orders", value: stats.completedOrders, icon: <CheckCircle2 size={18}/>, color: '#059669', bg: '#ecfdf5' }
  ];

  return (
    <AdminLayout>
      <div className="admin-content" style={{ padding: '0 0 20px' }}>
        {/* Mobile Header Banner */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h1 style={{ fontSize: 24, fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, color: '#2b170d', margin: '0 0 2px' }}>
                Store Dashboard
              </h1>
              <p style={{ color: '#806f62', fontSize: '12px', margin: 0 }}>
                {stats.hasData ? "Live overview of sales, orders, customers & products" : "No business data yet - metrics will appear as customers interact with the store"}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={refreshDashboard}
                disabled={refreshing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#fff',
                  border: '1px solid #dcd1c6',
                  color: '#3b322c',
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  cursor: refreshing ? 'wait' : 'pointer'
                }}
                title="Refresh from MongoDB"
              >
                <RefreshCw size={13} className={refreshing ? "spin" : ""} />
                <span>Refresh</span>
              </button>
              <span
                style={{
                  fontSize: '11px',
                  background: connected ? '#e5f6ea' : '#fff8e1',
                  color: connected ? '#1d9450' : '#d97706',
                  padding: '5px 10px',
                  borderRadius: '20px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={connected ? "MongoDB connected - showing live data" : "MongoDB not connected - showing demo/fallback data"}
              >
                {connected ? <TrendingUp size={12} /> : <WifiOff size={12} />}
                {connected ? "Live MongoDB" : "Demo Mode (DB offline)"}
              </span>
            </div>
          </div>
        </div>

        {/* Cloud Storage & Sync Health Monitoring Panel */}
        <div style={{
          background: 'linear-gradient(135deg, #fffdf9 0%, #faf3ea 100%)',
          border: '1px solid #ebd8c5',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(43, 23, 13, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#7a320c', color: '#fff', width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
                <Cloud size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#2b170d', margin: 0 }}>Cloud & Media Storage Sync Status</h3>
                <span style={{ fontSize: '11px', color: '#806f62' }}>MongoDB Database & Media Asset Pipeline Health</span>
              </div>
            </div>
            <span style={{ fontSize: '11px', background: connected ? '#e5f6ea' : '#fff3e0', color: connected ? '#15803d' : '#b45309', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> {connected ? "Database Connected" : "Connecting..."}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
            {/* MongoDB Status Box */}
            <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e8dac9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2b170d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={14} color="#7a320c" /> MongoDB Database
                </span>
                <span style={{ fontSize: '10px', color: connected ? '#15803d' : '#d97706', fontWeight: 600 }}>
                  {connected ? '🟢 Live Connected' : '🟠 Offline / Retrying'}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#6b584c', margin: '0 0 6px 0' }}>
                Products, orders & customers database sync active.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#806f62' }}>
                <span>Database: <b>MongoDB Atlas</b></span>
                <span>Records: <b>{stats.totalProducts + stats.totalOrders + stats.totalCustomers} items</b></span>
              </div>
            </div>

            {/* Media Asset Storage Box */}
            {(() => {
              const mediaInfo = getPuterMediaStatus();
              const handlePuterSignIn = async () => {
                try {
                  await signInToPuter();
                  emitToast("Successfully connected Puter Cloud Storage!", "success");
                  refreshDashboard();
                } catch (err) {
                  emitToast("Puter login cancelled or failed: " + err.message, "error");
                }
              };

              return (
                <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e8dac9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#2b170d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <HardDrive size={14} color="#2563eb" /> Media Storage (Puter / Server)
                    </span>
                    <span style={{ fontSize: '10px', color: mediaInfo.connected ? '#15803d' : '#d97706', fontWeight: 600 }}>
                      {mediaInfo.connected ? '🟢 Puter Connected' : '🟠 Puter Not Configured'}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#6b584c', margin: 0, lineHeight: '1.4' }}>
                    {mediaInfo.message}
                  </p>
                  
                  <div style={{ borderTop: '1px dashed #e8dac9', margin: '4px 0', padding: '6px 0 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#806f62', marginBottom: '4px' }}>
                      <span>Server Storage:</span>
                      <b style={{ color: mediaStats.serverStorage === 'Available' ? '#15803d' : '#dc2626' }}>{mediaStats.serverStorage || 'Available'}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#806f62', marginBottom: '4px' }}>
                      <span>Images Stored:</span>
                      <b>{mediaStats.imagesCount} files</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#806f62', marginBottom: '4px' }}>
                      <span>Videos Stored:</span>
                      <b>{mediaStats.videosCount} files</b>
                    </div>
                    {mediaStats.lastUpload && (
                      <div style={{ fontSize: '9px', color: '#9e8a7c', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Last Successful: <a href={mediaStats.lastUpload.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: '#7a320c' }}>{mediaStats.lastUpload.url.split('/').pop()}</a> ({new Date(mediaStats.lastUpload.createdAt).toLocaleTimeString()})
                      </div>
                    )}
                  </div>

                  {!mediaInfo.connected && typeof window !== 'undefined' && window.puter && (
                    <button
                      onClick={handlePuterSignIn}
                      style={{
                        marginTop: '4px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#1d4ed8'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#2563eb'}
                    >
                      <Cloud size={12} />
                      <span>🔑 Connect Puter Cloud Storage</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Home UI Connection Box */}
            <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e8dac9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2b170d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} color="#1d9450" /> Admin ↔ Home Sync
                </span>
                <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 600 }}>
                  🟢 Connected
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#6b584c', margin: '0 0 6px 0' }}>
                Changes made in admin reflect instantly on customer UI.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#806f62' }}>
                <span>Broadcast Channel: <b>Active</b></span>
                <span>Latency: <b>&lt; 50ms</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE MEDIA ASSET UPLOADER TOOL */}
        <div style={{
          background: '#fffdfa',
          border: '1px solid #ebd8c5',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(43, 23, 13, 0.02)'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#2b170d', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={16} color="#7a320c" /> ⚡ Interactive Media Asset Uploader Tool
          </h3>
          <p style={{ fontSize: '12px', color: '#806f62', margin: '0 0 16px 0' }}>
            Drag and drop or select any Image or Video file to upload. This uploads directly using the active Puter Cloud or Server Storage, saves metadata to MongoDB, and provides a permanent file URL.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Left side: Upload Input and Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                border: '2px dashed #ebd8c5',
                borderRadius: '10px',
                padding: '24px',
                textAlign: 'center',
                background: '#faf6f0',
                cursor: 'pointer',
                position: 'relative'
              }}>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleGenericUpload}
                  disabled={genericUploading}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: genericUploading ? 'not-allowed' : 'pointer'
                  }}
                />
                <Cloud size={32} color="#a54d2b" style={{ margin: '0 auto 8px', display: 'block' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#3b322c', display: 'block', marginBottom: '4px' }}>
                  {genericUploading ? "Uploading to Storage..." : "Click to select or Drag Image/Video here"}
                </span>
                <span style={{ fontSize: '11px', color: '#806f62' }}>
                  Supports PNG, JPEG, WEBP, GIF, MP4, WEBM up to 50MB
                </span>
              </div>

              {genericUploading && (
                <div style={{ background: '#f5ebe0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#7a320c', marginBottom: '6px' }}>
                    <span>Uploading...</span>
                    <span>{genericProgress}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#e3d2bf', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${genericProgress}%`, height: '100%', background: '#7a320c', transition: 'width 0.2s' }}></div>
                  </div>
                </div>
              )}

              {genericError && (
                <div style={{ background: '#fdf2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#dc2626' }}>
                  <b>Upload Error:</b> {genericError}
                </div>
              )}

              {genericUrl && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px' }}>
                  <b style={{ fontSize: '12px', color: '#16a34a', display: 'block', marginBottom: '6px' }}>✓ Upload Successful! Registered in MongoDB</b>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      readOnly
                      value={genericUrl}
                      style={{ flex: 1, fontSize: '11px', padding: '6px 8px', border: '1px solid #bbf7d0', borderRadius: '4px', background: '#fff', color: '#14532d' }}
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(genericUrl);
                        emitToast("File URL copied to clipboard!", "success");
                      }}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Live Preview and Media Info */}
            <div style={{
              background: '#fff',
              border: '1px solid #f0e4d7',
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '200px'
            }}>
              {genericPreview ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#806f62', alignSelf: 'flex-start' }}>
                    PREVIEW ({genericType.toUpperCase()}):
                  </span>
                  {genericType === "video" ? (
                    <video
                      src={genericPreview}
                      controls
                      referrerPolicy="no-referrer"
                      style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', border: '1px solid #ebd8c5' }}
                    />
                  ) : (
                    <img
                      src={genericPreview}
                      alt="Upload Preview"
                      referrerPolicy="no-referrer"
                      style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #ebd8c5' }}
                    />
                  )}
                  {genericUploading && (
                    <span style={{ fontSize: '11px', color: '#7a320c', fontWeight: 600 }}>
                      ⏳ Processing and writing to storage...
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#9e8a7c' }}>
                  <ImageIcon size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <span style={{ fontSize: '12px', display: 'block' }}>No file selected yet</span>
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>Select a file to see its preview</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Bar (Phone Friendly) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
          {quickActions.map((act, idx) => (
            <Link
              key={idx}
              to={act.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#fff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e8e0d8',
                textDecoration: 'none',
                color: '#2b170d',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              <div style={{ background: act.bg, color: act.color, width: '32px', height: '32px', borderRadius: '8px', display: 'grid', placeItems: 'center' }}>
                {act.icon}
              </div>
              <span>{act.title}</span>
            </Link>
          ))}
        </div>

        {/* Stat Cards Grid (Mobile 2 columns) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {statItems.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: '#fff',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #e8e0d8',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(43,23,13,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small style={{ color: '#806f62', fontSize: '11px', fontWeight: '500' }}>{stat.label}</small>
                <div style={{ background: stat.bg, color: stat.color, width: '28px', height: '28px', borderRadius: '6px', display: 'grid', placeItems: 'center' }}>
                  {stat.icon}
                </div>
              </div>
              <b style={{ fontSize: '20px', color: '#2b170d', fontFamily: 'system-ui, -apple-system, sans-serif' }}>{stat.value}</b>
            </motion.div>
          ))}
        </div>

        {/* Recent Orders & Products Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Recent Orders Card */}
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottom: '1px solid #f0ebe4' }}>
              <h2 style={{ fontSize: '16px', margin: 0, color: '#2b170d' }}>Recent Orders</h2>
              <Link to="/admin/orders" style={{ fontSize: '12px', color: '#a54d2b', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                View All <ChevronRight size={14} />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic', fontSize: '13px', margin: 0 }}>
                {connected ? "No orders yet. New orders will appear here the moment customers place them." : "No orders in demo mode. Connect MongoDB for live order data."}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentOrders.map((x) => (
                  <div
                    key={x.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: '#fdfbf7',
                      borderRadius: '8px',
                      border: '1px solid #f0ebe4'
                    }}
                  >
                    <div>
                      <b style={{ display: 'block', fontSize: '13px', color: '#2b170d' }}>Order #{x.id}</b>
                      <small style={{ color: '#806f62', fontSize: '11px' }}>{x.customerName || 'Customer'} • ₹{(x.finalAmount || x.amount || 0).toLocaleString()}</small>
                    </div>
                    <span className={`admin-badge ${x.status === 'Pending' ? 'warning' : x.status === 'Delivered' ? 'success' : x.status === 'Cancelled' ? 'error' : 'info'}`}>
                      {x.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Products Card */}
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottom: '1px solid #f0ebe4' }}>
              <h2 style={{ fontSize: '16px', margin: 0, color: '#2b170d' }}>Products List</h2>
              <Link to="/admin/products" style={{ fontSize: '12px', color: '#a54d2b', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                Manage <ChevronRight size={14} />
              </Link>
            </div>

            {topProducts.length === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic', fontSize: '13px', margin: 0 }}>
                {connected ? "No products yet. Add your first product to start selling." : "No products in demo mode. Connect MongoDB for live catalog data."}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topProducts.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: '#fdfbf7',
                      borderRadius: '8px',
                      border: '1px solid #f0ebe4'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={p.img || '/images/product-5mukhi.jpg'} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: '#2b170d' }}>{p.name}</span>
                        <small style={{ color: '#806f62', fontSize: '11px' }}>Stock: {p.stock}</small>
                      </div>
                    </div>
                    <b style={{ fontSize: '13px', color: '#2b170d' }}>₹{Number(p.price).toLocaleString()}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </AdminLayout>
  );
}
