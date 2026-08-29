import React, { useState, useEffect, useRef } from "react";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { Sparkles, Save, Edit, Check, Upload, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { ZODIAC_SIGNS as initialZodiacs } from "../../data/zodiac";

export function AdminZodiac() {
  const [zodiacs, setZodiacs] = useState(() => {
    const settings = db.getSettings();
    return settings.zodiacs || initialZodiacs;
  });
  const [products, setProducts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRefs = useRef({});

  useEffect(() => {
    const load = () => {
      const settings = db.getSettings();
      setZodiacs(settings.zodiacs || initialZodiacs);
      setProducts(db.getProducts().filter(p => p.status === 'Active'));
    };
    load();
    // Fresh fetch from MongoDB so admin sees the currently saved zodiac content
    db.fetchSettings().then(load);
    db.fetchProducts().then(load);
    const unsub = onStoreUpdate(load);
    return () => unsub();
  }, []);

  const handleChange = (id, field, value) => {
    setZodiacs(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z));
  };

  const handleProductSelect = (id, productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    setZodiacs(prev => prev.map(z => {
      if (z.id === id) {
        return {
          ...z,
          productName: product.name,
          link: `/product/${product.id}`,
          image: product.img || (product.images && product.images[0]) || z.image
        };
      }
      return z;
    }));
    emitToast("Auto-filled from catalog!", "success");
  };

  const handleImageUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      emitToast("Image size must be less than 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      handleChange(id, 'image', event.target.result);
      emitToast("Image uploaded locally", "success");
    };
    reader.onerror = () => {
      emitToast("Failed to read file", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const currentSettings = db.getSettings();
      const updatedSettings = { ...currentSettings, zodiacs };
      await db.saveSettings(updatedSettings);
      emitToast("Zodiac settings saved successfully!", "success");
    } catch (err) {
      emitToast(err.message || "Failed to save zodiac settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h1 style={{ fontSize: 24, fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, color: '#2b170d', margin: '0 0 2px' }}>
              Zodiac Guide Settings
            </h1>
            <p style={{ color: '#806f62', fontSize: '13px', margin: 0 }}>
              Live control for the homepage Zodiac section. Select from catalog or upload images.
            </p>
          </div>
          <button 
            type="button" 
            onClick={handleSave}
            disabled={isSaving}
            className="admin-btn primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px' }}
          >
            {isSaving ? <Sparkles size={16} className="spin" /> : <Save size={16} />}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {zodiacs.map((zodiac) => (
            <div key={zodiac.id} className="admin-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e8e0d8', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #f0ebe4', paddingBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: '#fdfbf7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e8e0d8' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={zodiac.color || "#C89B3C"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                    <path d={zodiac.symbolPath} />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#2b170d' }}>{zodiac.english} ({zodiac.rashi})</h3>
                  <small style={{ color: '#806f62', fontSize: '12px' }}>{zodiac.element} • {zodiac.deity}</small>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Catalog Selection */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8c7a6e', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Select from Catalog (Auto-fill)</label>
                  <select 
                    className="admin-input" 
                    onChange={(e) => handleProductSelect(zodiac.id, e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>-- Choose a product to auto-fill --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8c7a6e', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Recommended Mukhi</label>
                  <input
                    type="text"
                    value={zodiac.recommended || ""}
                    onChange={(e) => handleChange(zodiac.id, 'recommended', e.target.value)}
                    className="admin-input"
                    placeholder="e.g. 5 Mukhi"
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8c7a6e', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Product Name</label>
                  <input
                    type="text"
                    value={zodiac.productName || ""}
                    onChange={(e) => handleChange(zodiac.id, 'productName', e.target.value)}
                    className="admin-input"
                    placeholder="e.g. 5 Mukhi Rudraksha"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8c7a6e', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    <LinkIcon size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}/> 
                    Link / URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={zodiac.link || ""}
                    onChange={(e) => handleChange(zodiac.id, 'link', e.target.value)}
                    className="admin-input"
                    placeholder="Leave empty to disable link"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8c7a6e', fontWeight: 600, marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><ImageIcon size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}/> Image URL or Upload (Optional)</span>
                    <label style={{ cursor: 'pointer', color: '#a54d2b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Upload size={12} /> Upload
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => handleImageUpload(zodiac.id, e)} 
                        ref={el => fileInputRefs.current[zodiac.id] = el}
                      />
                    </label>
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={zodiac.image || ""}
                      onChange={(e) => handleChange(zodiac.id, 'image', e.target.value)}
                      className="admin-input"
                      style={{ flex: 1 }}
                      placeholder="e.g. /images/product.jpg"
                    />
                    {zodiac.image && (
                      <img src={zodiac.image} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e8e0d8' }} />
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8c7a6e', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Benefit / Tagline</label>
                  <input
                    type="text"
                    value={zodiac.benefit || ""}
                    onChange={(e) => handleChange(zodiac.id, 'benefit', e.target.value)}
                    className="admin-input"
                    placeholder="e.g. Spiritual Elevation"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
