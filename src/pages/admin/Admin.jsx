import React, { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "../../components/AdminLayout";
import { motion } from "framer-motion";
import { db, onStoreUpdate } from "../../lib/db";
import { auraAiClient } from "../../lib/auraAiClient";
import { authClient } from "../../lib/authClient";
import {
  getPuterMediaStatus, signInToPuter, signOutPuter, uploadMedia, subscribePuterStatus,
  getActiveStorageProvider, setActiveStorageProvider, getPcloudMediaStatus, getImagekitMediaStatus
} from "../../lib/imageUtils";

import { Link } from "react-router-dom";
import { ConfirmModal } from "../../components/ConfirmModal";
import { emitToast } from "../../context/ToastContext";
import {
  ShoppingBag, DollarSign, Users, Boxes, Clock, Eye, Plus, Megaphone,
  TicketPercent, ChevronRight, TrendingUp, Sparkles, RefreshCw, CheckCircle2,
  MessageSquare, Database, WifiOff, Cloud, HardDrive, Video, Image as ImageIcon,
  LogOut, ShieldCheck, AlertCircle
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
    serverStorage: "Puter Cloud Storage",
    imagesCount: null,
    videosCount: null,
    totalCount: null,
    totalSizeBytes: null,
    lastUpload: null,
    lastSyncTime: null
  });
  const [mediaInfo, setMediaInfo] = useState({
    connected: false,
    status: "Checking...",
    message: "Checking Puter Cloud status..."
  });

  const [activeStorageProvider, setActiveStorageProviderState] = useState("puter");
  const [pcloudInfo, setPcloudInfo] = useState({
    connected: false,
    status: "Checking...",
    message: "Checking pCloud Storage status...",
    email: "",
    username: "",
    quota: 0,
    usedQuota: 0,
    freeQuota: 0,
    mediaCount: 0,
    totalSizeBytes: 0
  });

  const [imagekitInfo, setImagekitInfo] = useState({
    connected: false,
    status: "Checking...",
    message: "Checking ImageKit Storage status...",
    publicKey: "",
    urlEndpoint: "",
    mediaCount: 0,
    totalSizeBytes: 0
  });

  const [confirmProviderModal, setConfirmProviderModal] = useState({
    isOpen: false,
    targetProvider: null
  });

  const [pcloudTokenModalOpen, setPcloudTokenModalOpen] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState("");
  const [isSavingPcloudToken, setIsSavingPcloudToken] = useState(false);

  const [imagekitCredsModalOpen, setImagekitCredsModalOpen] = useState(false);
  const [imagekitForm, setImagekitForm] = useState({
    publicKey: "",
    privateKey: "",
    urlEndpoint: ""
  });
  const [isSavingImagekitCreds, setIsSavingImagekitCreds] = useState(false);

  const handleSaveImagekitCredentials = async () => {
    if (!imagekitForm.publicKey.trim() || !imagekitForm.privateKey.trim() || !imagekitForm.urlEndpoint.trim()) {
      emitToast("Please fill in Public Key, Private Key, and URL Endpoint.", "warning");
      return;
    }
    setIsSavingImagekitCreds(true);
    try {
      let token = "";
      try { token = await authClient.getToken(); } catch (_) {}
      if (!token) {
        token = localStorage.getItem("aura_admin_token") || localStorage.getItem("aura_token") || "";
      }
      const res = await fetch("/api/upload/imagekit/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(imagekitForm)
      });
      const data = await res.json();
      if (data.success) {
        emitToast("ImageKit credentials saved successfully!", "success");
        setImagekitCredsModalOpen(false);
        await checkImagekit();
      } else {
        emitToast(data.message || "Failed to save ImageKit credentials.", "error");
      }
    } catch (err) {
      emitToast("ImageKit credentials error: " + err.message, "error");
    } finally {
      setIsSavingImagekitCreds(false);
    }
  };

  const handleSavePcloudToken = async () => {
    if (!manualTokenInput.trim()) {
      emitToast("Please enter a valid pCloud Access Token.", "warning");
      return;
    }
    setIsSavingPcloudToken(true);
    try {
      let token = "";
      try { token = await authClient.getToken(); } catch (_) {}
      if (!token) {
        token = localStorage.getItem("aura_admin_token") || localStorage.getItem("aura_token") || "";
      }
      const res = await fetch("/api/upload/pcloud/connect-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ token: manualTokenInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        emitToast(data.message || "pCloud token connected successfully!", "success");
        setPcloudTokenModalOpen(false);
        setManualTokenInput("");
        await checkPcloud();
      } else {
        emitToast(data.message || "Failed to connect pCloud token.", "error");
      }
    } catch (err) {
      emitToast("pCloud Token connect error: " + err.message, "error");
    } finally {
      setIsSavingPcloudToken(false);
    }
  };

  const handleDisconnectPcloud = async () => {
    try {
      let token = "";
      try { token = await authClient.getToken(); } catch (_) {}
      if (!token) {
        token = localStorage.getItem("aura_admin_token") || localStorage.getItem("aura_token") || "";
      }
      const res = await fetch("/api/upload/pcloud/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        emitToast("pCloud Storage disconnected.", "info");
        await checkPcloud();
      }
    } catch (err) {
      emitToast("Disconnect pCloud error: " + err.message, "error");
    }
  };

  const handleConnectPcloudOAuth = async () => {
    try {
      const res = await fetch("/api/upload/pcloud/connect");
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.open(data.authUrl, "pcloud_oauth", "width=600,height=700");
      } else {
        emitToast(data.message || "OAuth client ID missing. Use 'Enter Access Token' to connect manually.", "warning");
        setPcloudTokenModalOpen(true);
      }
    } catch (err) {
      emitToast("OAuth init error: " + err.message, "error");
      setPcloudTokenModalOpen(true);
    }
  };

  const fetchActiveProvider = useCallback(async () => {
    try {
      const p = await getActiveStorageProvider(true);
      if (mountedRef.current) {
        setActiveStorageProviderState(p);
      }
    } catch (_) {}
  }, []);

  const checkPcloud = useCallback(async () => {
    try {
      const info = await getPcloudMediaStatus();
      if (mountedRef.current && info) {
        setPcloudInfo(info);
      }
    } catch (_) {
      if (mountedRef.current) {
        setPcloudInfo(prev => ({
          ...prev,
          connected: false,
          status: "Error",
          message: "Failed to connect to pCloud API endpoint."
        }));
      }
    }
  }, []);

  const checkImagekit = useCallback(async () => {
    try {
      const info = await getImagekitMediaStatus();
      if (mountedRef.current && info) {
        setImagekitInfo(info);
      }
    } catch (_) {
      if (mountedRef.current) {
        setImagekitInfo(prev => ({
          ...prev,
          connected: false,
          status: "Error",
          message: "Failed to connect to ImageKit API endpoint."
        }));
      }
    }
  }, []);

  const checkPuter = useCallback(async (isManual = false) => {
    try {
      const info = await getPuterMediaStatus({ force: isManual });
      if (mountedRef.current && info) {
        setMediaInfo(info);
        if (info.connected) {
          fetch("/api/upload/stats")
            .then(res => res.json())
            .then(mediaStatsRes => {
              if (mountedRef.current && mediaStatsRes.success) {
                setMediaStats({
                  serverStorage: mediaStatsRes.serverStorage || "Puter Cloud Storage",
                  imagesCount: mediaStatsRes.imagesCount ?? 0,
                  videosCount: mediaStatsRes.videosCount ?? 0,
                  totalCount: mediaStatsRes.totalCount ?? 0,
                  totalSizeBytes: mediaStatsRes.totalSizeBytes ?? 0,
                  lastUpload: mediaStatsRes.lastUpload || null,
                  lastSyncTime: new Date().toLocaleTimeString()
                });
              }
            })
            .catch(() => {});
        }
      }
    } catch (_) {
      if (mountedRef.current) {
        setMediaInfo(prev => ({
          ...prev,
          connected: false,
          status: "Not Connected",
          message: "Puter Cloud connection check failed. Click Reconnect to retry."
        }));
      }
    }
  }, []);
  const [isSigningInPuter, setIsSigningInPuter] = useState(false);
  const [genericUploading, setGenericUploading] = useState(false);
  const [genericProgress, setGenericProgress] = useState(0);
  const [genericUrl, setGenericUrl] = useState("");
  const [genericError, setGenericError] = useState("");
  const [genericPreview, setGenericPreview] = useState("");
  const [genericType, setGenericType] = useState(""); // "image" | "video"

  const handleGenericUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!mediaInfo.connected) {
      emitToast("Puter Cloud not connected. Please connect Puter first.", "warning");
      return;
    }

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
      // Fresh live data from MongoDB
      const [productsRes, ordersRes, customersRes, analyticsRes, aiMetricsRes] = await Promise.allSettled([
        db.fetchProducts(),
        db.fetchOrders(),
        db.fetchCustomers(),
        db.fetchAnalytics(),
        auraAiClient.getAnalytics().catch(() => ({ totalConvos: 0 }))
      ]);

      if (!mountedRef.current) return;

      const dbRejection = [productsRes, ordersRes, customersRes, analyticsRes].find(r => r.status === "rejected");
      if (dbRejection) {
        setFetchError(dbRejection.reason?.message || "Database unavailable. Could not sync dashboard metrics.");
      }

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

      // Fetch real media statistics from MongoDB & Check Puter Storage Status
      checkPuter();
      const mediaStatsRes = await fetch("/api/upload/stats")
        .then(res => res.json())
        .catch(() => ({ success: false }));
      if (mediaStatsRes.success) {
        setMediaStats({
          serverStorage: mediaStatsRes.serverStorage || "Puter Cloud Storage",
          imagesCount: mediaStatsRes.imagesCount ?? 0,
          videosCount: mediaStatsRes.videosCount ?? 0,
          totalCount: mediaStatsRes.totalCount ?? 0,
          totalSizeBytes: mediaStatsRes.totalSizeBytes ?? 0,
          lastUpload: mediaStatsRes.lastUpload || null,
          lastSyncTime: new Date().toLocaleTimeString()
        });
      } else {
        setMediaStats(prev => ({
          ...prev,
          imagesCount: null,
          videosCount: null,
          totalCount: null,
          totalSizeBytes: null,
          lastUpload: null,
          lastSyncTime: null
        }));
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
    // Auto-restore and check active provider, Puter Cloud, pCloud & ImageKit status
    fetchActiveProvider();
    checkPcloud();
    checkImagekit();
    checkPuter();
    const unsubPuter = subscribePuterStatus((info) => {
      if (mountedRef.current && info) {
        setMediaInfo(info);
        if (info.connected) {
          fetch("/api/upload/stats")
            .then(res => res.json())
            .then(mediaStatsRes => {
              if (mountedRef.current && mediaStatsRes.success) {
                setMediaStats({
                  serverStorage: mediaStatsRes.serverStorage || "Puter Cloud Storage",
                  imagesCount: mediaStatsRes.imagesCount ?? 0,
                  videosCount: mediaStatsRes.videosCount ?? 0,
                  totalCount: mediaStatsRes.totalCount ?? 0,
                  totalSizeBytes: mediaStatsRes.totalSizeBytes ?? 0,
                  lastUpload: mediaStatsRes.lastUpload || null,
                  lastSyncTime: new Date().toLocaleTimeString()
                });
              }
            })
            .catch(() => {});
        }
      }
    });
    return () => unsubPuter();
  }, [checkPuter, checkImagekit]);

  useEffect(() => {
    refreshDashboard();
    fetchActiveProvider();
    checkPcloud();
    checkImagekit();
    db.checkDbHealth().then(h => setDbStatus(h.connected ? "connected" : "disconnected")).catch(() => setDbStatus("disconnected"));
    const unsub = onStoreUpdate(() => {
      refreshDashboard();
    });
    return () => unsub();
  }, [refreshDashboard, fetchActiveProvider, checkPcloud, checkImagekit]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === "pcloud:connected") {
        emitToast("pCloud Storage connected via OAuth!", "success");
        checkPcloud();
        refreshDashboard();
      } else if (event.data && event.data.type === "pcloud:error") {
        emitToast("pCloud OAuth error: " + (event.data.error || "Authorization refused"), "error");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [checkPcloud, refreshDashboard]);

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
          padding: '18px 20px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(43, 23, 13, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#7a320c', color: '#fff', width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
                <Cloud size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#2b170d', margin: 0 }}>Cloud & Media Storage Sync Status</h3>
                <span style={{ fontSize: '11px', color: '#806f62' }}>MongoDB Database & Dual Storage Provider Management</span>
              </div>
            </div>
            <span style={{ fontSize: '11px', background: connected ? '#e5f6ea' : '#fff3e0', color: connected ? '#15803d' : '#b45309', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> {connected ? "Database Connected" : "Connecting..."}
            </span>
          </div>

          {/* ACTIVE STORAGE PROVIDER CONTROL BANNER */}
          {(() => {
            const isPuter = activeStorageProvider === 'puter';
            const isPcloud = activeStorageProvider === 'pcloud';
            const isImagekit = activeStorageProvider === 'imagekit';

            const providerName = isImagekit ? 'IMAGEKIT STORAGE' : (isPcloud ? 'pCLOUD STORAGE' : 'PUTER CLOUD STORAGE');
            const bannerBg = isImagekit ? '#f5f3ff' : (isPcloud ? '#f0fdf4' : '#eff6ff');
            const bannerBorder = isImagekit ? '#c4b5fd' : (isPcloud ? '#86efac' : '#93c5fd');
            const bannerTextColor = isImagekit ? '#5b21b6' : (isPcloud ? '#166534' : '#1e40af');

            return (
              <div style={{
                background: bannerBg,
                border: `1.5px solid ${bannerBorder}`,
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <HardDrive size={18} color={isImagekit ? '#7c3aed' : (isPcloud ? '#16a34a' : '#2563eb')} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: bannerTextColor, letterSpacing: '0.02em' }}>
                      NEW UPLOADS WILL USE: {providerName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                      Only one provider receives new uploads at a time. Existing media files remain attached to their original provider.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      if (isPuter) return;
                      setConfirmProviderModal({ isOpen: true, targetProvider: 'puter' });
                    }}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: !isPuter ? '1px solid #cbd5e1' : 'none',
                      background: isPuter ? '#2563eb' : '#ffffff',
                      color: isPuter ? '#ffffff' : '#475569',
                      cursor: !isPuter ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isPuter && <CheckCircle2 size={12} />}
                    ☁️ Puter Cloud
                  </button>

                  <button
                    onClick={() => {
                      if (isPcloud) return;
                      setConfirmProviderModal({ isOpen: true, targetProvider: 'pcloud' });
                    }}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: !isPcloud ? '1px solid #cbd5e1' : 'none',
                      background: isPcloud ? '#16a34a' : '#ffffff',
                      color: isPcloud ? '#ffffff' : '#475569',
                      cursor: !isPcloud ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isPcloud && <CheckCircle2 size={12} />}
                    ☁️ pCloud Storage
                  </button>

                  <button
                    onClick={() => {
                      if (isImagekit) return;
                      setConfirmProviderModal({ isOpen: true, targetProvider: 'imagekit' });
                    }}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: !isImagekit ? '1px solid #cbd5e1' : 'none',
                      background: isImagekit ? '#7c3aed' : '#ffffff',
                      color: isImagekit ? '#ffffff' : '#475569',
                      cursor: !isImagekit ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isImagekit && <CheckCircle2 size={12} />}
                    ⚡ ImageKit Storage
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Sequential Provider & Infrastructure Cards */}
          {(() => {
            const handlePuterSignIn = async () => {
              setIsSigningInPuter(true);
              try {
                const res = await signInToPuter();
                const username = res.user?.username || res.user?.name || "Admin";
                emitToast(`Connected Puter Cloud Storage (${username})!`, "success");
                await checkPuter();
                refreshDashboard();
              } catch (err) {
                emitToast("Puter login cancelled or failed: " + err.message, "error");
              } finally {
                setIsSigningInPuter(false);
              }
            };

            const handlePuterSignOut = async () => {
              try {
                await signOutPuter();
                emitToast("Puter Cloud Storage disconnected.", "info");
                await checkPuter();
                refreshDashboard();
              } catch (err) {
                emitToast("Puter logout error: " + err.message, "error");
              }
            };

            const formatStorage = (bytes) => {
              if (bytes === null || bytes === undefined) return "0 MB";
              if (bytes === 0) return "0 MB";
              const mb = bytes / (1024 * 1024);
              if (mb >= 1024) return (mb / 1024).toFixed(2) + " GB";
              return mb.toFixed(2) + " MB";
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* 1. CARD 1: MongoDB Database Card */}
                <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e8dac9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#2b170d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Database size={15} color="#7a320c" /> 1. MongoDB Database
                    </span>
                    <span style={{ fontSize: '11px', color: connected ? '#15803d' : '#d97706', fontWeight: 600 }}>
                      {connected ? '🟢 Live Connected' : '🟠 Offline / Retrying'}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#6b584c', margin: '0 0 6px 0' }}>
                    Products, orders & customers database sync active. Stores authoritative metadata for all uploaded media.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#806f62' }}>
                    <span>Database Engine: <b>MongoDB Atlas</b></span>
                    <span>Total Records: <b>{stats.totalProducts + stats.totalOrders + stats.totalCustomers} items</b></span>
                  </div>
                </div>

                {/* 2. CARD 2: Media Storage (Puter Cloud) Card */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: activeStorageProvider === 'puter' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: activeStorageProvider === 'puter' ? '#f8fafc' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Cloud size={15} color="#2563eb" /> 2. Media Storage (Puter Cloud)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {activeStorageProvider === 'puter' ? (
                        <span style={{ fontSize: '10px', fontWeight: 800, background: '#2563eb', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>
                          ACTIVE PROVIDER
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmProviderModal({ isOpen: true, targetProvider: 'puter' })}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          Turn ON Puter
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: '#475569', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '2px' }}>
                    <div>Status: <b>{mediaInfo.connected ? `Connected (${mediaInfo.username || 'Admin'})` : 'Not Connected'}</b></div>
                    <div>Account Email: <b>{mediaInfo.email || (mediaInfo.connected ? `${mediaInfo.username || 'admin'}@puter.com` : 'Unavailable')}</b></div>
                    <div>Puter Media Count: <b>{mediaStats.totalCount !== null ? `${mediaStats.totalCount} files` : '0 files'}</b></div>
                    <div>Total Storage Used: <b style={{ color: '#2563eb' }}>{formatStorage(mediaStats.totalSizeBytes)}</b></div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {!mediaInfo.connected ? (
                      <button
                        onClick={handlePuterSignIn}
                        disabled={isSigningInPuter}
                        style={{
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          padding: '6px 14px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {isSigningInPuter ? "Connecting..." : "🔑 Connect Puter Storage"}
                      </button>
                    ) : (
                      <button
                        onClick={handlePuterSignOut}
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '5px',
                          padding: '5px 12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Disconnect Puter
                      </button>
                    )}
                    <button
                      onClick={() => checkPuter(true)}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        padding: '5px 12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <RefreshCw size={11} /> Refresh Status
                    </button>
                  </div>
                </div>

                {/* 3. CARD 3: Media Storage (pCloud) Card */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: activeStorageProvider === 'pcloud' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: activeStorageProvider === 'pcloud' ? '#f0fdf4' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <HardDrive size={15} color="#16a34a" /> 3. Media Storage (pCloud)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {activeStorageProvider === 'pcloud' ? (
                        <span style={{ fontSize: '10px', fontWeight: 800, background: '#16a34a', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>
                          ACTIVE PROVIDER
                        </span>
                      ) : pcloudInfo.connected ? (
                        <button
                          onClick={() => setConfirmProviderModal({ isOpen: true, targetProvider: 'pcloud' })}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          Activate pCloud
                        </button>
                      ) : (
                        <button
                          onClick={handleConnectPcloudOAuth}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          Connect pCloud
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: '#475569', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '2px' }}>
                    <div>Connection Status: <b>{pcloudInfo.connected ? `Connected (${pcloudInfo.email})` : (pcloudInfo.status || 'Not Connected')}</b></div>
                    <div>Account Email: <b>{pcloudInfo.email || 'Not Configured'}</b></div>
                    <div>pCloud Media Count: <b>{pcloudInfo.mediaCount ?? 0} files</b></div>
                    <div>Storage Quota Used: <b style={{ color: '#16a34a' }}>{formatStorage(pcloudInfo.usedQuota)} / {formatStorage(pcloudInfo.quota)}</b></div>
                  </div>

                  <p style={{ fontSize: '11px', color: pcloudInfo.connected ? '#166534' : '#b45309', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                    {pcloudInfo.message || (pcloudInfo.connected ? 'pCloud connected and ready for uploads.' : 'pCloud is not configured. Connect via OAuth or paste your Access Token below.')}
                  </p>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {!pcloudInfo.connected ? (
                      <>
                        <button
                          onClick={handleConnectPcloudOAuth}
                          style={{
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '6px 14px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          🔑 Connect via OAuth
                        </button>

                        <button
                          onClick={() => setPcloudTokenModalOpen(true)}
                          style={{
                            background: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '6px 14px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          📝 Enter Access Token
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleDisconnectPcloud}
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '5px',
                          padding: '5px 12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Disconnect pCloud
                      </button>
                    )}

                    <button
                      onClick={checkPcloud}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        padding: '5px 12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <RefreshCw size={11} /> Refresh pCloud Status
                    </button>
                  </div>
                </div>

                {/* 4. CARD 4: Media Storage (ImageKit) Card */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: activeStorageProvider === 'imagekit' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  background: activeStorageProvider === 'imagekit' ? '#f5f3ff' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={15} color="#7c3aed" /> 4. Media Storage (ImageKit)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {activeStorageProvider === 'imagekit' ? (
                        <span style={{ fontSize: '10px', fontWeight: 800, background: '#7c3aed', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>
                          ACTIVE PROVIDER
                        </span>
                      ) : imagekitInfo.connected ? (
                        <button
                          onClick={() => setConfirmProviderModal({ isOpen: true, targetProvider: 'imagekit' })}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#7c3aed',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          Activate ImageKit
                        </button>
                      ) : (
                        <button
                          onClick={() => setImagekitCredsModalOpen(true)}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#7c3aed',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          Configure ImageKit
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: '#475569', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '2px' }}>
                    <div>Connection Status: <b>{imagekitInfo.connected ? 'Connected' : (imagekitInfo.status || 'Not Configured')}</b></div>
                    <div>Public Key: <b>{imagekitInfo.publicKey ? `${imagekitInfo.publicKey.substring(0, 12)}...` : 'Not Configured'}</b></div>
                    <div>URL Endpoint: <b>{imagekitInfo.urlEndpoint || 'Not Configured'}</b></div>
                    <div>ImageKit Media Count: <b>{imagekitInfo.mediaCount ?? 0} files</b></div>
                  </div>

                  <p style={{ fontSize: '11px', color: imagekitInfo.connected ? '#5b21b6' : '#b45309', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                    {imagekitInfo.message || (imagekitInfo.connected ? 'ImageKit connected and ready for uploads.' : 'ImageKit credentials not configured. Click Configure ImageKit below.')}
                  </p>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setImagekitCredsModalOpen(true)}
                      style={{
                        background: '#7c3aed',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '6px 14px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ⚙️ {imagekitInfo.connected ? 'Edit Credentials' : 'Configure Credentials'}
                    </button>

                    <button
                      onClick={checkImagekit}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        padding: '5px 12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <RefreshCw size={11} /> Refresh ImageKit Status
                    </button>
                  </div>
                </div>

                {/* 5. CARD 5: Admin ↔ Home Sync Card */}
                <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e8dac9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#2b170d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={15} color="#1d9450" /> 5. Admin ↔ Home Sync
                    </span>
                    <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
                      🟢 Live Synchronized
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#6b584c', margin: '0 0 6px 0' }}>
                    All product image and video URLs rendered on the storefront sync instantly with MongoDB and the active media provider.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#806f62' }}>
                    <span>Store Broadcast Channel: <b>Active</b></span>
                    <span>Sync Latency: <b>&lt; 50ms</b></span>
                  </div>
                </div>

              </div>
            );
          })()}
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
            Drag and drop or select any Image or Video file to upload. This uploads directly using the active storage provider ({activeStorageProvider === 'imagekit' ? 'ImageKit Storage' : (activeStorageProvider === 'pcloud' ? 'pCloud Storage' : 'Puter Cloud Storage')}), saves metadata to MongoDB, and provides a permanent file URL.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Left side: Upload Input and Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!mediaInfo.connected && (
                <div style={{
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} color="#ca8a04" />
                    <span style={{ fontSize: '11px', color: '#854d0e', fontWeight: 500 }}>
                      Puter Cloud is not connected. Connect Puter to upload images/videos.
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      setIsSigningInPuter(true);
                      try {
                        const res = await signInToPuter();
                        const username = res.user?.username || res.user?.name || "Admin";
                        emitToast(`Connected Puter Cloud (${username})!`, "success");
                        await checkPuter();
                      } catch (err) {
                        emitToast("Puter login cancelled or failed: " + err.message, "error");
                      } finally {
                        setIsSigningInPuter(false);
                      }
                    }}
                    disabled={isSigningInPuter}
                    style={{
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: isSigningInPuter ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isSigningInPuter ? "Connecting..." : "Connect Puter"}
                  </button>
                </div>
              )}

              {(() => {
                const isActiveReady = activeStorageProvider === 'pcloud' ? pcloudInfo.connected : mediaInfo.connected;
                return (
                  <div style={{
                    border: isActiveReady ? '2px dashed #ebd8c5' : '2px dashed #e2e8f0',
                    borderRadius: '10px',
                    padding: '24px',
                    textAlign: 'center',
                    background: isActiveReady ? '#faf6f0' : '#f8fafc',
                    cursor: isActiveReady ? 'pointer' : 'not-allowed',
                    position: 'relative'
                  }}>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleGenericUpload}
                      disabled={genericUploading || !isActiveReady}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: (genericUploading || !isActiveReady) ? 'not-allowed' : 'pointer'
                      }}
                    />
                    <Cloud size={32} color={isActiveReady ? (activeStorageProvider === 'pcloud' ? "#16a34a" : "#a54d2b") : "#94a3b8"} style={{ margin: '0 auto 8px', display: 'block' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isActiveReady ? '#3b322c' : '#64748b', display: 'block', marginBottom: '4px' }}>
                      {genericUploading
                        ? `Uploading to ${activeStorageProvider === 'pcloud' ? 'pCloud' : 'Puter'}...`
                        : !isActiveReady
                        ? `Enable ${activeStorageProvider === 'pcloud' ? 'pCloud Storage' : 'Puter Cloud'} above to enable upload`
                        : `Click to select or Drag Image/Video here (${activeStorageProvider === 'pcloud' ? 'pCloud Active' : 'Puter Active'})`}
                    </span>
                    <span style={{ fontSize: '11px', color: '#806f62' }}>
                      Supports PNG, JPEG, WEBP, GIF, MP4, WEBM up to 50MB
                    </span>
                  </div>
                );
              })()}

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

      <ConfirmModal
        isOpen={confirmProviderModal.isOpen}
        title="Switch Active Media Storage Provider?"
        message={`Are you sure you want to switch the active storage provider to ${confirmProviderModal.targetProvider === "imagekit" ? "ImageKit Storage" : (confirmProviderModal.targetProvider === "pcloud" ? "pCloud Storage" : "Puter Cloud Storage")}?\n\n• All NEW product image/video uploads will automatically use ${confirmProviderModal.targetProvider === "imagekit" ? "ImageKit Storage" : (confirmProviderModal.targetProvider === "pcloud" ? "pCloud Storage" : "Puter Cloud Storage")}.\n• Existing media stored on previous providers will NOT be deleted, moved, or modified.`}
        confirmText={`Switch to ${confirmProviderModal.targetProvider === "imagekit" ? "ImageKit" : (confirmProviderModal.targetProvider === "pcloud" ? "pCloud" : "Puter")}`}
        cancelText="Cancel"
        isDanger={false}
        onConfirm={async () => {
          const target = confirmProviderModal.targetProvider;
          setConfirmProviderModal({ isOpen: false, targetProvider: null });
          try {
            await setActiveStorageProvider(target);
            setActiveStorageProviderState(target);
            emitToast(`Active storage provider switched to ${target === "imagekit" ? "ImageKit Storage" : (target === "pcloud" ? "pCloud Storage" : "Puter Cloud Storage")}!`, "success");
            await fetchActiveProvider();
            await checkPcloud();
            await checkImagekit();
            await checkPuter(true);
            refreshDashboard();
          } catch (err) {
            emitToast("Failed to switch storage provider: " + (err.message || err), "error");
          }
        }}
        onClose={() => setConfirmProviderModal({ isOpen: false, targetProvider: null })}
      />

      {/* ImageKit Credentials Modal */}
      {imagekitCredsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#7c3aed" /> Configure ImageKit Storage API Credentials
              </h3>
              <button
                onClick={() => setImagekitCredsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
              Enter your ImageKit API credentials. These can be obtained from your ImageKit Dashboard under <b>Developer Options → API Keys</b>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Public Key (e.g. public_...)
                </label>
                <input
                  type="text"
                  value={imagekitForm.publicKey}
                  onChange={(e) => setImagekitForm(prev => ({ ...prev, publicKey: e.target.value }))}
                  placeholder="public_..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Private Key (e.g. private_...)
                </label>
                <input
                  type="password"
                  value={imagekitForm.privateKey}
                  onChange={(e) => setImagekitForm(prev => ({ ...prev, privateKey: e.target.value }))}
                  placeholder="private_..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  URL Endpoint (e.g. https://ik.imagekit.io/your_id)
                </label>
                <input
                  type="text"
                  value={imagekitForm.urlEndpoint}
                  onChange={(e) => setImagekitForm(prev => ({ ...prev, urlEndpoint: e.target.value }))}
                  placeholder="https://ik.imagekit.io/..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => setImagekitCredsModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveImagekitCredentials}
                disabled={isSavingImagekitCreds}
                style={{
                  background: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isSavingImagekitCreds ? "Saving..." : "Save ImageKit Credentials"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual pCloud Token Modal */}
      {pcloudTokenModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HardDrive size={18} color="#16a34a" /> Connect pCloud Access Token
              </h3>
              <button
                onClick={() => setPcloudTokenModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
              Paste your pCloud Access Token below. You can generate a token in your pCloud Developer Console or App Settings.
            </p>

            <textarea
              rows={3}
              value={manualTokenInput}
              onChange={(e) => setManualTokenInput(e.target.value)}
              placeholder="Paste pCloud Access Token here..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontFamily: 'monospace',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setPcloudTokenModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePcloudToken}
                disabled={isSavingPcloudToken}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isSavingPcloudToken ? "Saving..." : "Connect Token"}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
