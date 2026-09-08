import React, { useState, useMemo } from "react";
import { Search, Check, X } from "lucide-react";
import { db } from "../../lib/db";
import { getProductPrimaryImage } from "../../lib/imageUtils";

export function AdminProductMultiSelector({ selectedIds, onChange, label = "Select Products" }) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const allProducts = useMemo(() => {
    try {
      return db.getProducts() || [];
    } catch {
      return [];
    }
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allProducts.slice(0, 50); // Just show first 50 when empty
    const term = searchQuery.toLowerCase();
    return allProducts.filter(p => 
      String(p.name || "").toLowerCase().includes(term) || 
      String(p.id || p._id).includes(term)
    );
  }, [allProducts, searchQuery]);

  const toggleProduct = (id) => {
    const strId = String(id);
    if (selectedIds.includes(strId)) {
      onChange(selectedIds.filter(x => x !== strId));
    } else {
      onChange([...selectedIds, strId]);
    }
  };

  const selectedProducts = useMemo(() => {
    return selectedIds.map(id => allProducts.find(p => String(p.id || p._id) === String(id))).filter(Boolean);
  }, [selectedIds, allProducts]);

  return (
    <div style={{ marginTop: "12px", border: "1px solid #ebd8cb", borderRadius: "10px", padding: "16px", background: "#fcfaf8" }}>
      <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#3b322c", marginBottom: "12px" }}>
        {label} ({selectedIds.length})
      </label>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left: Search & Select */}
        <div>
          <div style={{ position: "relative", marginBottom: "12px" }}>
            <Search size={16} color="#9c8c80" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
            <input 
              type="text" 
              placeholder="Search products by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "6px",
                border: "1px solid #dcd1c6",
                fontSize: "13px",
                boxSizing: "border-box"
              }}
            />
          </div>
          
          <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #ebd8cb", borderRadius: "8px", background: "#ffffff" }}>
            {searchResults.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#806f62", fontSize: "13px" }}>
                No products found.
              </div>
            ) : (
              searchResults.map(p => {
                const isSelected = selectedIds.includes(String(p.id || p._id));
                const thumb = getProductPrimaryImage(p);
                return (
                  <div 
                    key={p.id || p._id}
                    onClick={() => toggleProduct(p.id || p._id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid #f5eee8",
                      background: isSelected ? "#fed7aa" : "#ffffff"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <img src={thumb} alt={p.name} onError={(e) => { e.currentTarget.src = "/images/placeholder.svg"; }} style={{ width: "30px", height: "30px", borderRadius: "4px", objectFit: "cover" }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "12.5px", fontWeight: isSelected ? "700" : "600", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#7a6a5e" }}>₹{Number(p.price || 0).toLocaleString()}</div>
                      </div>
                    </div>
                    {isSelected && <Check size={14} color="#7c2d12" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Right: Selected */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#443428", marginBottom: "8px" }}>
            Currently Selected
          </label>
          <div style={{ maxHeight: "288px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
            {selectedProducts.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#806f62", fontSize: "12px", border: "1px dashed #dcd1c6", borderRadius: "8px" }}>
                No products selected yet.
              </div>
            ) : (
              selectedProducts.map(p => (
                <div key={p.id || p._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "#ffffff", border: "1px solid #ebd8cb", borderRadius: "6px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </div>
                  <button type="button" onClick={() => toggleProduct(p.id || p._id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: "4px" }}>
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
