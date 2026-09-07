import { getProductPrimaryImage, getProductGalleryImages } from "../../lib/imageUtils";
import { getProductRoute } from "../../lib/routes";
import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, Search, Check, X, ArrowRight, Loader2, Star, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { db, onStoreUpdate } from "../../lib/db";
import { emitToast } from "../../context/ToastContext";

export function AdminFeaturedProductManager({ products = [], onSettingsSaved }) {
  const [settings, setSettings] = useState(() => db.getSettings() || {});
  const [enabled, setEnabled] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const s = db.getSettings() || {};
    setSettings(s);
    setEnabled(Boolean(s.featuredProductEnabled));
    setSelectedProductId(s.featuredProductId || "");
  }, []);

  useEffect(() => {
    const unsub = onStoreUpdate(() => {
      const s = db.getSettings() || {};
      setSettings(s);
    });
    return () => unsub();
  }, []);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find(p => String(p.id) === String(selectedProductId) || String(p._id) === String(selectedProductId) || String(p.slug) === String(selectedProductId));
  }, [selectedProductId, products]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return products.slice(0, 8);
    }
    const q = searchQuery.toLowerCase().trim();
    return products.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
      (p.mukhi && p.mukhi.toLowerCase().includes(q)) ||
      (Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(q)))
    ).slice(0, 10);
  }, [searchQuery, products]);

  const handleSave = async () => {
    if (enabled && !selectedProductId) {
      emitToast("Please select an existing product before enabling.", "error");
      return;
    }

    setIsSaving(true);
    try {
      await db.saveSettings({
        featuredProductEnabled: enabled,
        featuredProductId: selectedProductId || ""
      });
      emitToast("Home Featured Product settings saved successfully!", "success");
      if (onSettingsSaved) onSettingsSaved();
    } catch (err) {
      emitToast(err.message || "Failed to save Featured Product settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="admin-card"
      id="admin-home-featured-product-section"
      style={{
        marginBottom: "18px",
        background: "#fffdfa",
        border: "1.5px solid #eadecd",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(43, 23, 13, 0.04)",
        transition: "all 0.2s ease"
      }}
    >
      {/* Clickable Compact Bar / Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 18px",
          cursor: "pointer",
          userSelect: "none",
          background: isExpanded ? "#fef8f0" : "#fffdfa",
          borderBottom: isExpanded ? "1px solid #ebd8cb" : "none",
          transition: "background 0.15s ease"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Icon Badge */}
          <div style={{ background: "#fed7aa", color: "#7c2d12", padding: "6px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Star size={18} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ fontSize: "14.5px", fontWeight: "700", color: "#2b170d", margin: 0 }}>
                Home Featured Product (Promotional Ad)
              </h3>
              {/* Status Indicator */}
              <span 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: "700",
                  background: enabled && selectedProduct ? "#dcfce7" : "#f3f4f6",
                  color: enabled && selectedProduct ? "#15803d" : "#6b7280",
                  border: `1px solid ${enabled && selectedProduct ? "#86efac" : "#e5e7eb"}`
                }}
              >
                {enabled && selectedProduct ? `● Active: ${selectedProduct.name.slice(0, 24)}${selectedProduct.name.length > 24 ? "..." : ""}` : "○ Disabled"}
              </span>
            </div>
            {!isExpanded && (
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#806f62" }}>
                Click to expand &amp; configure home promotional showcase product
              </p>
            )}
          </div>
        </div>

        {/* Action button icon */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            background: "#f7efe6",
            border: "1px solid #ebd8cb",
            color: "#7c2d12",
            borderRadius: "8px",
            padding: "6px 12px",
            fontSize: "12.5px",
            fontWeight: "700",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer"
          }}
        >
          {isExpanded ? (
            <>Hide Details <ChevronUp size={16} /></>
          ) : (
            <>Configure Details <ChevronDown size={16} /></>
          )}
        </button>
      </div>

      {/* Expanded Details Body */}
      {isExpanded && (
        <div style={{ padding: "18px 20px" }}>
          <p style={{ margin: "0 0 14px", fontSize: "12.5px", color: "#7a6a5e" }}>
            Feature a single authentic catalog product on the customer Home page below the "Shop By Zodiac Sign" section.
          </p>

          {/* Enable Toggle */}
          <div style={{ marginBottom: "18px" }}>
            <label 
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                color: "#2b170d",
                userSelect: "none"
              }}
            >
              <input 
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "#a54d2b",
                  cursor: "pointer"
                }}
              />
              <span>Show Featured Product on Home</span>
            </label>
          </div>

          {/* Product Selection Area */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", alignItems: "start", marginBottom: "18px" }}>
            
            {/* Left Column: Search & Select */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#443428", marginBottom: "6px" }}>
                Select Product from Catalog
              </label>

              {/* Search box */}
              <div style={{ position: "relative", marginBottom: "10px" }}>
                <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#806f62" }} />
                <input 
                  type="text"
                  placeholder="Search by product name, mukhi, category..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearching(true);
                  }}
                  onFocus={() => setIsSearching(true)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "9px 12px 9px 34px",
                    borderRadius: "8px",
                    border: "1px solid #dcd1c6",
                    fontSize: "13px",
                    background: "#ffffff",
                    color: "#2b170d"
                  }}
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#806f62", padding: "2px" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Product candidate list */}
              <div 
                style={{
                  maxHeight: "220px",
                  overflowY: "auto",
                  border: "1px solid #ebd8cb",
                  borderRadius: "8px",
                  background: "#ffffff"
                }}
              >
                {searchResults.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "#806f62", fontSize: "13px" }}>
                    No products found matching "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map(p => {
                    const isSelected = String(p.id) === String(selectedProductId) || String(p._id) === String(selectedProductId);
                    const thumb = getProductPrimaryImage(p);
                    const isDraft = p.status === "Draft" || p.status === "draft";

                    return (
                      <div 
                        key={p.id || p._id}
                        onClick={() => {
                          setSelectedProductId(String(p.id || p._id));
                          setIsSearching(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f5eee8",
                          background: isSelected ? "#fed7aa" : "#ffffff",
                          transition: "background 0.15s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                          <img 
                            src={thumb} 
                            alt={p.name}
                            onError={(e) => { e.currentTarget.src = "/images/product-5mukhi.jpg"; }}
                            style={{ width: "38px", height: "38px", borderRadius: "6px", objectFit: "cover", flexShrink: 0, border: "1px solid #e8dacb" }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: isSelected ? "700" : "600", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#7a6a5e", display: "flex", gap: "6px", alignItems: "center" }}>
                              <span style={{ fontWeight: "700", color: "#a54d2b" }}>₹{Number(p.price || 0).toLocaleString("en-IN")}</span>
                              <span>•</span>
                              <span>{p.category || "Rudraksha"}</span>
                              {isDraft && (
                                <span style={{ color: "#d97706", fontWeight: "700" }}>(Draft)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, marginLeft: "8px" }}>
                          {isSelected ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#7c2d12", fontWeight: "700", fontSize: "11.5px" }}>
                              <Check size={14} /> Selected
                            </span>
                          ) : (
                            <span style={{ fontSize: "11.5px", color: "#a54d2b", fontWeight: "600" }}>
                              Select
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Currently Selected Preview */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#443428", marginBottom: "6px" }}>
                Active Selection Preview
              </label>

              {selectedProduct ? (
                <div 
                  style={{
                    border: "1px solid #ebd8cb",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    background: "#ffffff",
                    display: "flex",
                    gap: "14px",
                    alignItems: "center"
                  }}
                >
                  <img 
                    src={getProductPrimaryImage(selectedProduct)}
                    alt={selectedProduct.name}
                    onError={(e) => { e.currentTarget.src = "/images/product-5mukhi.jpg"; }}
                    style={{ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover", border: "1px solid #e8dacb", flexShrink: 0 }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#a54d2b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {selectedProduct.badge || "Featured Selection"}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                      {selectedProduct.name}
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "baseline", marginTop: "4px" }}>
                      <span style={{ fontSize: "15px", fontWeight: "800", color: "#a54d2b" }}>
                        ₹{Number(selectedProduct.price || 0).toLocaleString("en-IN")}
                      </span>
                      {(selectedProduct.comparePrice || selectedProduct.mrp) > selectedProduct.price && (
                        <span style={{ fontSize: "12px", color: "#9c8c80", textDecoration: "line-through" }}>
                          ₹{Number(selectedProduct.comparePrice || selectedProduct.mrp).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setSelectedProductId("")}
                    title="Remove selection"
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#991b1b",
                      borderRadius: "6px",
                      padding: "5px 8px",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <X size={13} /> Clear
                  </button>
                </div>
              ) : (
                <div 
                  style={{
                    border: "1.5px dashed #dcd1c6",
                    borderRadius: "10px",
                    padding: "24px 16px",
                    textAlign: "center",
                    color: "#806f62",
                    background: "#faf7f2",
                    fontSize: "13px"
                  }}
                >
                  No product selected. Choose one from the catalog list on the left.
                </div>
              )}
            </div>

          </div>

          {/* Save Button Action */}
          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f0ebe4", paddingTop: "14px" }}>
            <button 
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="admin-btn"
              style={{
                padding: "8px 20px",
                fontSize: "13.5px",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {isSaving ? "Saving..." : "Save Featured Product"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
