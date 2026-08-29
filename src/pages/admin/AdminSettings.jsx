import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { Save, Instagram, Facebook, Youtube, Share2, FileText, Truck, RotateCcw, ShieldCheck, Headphones, Star, ArrowRight } from "lucide-react";
import "./admin-pages.css";

export function AdminSettings() {
  const [settings, setSettings] = useState(() => db.getSettings());
  const [policies, setPolicies] = useState(() => db.getPolicies());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load live settings from MongoDB on mount
    db.fetchSettings().then(() => {
      setSettings(db.getSettings());
      setPolicies(db.getPolicies());
    });
    const unsub = onStoreUpdate(() => {
      setSettings(db.getSettings());
      setPolicies(db.getPolicies());
    });
    return () => unsub();
  }, []);

  const updateSettings = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const updatePolicy = (key, value) => setPolicies((current) => ({ ...current, [key]: value }));

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
          <p className="admin-page-subtitle">Update store contact info, social links, and centralized store policies.</p>
        </div>
      </div>
      <form onSubmit={handleSave} className="admin-card">
        <h2 className="admin-section-heading">Store Information</h2>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="storeName">Store Name</label>
            <input id="storeName" value={settings.storeName || ""} onChange={(e) => updateSettings("storeName", e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="supportEmail">Support Email</label>
            <input id="supportEmail" type="email" value={settings.supportEmail || ""} onChange={(e) => updateSettings("supportEmail", e.target.value)} />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="supportPhone">Support Phone</label>
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

        <h2 className="admin-section-heading" style={{ marginTop: "24px" }}>Admin Access</h2>
        <div className="admin-form-group">
          <label>Admin Email</label>
          <input value={"rohitjangir8740@gmail.com"} disabled />
          <small className="admin-help">This email is authorized to access the admin dashboard.</small>
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
