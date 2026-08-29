import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { uploadMedia } from "../../lib/imageUtils";
import { emitToast } from "../../context/ToastContext";
import { ConfirmModal } from "../../components/ConfirmModal";
import { Plus, Pencil, Trash2, X, Upload, Link as LinkIcon, ArrowLeft, Eye, Copy, Smartphone, Monitor, CheckCircle, AlertTriangle, Calendar } from "lucide-react";
import "./admin-pages.css";

const blankPromotion = {
  title: "",
  subtitle: "",
  offer: "",
  couponCode: "",
  buttonText: "Shop Collection",
  link: "/shop",
  image: "",
  mobileImage: "",
  startDate: "",
  endDate: "",
  order: 0,
  active: true,
  badgeText: ""
};

export function AdminPromotions() {
  const [promotions, setPromotions] = useState([]);
  const [editing, setEditing] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewMode, setPreviewMode] = useState("desktop"); // desktop | mobile
  const [deleteId, setDeleteId] = useState(null);

  const load = () => setPromotions(db.getPromotions());
  useEffect(() => {
    load();
    const unsub = onStoreUpdate(load);
    return () => unsub();
  }, []);

  const handleFileUpload = async (e, field) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const compressed = await uploadMedia(file);
      if (compressed) {
        setEditing(prev => prev ? { ...prev, [field]: compressed } : prev);
        setErrorMsg("");
        emitToast("Image uploaded and compressed successfully!", "success");
      }
    } catch (err) {
      emitToast(err.message || "Failed to upload image", "error");
    }
    e.target.value = "";
  };

  const save = async (event) => {
    event.preventDefault();
    setErrorMsg("");

    if (!editing.title.trim()) {
      setErrorMsg("Campaign title is required.");
      return;
    }
    if (!editing.image || !editing.image.trim()) {
      setErrorMsg("Please provide a desktop banner image.");
      return;
    }

    const promoToSave = {
      ...editing,
      id: editing.id || `PROMO-${Date.now()}`,
      order: Number(editing.order) || 0
    };

    try {
      await db.savePromotion(promoToSave);
      emitToast("Campaign saved successfully!", "success");
      setEditing(null);
      load();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save promotion");
      emitToast(err.message || "Failed to save promotion", "error");
    }
  };

  const confirmDeletePromotion = async () => {
    if (!deleteId) return;
    try {
      await db.deletePromotion(deleteId);
      emitToast("Campaign deleted", "success");
      setDeleteId(null);
      load();
    } catch (err) {
      emitToast(err.message || "Failed to delete promotion", "error");
    }
  };

  const duplicate = async (promo) => {
    const dup = {
      ...promo,
      id: `PROMO-${Date.now()}`,
      title: `${promo.title} (Copy)`,
      order: (promo.order || 0) + 1
    };
    try {
      await db.savePromotion(dup);
      emitToast("Campaign duplicated successfully!", "success");
      load();
    } catch (err) {
      emitToast(err.message || "Failed to duplicate promotion", "error");
    }
  };

  const toggleStatus = async (promo) => {
    const updated = { ...promo, active: !promo.active };
    try {
      await db.savePromotion(updated);
      emitToast(`Campaign status updated to ${updated.active ? 'Active' : 'Inactive'}`, "success");
      load();
    } catch (err) {
      emitToast(err.message || "Failed to toggle promotion status", "error");
    }
  };

  const getStatusBadge = (promo) => {
    if (!promo.active) return <span className="admin-badge warning">Inactive</span>;
    const now = new Date();
    if (promo.startDate && new Date(promo.startDate) > now) {
      return <span className="admin-badge warning" style={{ background: '#fff3e0', color: '#e65100' }}>Scheduled</span>;
    }
    if (promo.endDate && new Date(promo.endDate) < now) {
      return <span className="admin-badge" style={{ background: '#ffebee', color: '#c62828' }}>Expired</span>;
    }
    return <span className="admin-badge success">Active</span>;
  };

  return (
    <AdminLayout>
      <Link to="/admin/banners" className="admin-back-link">
        <ArrowLeft size={16} /> Back to Home Content
      </Link>

      <div className="admin-page-header">
        <div>
          <h1>Promotion Studio</h1>
          <p className="admin-page-subtitle">Design, schedule, and preview high-conversion promotional campaigns for the customer store home.</p>
        </div>
        <button className="admin-btn" onClick={() => { setEditing({ ...blankPromotion }); setErrorMsg(""); }}>
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      {errorMsg && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Campaign Editor Modal / Form */}
      {editing && (
        <form className="admin-card" onSubmit={save} style={{ marginBottom: 30, border: '1.5px solid #a54d2b' }}>
          <div className="admin-card-title">
            <h2>{editing.id && promotions.some(p => p.id === editing.id) ? "Edit Promotional Campaign" : "New Promotional Campaign"}</h2>
            <button type="button" className="admin-icon-btn" onClick={() => setEditing(null)} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Campaign Title *</label>
              <input 
                required 
                value={editing.title} 
                onChange={(e) => setEditing({ ...editing, title: e.target.value })} 
                placeholder="e.g., Sacred Rudraksha Mahotsav" 
              />
            </div>
            <div className="admin-form-group">
              <label>Short Subtitle</label>
              <input 
                value={editing.subtitle} 
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} 
                placeholder="e.g., Flat 20% Off on 5 Mukhi & Malas" 
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Offer / Discount Text</label>
              <input 
                value={editing.offer} 
                onChange={(e) => setEditing({ ...editing, offer: e.target.value })} 
                placeholder="e.g., FLAT 20% OFF" 
              />
            </div>
            <div className="admin-form-group">
              <label>Coupon Code (Optional)</label>
              <input 
                value={editing.couponCode} 
                onChange={(e) => setEditing({ ...editing, couponCode: e.target.value })} 
                placeholder="e.g., AURA20" 
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>CTA Button Text</label>
              <input 
                value={editing.buttonText} 
                onChange={(e) => setEditing({ ...editing, buttonText: e.target.value })} 
                placeholder="Shop Collection" 
              />
            </div>
            <div className="admin-form-group">
              <label>CTA Destination Link</label>
              <input 
                value={editing.link} 
                onChange={(e) => setEditing({ ...editing, link: e.target.value })} 
                placeholder="/shop?category=malas" 
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Campaign Badge (Optional)</label>
              <input 
                value={editing.badgeText} 
                onChange={(e) => setEditing({ ...editing, badgeText: e.target.value })} 
                placeholder="e.g., Limited Edition • Best Seller" 
              />
            </div>
            <div className="admin-form-group">
              <label>Display Priority Order (Lower = First)</label>
              <input 
                type="number" 
                value={editing.order} 
                onChange={(e) => setEditing({ ...editing, order: e.target.value })} 
                placeholder="0" 
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label><Calendar size={14} /> Start Date & Time</label>
              <input 
                type="datetime-local" 
                value={editing.startDate || ""} 
                onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} 
              />
            </div>
            <div className="admin-form-group">
              <label><Calendar size={14} /> End Date & Time (Expiry)</label>
              <input 
                type="datetime-local" 
                value={editing.endDate || ""} 
                onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} 
              />
            </div>
          </div>

          <div className="admin-form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
            <input 
              type="checkbox" 
              id="active_check" 
              checked={editing.active} 
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })} 
              style={{ width: '18px', height: '18px', accentColor: '#a54d2b' }}
            />
            <label htmlFor="active_check" style={{ fontWeight: '600', cursor: 'pointer' }}>Active (Show on Customer Store Home)</label>
          </div>

          {/* DESKTOP & MOBILE BANNER IMAGES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div style={{ background: '#fdfbf7', padding: '16px', borderRadius: '10px', border: '1px solid #e8e0d8' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#2b170d', marginBottom: '8px', display: 'block' }}>
                Desktop Banner Image * (1200x400px)
              </label>
              {editing.image && (
                <div style={{ marginBottom: '10px' }}>
                  <img src={editing.image} alt="Desktop preview" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '6px' }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} style={{ fontSize: '11px' }} />
                <input 
                  type="url" 
                  value={editing.image} 
                  onChange={(e) => setEditing({ ...editing, image: e.target.value })} 
                  placeholder="Or paste Desktop image URL" 
                  style={{ fontSize: '12px', padding: '6px 8px' }} 
                />
              </div>
            </div>

            <div style={{ background: '#fdfbf7', padding: '16px', borderRadius: '10px', border: '1px solid #e8e0d8' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#2b170d', marginBottom: '8px', display: 'block' }}>
                Mobile Banner Image (Optional, 600x600px)
              </label>
              {editing.mobileImage && (
                <div style={{ marginBottom: '10px' }}>
                  <img src={editing.mobileImage} alt="Mobile preview" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '6px' }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'mobileImage')} style={{ fontSize: '11px' }} />
                <input 
                  type="url" 
                  value={editing.mobileImage} 
                  onChange={(e) => setEditing({ ...editing, mobileImage: e.target.value })} 
                  placeholder="Or paste Mobile image URL" 
                  style={{ fontSize: '12px', padding: '6px 8px' }} 
                />
              </div>
            </div>
          </div>

          {/* LIVE PREVIEW BOX */}
          <div style={{ marginTop: '25px', padding: '20px', background: '#f9f5f0', borderRadius: '12px', border: '1px solid #e8dac9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <b style={{ fontSize: '13px', color: '#7a320c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={16} /> Live Campaign Preview
              </b>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  type="button" 
                  onClick={() => setPreviewMode("desktop")}
                  style={{ padding: '5px 12px', background: previewMode === 'desktop' ? '#7a320c' : '#fff', color: previewMode === 'desktop' ? '#fff' : '#4a3b32', border: '1px solid #e8dac9', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Monitor size={14} /> Desktop
                </button>
                <button 
                  type="button" 
                  onClick={() => setPreviewMode("mobile")}
                  style={{ padding: '5px 12px', background: previewMode === 'mobile' ? '#7a320c' : '#fff', color: previewMode === 'mobile' ? '#fff' : '#4a3b32', border: '1px solid #e8dac9', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Smartphone size={14} /> Mobile
                </button>
              </div>
            </div>

            <div style={{
              maxWidth: previewMode === 'mobile' ? '360px' : '100%',
              margin: '0 auto',
              background: '#5d2b14',
              color: '#fff4e7',
              borderRadius: '12px',
              minHeight: '180px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}>
              {(previewMode === 'mobile' && editing.mobileImage) ? (
                <img src={editing.mobileImage} alt="Preview" style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
              ) : editing.image ? (
                <img src={editing.image} alt="Preview" style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
              ) : null}

              <div style={{ padding: '24px', zIndex: 1, maxWidth: '65%' }}>
                {editing.badgeText && (
                  <span style={{ fontSize: '9px', background: '#c88a3d', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', display: 'inline-block', marginBottom: '8px' }}>
                    {editing.badgeText}
                  </span>
                )}
                {editing.offer && <small style={{ fontSize: '10px', color: '#f5c382', fontWeight: '700', display: 'block' }}>{editing.offer}</small>}
                <h3 style={{ font: '600 22px "Cormorant Garamond"', margin: '4px 0 6px', color: '#fff' }}>
                  {editing.title || 'Campaign Title'}
                </h3>
                <p style={{ fontSize: '11px', margin: '0 0 14px', opacity: 0.9 }}>{editing.subtitle || 'Subtitle description'}</p>
                {editing.couponCode && (
                  <div style={{ fontSize: '10px', background: 'rgba(255,255,255,0.15)', padding: '4px 8px', borderRadius: '4px', width: 'max-content', marginBottom: '10px', fontFamily: 'monospace' }}>
                    Code: <b>{editing.couponCode}</b>
                  </div>
                )}
                <span style={{ background: '#fff', color: '#5d2b14', padding: '7px 14px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', display: 'inline-block' }}>
                  {editing.buttonText || 'Shop Now'} →
                </span>
              </div>
            </div>
          </div>

          <div className="admin-form-actions" style={{ marginTop: '20px' }}>
            <button type="button" onClick={() => setEditing(null)} className="admin-btn secondary" style={{ background: '#fff', border: '1px solid #dcd1c6', color: '#665a51' }}>
              Cancel
            </button>
            <button type="submit" className="admin-btn">
              Save Campaign
            </button>
          </div>
        </form>
      )}

      {/* Campaigns List Table */}
      {promotions.length === 0 ? (
        <div className="admin-empty">No promotional campaigns created yet. Click "Create Campaign" to begin.</div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Banner</th>
                <th>Campaign Title</th>
                <th>Offer / Code</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...promotions].sort((a,b)=>(a.order||0)-(b.order||0)).map(promo => (
                <tr key={promo.id}>
                  <td>
                    <img 
                      src={promo.image || "/images/product-5mukhi.jpg"} 
                      alt="" 
                      style={{ width: '60px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e8dac9' }} 
                    />
                  </td>
                  <td>
                    <b>{promo.title}</b>
                    <small style={{ display: 'block', color: '#806f62' }}>{promo.subtitle || promo.link}</small>
                  </td>
                  <td>
                    {promo.offer && <span style={{ fontSize: '11px', color: '#a54d2b', fontWeight: '700', display: 'block' }}>{promo.offer}</span>}
                    {promo.couponCode && <code style={{ fontSize: '10px', background: '#f5f0eb', padding: '2px 6px', borderRadius: '4px' }}>{promo.couponCode}</code>}
                  </td>
                  <td>{promo.order || 0}</td>
                  <td>{getStatusBadge(promo)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        onClick={() => toggleStatus(promo)} 
                        title={promo.active ? "Hide / Deactivate" : "Show / Activate"}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: promo.active ? '#20a95a' : '#806f62' }}
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button 
                        onClick={() => duplicate(promo)} 
                        title="Duplicate Campaign"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52473f' }}
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => setEditing(promo)} 
                        title="Edit Campaign"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1565c0' }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => setDeleteId(promo.id)} 
                        title="Delete Campaign"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d64b2e' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Promotional Campaign?"
        message="Are you sure you want to delete this promotional campaign? It will be removed from your storefront."
        confirmText="Delete Campaign"
        onConfirm={confirmDeletePromotion}
        onClose={() => setDeleteId(null)}
      />
    </AdminLayout>
  );
}
