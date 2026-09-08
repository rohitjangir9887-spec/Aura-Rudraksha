import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { ArrowLeft, Search, GripVertical, Check, X, ArrowUp, ArrowDown, Eye, Save, CloudUpload } from "lucide-react";
import { ADMIN_BASE_PATH } from "../../lib/routes";
import { db } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";
import { getProductPrimaryImage } from "../../lib/imageUtils";
import { isPublicProduct } from "../../lib/db";
import { HomeProductShowcase } from "../../components/HomeProductShowcase";
import "./admin-pages.css";

export function AdminHomeProductManager() {
  const [allProducts, setAllProducts] = useState([]);
  const [draftLayout, setDraftLayout] = useState([]); // Array of product IDs
  const [searchQuery, setSearchQuery] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const products = db.getProducts().filter(isPublicProduct);
    setAllProducts(products);

    const settings = db.getSettings();
    if (settings?.homeProductLayout?.draft) {
      setDraftLayout(settings.homeProductLayout.draft);
    } else if (settings?.homeProductLayout?.live) {
      setDraftLayout(settings.homeProductLayout.live);
    } else {
      // Fallback: use existing logic of homeOrder
      const defaultIds = [...products]
        .filter(p => p.showOnHome !== false)
        .sort((a, b) => (Number(a.homeOrder || 0) || 999) - (Number(b.homeOrder || 0) || 999))
        .map(p => String(p.id || p._id));
      setDraftLayout(defaultIds);
    }
  }, []);

  const searchResults = searchQuery.trim()
    ? allProducts.filter(p => String(p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || String(p.id).includes(searchQuery))
    : allProducts.slice(0, 20);

  const handleAdd = (id) => {
    const strId = String(id);
    if (!draftLayout.includes(strId)) {
      setDraftLayout(prev => [...prev, strId]);
    }
  };

  const handleRemove = (id) => {
    setDraftLayout(prev => prev.filter(x => x !== String(id)));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    setDraftLayout(prev => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const moveDown = (index) => {
    if (index === draftLayout.length - 1) return;
    setDraftLayout(prev => {
      const arr = [...prev];
      [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
      return arr;
    });
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const currentSettings = db.getSettings() || {};
      const newLayout = { ...(currentSettings.homeProductLayout || {}), draft: draftLayout };
      await db.saveSettings({ ...currentSettings, homeProductLayout: newLayout });
      emitToast("Draft saved successfully", "success");
    } catch (e) {
      emitToast("Failed to save draft", "error");
    }
    setIsSaving(false);
  };

  const handlePublish = async () => {
    setIsSaving(true);
    try {
      const currentSettings = db.getSettings() || {};
      const newLayout = { draft: draftLayout, live: draftLayout };
      await db.saveSettings({ ...currentSettings, homeProductLayout: newLayout });
      emitToast("Home products published to live site!", "success");
    } catch (e) {
      emitToast("Failed to publish", "error");
    }
    setIsSaving(false);
  };

  const draftProductsObj = draftLayout.map(id => allProducts.find(p => String(p.id || p._id) === id)).filter(Boolean);

  return (
    <AdminLayout>
      <Link to={`${ADMIN_BASE_PATH}/banners`} className="admin-back-link">
        <ArrowLeft size={16} /> Back to Home Content
      </Link>
      <div className="admin-page-header">
        <div>
          <h1>Home Product Listing</h1>
          <p className="admin-page-subtitle">Manage which products appear on the storefront home page and their exact order.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="admin-btn secondary" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? "Hide Preview" : <><Eye size={16}/> Preview</>}
          </button>
          <button className="admin-btn secondary" onClick={handleSaveDraft} disabled={isSaving}>
            <Save size={16}/> Save Draft
          </button>
          <button className="admin-btn" style={{ background: "#20a95a" }} onClick={handlePublish} disabled={isSaving}>
            <CloudUpload size={16}/> Publish Live
          </button>
        </div>
      </div>

      {showPreview ? (
        <div style={{ background: "#fff", border: "1px solid #ebd8cb", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ background: "#2b170d", color: "#fff", padding: "10px 16px", fontSize: "13px", fontWeight: "600", display: "flex", justifyContent: "space-between" }}>
            <span>Live Preview</span>
            <span style={{ color: "#a54d2b" }}>Customer View</span>
          </div>
          <div style={{ padding: "24px 0", background: "#fdfbf9" }}>
            <HomeProductShowcase products={draftProductsObj} isLoading={false} overrideLayout={true} />
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Left: Search & Select */}
          <div className="admin-card">
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", color: "#2b170d" }}>Add Products</h3>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <Search size={16} color="#9c8c80" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="text" 
                placeholder="Search products by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px 10px 36px",
                  borderRadius: "8px", border: "1px solid #dcd1c6", fontSize: "13.5px"
                }}
              />
            </div>
            
            <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ebd8cb", borderRadius: "8px", background: "#ffffff" }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#806f62", fontSize: "13px" }}>No products found.</div>
              ) : (
                searchResults.map(p => {
                  const isAdded = draftLayout.includes(String(p.id || p._id));
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid #f5eee8", background: isAdded ? "#faf7f2" : "#ffffff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                        <img src={getProductPrimaryImage(p)} alt={p.name} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                          <div style={{ fontSize: "11.5px", color: "#7a6a5e" }}>₹{Number(p.price || 0).toLocaleString()}</div>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => isAdded ? handleRemove(p.id) : handleAdd(p.id)}
                        className={isAdded ? "admin-btn secondary" : "admin-btn"}
                        style={{ padding: "6px 12px", fontSize: "11.5px" }}
                      >
                        {isAdded ? "Remove" : "Add"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Right: Ordered Layout */}
          <div className="admin-card">
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", color: "#2b170d" }}>
              Active Home Layout ({draftLayout.length})
            </h3>
            <div style={{ maxHeight: "460px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {draftProductsObj.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#806f62", fontSize: "13px", border: "2px dashed #dcd1c6", borderRadius: "12px" }}>
                  No products added to the home page yet.
                </div>
              ) : (
                draftProductsObj.map((p, index) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: "#ffffff", border: "1px solid #ebd8cb", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <div style={{ color: "#a29286", fontWeight: "700", fontSize: "13px", width: "20px", textAlign: "center" }}>
                      {index + 1}
                    </div>
                    <img src={getProductPrimaryImage(p)} alt={p.name} style={{ width: "44px", height: "44px", borderRadius: "6px", objectFit: "cover" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                      <div style={{ fontSize: "11.5px", color: "#a54d2b", fontWeight: "700" }}>₹{Number(p.price || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button type="button" onClick={() => moveUp(index)} disabled={index === 0} style={{ background: "none", border: "none", color: index === 0 ? "#e2d2c1" : "#443428", cursor: index === 0 ? "default" : "pointer", padding: "4px" }}>
                        <ArrowUp size={16} />
                      </button>
                      <button type="button" onClick={() => moveDown(index)} disabled={index === draftProductsObj.length - 1} style={{ background: "none", border: "none", color: index === draftProductsObj.length - 1 ? "#e2d2c1" : "#443428", cursor: index === draftProductsObj.length - 1 ? "default" : "pointer", padding: "4px" }}>
                        <ArrowDown size={16} />
                      </button>
                      <button type="button" onClick={() => handleRemove(p.id)} style={{ background: "#fef2f2", border: "none", color: "#dc2626", borderRadius: "4px", cursor: "pointer", padding: "6px", marginLeft: "4px" }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
