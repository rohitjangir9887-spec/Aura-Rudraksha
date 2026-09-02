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
  const [tickets, setTickets] = useState([]);
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

    const unsub = onStoreUpdate(() => {
      setSettings(db.getSettings());
      setPolicies(db.getPolicies());
      setTickets(db.getTickets());
    });
    return () => unsub();
  }, []);

  const updateSettings = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const updatePolicy = (key, value) => setPolicies((current) => ({ ...current, [key]: value }));

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
              value={settings.supportEmail || "aurarudrakshaofficial@gmail.com"} 
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
