import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { ConfirmModal } from "../../components/ConfirmModal";
import { Edit, Trash2, Plus, ArrowLeft, Tag, Check, AlertCircle, ShoppingBag, ShieldAlert, RefreshCw } from "lucide-react";
import { AdminProductMultiSelector } from "../../components/admin/AdminProductMultiSelector";
import "./admin-pages.css";

export function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [editing, setEditing] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState("connected");

  useEffect(() => {
    load();
    const unsub = onStoreUpdate(() => {
      setCoupons(db.getCoupons() || []);
    });
    return () => unsub();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      if (db.fetchCoupons) {
        const fresh = await db.fetchCoupons();
        if (Array.isArray(fresh)) {
          setCoupons(fresh);
          setDbStatus("connected");
          setLoading(false);
          return;
        }
      }
      setDbStatus("connected");
    } catch (e) {
      console.warn("Failed fetching fresh coupons from MongoDB:", e);
      setDbStatus("offline");
    }
    setCoupons(db.getCoupons() || []);
    setLoading(false);
  };

  const isExpired = (c) => Boolean(c.expiry && new Date(c.expiry).getTime() < Date.now());
  const effectiveStatus = (c) => (c.status === "Active" && isExpired(c)) ? "Expired" : (c.status === "Disabled" ? "Inactive" : c.status || "Active");

  const handleStartEdit = (coupon) => {
    const isLinkedToOffer = (db.getOffers() || []).some(
      o => o.couponCode && String(o.couponCode).toUpperCase() === String(coupon.code).toUpperCase() && o.status === "Active"
    );
    setEditing({
      ...coupon,
      _originalCode: coupon.code,
      showOnHome: Boolean(coupon.showOnHome || isLinkedToOffer)
    });
    setErrorMsg("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const code = (editing.code || "").trim().toUpperCase();
    if (!code) {
      setErrorMsg("Coupon code cannot be empty.");
      return;
    }

    const discountVal = Number(editing.discount);
    if (isNaN(discountVal) || discountVal <= 0) {
      setErrorMsg("Discount value must be greater than 0.");
      return;
    }

    if (editing.type === "percentage" && (discountVal < 1 || discountVal > 100)) {
      setErrorMsg("Percentage discount must be between 1% and 100%.");
      return;
    }

    const savedCoupon = {
      ...editing,
      code: code,
      discount: discountVal,
      type: editing.type || "percentage",
      limit: editing.limit ? Number(editing.limit) : "",
      minAmount: editing.minAmount ? Number(editing.minAmount) : 0,
      maxDiscount: editing.maxDiscount ? Number(editing.maxDiscount) : 0,
      targetType: editing.targetType || "all",
      selectedProducts: editing.selectedProducts || [],
      excludedProducts: editing.excludedProducts || [],
      expiry: editing.expiry || null,
      status: editing.status || "Active",
      showOnHome: Boolean(editing.showOnHome)
    };

    try {
      setLoading(true);
      await db.saveCoupon(savedCoupon);

      const oldCode = editing._originalCode || code;

      // Sync to Home Banner if checked
      if (savedCoupon.showOnHome && savedCoupon.status === "Active") {
        const existingOffers = db.getOffers() || [];
        const existing = existingOffers.find(o => o.couponCode === code || o.couponCode === oldCode);
        const offerTitle = savedCoupon.type === 'fixed' ? `Flat ₹${discountVal} OFF` : `Flat ${discountVal}% OFF`;

        await db.saveOffer({
          id: existing ? existing.id : undefined,
          title: offerTitle,
          label: "Special Coupon Offer",
          description: `Use coupon code ${code} at checkout.`,
          buttonText: "Shop Now",
          link: "/shop",
          couponCode: code,
          type: savedCoupon.type === 'fixed' ? "Flat Amount" : "Percentage",
          discountValue: discountVal,
          shownOn: "Home Banner",
          status: "Active",
          image: existing?.image || "https://i.ibb.co/xKN0T46x/file-00000000b33082088625dc1f759658a4.png"
        });
      } else {
        // If unchecked or inactive, remove from home offers immediately
        const existingOffers = db.getOffers() || [];
        const existing = existingOffers.find(o => o.couponCode === code || o.couponCode === oldCode);
        if (existing) {
          try {
            await db.deleteOffer(existing.id);
          } catch (_) {}
        }
      }

      emitToast(editing.id ? "Coupon updated successfully" : "Coupon created successfully", "success");
      setEditing(null);
      await load();
    } catch (err) {
      emitToast(err.message || "Failed to save coupon to database", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteCoupon = async () => {
    if (!deleteId) return;
    try {
      const couponToDelete = (db.getCoupons() || []).find(c => c.id === deleteId || c._id === deleteId || c.code === deleteId);
      const codeToDelete = couponToDelete?.code ? String(couponToDelete.code).toUpperCase() : String(deleteId).toUpperCase();

      await db.deleteCoupon(deleteId);

      // Also remove any matching offers from home
      const existingOffers = db.getOffers() || [];
      for (const off of existingOffers) {
        if (off.couponCode && String(off.couponCode).toUpperCase() === codeToDelete) {
          try {
            await db.deleteOffer(off.id);
          } catch (_) {}
        }
      }

      emitToast("Coupon and associated home offers deleted successfully", "success");
      setDeleteId(null);
      setCoupons(db.getCoupons() || []);
      load();
    } catch (err) {
      emitToast(err.message || "Failed to delete coupon", "error");
    }
  };

  if (editing) {
    return (
      <AdminLayout>
        <button className="admin-back-link" onClick={() => setEditing(null)}>
          <ArrowLeft size={16} /> Back to Coupons
        </button>

        <div className="admin-page-header">
          <h1>{editing.id ? 'Edit Coupon' : 'Add New Coupon'}</h1>
        </div>

        {errorMsg && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="admin-card">
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Coupon Code *</label>
              <input 
                required 
                style={{ textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px' }} 
                value={editing.code} 
                onChange={e => {
                  setEditing({...editing, code: e.target.value.toUpperCase()});
                  setErrorMsg("");
                }} 
                placeholder="e.g. AURA10"
              />
            </div>

            <div className="admin-form-group">
              <label>Discount Type *</label>
              <select value={editing.type || "percentage"} onChange={e => setEditing({...editing, type: e.target.value})}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>
                Discount Value {editing.type === 'fixed' ? '(₹ Amount)' : '(1% - 100%)'} *
              </label>
              <input 
                required 
                type="number" 
                min="1"
                max={editing.type === 'percentage' ? "100" : undefined}
                value={editing.discount} 
                onChange={e => setEditing({...editing, discount: e.target.value})} 
                placeholder={editing.type === 'fixed' ? 'e.g. 200' : 'e.g. 15'}
              />
            </div>

            <div className="admin-form-group">
              <label>Usage Limit (Max Uses)</label>
              <input 
                type="number" 
                value={editing.limit || ''} 
                onChange={e => setEditing({...editing, limit: e.target.value})} 
                placeholder="Leave blank for unlimited" 
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Minimum Shopping Amount (₹) *</label>
              <input
                type="number"
                min="0"
                value={editing.minAmount !== undefined ? editing.minAmount : ''}
                onChange={e => setEditing({...editing, minAmount: e.target.value})}
                placeholder="e.g. 500 (Shopping kitne ki ho tb lage)"
              />
              <small className="admin-help">User ki total shopping is price se adhik ya barabar hone par hi coupon apply hoga.</small>
            </div>

            <div className="admin-form-group">
              <label>Maximum Discount Cap (₹) (Optional)</label>
              <input
                type="number"
                min="0"
                value={editing.maxDiscount !== undefined ? editing.maxDiscount : ''}
                onChange={e => setEditing({...editing, maxDiscount: e.target.value})}
                placeholder="e.g. 500 (Max off limit)"
              />
              <small className="admin-help">Percentage discount par maximum kitna discount mil sakta hai.</small>
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Expiry Date (optional)</label>
              <input
                type="datetime-local"
                value={editing.expiry ? editing.expiry.slice(0, 16) : ''}
                onChange={e => setEditing({...editing, expiry: e.target.value ? new Date(e.target.value).toISOString() : ''})}
              />
              <small className="admin-help">Coupons stop working automatically after this time.</small>
            </div>

            <div className="admin-form-group">
              <label>Coupon Status</label>
              <select value={effectiveStatus(editing) === "Expired" ? "Active" : (editing.status || "Active")} onChange={e => setEditing({...editing, status: e.target.value})}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive (Disabled)</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Product Applicability Section */}
          <div style={{ marginTop: '16px', background: '#fcfaf8', padding: '16px', borderRadius: '12px', border: '1px solid #e8e0d8' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#2b170d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={16} color="#a54d2b" /> Product Applicability & Rules (Kin Products Par Lagna Chahiye)
            </h4>

            <div className="admin-form-group">
              <label>Which products does this coupon apply to?</label>
              <select 
                value={editing.targetType || "all"} 
                onChange={e => setEditing({...editing, targetType: e.target.value})}
                style={{ fontWeight: '600', color: '#2b170d' }}
              >
                <option value="all">Apply to ALL Products in Catalog</option>
                <option value="selected">Apply ONLY to Specific Selected Products</option>
                <option value="excluded">Apply to ALL Products EXCEPT Excluded Products</option>
              </select>
            </div>

            {editing.targetType === "selected" && (
              <AdminProductMultiSelector
                selectedIds={editing.selectedProducts || []}
                onChange={(ids) => setEditing({...editing, selectedProducts: ids})}
                label="Select Applicable Products (Select products to apply coupon)"
              />
            )}

            {editing.targetType === "excluded" && (
              <AdminProductMultiSelector
                selectedIds={editing.excludedProducts || []}
                onChange={(ids) => setEditing({...editing, excludedProducts: ids})}
                label="Select Excluded Products (Select products where coupon SHOULD NOT work)"
              />
            )}

            {editing.targetType === "all" && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#7c2d12', display: 'block', marginBottom: '6px' }}>
                  Optionally Exclude Specific Products
                </label>
                <AdminProductMultiSelector
                  selectedIds={editing.excludedProducts || []}
                  onChange={(ids) => setEditing({...editing, excludedProducts: ids})}
                  label="Select Excluded Products (Products to block from coupon)"
                />
              </div>
            )}
          </div>

          <div className="admin-form-group" style={{ background: '#fdfbf7', padding: '14px', borderRadius: '10px', border: '1px solid #e8e0d8', marginTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
              <input 
                type="checkbox" 
                checked={Boolean(editing.showOnHome)} 
                onChange={e => setEditing({ ...editing, showOnHome: e.target.checked })} 
                style={{ width: 18, height: 18, accentColor: '#a54d2b' }}
              />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#2b170d' }}>
                Show this coupon as a Home Promotional Banner
              </span>
            </label>
            <small style={{ color: '#806f62', display: 'block', marginTop: '4px', marginLeft: '28px', fontSize: '12px' }}>
              When enabled, this offer will automatically sync to the Home Page promotional section.
            </small>
          </div>

          <div className="admin-form-actions">
            <button type="button" className="admin-btn secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="admin-btn"><Check size={16} /> Save Coupon</button>
          </div>
        </form>
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
          <h1>Coupons</h1>
          <p className="admin-page-subtitle">Manage promotional discount codes for store checkout</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            padding: '5px 12px',
            borderRadius: '20px',
            background: dbStatus === "connected" ? "#e6f4ea" : "#fce8e6",
            color: dbStatus === "connected" ? "#137333" : "#c5221f",
            fontWeight: 600,
            border: `1px solid ${dbStatus === "connected" ? "#ceead6" : "#fad2cf"}`
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: dbStatus === "connected" ? "#137333" : "#c5221f"
            }} />
            {dbStatus === "connected" ? "MongoDB Live" : "Offline Cache"}
          </div>
          <button 
            type="button"
            className="admin-btn secondary" 
            onClick={() => load()} 
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
            title="Fetch fresh data from MongoDB"
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> 
            {loading ? "Syncing..." : "Refresh"}
          </button>
          <button className="admin-btn" onClick={() => setEditing({ code: '', discount: 10, type: 'percentage', limit: '', minAmount: '', maxDiscount: '', targetType: 'all', selectedProducts: [], excludedProducts: [], expiry: '', status: 'Active', showOnHome: false })}>
            <Plus size={16}/> Add Coupon
          </button>
        </div>
      </div>

      {coupons.length === 0 ? (
        <div className="admin-empty">No coupons created yet. Click "Add Coupon" to create one.</div>
      ) : (
        <>
        {/* Desktop Coupons Table */}
        <div className="admin-table-container desktop-only" style={{ marginBottom: 20 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min. Order</th>
                <th>Applicability</th>
                <th>Usage</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Home Banner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => {
                const st = effectiveStatus(c);
                const targetText = c.targetType === "selected" 
                  ? `${c.selectedProducts?.length || 0} Selected` 
                  : (c.excludedProducts?.length ? `All except ${c.excludedProducts.length}` : "All Products");
                return (
                  <tr key={c.id}>
                    <td><b>{c.code}</b></td>
                    <td><b>{c.type === "fixed" ? `₹${c.discount} OFF` : `${c.discount}% OFF`}</b></td>
                    <td>{c.minAmount || c.minOrderValue ? `₹${Number(c.minAmount || c.minOrderValue).toLocaleString()}` : "₹0 (No Min)"}</td>
                    <td><span className="admin-badge info" style={{ fontSize: '11px' }}>{targetText}</span></td>
                    <td>{c.usage || 0} / {c.limit ? c.limit : "∞"}</td>
                    <td><small>{c.expiry ? new Date(c.expiry).toLocaleDateString() : "—"}</small></td>
                    <td>
                      <span className={`admin-badge ${st === 'Active' ? 'success' : st === 'Expired' ? 'error' : 'warning'}`}>{st}</span>
                    </td>
                    <td>{c.showOnHome ? <span className="admin-badge info">Synced</span> : "—"}</td>
                    <td>
                      <div className="admin-actions-cell">
                        <button className="admin-icon-btn" onClick={() => handleStartEdit(c)} title="Edit Coupon">
                          <Edit size={16} />
                        </button>
                        <button className="admin-icon-btn danger" onClick={() => setDeleteId(c.id)} title="Delete Coupon">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="admin-mobile-cards">
          {coupons.map(c => (
            <div key={c.id} className="admin-mobile-card">
              <div className="mobile-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '8px', background: '#fdf0e8', color: '#a54d2b', display: 'grid', placeItems: 'center' }}>
                    <Tag size={20} />
                  </div>
                  <div>
                    <span className="mobile-card-title">{c.code}</span>
                    <div className="mobile-card-sub">
                      Discount: <b>{c.type === 'fixed' ? `₹${c.discount} OFF` : `${c.discount}% OFF`}</b> • Used: {c.usage || 0}/{c.limit || '∞'}
                    </div>
                  </div>
                </div>
                <span className={`admin-badge ${effectiveStatus(c) === 'Active' ? 'success' : effectiveStatus(c) === 'Expired' ? 'error' : 'warning'}`}>
                  {effectiveStatus(c)}
                </span>
              </div>

              {c.showOnHome && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#166534', background: '#e5f6ea', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                  ✓ Synced to Home Promotional Banner
                </div>
              )}

              <div className="mobile-card-body">
                <div className="mobile-card-actions" style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <button className="admin-btn secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleStartEdit(c)}>
                    <Edit size={14} /> Edit
                  </button>
                  <button className="admin-icon-btn danger" style={{ width: 34, height: 34 }} onClick={() => setDeleteId(c.id)} title="Delete Coupon">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Coupon?"
        message="Are you sure you want to delete this coupon? Customers will no longer be able to use this promo code."
        confirmText="Delete Coupon"
        onConfirm={confirmDeleteCoupon}
        onClose={() => setDeleteId(null)}
      />
    </AdminLayout>
  );
}

