import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { Save, Plus, Trash2, ArrowLeft, Image as ImageIcon, CheckCircle, Package } from "lucide-react";

const DEFAULT_CATEGORIES = [
  {
    id: "rudraksha",
    name: "Rudraksha",
    desc: "Authentic Nepal beads",
    image: "/images/product-5mukhi.jpg",
    link: "/shop?q=Rudraksha"
  },
  {
    id: "malas",
    name: "Malas",
    desc: "108+1 Japa malas",
    image: "/images/product-mala.jpg",
    link: "/shop?q=Mala"
  }
];

export function AdminCategories() {
  const [categories, setCategories] = useState(() => {
    const settings = db.getSettings();
    return (settings.shopCategories && settings.shopCategories.length > 0) ? settings.shopCategories : DEFAULT_CATEGORIES;
  });
  
  const [products, setProducts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRefs = useRef({});

  // Modal State
  const [manageCatIndex, setManageCatIndex] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [isSavingProducts, setIsSavingProducts] = useState(false);

  useEffect(() => {
    const load = () => {
      const settings = db.getSettings();
      if (settings.shopCategories && settings.shopCategories.length > 0) {
        setCategories(settings.shopCategories);
      }
      setProducts(db.getProducts());
    };
    load();
    db.fetchSettings().then(load);
    db.fetchProducts().then(load);
    const unsub = onStoreUpdate(load);
    return () => unsub();
  }, []);

  const handleChange = (index, field, value) => {
    setCategories(prev => {
      const newCats = [...prev];
      newCats[index] = { ...newCats[index], [field]: value };
      return newCats;
    });
  };

  const handleAdd = () => {
    setCategories(prev => [
      ...prev, 
      {
        id: `cat-${Date.now()}`,
        name: "New Category",
        desc: "Short description",
        image: "",
        link: "/shop"
      }
    ]);
  };

  const handleRemove = (index) => {
    setCategories(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      emitToast("Image size must be less than 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      handleChange(index, 'image', event.target.result);
      emitToast("Image uploaded locally", "success");
    };
    reader.onerror = () => {
      emitToast("Failed to read file", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const currentSettings = db.getSettings();
      const updatedSettings = { ...currentSettings, shopCategories: categories };
      await db.saveSettings(updatedSettings);
      emitToast("Shop Categories saved successfully!", "success");
    } catch (err) {
      emitToast(err.message || "Failed to save categories", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Product Selection Modal Logic ----
  const openManageModal = (index) => {
    const cat = categories[index];
    const initialSelected = new Set(
      products.filter(p => p.category === cat.name).map(p => p.id)
    );
    setSelectedProductIds(initialSelected);
    setManageCatIndex(index);
  };

  const toggleProductSelection = (productId) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProductIds(newSelected);
  };

  const saveProductSelection = async () => {
    if (manageCatIndex === null) return;
    setIsSavingProducts(true);
    
    const catName = categories[manageCatIndex].name;
    const initialSelected = new Set(products.filter(p => p.category === catName).map(p => p.id));
    
    const updates = [];
    
    // Process products whose category needs to be updated
    for (const p of products) {
      const isCurrentlyInCat = initialSelected.has(p.id);
      const shouldBeInCat = selectedProductIds.has(p.id);
      
      if (isCurrentlyInCat && !shouldBeInCat) {
        updates.push({ ...p, category: "Uncategorized" });
      } else if (!isCurrentlyInCat && shouldBeInCat) {
        updates.push({ ...p, category: catName });
      }
    }
    
    try {
      for (const updatedProduct of updates) {
        await db.saveProduct(updatedProduct);
      }
      emitToast("Products assigned to category successfully!", "success");
      setManageCatIndex(null);
    } catch (err) {
      emitToast(err.message || "Failed to update product categories", "error");
    } finally {
      setIsSavingProducts(false);
    }
  };

  return (
    <AdminLayout>
      <Link to="/admin/banners" className="admin-back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#a54d2b', fontSize: '13px', textDecoration: 'none', marginBottom: '20px', fontWeight: '600' }}>
        <ArrowLeft size={16} /> Back to Home Content
      </Link>
      
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: '0 0 5px 0', color: '#2b170d' }}>Shop Categories</h1>
          <p style={{ color: '#806f62', margin: 0, fontSize: '13px' }}>Manage the categories shown on the home page</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="primary-btn" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#2b170d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          <Save size={16} />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {categories.map((cat, i) => (
          <div key={i} className="admin-card" style={{ display: 'flex', gap: '20px', padding: '20px', background: '#fff', border: '1px solid #ebdccb', borderRadius: '12px' }}>
            
            {/* Image Preview & Upload */}
            <div style={{ flex: '0 0 120px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ width: '120px', height: '120px', background: '#f4eee6', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: '1px solid #ebdccb' }}>
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a29286' }}>
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>
              
              <button 
                type="button" 
                onClick={() => fileInputRefs.current[i]?.click()}
                style={{ fontSize: '11px', padding: '6px', background: '#fff', border: '1px solid #d0c3b5', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#4a3828' }}
              >
                Upload Photo
              </button>
              <input 
                type="file" 
                accept="image/*"
                ref={el => fileInputRefs.current[i] = el}
                style={{ display: 'none' }}
                onChange={(e) => handleImageUpload(i, e)}
              />
            </div>

            {/* Category Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#806f62', marginBottom: '5px' }}>Name</label>
                  <input 
                    type="text" 
                    value={cat.name} 
                    onChange={e => handleChange(i, 'name', e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ebdccb', borderRadius: '8px', fontSize: '14px', background: '#fdfcfb' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#806f62', marginBottom: '5px' }}>Link URL</label>
                  <input 
                    type="text" 
                    value={cat.link} 
                    onChange={e => handleChange(i, 'link', e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ebdccb', borderRadius: '8px', fontSize: '14px', background: '#fdfcfb' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#806f62', marginBottom: '5px' }}>Description</label>
                <input 
                  type="text" 
                  value={cat.desc} 
                  onChange={e => handleChange(i, 'desc', e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ebdccb', borderRadius: '8px', fontSize: '14px', background: '#fdfcfb' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#806f62', marginBottom: '5px' }}>Image URL (Optional if uploaded)</label>
                  <input 
                    type="text" 
                    value={cat.image} 
                    onChange={e => handleChange(i, 'image', e.target.value)}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '10px', border: '1px solid #ebdccb', borderRadius: '8px', fontSize: '14px', background: '#fdfcfb' }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button 
                    type="button"
                    onClick={() => openManageModal(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fdf0e8', color: '#a54d2b', border: '1px solid #f6dcc9', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    <Package size={16} /> Manage Products
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleRemove(i)}
                    style={{ background: 'none', border: 'none', color: '#d64b2e', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: '8px 12px' }}
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            </div>

          </div>
        ))}

        <button 
          onClick={handleAdd}
          style={{ width: '100%', padding: '20px', background: '#fdfaf6', border: '2px dashed #ebdccb', borderRadius: '12px', color: '#a54d2b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
        >
          <Plus size={20} /> Add Category
        </button>
      </div>

      {/* Product Selection Modal */}
      {manageCatIndex !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 10, 5, 0.5)', backdropFilter: 'blur(3px)' }} onClick={() => setManageCatIndex(null)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px', background: '#fff', borderRadius: '16px', border: '1px solid #ebdccb', display: 'flex', flexDirection: 'column', maxHeight: '85vh', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid #ebdccb' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '20px', color: '#2b170d', fontFamily: "'Cormorant Garamond', serif" }}>
                Products in {categories[manageCatIndex]?.name}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#806f62' }}>
                Select products to add to this category. Unselected products will be removed from it.
              </p>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', background: '#fcfaf6' }}>
              {products.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#806f62' }}>No products found in the store.</div>
              ) : (
                products.map((p) => {
                  const isSelected = selectedProductIds.has(p.id);
                  const displayImg = p.img || (p.images && p.images[0]) || "/images/product-5mukhi.jpg";
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => toggleProductSelection(p.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', 
                        background: '#fff', border: `1px solid ${isSelected ? '#a54d2b' : '#ebdccb'}`, 
                        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(165, 77, 43, 0.1)' : 'none'
                      }}
                    >
                      <div style={{ 
                        width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${isSelected ? '#a54d2b' : '#dcd1c6'}`, 
                        background: isSelected ? '#a54d2b' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                      }}>
                        {isSelected && <CheckCircle size={14} color="#fff" />}
                      </div>
                      
                      <img src={displayImg} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }} />
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#2b170d' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: '#806f62' }}>Current Category: {p.category || 'None'}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid #ebdccb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setManageCatIndex(null)}
                style={{ padding: '10px 16px', background: '#fff', border: '1px solid #dcd1c6', borderRadius: '8px', color: '#4a3b32', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={saveProductSelection}
                disabled={isSavingProducts}
                style={{ padding: '10px 20px', background: '#a54d2b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isSavingProducts ? "Saving..." : "Save Selection"}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
