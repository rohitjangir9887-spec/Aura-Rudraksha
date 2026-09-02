import React, { useState, useEffect } from "react";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { ConfirmModal } from "../../components/ConfirmModal";
import { 
  Sparkles, Gift, Clock, Tag, Eye, Smartphone, Monitor, Check, 
  Copy, RefreshCw, Sliders, Palette, Zap, Layers, AlertCircle, 
  HelpCircle, ArrowRight, ShieldCheck, X, Plus, Pencil, Trash2
} from "lucide-react";
import "./admin-pages.css";

export function AdminOffers() {
  const [activeOffer, setActiveOffer] = useState(() => db.getActiveOffer());

  // Home Banner Deals (general offers list)
  const [offers, setOffers] = useState(() => db.getOffers());
  const [editingDeal, setEditingDeal] = useState(null);
  const [dealError, setDealError] = useState("");
  const [deleteDealId, setDeleteDealId] = useState(null);

  const loadDeals = () => setOffers(db.getOffers());
  const [previewMode, setPreviewMode] = useState("desktop"); // 'desktop' | 'mobile'
  const [previewComponent, setPreviewComponent] = useState("all"); // 'all' | 'hero' | 'card' | 'pdp' | 'floating' | 'popup'
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Live timer tick for admin preview
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = () => {
    setActiveOffer(db.getActiveOffer());
  };

  useEffect(() => {
    load();
    loadDeals();
    const unsub = onStoreUpdate(() => {
      load();
      loadDeals();
    });
    return () => unsub();
  }, []);

  const handleChange = (field, val) => {
    setActiveOffer(prev => {
      const updated = { ...prev, [field]: val };
      return updated;
    });
  };

  const handleInstantToggle = async (field, val, label = "Offer setting") => {
    let updated = { ...activeOffer, [field]: val };
    // If enabling hero/timer/site offer, ensure valid future expiry
    if (val === true && (field === "heroEnabled" || field === "enabled")) {
      const expTime = updated.expiresAt ? new Date(updated.expiresAt).getTime() : 0;
      if (!expTime || expTime <= Date.now()) {
        const freshExpiry = new Date(Date.now() + 3 * 24 * 3600000).toISOString();
        updated.expiresAt = freshExpiry;
        updated.expiry = freshExpiry;
      }
    }
    setActiveOffer(updated);
    try {
      await db.saveActiveOffer(updated);
      emitToast(`${label} ${val ? "enabled (ON)" : "disabled (OFF)"} instantly! ✨`, "success");
    } catch (err) {
      emitToast(err.message || "Failed to update offer in database", "error");
    }
  };

  const handleToggleMasterOffer = async () => {
    const isCurrentlyActive = activeOffer.status === "Active" && activeOffer.enabled !== false;
    const newStatus = isCurrentlyActive ? "Disabled" : "Active";
    const newEnabled = !isCurrentlyActive;
    
    let updated = { ...activeOffer, status: newStatus, enabled: newEnabled };
    if (newEnabled) {
      const expTime = updated.expiresAt ? new Date(updated.expiresAt).getTime() : 0;
      if (!expTime || expTime <= Date.now()) {
        const freshExpiry = new Date(Date.now() + 3 * 24 * 3600000).toISOString();
        updated.expiresAt = freshExpiry;
        updated.expiry = freshExpiry;
      }
    }
    setActiveOffer(updated);
    try {
      await db.saveActiveOffer(updated);
      emitToast(`Central Offer is now ${newEnabled ? "LIVE & ACTIVE site-wide (ON)" : "DISABLED & HIDDEN site-wide (OFF)"}! ✨`, newEnabled ? "success" : "info");
    } catch (err) {
      emitToast(err.message || "Failed to update offer in database", "error");
    }
  };

  const handleStatusChange = async (newStatus) => {
    const newEnabled = newStatus === "Active";
    let updated = { ...activeOffer, status: newStatus, enabled: newEnabled };
    if (newEnabled) {
      const expTime = updated.expiresAt ? new Date(updated.expiresAt).getTime() : 0;
      if (!expTime || expTime <= Date.now()) {
        const freshExpiry = new Date(Date.now() + 3 * 24 * 3600000).toISOString();
        updated.expiresAt = freshExpiry;
        updated.expiry = freshExpiry;
      }
    }
    setActiveOffer(updated);
    try {
      await db.saveActiveOffer(updated);
      emitToast(`Offer status updated to ${newStatus}!`, "success");
    } catch (err) {
      emitToast(err.message || "Failed to save status", "error");
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      let offerToSave = { ...activeOffer };
      if (offerToSave.status === "Active" && offerToSave.enabled !== false) {
        const expTime = offerToSave.expiresAt ? new Date(offerToSave.expiresAt).getTime() : 0;
        if (!expTime || expTime <= Date.now()) {
          const freshExpiry = new Date(Date.now() + 3 * 24 * 3600000).toISOString();
          offerToSave.expiresAt = freshExpiry;
          offerToSave.expiry = freshExpiry;
          setActiveOffer(offerToSave);
        }
      }
      await db.saveActiveOffer(offerToSave);
      
      // Also sync to top promos for seamless backward compatibility
      try {
        const currentPromos = db.getTopPromos();
        if (currentPromos && currentPromos.length > 0) {
          await db.saveTopPromo({
            ...currentPromos[0],
            offerText: offerToSave.title,
            optionalMessage: offerToSave.subtitle,
            couponCode: offerToSave.couponCode,
            enablePromo: offerToSave.enabled && offerToSave.status === "Active",
            status: offerToSave.status,
            expiry: offerToSave.expiresAt,
            startDate: offerToSave.startDate,
            enableCountdown: offerToSave.timerEnabled,
            bgColor: offerToSave.backgroundColor,
            textColor: offerToSave.textColor,
            accentColor: offerToSave.accentColor,
            couponBorderColor: offerToSave.accentColor
          });
        }
      } catch (_) {}

      emitToast("Central Live Offer updated & saved to database!", "success");
    } catch (err) {
      emitToast(err.message || "Failed to save offer to database", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToAuraDefaults = async () => {
    const defaults = {
      id: "OFFER-CENTRAL-1",
      enabled: true,
      status: "Active",
      title: "₹200 OFF",
      subtitle: "Limited Time Festival Offer",
      couponCode: "SHRAWAN200",
      discountType: "fixed",
      discountValue: 200,
      startDate: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
      expiresAt: new Date(Date.now() + 2 * 24 * 3600000 + 5 * 3600000 + 40 * 60000).toISOString().slice(0, 16),
      backgroundColor: "#2b170d",
      textColor: "#fbf5ef",
      accentColor: "#c89b3c",
      badgeColor: "#7a320c",
      borderColor: "#4b2614",
      buttonColor: "#c89b3c",
      topStripEnabled: false,
      heroEnabled: false,
      productCardEnabled: false,
      productPageEnabled: false,
      imageBadgeEnabled: false,
      floatingEnabled: false,
      stickyEnabled: false,
      popupEnabled: false,
      timerEnabled: false,
      marqueeEnabled: true,
      popupDelay: 10,
      scrollTrigger: 400,
      animationStyle: "fade"
    };
    setActiveOffer(defaults);
    try {
      await db.saveActiveOffer(defaults);
      emitToast("Restored Aura Rudraksha Sacred Palette defaults!", "info");
    } catch (err) {
      emitToast(err.message || "Failed to save defaults to database", "error");
    }
  };

  const setExpiryRelative = (hours) => {
    const target = new Date(Date.now() + hours * 3600000).toISOString().slice(0, 16);
    handleChange("expiresAt", target);
    emitToast(`Expiry set to ${hours >= 24 ? (hours/24) + " days" : hours + " hours"} from now`, "info");
  };

  const openDealEditor = (o) => {
    setDealError("");
    if (o) {
      setEditingDeal({
        ...o,
        startDate: o.startDate ? new Date(o.startDate).toISOString().slice(0, 16) : "",
        expiry: o.expiry ? new Date(o.expiry).toISOString().slice(0, 16) : ""
      });
    } else {
      setEditingDeal({
        title: "", label: "", description: "", buttonText: "Shop Now", link: "/shop",
        type: "Percentage", discountValue: 0, couponCode: "",
        shownOn: "Home Banner", status: "Active", theme: "dark", order: 0,
        startDate: "", expiry: ""
      });
    }
  };

  const handleDealSave = async (e) => {
    e?.preventDefault();
    if (!editingDeal.title?.trim()) {
      setDealError("Deal title is required.");
      return;
    }
    try {
      await db.saveOffer({
        ...editingDeal,
        discountValue: Number(editingDeal.discountValue) || 0,
        order: Number(editingDeal.order) || 0,
        startDate: editingDeal.startDate ? new Date(editingDeal.startDate).toISOString() : undefined,
        expiry: editingDeal.expiry ? new Date(editingDeal.expiry).toISOString() : undefined
      });
      emitToast("Home deal saved to database", "success");
      setEditingDeal(null);
      loadDeals();
    } catch (err) {
      setDealError(err.message || "Failed to save deal");
    }
  };

  const confirmDeleteDeal = async () => {
    if (!deleteDealId) return;
    try {
      await db.deleteOffer(deleteDealId);
      emitToast("Home deal deleted", "success");
      setDeleteDealId(null);
      loadDeals();
    } catch (err) {
      emitToast(err.message || "Failed to delete deal", "error");
    }
  };

  const handleDealToggleStatus = async (deal) => {
    const newStatus = deal.status === "Active" ? "Inactive" : "Active";
    try {
      await db.saveOffer({ ...deal, status: newStatus });
      emitToast(`Deal "${deal.title}" set to ${newStatus}!`, "success");
      loadDeals();
    } catch (err) {
      emitToast(err.message || "Failed to toggle deal status", "error");
    }
  };

  const setExpireNow = () => {
    const target = new Date(Date.now() - 1000).toISOString().slice(0, 16);
    handleChange("expiresAt", target);
    emitToast("Expiry set to past timestamp (Offer will auto-hide!)", "warning");
  };

  // Preview countdown calculation
  const expTimestamp = activeOffer.expiresAt ? new Date(activeOffer.expiresAt).getTime() : 0;
  const diff = expTimestamp - now;
  const isPreviewExpired = diff <= 0;
  
  const d = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const h = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const m = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
  const s = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));

  const pad = (n) => String(n).padStart(2, "0");

  const isOfferActive = activeOffer.enabled !== false && activeOffer.status === "Active" && !isPreviewExpired;

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <div>
          <div className="admin-breadcrumb">
            <span>Marketing</span> / <strong>Central Live Offer System</strong>
          </div>
          <h1>Unified Promotional Offer Engine</h1>
          <p className="admin-subtitle">
            Configure once. One central live offer dynamically synchronizes across Home Hero, Product Cards, Product Detail Page, Floating Scroll Offer, and Popup.
          </p>
        </div>

        <div className="admin-header-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button 
            type="button" 
            className="admin-btn secondary"
            onClick={handleResetToAuraDefaults}
            title="Reset to official Aura Rudraksha styling"
          >
            <RefreshCw size={15} /> Reset Defaults
          </button>

          <button 
            type="button" 
            className="admin-btn primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Check size={16} strokeWidth={2.5} /> Save & Apply Everywhere
              </>
            )}
          </button>
        </div>
      </div>

      {/* Offer Master Status Alert Banner */}
      <div 
        style={{
          background: isOfferActive ? "rgba(22, 163, 74, 0.08)" : "rgba(239, 68, 68, 0.08)",
          border: `1.5px solid ${isOfferActive ? "#16a34a" : "#ef4444"}`,
          borderRadius: "12px",
          padding: "14px 18px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: isOfferActive ? "#16a34a" : "#ef4444",
            boxShadow: isOfferActive ? "0 0 10px #16a34a" : "none"
          }} />
          <div>
            <strong style={{ fontSize: "14px", color: isOfferActive ? "#166534" : "#991b1b" }}>
              {isOfferActive ? "🟢 LIVE & ACTIVE SITE-WIDE" : isPreviewExpired ? "🔴 OFFER EXPIRED (Auto-Hidden Site-Wide)" : "⚪ OFFER DISABLED"}
            </strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#6b584c" }}>
              {isOfferActive 
                ? `Displaying "${activeOffer.title}" with coupon "${activeOffer.couponCode}". Time remaining: ${pad(d)}d : ${pad(h)}h : ${pad(m)}m : ${pad(s)}s.`
                : isPreviewExpired 
                ? "Offer has passed its expiration date and is automatically hidden from all storefront surfaces."
                : "Offer is set to disabled status. Switch status to 'Active' to broadcast across the store."}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button 
            type="button" 
            onClick={handleToggleMasterOffer}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              background: activeOffer.status === "Active" && activeOffer.enabled !== false ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${activeOffer.status === "Active" && activeOffer.enabled !== false ? "#ef4444" : "#16a34a"}`,
              color: activeOffer.status === "Active" && activeOffer.enabled !== false ? "#b91c1c" : "#15803d"
            }}
          >
            {activeOffer.status === "Active" && activeOffer.enabled !== false ? "Turn OFF Offer" : "Activate Offer"}
          </button>
        </div>
      </div>

      <div className="admin-offers-grid">
        
        {/* ========================================================
            LEFT COLUMN: COMPREHENSIVE CONFIGURATION FORM
           ======================================================== */}
        <form onSubmit={handleSave} className="admin-form-box" style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #ebd8c5", boxShadow: "0 4px 20px rgba(43,23,13,0.03)" }}>
          
          {/* Section 1: Core Offer Details */}
          <div style={{ marginBottom: "24px", borderBottom: "1px solid #f0e2d3", paddingBottom: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#2b170d", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px 0" }}>
              <Tag size={18} color="#7a320c" /> 1. Core Offer Details
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label>Offer Status</label>
                <select 
                  value={activeOffer.status || "Active"} 
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <option value="Active">Active (Visible)</option>
                  <option value="Disabled">Disabled (Hidden)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Offer Headline / Title</label>
                <input 
                  type="text" 
                  value={activeOffer.title || ""} 
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g. ₹200 OFF or Flat 20% OFF"
                  required
                />
              </div>

              <div className="form-group">
                <label>Offer Subtitle / Occasion</label>
                <input 
                  type="text" 
                  value={activeOffer.subtitle || ""} 
                  onChange={(e) => handleChange("subtitle", e.target.value)}
                  placeholder="e.g. Limited Time Festival Offer"
                />
              </div>

              <div className="form-group">
                <label>Coupon Code</label>
                <input 
                  type="text" 
                  value={activeOffer.couponCode || ""} 
                  onChange={(e) => handleChange("couponCode", e.target.value.toUpperCase())}
                  placeholder="e.g. SHRAWAN200"
                  style={{ textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}
                  required
                />
              </div>

              <div className="form-group">
                <label>Discount Type</label>
                <select 
                  value={activeOffer.discountType || "fixed"} 
                  onChange={(e) => handleChange("discountType", e.target.value)}
                >
                  <option value="fixed">Flat Fixed (₹ Rupees)</option>
                  <option value="percentage">Percentage (% OFF)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Discount Value</label>
                <input 
                  type="number" 
                  value={activeOffer.discountValue || 200} 
                  onChange={(e) => handleChange("discountValue", Number(e.target.value))}
                  placeholder="200"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Timing, Expiry & Countdown */}
          <div style={{ marginBottom: "24px", borderBottom: "1px solid #f0e2d3", paddingBottom: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#2b170d", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px 0" }}>
              <Clock size={18} color="#7a320c" /> 2. Schedule & Live Countdown Timer
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
              <div className="form-group">
                <label>Start Date & Time (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={activeOffer.startDate ? activeOffer.startDate.slice(0, 16) : ""} 
                  onChange={(e) => handleChange("startDate", e.target.value ? new Date(e.target.value).toISOString() : "")}
                />
              </div>

              <div className="form-group">
                <label>Expires At (Mandatory for timer)</label>
                <input 
                  type="datetime-local" 
                  value={activeOffer.expiresAt ? activeOffer.expiresAt.slice(0, 16) : ""} 
                  onChange={(e) => handleChange("expiresAt", e.target.value ? new Date(e.target.value).toISOString() : "")}
                  required
                />
              </div>
            </div>

            {/* Quick Expiry Shortcuts */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginTop: "8px" }}>
              <span style={{ fontSize: "12px", color: "#7a320c", fontWeight: 600 }}>Quick Presets:</span>
              <button type="button" onClick={() => setExpiryRelative(2)} className="admin-chip-btn">+2 Hours</button>
              <button type="button" onClick={() => setExpiryRelative(12)} className="admin-chip-btn">+12 Hours</button>
              <button type="button" onClick={() => setExpiryRelative(48)} className="admin-chip-btn">+2 Days</button>
              <button type="button" onClick={() => setExpiryRelative(72)} className="admin-chip-btn">+3 Days</button>
              <button type="button" onClick={setExpireNow} className="admin-chip-btn danger">Test Expire Now</button>
            </div>
          </div>

          {/* Section 3: Placements & Surface Toggles */}
          <div style={{ marginBottom: "24px", borderBottom: "1px solid #f0e2d3", paddingBottom: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#2b170d", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px 0" }}>
              <Layers size={18} color="#7a320c" /> 3. Storefront Visibility & Placements
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              
              <label className="admin-toggle-card">
                <input 
                  type="checkbox" 
                  checked={activeOffer.timerEnabled !== false} 
                  onChange={(e) => handleInstantToggle("timerEnabled", e.target.checked, "Countdown Timer")} 
                />
                <div>
                  <strong>Live Countdown Timer</strong>
                  <span>Ticking seconds across all placements</span>
                </div>
              </label>

              <label className="admin-toggle-card">
                <input 
                  type="checkbox" 
                  checked={activeOffer.topStripEnabled !== false} 
                  onChange={(e) => handleInstantToggle("topStripEnabled", e.target.checked, "Top Header Strip")} 
                />
                <div>
                  <strong>Top Header Strip</strong>
                  <span>Always visible promotional strip at top</span>
                </div>
              </label>

              <label className="admin-toggle-card">
                <input 
                  type="checkbox" 
                  checked={activeOffer.marqueeEnabled !== false} 
                  onChange={(e) => handleInstantToggle("marqueeEnabled", e.target.checked, "Scrolling Marquee")} 
                />
                <div>
                  <strong>Scrolling Marquee</strong>
                  <span>Moving announcement text below top strip</span>
                </div>
              </label>

              <label className="admin-toggle-card">
                <input 
                  type="checkbox" 
                  checked={activeOffer.heroEnabled !== false} 
                  onChange={(e) => handleInstantToggle("heroEnabled", e.target.checked, "Home Hero Banner")} 
                />
                <div>
                  <strong>Home Hero Offer Banner</strong>
                  <span>Display promotional offer on homepage</span>
                </div>
              </label>

              <label className="admin-toggle-card">
                <input 
                  type="checkbox" 
                  checked={activeOffer.productCardEnabled !== false} 
                  onChange={(e) => handleInstantToggle("productCardEnabled", e.target.checked, "Product Card Badges")} 
                />
                <div>
                  <strong>Product Card Offer Badges</strong>
                  <span>Show badge on catalog & category grids</span>
                </div>
              </label>

              <label className="admin-toggle-card">
                <input 
                  type="checkbox" 
                  checked={activeOffer.productPageEnabled !== false} 
                  onChange={(e) => handleInstantToggle("productPageEnabled", e.target.checked, "Product Detail Card")} 
                />
                <div>
                  <strong>Product Detail Offer Card</strong>
                  <span>Card near product price & buy buttons</span>
                </div>
              </label>

              <label className="admin-toggle-card">
                <input 
                  type="checkbox" 
                  checked={activeOffer.imageBadgeEnabled !== false} 
                  onChange={(e) => handleInstantToggle("imageBadgeEnabled", e.target.checked, "Product Image Badge")} 
                />
                <div>
                  <strong>Product Image Badge</strong>
                  <span>Small luxury badge over gallery image</span>
                </div>
              </label>

              <label className="admin-toggle-card">
                <input 
                  type="checkbox" 
                  checked={activeOffer.floatingEnabled !== false} 
                  onChange={(e) => handleInstantToggle("floatingEnabled", e.target.checked, "Scroll Floating Offer")} 
                />
                <div>
                  <strong>Scroll Floating Offer</strong>
                  <span>Appears smoothly after user scrolls</span>
                </div>
              </label>

              <label className="admin-toggle-card">
                <input 
                  type="checkbox" 
                  checked={activeOffer.stickyEnabled !== false} 
                  onChange={(e) => handleInstantToggle("stickyEnabled", e.target.checked, "Sticky Buy Bar")} 
                />
                <div>
                  <strong>Sticky Product Buy Bar</strong>
                  <span>Appears when main purchase buttons scroll out</span>
                </div>
              </label>

              <label className="admin-toggle-card">
                <input 
                  type="checkbox" 
                  checked={activeOffer.popupEnabled !== false} 
                  onChange={(e) => handleInstantToggle("popupEnabled", e.target.checked, "Promotional Popup")} 
                />
                <div>
                  <strong>Offer Modal Popup</strong>
                  <span>Appears once per session for visitors</span>
                </div>
              </label>
            </div>

            {/* Scroll and Delay Numerical Controls */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "16px" }}>
              <div className="form-group">
                <label>Popup Delay (seconds)</label>
                <input 
                  type="number" 
                  value={activeOffer.popupDelay || 10} 
                  onChange={(e) => handleChange("popupDelay", Number(e.target.value))}
                  min="2"
                  max="120"
                />
              </div>

              <div className="form-group">
                <label>Scroll Trigger (pixels)</label>
                <input 
                  type="number" 
                  value={activeOffer.scrollTrigger || 400} 
                  onChange={(e) => handleChange("scrollTrigger", Number(e.target.value))}
                  min="100"
                  max="1500"
                  step="50"
                />
              </div>

              <div className="form-group">
                <label>Animation Style</label>
                <select 
                  value={activeOffer.animationStyle || "fade"} 
                  onChange={(e) => handleChange("animationStyle", e.target.value)}
                >
                  <option value="fade">Fade In</option>
                  <option value="slide">Slide Up</option>
                  <option value="scale">Scale Pop</option>
                  <option value="none">Instant</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Colors & Luxury Palette */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "16px", color: "#2b170d", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px 0" }}>
              <Palette size={18} color="#7a320c" /> 4. Colors & Theme Customization
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              <div className="form-group">
                <label>Background Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input 
                    type="color" 
                    value={activeOffer.backgroundColor || "#2b170d"} 
                    onChange={(e) => handleChange("backgroundColor", e.target.value)}
                    style={{ width: "36px", height: "36px", padding: "0", cursor: "pointer", border: "1px solid #ebd8c5", borderRadius: "6px" }}
                  />
                  <input 
                    type="text" 
                    value={activeOffer.backgroundColor || "#2b170d"} 
                    onChange={(e) => handleChange("backgroundColor", e.target.value)}
                    style={{ fontSize: "12px", fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Text Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input 
                    type="color" 
                    value={activeOffer.textColor || "#fbf5ef"} 
                    onChange={(e) => handleChange("textColor", e.target.value)}
                    style={{ width: "36px", height: "36px", padding: "0", cursor: "pointer", border: "1px solid #ebd8c5", borderRadius: "6px" }}
                  />
                  <input 
                    type="text" 
                    value={activeOffer.textColor || "#fbf5ef"} 
                    onChange={(e) => handleChange("textColor", e.target.value)}
                    style={{ fontSize: "12px", fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Accent / Headline Gold</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input 
                    type="color" 
                    value={activeOffer.accentColor || "#c89b3c"} 
                    onChange={(e) => handleChange("accentColor", e.target.value)}
                    style={{ width: "36px", height: "36px", padding: "0", cursor: "pointer", border: "1px solid #ebd8c5", borderRadius: "6px" }}
                  />
                  <input 
                    type="text" 
                    value={activeOffer.accentColor || "#c89b3c"} 
                    onChange={(e) => handleChange("accentColor", e.target.value)}
                    style={{ fontSize: "12px", fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Badge Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input 
                    type="color" 
                    value={activeOffer.badgeColor || "#7a320c"} 
                    onChange={(e) => handleChange("badgeColor", e.target.value)}
                    style={{ width: "36px", height: "36px", padding: "0", cursor: "pointer", border: "1px solid #ebd8c5", borderRadius: "6px" }}
                  />
                  <input 
                    type="text" 
                    value={activeOffer.badgeColor || "#7a320c"} 
                    onChange={(e) => handleChange("badgeColor", e.target.value)}
                    style={{ fontSize: "12px", fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Border Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input 
                    type="color" 
                    value={activeOffer.borderColor || "#4b2614"} 
                    onChange={(e) => handleChange("borderColor", e.target.value)}
                    style={{ width: "36px", height: "36px", padding: "0", cursor: "pointer", border: "1px solid #ebd8c5", borderRadius: "6px" }}
                  />
                  <input 
                    type="text" 
                    value={activeOffer.borderColor || "#4b2614"} 
                    onChange={(e) => handleChange("borderColor", e.target.value)}
                    style={{ fontSize: "12px", fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Button / CTA Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input 
                    type="color" 
                    value={activeOffer.buttonColor || "#c89b3c"} 
                    onChange={(e) => handleChange("buttonColor", e.target.value)}
                    style={{ width: "36px", height: "36px", padding: "0", cursor: "pointer", border: "1px solid #ebd8c5", borderRadius: "6px" }}
                  />
                  <input 
                    type="text" 
                    value={activeOffer.buttonColor || "#c89b3c"} 
                    onChange={(e) => handleChange("buttonColor", e.target.value)}
                    style={{ fontSize: "12px", fontFamily: "monospace" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
            <button 
              type="submit" 
              className="admin-btn primary"
              style={{ minWidth: "220px", padding: "12px 24px", fontSize: "14px" }}
              disabled={isSaving}
            >
              <Check size={16} strokeWidth={2.5} /> Save & Broadcast Everywhere
            </button>
          </div>
        </form>


        {/* ========================================================
            RIGHT COLUMN: REAL-TIME INTERACTIVE MULTI-SURFACE PREVIEW
           ======================================================== */}
        <div className="admin-preview-pane" style={{ position: "sticky", top: "20px" }}>
          <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #ebd8c5", boxShadow: "0 4px 20px rgba(43,23,13,0.04)" }}>
            
            {/* Preview Controls Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #f0e2d3" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Eye size={16} color="#7a320c" />
                <strong style={{ fontSize: "14px", color: "#2b170d" }}>Live Storefront Previews</strong>
              </div>

              {/* Desktop vs Mobile Toggle */}
              <div style={{ display: "flex", background: "#f5eee6", padding: "3px", borderRadius: "8px" }}>
                <button
                  type="button"
                  onClick={() => setPreviewMode("desktop")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: previewMode === "desktop" ? "#ffffff" : "transparent",
                    color: previewMode === "desktop" ? "#7a320c" : "#8c7a6e",
                    boxShadow: previewMode === "desktop" ? "0 2px 5px rgba(0,0,0,0.06)" : "none"
                  }}
                >
                  <Monitor size={13} /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: previewMode === "mobile" ? "#ffffff" : "transparent",
                    color: previewMode === "mobile" ? "#7a320c" : "#8c7a6e",
                    boxShadow: previewMode === "mobile" ? "0 2px 5px rgba(0,0,0,0.06)" : "none"
                  }}
                >
                  <Smartphone size={13} /> Mobile
                </button>
              </div>
            </div>

            {/* Container for simulation */}
            <div style={{
              maxWidth: previewMode === "mobile" ? "360px" : "100%",
              margin: "0 auto",
              background: "#fdfbf7",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #ebd8c5",
              display: "flex",
              flexDirection: "column",
              gap: "18px"
            }}>

              {/* 1. TOP PROMO STRIP PREVIEW */}
              <div>
                <span style={{ fontSize: "11px", color: "#8c7a6e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                  1. Top Announcement Bar
                </span>
                <div style={{
                  background: activeOffer.backgroundColor || "#2b170d",
                  color: activeOffer.textColor || "#fbf5ef",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🎁</span>
                    <strong>{activeOffer.title}</strong>
                    <span style={{ color: activeOffer.accentColor }}>({activeOffer.couponCode})</span>
                  </div>
                  {activeOffer.timerEnabled && (
                    <span style={{ fontSize: "11px", color: activeOffer.accentColor, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {pad(d)}d:{pad(h)}h:{pad(m)}m:{pad(s)}s
                    </span>
                  )}
                </div>
              </div>

              {/* 2. HOME HERO PROMOTIONAL BANNER PREVIEW */}
              {activeOffer.heroEnabled && (
                <div>
                  <span style={{ fontSize: "11px", color: "#8c7a6e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                    2. Home Hero Offer Banner
                  </span>
                  <div style={{
                    background: `linear-gradient(135deg, ${activeOffer.backgroundColor || "#2b170d"} 0%, #150904 100%)`,
                    color: activeOffer.textColor || "#fbf5ef",
                    border: `1px solid ${activeOffer.borderColor || "#4b2614"}`,
                    borderRadius: "12px",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "10px", color: activeOffer.accentColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        ✨ FESTIVAL BLESSINGS
                      </span>
                      {activeOffer.timerEnabled && (
                        <div style={{ display: "flex", gap: "3px", fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: "10px", color: activeOffer.accentColor, fontVariantNumeric: "tabular-nums" }}>
                          <span style={{ background: "rgba(0,0,0,0.4)", padding: "2px 4px", borderRadius: "3px" }}>{pad(d)}d</span>:
                          <span style={{ background: "rgba(0,0,0,0.4)", padding: "2px 4px", borderRadius: "3px" }}>{pad(h)}h</span>:
                          <span style={{ background: "rgba(0,0,0,0.4)", padding: "2px 4px", borderRadius: "3px" }}>{pad(m)}m</span>:
                          <span style={{ background: "rgba(0,0,0,0.4)", padding: "2px 4px", borderRadius: "3px" }}>{pad(s)}s</span>
                        </div>
                      )}
                    </div>

                    <h4 style={{ margin: 0, fontSize: "18px", color: activeOffer.textColor }}>
                      🎁 {activeOffer.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: "12px", color: `${activeOffer.textColor}cc` }}>
                      {activeOffer.subtitle}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                      <span style={{
                        background: "rgba(255,255,255,0.12)",
                        border: `1px dashed ${activeOffer.accentColor}`,
                        color: activeOffer.accentColor,
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 700
                      }}>
                        CODE: {activeOffer.couponCode}
                      </span>

                      <span style={{
                        background: activeOffer.buttonColor || "#c89b3c",
                        color: "#110c08",
                        padding: "4px 10px",
                        borderRadius: "14px",
                        fontSize: "11px",
                        fontWeight: 700
                      }}>
                        Shop Now →
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PRODUCT DETAIL OFFER CARD PREVIEW */}
              {activeOffer.productPageEnabled && (
                <div>
                  <span style={{ fontSize: "11px", color: "#8c7a6e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                    3. Product Detail Page Offer Card
                  </span>
                  <div style={{
                    background: `linear-gradient(135deg, ${activeOffer.backgroundColor || "#2b170d"} 0%, #150904 100%)`,
                    border: `1px solid ${activeOffer.borderColor || "#4b2614"}`,
                    color: activeOffer.textColor || "#fbf5ef",
                    borderRadius: "10px",
                    padding: "12px",
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    <div style={{ height: "2px", background: `linear-gradient(90deg, ${activeOffer.accentColor}, #f5c382, ${activeOffer.accentColor})`, position: "absolute", top: 0, left: 0, right: 0 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "10px", color: activeOffer.accentColor, fontWeight: 700 }}>
                        ✦ EXCLUSIVE STORE OFFER
                      </span>
                      {activeOffer.timerEnabled && (
                        <span style={{ fontSize: "10px", color: `${activeOffer.textColor}aa`, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontVariantNumeric: "tabular-nums" }}>
                          Ends: {pad(d)}d : {pad(h)}h : {pad(m)}m : {pad(s)}s
                        </span>
                      )}
                    </div>
                    <strong style={{ fontSize: "14px", color: activeOffer.textColor, display: "block" }}>
                      Save Extra <span style={{ color: activeOffer.accentColor }}>{activeOffer.title}</span>
                    </strong>
                    <span style={{ fontSize: "11.5px", color: `${activeOffer.textColor}bb`, display: "block", marginTop: "2px" }}>
                      Use code <strong style={{ color: activeOffer.accentColor }}>{activeOffer.couponCode}</strong> at checkout
                    </span>
                    <button type="button" style={{
                      marginTop: "8px",
                      width: "100%",
                      background: activeOffer.buttonColor || "#c89b3c",
                      border: "none",
                      color: "#110c08",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      padding: "6px",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}>
                      Copy Code
                    </button>
                  </div>
                </div>
              )}

              {/* 4. PRODUCT CARD OFFER BADGE & FLOATING CARD */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "10.5px", color: "#8c7a6e", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    4. Product Card Badge
                  </span>
                  <div style={{
                    background: activeOffer.badgeColor || "#7a320c",
                    color: activeOffer.textColor || "#ffffff",
                    border: `1px solid ${activeOffer.accentColor}50`,
                    borderRadius: "6px",
                    padding: "6px 8px",
                    display: "inline-flex",
                    flexDirection: "column",
                    gap: "2px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700 }}>
                      <span>🎁</span> <span>{activeOffer.title}</span>
                    </div>
                    <span style={{ fontSize: "9px", color: activeOffer.accentColor, fontWeight: 700, background: "rgba(255,255,255,0.12)", padding: "1px 4px", borderRadius: "3px", textAlign: "center" }}>
                      {activeOffer.couponCode}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "10.5px", color: "#8c7a6e", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    5. Scroll Floating Offer
                  </span>
                  <div style={{
                    background: activeOffer.backgroundColor || "#2b170d",
                    color: activeOffer.textColor || "#ffffff",
                    border: `1px solid ${activeOffer.accentColor}60`,
                    borderRadius: "8px",
                    padding: "6px 8px",
                    fontSize: "11px",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: activeOffer.accentColor, fontWeight: 700 }}>
                      <span>🎁 {activeOffer.title}</span>
                      <span style={{ color: `${activeOffer.textColor}60` }}>×</span>
                    </div>
                    <span style={{ fontSize: "9.5px", color: activeOffer.textColor, display: "block" }}>
                      Code: <strong>{activeOffer.couponCode}</strong>
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

        {/* ========================================================
            HOME BANNER DEALS (General Offers list)
           ======================================================== */}
        <div style={{ marginBottom: "8px" }}>
          <div className="admin-card" style={{ background: "#ffffff", border: "1px solid #ebd8c5", borderRadius: "16px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ fontSize: "16px", color: "#2b170d", margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Gift size={18} color="#7a320c" /> Home Banner Deals
                </h3>
                <p style={{ margin: 0, fontSize: "12.5px", color: "#8c7a6e" }}>
                  Deal cards shown in the Home "Shop by Category" area. Synced to the storefront instantly.
                </p>
              </div>
              <button type="button" className="admin-btn" style={{ background: "#a54d2b", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 16px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }} onClick={() => openDealEditor(null)}>
                <Plus size={15} /> Add Deal
              </button>
            </div>

            {offers.length === 0 ? (
              <p style={{ color: "#806f62", fontSize: "13px", fontStyle: "italic", margin: 0 }}>
                No home banner deals yet. Deals created here appear on the customer home page.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[...offers].sort((a, b) => (a.order || 0) - (b.order || 0)).map(o => (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 14px", border: "1px solid #f0e2d3", borderRadius: "10px", background: "#fdfbf7", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "180px" }}>
                      <b style={{ fontSize: "14px", color: "#2b170d", display: "block" }}>{o.title}</b>
                      <small style={{ color: "#806f62", fontSize: "12px" }}>
                        {o.type || ""} {Number(o.discountValue) > 0 ? `• ${o.discountValue}${(o.type || "").toLowerCase() === "percentage" ? "%" : " OFF"}` : ""}
                        {o.couponCode ? ` • Code: ${o.couponCode}` : ""}
                        {o.expiry ? ` • Ends ${new Date(o.expiry).toLocaleDateString()}` : ""}
                      </small>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleDealToggleStatus(o)} 
                      title={`Click to turn ${o.status === "Active" ? "OFF (Inactive)" : "ON (Active)"}`}
                      style={{ 
                        padding: "4px 10px", 
                        borderRadius: "20px", 
                        fontSize: "11px", 
                        fontWeight: 600, 
                        border: `1px solid ${o.status === "Active" ? "#a7f3d0" : "#fecaca"}`,
                        background: o.status === "Active" ? "#e5f6ea" : "#ffebee", 
                        color: o.status === "Active" ? "#1d9450" : "#c62828",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: o.status === "Active" ? "#16a34a" : "#dc2626" }} />
                      {o.status === "Active" ? "Active (ON)" : "Inactive (OFF)"}
                    </button>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button type="button" title="Edit deal" onClick={() => openDealEditor(o)} style={{ display: "grid", placeItems: "center", width: "34px", height: "34px", borderRadius: "8px", border: "1px solid #dcd1c6", background: "#fff", cursor: "pointer", color: "#1565c0" }}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" title="Delete deal" onClick={() => setDeleteDealId(o.id)} style={{ display: "grid", placeItems: "center", width: "34px", height: "34px", borderRadius: "8px", border: "1px solid #f0c8c8", background: "#fff", cursor: "pointer", color: "#c62828" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>


      {/* HOME DEAL EDITOR MODAL */}
      {editingDeal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(43,23,13,0.45)", display: "grid", placeItems: "center", zIndex: 1000, padding: "16px" }} onClick={() => setEditingDeal(null)}>
          <form onSubmit={handleDealSave} onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "560px", background: "#fff", borderRadius: "16px", padding: "24px", maxHeight: "88vh", overflowY: "auto", border: "1px solid #ebd8c5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#2b170d" }}>{editingDeal.id && offers.some(o => o.id === editingDeal.id) ? "Edit Home Deal" : "New Home Deal"}</h3>
              <button type="button" onClick={() => setEditingDeal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#806f62" }}>
                <X size={20} />
              </button>
            </div>

            {dealError && (
              <div style={{ background: "#ffebee", color: "#c62828", padding: "10px 12px", borderRadius: "8px", marginBottom: "14px", fontSize: "12.5px" }}>⚠️ {dealError}</div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Title *</label>
                <input type="text" value={editingDeal.title} onChange={e => setEditingDeal({ ...editingDeal, title: e.target.value })} placeholder="e.g. Flat 20% OFF" style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box" }} />
              </div>
              <div className="form-group">
                <label>Label</label>
                <input type="text" value={editingDeal.label || ""} onChange={e => setEditingDeal({ ...editingDeal, label: e.target.value })} placeholder="e.g. Special Offer" style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box" }} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" value={editingDeal.description || ""} onChange={e => setEditingDeal({ ...editingDeal, description: e.target.value })} placeholder="e.g. On All Rudraksha" style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box" }} />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={editingDeal.type || "Percentage"} onChange={e => setEditingDeal({ ...editingDeal, type: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box" }}>
                  <option value="Percentage">Percentage</option>
                  <option value="Flat Amount">Flat Amount</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Feature">Feature (non-discount)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Discount Value</label>
                <input type="number" min="0" value={editingDeal.discountValue || 0} onChange={e => setEditingDeal({ ...editingDeal, discountValue: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box" }} />
              </div>
              <div className="form-group">
                <label>Coupon Code (optional)</label>
                <input type="text" value={editingDeal.couponCode || ""} onChange={e => setEditingDeal({ ...editingDeal, couponCode: e.target.value.toUpperCase() })} placeholder="e.g. AURA20" style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box", textTransform: "uppercase" }} />
              </div>
              <div className="form-group">
                <label>Button Text</label>
                <input type="text" value={editingDeal.buttonText || ""} onChange={e => setEditingDeal({ ...editingDeal, buttonText: e.target.value })} placeholder="Shop Now" style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box" }} />
              </div>
              <div className="form-group">
                <label>Link</label>
                <input type="text" value={editingDeal.link || ""} onChange={e => setEditingDeal({ ...editingDeal, link: e.target.value })} placeholder="/shop" style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box" }} />
              </div>
              <div className="form-group">
                <label>Display Order</label>
                <input type="number" value={editingDeal.order || 0} onChange={e => setEditingDeal({ ...editingDeal, order: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box" }} />
              </div>

              <div className="form-group">
                <label>Start Date (optional)</label>
                <input type="datetime-local" value={editingDeal.startDate || ""} onChange={e => setEditingDeal({ ...editingDeal, startDate: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box" }} />
              </div>
              <div className="form-group">
                <label>Expiry (optional)</label>
                <input type="datetime-local" value={editingDeal.expiry || ""} onChange={e => setEditingDeal({ ...editingDeal, expiry: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box" }} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={editingDeal.status || "Active"} onChange={e => setEditingDeal({ ...editingDeal, status: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px", boxSizing: "border-box" }}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button type="button" onClick={() => setEditingDeal(null)} className="admin-btn" style={{ background: "#fff", color: "#3b322c", border: "1px solid #dcd1c6", borderRadius: "8px", padding: "9px 16px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button type="submit" className="admin-btn" style={{ background: "#a54d2b", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 16px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}><Check size={15} /> Save Deal</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteDealId}
        title="Delete Home Banner Deal?"
        message="Are you sure you want to delete this deal? It will no longer appear on your store."
        confirmText="Delete Deal"
        onConfirm={confirmDeleteDeal}
        onClose={() => setDeleteDealId(null)}
      />
    </AdminLayout>
  );
}
