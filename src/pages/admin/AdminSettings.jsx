import { getProductPrimaryImage, getProductGalleryImages } from "../../lib/imageUtils";
import { getProductRoute } from "../../lib/routes";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { Save, Instagram, Facebook, Youtube, Share2, FileText, Truck, RotateCcw, ShieldCheck, Headphones, Star, ArrowRight, Search, CheckCircle2, PackageCheck, CreditCard, Banknote, Megaphone } from "lucide-react";
import "./admin-pages.css";

export function AdminSettings() {
  const [settings, setSettings] = useState(() => db.getSettings());
  const [policies, setPolicies] = useState(() => db.getPolicies());
  const [tickets, setTickets] = useState([]);
  const [products, setProducts] = useState(() => db.getProducts());
  const [prodSearch, setProdSearch] = useState("");
  const [savingProdId, setSavingProdId] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load live settings & tickets from MongoDB on mount
    db.fetchSettings().then(() => {
      setSettings(db.getSettings());
      setPolicies(db.getPolicies());
    });
    db.fetchTickets().then(() => {
      setTickets(db.getTickets());
    });
    db.fetchProducts().then(() => {
      setProducts(db.getProducts());
    });

    const unsub = onStoreUpdate(() => {
      setSettings(db.getSettings());
      setPolicies(db.getPolicies());
      setTickets(db.getTickets());
      setProducts(db.getProducts());
    });
    return () => unsub();
  }, []);

  const updateSettings = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const updatePolicy = (key, value) => setPolicies((current) => ({ ...current, [key]: value }));

  const handleInstantToggleSetting = async (key, nextValue, label) => {
    const updated = { ...settings, [key]: nextValue };
    setSettings(updated);
    try {
      await db.saveSettings(updated);
      emitToast(`${label} turned ${nextValue ? "ON" : "OFF"} successfully!`, "success");
    } catch (err) {
      emitToast(err.message || `Failed to update ${label}`, "error");
    }
  };

  const handleTicketStatusChange = async (id, status) => {
    const t = tickets.find(x => x.id === id);
    if (t) {
      try {
        await db.saveTicket({ ...t, status });
        emitToast(`Ticket #${id} status updated to ${status}`, "success");
        setTickets(db.getTickets());
      } catch (err) {
        emitToast(err.message || "Failed to update ticket status", "error");
      }
    }
  };

  const getBadgeClass = (status) => {
    switch (status) {
      case "Resolved": return "success";
      case "Closed": return "muted";
      case "Cancelled": return "error";
      case "Pending / In Progress":
      case "In Progress":
      case "Pending": return "info";
      default: return "warning";
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      await db.saveSettings(settings);
      await db.savePolicies(policies);
      setSaved(true);
      emitToast("Store settings & customer care policies saved successfully!", "success");
      window.setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      emitToast(err.message || "Failed to save settings to database", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <div>
          <h1>Store Settings & Customer Care</h1>
          <p className="admin-page-subtitle">Update store contact info, support email, social links, policies, and track support tickets.</p>
        </div>
      </div>
      <form onSubmit={handleSave} className="admin-card">
        <h2 className="admin-section-heading">Store Information & Customer Support Email</h2>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="storeName">Store Name</label>
            <input id="storeName" value={settings.storeName || ""} onChange={(e) => updateSettings("storeName", e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="supportEmail">Customer Support Gmail ID (Official Email)</label>
            <input 
              id="supportEmail" 
              type="email" 
              required
              placeholder="aurarudrakshaofficial@gmail.com"
              value={settings.supportEmail ?? ""} 
              onChange={(e) => updateSettings("supportEmail", e.target.value)} 
            />
            <small style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", display: "block" }}>
              This Gmail ID receives all customer inquiries and is displayed across store policies & contact pages.
            </small>
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="supportPhone">Support Phone / WhatsApp</label>
            <input id="supportPhone" value={settings.supportPhone || ""} onChange={(e) => updateSettings("supportPhone", e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="currency">Currency</label>
            <select id="currency" value={settings.currency || "INR"} onChange={(e) => updateSettings("currency", e.target.value)}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>

        {/* 💳 PAYMENT METHODS CONTROL (ONLINE PAYMENT & CASH ON DELIVERY - COD) */}
        <div style={{ marginTop: "32px", borderTop: "2px solid var(--line)", paddingTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 className="admin-section-heading" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "18px", color: "#2b170d" }}>
                <CreditCard size={20} color="#a54d2b" /> Payment Methods: Online & Cash on Delivery (COD ऑन/ऑफ कंट्रोल)
              </h2>
              <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "4px 0 0" }}>
                Both Online Payment and Cash on Delivery (COD) are enabled by default. Turn either payment mode ON or OFF anytime.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "18px" }}>
            {/* Cash on Delivery (COD) Toggle Card */}
            <div
              style={{
                background: settings.enableCod !== false ? "#f0fdf4" : "#fef2f2",
                border: `1.5px solid ${settings.enableCod !== false ? "#86efac" : "#fecaca"}`,
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <Banknote size={22} color={settings.enableCod !== false ? "#15803d" : "#b91c1c"} style={{ marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "15px", color: "#2b170d", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span>Cash on Delivery (COD)</span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "2px 8px",
                          borderRadius: "99px",
                          background: settings.enableCod !== false ? "#15803d" : "#b91c1c",
                          color: "#ffffff"
                        }}
                      >
                        {settings.enableCod !== false ? "ACTIVE (ON)" : "DISABLED (OFF)"}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#574a40", margin: "4px 0 0", lineHeight: "1.4" }}>
                      Allow customers to place Cash on Delivery (कैश ऑन डिलीवरी) orders and pay at their doorstep.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInstantToggleSetting("enableCod", settings.enableCod === false, "Cash on Delivery (COD)")}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "99px",
                    border: "none",
                    fontWeight: "800",
                    fontSize: "12px",
                    cursor: "pointer",
                    background: settings.enableCod !== false ? "#16a34a" : "#dc2626",
                    color: "#ffffff",
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
                  }}
                >
                  {settings.enableCod !== false ? "Turn OFF" : "Turn ON"}
                </button>
              </div>

              <div style={{ borderTop: "1px dashed rgba(0,0,0,0.1)", paddingTop: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <label htmlFor="codFee" style={{ fontSize: "12px", fontWeight: "700", color: "#2b170d", margin: 0 }}>
                  Optional Extra COD Handling Charge (₹):
                </label>
                <input
                  id="codFee"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={settings.codFee ?? 0}
                  onChange={(e) => updateSettings("codFee", Math.max(0, Number(e.target.value) || 0))}
                  style={{
                    width: "90px",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "700",
                    background: "#ffffff"
                  }}
                />
              </div>
            </div>

            {/* Online Payment Toggle Card */}
            <div
              style={{
                background: settings.enableOnlinePayment !== false ? "#fdf8f2" : "#fef2f2",
                border: `1.5px solid ${settings.enableOnlinePayment !== false ? "#d4a373" : "#fecaca"}`,
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <CreditCard size={22} color={settings.enableOnlinePayment !== false ? "#9d5a2b" : "#b91c1c"} style={{ marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "15px", color: "#2b170d", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span>Online Payment (UPI / Cards)</span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "2px 8px",
                          borderRadius: "99px",
                          background: settings.enableOnlinePayment !== false ? "#9d5a2b" : "#b91c1c",
                          color: "#ffffff"
                        }}
                      >
                        {settings.enableOnlinePayment !== false ? "ACTIVE (ON)" : "DISABLED (OFF)"}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#574a40", margin: "4px 0 0", lineHeight: "1.4" }}>
                      Accept instant prepaid payments via PayU Gateway (UPI, GPay, PhonePe, Paytm, Cards, NetBanking).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInstantToggleSetting("enableOnlinePayment", settings.enableOnlinePayment === false, "Online Payment")}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "99px",
                    border: "none",
                    fontWeight: "800",
                    fontSize: "12px",
                    cursor: "pointer",
                    background: settings.enableOnlinePayment !== false ? "#9d5a2b" : "#dc2626",
                    color: "#ffffff",
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
                  }}
                >
                  {settings.enableOnlinePayment !== false ? "Turn OFF" : "Turn ON"}
                </button>
              </div>
              <div style={{ borderTop: "1px dashed rgba(0,0,0,0.1)", paddingTop: "10px", fontSize: "11.5px", color: "#6e5a4c" }}>
                ✅ Default: Both <b>Online Payment</b> and <b>COD</b> stay ON so customers can choose either at checkout.
              </div>
            </div>
          </div>
        </div>

        {/* 📢 META ADS (FACEBOOK & INSTAGRAM PIXEL) CONFIGURATION */}
        <div style={{ marginTop: "28px", borderTop: "2px solid var(--line)", paddingTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 className="admin-section-heading" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "18px", color: "#2b170d" }}>
                <Megaphone size={20} color="#1877F2" /> Meta Ads & Facebook / Instagram Pixel (मेटा विज्ञापन ट्रैकिंग)
              </h2>
              <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "4px 0 0" }}>
                Automatically tracks <b>PageView</b>, <b>ViewContent</b>, <b>AddToCart</b>, <b>InitiateCheckout</b>, and <b>Purchase</b> (both Online & COD) for high-ROAS Meta Ads campaigns.
              </p>
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="metaPixelId" style={{ fontWeight: "700" }}>Meta Pixel ID (Dataset ID)</label>
              <input
                id="metaPixelId"
                type="text"
                placeholder="e.g. 123456789012345"
                value={settings.metaPixelId || ""}
                onChange={(e) => updateSettings("metaPixelId", e.target.value.trim())}
              />
              <small style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", display: "block" }}>
                Paste your 15-16 digit Meta Pixel ID from Meta Events Manager. Click Save Settings below to activate.
              </small>
            </div>

            <div className="admin-form-group" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "13.5px", color: "#2b170d", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings.metaPixelEnabled !== false}
                  onChange={(e) => handleInstantToggleSetting("metaPixelEnabled", e.target.checked, "Meta Pixel Tracking")}
                />
                <span>Enable Meta Ads Conversion Tracking & Attribution (fbclid / UTM)</span>
              </label>
              <small style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", marginLeft: "24px", display: "block" }}>
                Guest checkout without forced login is active so visitors from Instagram/Facebook ads can buy via COD or Online in 1 step.
              </small>
            </div>
          </div>
        </div>

        {/* 🚚 SHIPPING CHARGES & DELIVERY CONFIGURATION */}
        <div style={{ marginTop: "32px", borderTop: "2px solid var(--line)", paddingTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 className="admin-section-heading" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "18px", color: "#2b170d" }}>
                <Truck size={20} color="#a54d2b" /> Shipping Charges & Delivery Rules (शिपिंग शुल्क नियम)
              </h2>
              <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "4px 0 0" }}>
                Control storewide free shipping defaults, minimum order price thresholds, and custom per-product shipping rules.
              </p>
            </div>
          </div>

          {/* Current Live Status Banner */}
          {((settings.freeShippingThreshold ?? 0) === 0 && (settings.standardShippingFee ?? 0) === 0) ? (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
              <PackageCheck size={24} color="#16a34a" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: "#15803d", fontSize: "14px", display: "block" }}>
                  🎉 ACTIVE RULE: DEFAULT FREE SHIPPING ON ALL ORDERS (सभी ऑर्डर पर फ्री डिलीवरी)
                </strong>
                <span style={{ fontSize: "12px", color: "#166534" }}>
                  Customers will not be charged any shipping fee for any order amount across India.
                </span>
              </div>
            </div>
          ) : (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
              <Truck size={24} color="#d97706" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: "#b45309", fontSize: "14px", display: "block" }}>
                  🚚 CUSTOM THRESHOLD: Orders below ₹{settings.freeShippingThreshold ?? 0} charge ₹{settings.standardShippingFee ?? 0}
                </strong>
                <span style={{ fontSize: "12px", color: "#92400e" }}>
                  Free shipping is automatically unlocked on cart orders ₹{settings.freeShippingThreshold ?? 0} or above.
                </span>
              </div>
            </div>
          )}

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="standardShippingFee" style={{ fontWeight: "700" }}>Standard Shipping Fee (₹)</label>
              <input 
                id="standardShippingFee" 
                type="number" 
                min="0"
                placeholder="0"
                value={settings.standardShippingFee ?? 0} 
                onChange={(e) => updateSettings("standardShippingFee", Number(e.target.value) || 0)} 
              />
              <small style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", display: "block" }}>
                Set to <b>₹0</b> for default Free Shipping. If set (e.g., ₹50), this fee applies to orders below threshold.
              </small>
            </div>

            <div className="admin-form-group">
              <label htmlFor="freeShippingThreshold" style={{ fontWeight: "700" }}>Free Shipping Minimum Order Price (₹)</label>
              <input 
                id="freeShippingThreshold" 
                type="number" 
                min="0"
                placeholder="0"
                value={settings.freeShippingThreshold ?? 0} 
                onChange={(e) => updateSettings("freeShippingThreshold", Number(e.target.value) || 0)} 
              />
              <small style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", display: "block" }}>
                Set to <b>₹0</b> for FREE shipping on ALL orders. Set e.g. <b>₹499</b> to grant free shipping on orders ₹499+.
              </small>
            </div>
          </div>

          <div style={{ background: "#fcfaf7", border: "1px solid #e7dcce", borderRadius: "10px", padding: "14px", marginTop: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "13.5px", color: "#2b170d", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={settings.enableProductShipping !== false} 
                onChange={(e) => updateSettings("enableProductShipping", e.target.checked)} 
              />
              <span>Enable Product-Specific Custom Shipping Fees (उत्पाद-विशिष्ट डिलीवरी शुल्क)</span>
            </label>
            <p style={{ margin: "4px 0 0 26px", fontSize: "11.5px", color: "#6e5d50" }}>
              Allows you to set individual custom shipping charges per item (e.g. Heavy Idols or Brass Sets) while keeping rest of store on default rules.
            </p>
          </div>

          {/* PER-PRODUCT QUICK OVERVIEW & EDIT TABLE */}
          {settings.enableProductShipping !== false && (
            <div style={{ marginTop: "20px", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
              <div style={{ padding: "12px 16px", background: "#fdf8f3", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <strong style={{ fontSize: "13px", color: "#2b170d", display: "flex", alignItems: "center", gap: "6px" }}>
                  📦 Per-Product Shipping Rules ({products.length} Products)
                </strong>
                <div style={{ position: "relative", minWidth: "200px" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#8c7d72" }} />
                  <input 
                    type="text" 
                    placeholder="Search product..." 
                    value={prodSearch} 
                    onChange={e => setProdSearch(e.target.value)} 
                    style={{ padding: "5px 10px 5px 30px", borderRadius: "6px", border: "1px solid #dcd1c6", fontSize: "12px", width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#fcfaf8", borderBottom: "1px solid #e7dcce", textAlign: "left", color: "#6e5d50" }}>
                      <th style={{ padding: "8px 12px" }}>Product</th>
                      <th style={{ padding: "8px 12px" }}>Price</th>
                      <th style={{ padding: "8px 12px" }}>Shipping Rule</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products
                      .filter(p => !prodSearch || p.name.toLowerCase().includes(prodSearch.toLowerCase()))
                      .slice(0, 8)
                      .map(p => {
                        const isFree = p.freeShipping !== false;
                        return (
                          <tr key={p.id} style={{ borderBottom: "1px solid #f0e6da" }}>
                            <td style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                              <img src={getProductPrimaryImage(p)} alt={p.name} style={{ width: "28px", height: "28px", objectFit: "cover", borderRadius: "4px" }} />
                              <span style={{ fontWeight: "600", color: "#2b170d" }}>{p.name}</span>
                            </td>
                            <td style={{ padding: "8px 12px" }}>₹{p.price?.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "8px 12px" }}>
                              {isFree ? (
                                <span style={{ color: "#16a34a", fontWeight: "700", background: "#f0fdf4", padding: "2px 8px", borderRadius: "12px" }}>
                                  🚚 FREE Shipping
                                </span>
                              ) : (
                                <span style={{ color: "#d97706", fontWeight: "700", background: "#fffbeb", padding: "2px 8px", borderRadius: "12px" }}>
                                  📦 +₹{p.shippingFee || 0} Charge
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "right" }}>
                              <Link to={`/admin/products?search=${encodeURIComponent(p.name)}`} style={{ fontSize: "11px", color: "#a54d2b", textDecoration: "none", fontWeight: "600" }}>
                                Edit in Products →
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* TICKET TRACKING SECTION IN SETTINGS */}
        <div style={{ marginTop: "32px", borderTop: "1px solid var(--line)", paddingTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 className="admin-section-heading" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <Headphones size={18} color="#a54d2b" /> Ticket Tracking & Support Inquiries
              </h2>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                Live overview of all customer tickets and their current status.
              </p>
            </div>
            <Link to="/admin/support" className="admin-btn secondary" style={{ textDecoration: "none", fontSize: "12px", padding: "6px 12px" }}>
              Go to Full Support Portal <ArrowRight size={13} />
            </Link>
          </div>

          {tickets.length === 0 ? (
            <div style={{ background: "#faf8f5", padding: "16px", borderRadius: "8px", border: "1px solid #ebdccb", fontSize: "13px", color: "#6b584c", textAlign: "center" }}>
              No support tickets found yet.
            </div>
          ) : (
            <div style={{ border: "1px solid var(--line)", borderRadius: "10px", overflowX: "auto", marginBottom: "24px" }}>
              <table className="admin-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Customer Name & Email</th>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Current Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => {
                    const st = t.status || "Open";
                    return (
                      <tr key={t.id}>
                        <td><b>{t.id}</b></td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#2b170d" }}>{t.name || "Devotee"}</div>
                          <div style={{ fontSize: "11px", color: "#806f62" }}>{t.email}</div>
                        </td>
                        <td><span style={{ fontSize: "12.5px" }}>{t.subject}</span></td>
                        <td><small>{new Date(t.date || t.createdAt || Date.now()).toLocaleDateString()}</small></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span className={`admin-badge ${getBadgeClass(st)}`}>
                              {st}
                            </span>
                            <select
                              value={st}
                              onChange={(e) => handleTicketStatusChange(t.id, e.target.value)}
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "3px 6px",
                                borderRadius: "6px",
                                border: "1px solid #dcd1c6",
                                background: "#ffffff",
                                cursor: "pointer"
                              }}
                            >
                              <option value="Open">Open</option>
                              <option value="Pending / In Progress">Pending / In Progress</option>
                              <option value="Resolved">Resolved</option>
                              <option value="Closed">Closed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <h2 className="admin-section-heading" style={{ marginTop: "28px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Share2 size={18} /> Social Media Links (Follow Aura)
        </h2>
        <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "16px" }}>
          These official platform links are displayed in the store footer.
        </p>
        <div className="admin-form-group">
          <label htmlFor="instagramUrl" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Instagram size={15} color="#E1306C" /> Instagram Page URL
          </label>
          <input
            id="instagramUrl"
            type="url"
            placeholder="https://instagram.com/aurarudraksha"
            value={settings.instagramUrl || ""}
            onChange={(e) => updateSettings("instagramUrl", e.target.value)}
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="facebookUrl" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Facebook size={15} color="#1877F2" /> Facebook Page URL
          </label>
          <input
            id="facebookUrl"
            type="url"
            placeholder="https://facebook.com/aurarudraksha"
            value={settings.facebookUrl || ""}
            onChange={(e) => updateSettings("facebookUrl", e.target.value)}
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="youtubeUrl" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Youtube size={15} color="#FF0000" /> YouTube Channel URL
          </label>
          <input
            id="youtubeUrl"
            type="url"
            placeholder="https://youtube.com/@aurarudraksha"
            value={settings.youtubeUrl || ""}
            onChange={(e) => updateSettings("youtubeUrl", e.target.value)}
          />
        </div>

        <h2 className="admin-section-heading" style={{ marginTop: "32px", borderTop: "1px solid var(--line)", paddingTop: "24px" }}>
          Centralized Customer Care & Policies
        </h2>
        <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "20px" }}>
          Edit policy text below. Changes instantly update the customer-facing Footer and Policies pages.
        </p>

        <div className="admin-form-group" style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
            <Truck size={16} color="#a54d2b" /> Shipping Policy
          </label>
          <textarea
            rows={4}
            value={policies.shippingPolicy || ""}
            onChange={(e) => updatePolicy("shippingPolicy", e.target.value)}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px" }}
          />
        </div>

        <div className="admin-form-group" style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
            <RotateCcw size={16} color="#a54d2b" /> Return & Refund Policy
          </label>
          <textarea
            rows={4}
            value={policies.returnPolicy || ""}
            onChange={(e) => updatePolicy("returnPolicy", e.target.value)}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px" }}
          />
        </div>

        <div className="admin-form-group" style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
            <ShieldCheck size={16} color="#a54d2b" /> Privacy Policy
          </label>
          <textarea
            rows={4}
            value={policies.privacyPolicy || ""}
            onChange={(e) => updatePolicy("privacyPolicy", e.target.value)}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px" }}
          />
        </div>

        <div className="admin-form-group" style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
            <FileText size={16} color="#a54d2b" /> Terms & Conditions
          </label>
          <textarea
            rows={4}
            value={policies.termsPolicy || ""}
            onChange={(e) => updatePolicy("termsPolicy", e.target.value)}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px" }}
          />
        </div>

        <div className="admin-form-group" style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
            <Headphones size={16} color="#a54d2b" /> Contact Support & Care
          </label>
          <textarea
            rows={4}
            value={policies.contactSupport || ""}
            onChange={(e) => updatePolicy("contactSupport", e.target.value)}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px" }}
          />
        </div>

        <h2 className="admin-section-heading" style={{ marginTop: "28px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Star size={18} color="#d97706" /> Customer Reviews & Testimonials
        </h2>
        <div style={{ background: "#fcf8f2", border: "1px solid #eadecd", borderRadius: "10px", padding: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <strong style={{ color: "#7a320c", fontSize: "14px", display: "block" }}>Devotee Reviews & Visual Experience</strong>
            <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#6e5d52" }}>
              Approve/reject submissions, reply officially as Aura team, toggle photo galleries, and customize review card styling.
            </p>
          </div>
          <Link to="/admin/reviews" className="admin-btn" style={{ textDecoration: "none" }}>
            <span>Manage Reviews</span> <ArrowRight size={14} />
          </Link>
        </div>

        <h2 className="admin-section-heading" style={{ marginTop: "24px" }}>Admin Access & Security</h2>
        <div className="admin-form-group">
          <label>Authorized Admin Emails</label>
          <input value={"rohitjangir9887@gmail.com, rohitjangir8740@gmail.com"} disabled />
          <small className="admin-help">These accounts and any designated MongoDB admin roles are authorized to access the Aura Admin Dashboard.</small>
        </div>
        
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn">
            {saved ? "Settings Saved ✓" : <><Save size={16} /> Save Settings & Policies</>}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
