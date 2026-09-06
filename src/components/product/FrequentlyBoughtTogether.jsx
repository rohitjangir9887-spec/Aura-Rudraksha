import React, { useState } from "react";
import { Plus, Check, ShoppingCart, Sparkles, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { money } from "../../data";
import { emitToast } from "../../context/ToastContext";

export function FrequentlyBoughtTogether({ currentProduct, allProducts = [], onAddBundle }) {
  if (!currentProduct) return null;

  // Pick 1 or 2 complementary products
  const complementary = allProducts
    .filter(p => String(p.id) !== String(currentProduct.id))
    .slice(0, 2);

  if (complementary.length === 0) return null;

  // Selection state
  const [selectedIds, setSelectedIds] = useState(() => [
    String(currentProduct.id),
    ...complementary.map(p => String(p.id))
  ]);

  const [added, setAdded] = useState(false);

  const toggleSelect = (id) => {
    // Current product cannot be unselected
    if (String(id) === String(currentProduct.id)) return;
    
    const strId = String(id);
    setSelectedIds(prev => 
      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
    );
  };

  const allBundleItems = [currentProduct, ...complementary];
  const activeItems = allBundleItems.filter(item => selectedIds.includes(String(item.id)));

  const totalMrp = activeItems.reduce((sum, item) => sum + (Number(item.mrp) || Number(item.price) || 0), 0);
  const totalPrice = activeItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const bundleSavings = totalMrp > totalPrice ? totalMrp - totalPrice : 0;

  const handleAddBundle = () => {
    if (activeItems.length === 0) return;
    if (onAddBundle) {
      onAddBundle(activeItems.map(item => ({ id: item.id, qty: 1 })));
    }
    setAdded(true);
    emitToast(`${activeItems.length} items added to your sacred cart! ❤️`, "success");
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="aura-bundle-card">
      <div className="aura-bundle-header">
        <div className="bundle-title-wrap">
          <Sparkles size={16} className="gold-sparkle" />
          <h3 className="bundle-title">Frequently Bought Together</h3>
        </div>
        <span className="bundle-badge">Devotee Preferred Bundle</span>
      </div>

      <div className="aura-bundle-content">
        {/* Products visual row */}
        <div className="aura-bundle-items-row">
          {allBundleItems.map((item, idx) => {
            const isSelected = selectedIds.includes(String(item.id));
            const isCurrent = String(item.id) === String(currentProduct.id);
            const img = (item.images && item.images[0]) || item.img || "/images/product-5mukhi.jpg";

            return (
              <React.Fragment key={item.id}>
                {idx > 0 && <div className="bundle-plus-sign">+</div>}
                
                <div 
                  className={`bundle-item-card ${isSelected ? "selected" : "deselected"}`}
                  onClick={() => toggleSelect(item.id)}
                >
                  <div className="bundle-item-img-frame">
                    <img 
                      src={img} 
                      alt={item.name} 
                      loading="lazy"
                      onError={(e) => {
                        if (!e.target.src.includes("product-5mukhi.jpg")) {
                          e.target.src = "/images/product-5mukhi.jpg";
                        }
                      }}
                    />
                    <div className={`bundle-checkbox ${isSelected ? "checked" : ""}`}>
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>

                  <div className="bundle-item-meta">
                    <span className="bundle-item-name" title={item.name}>
                      {isCurrent ? `This Item: ${item.name}` : item.name}
                    </span>
                    <div className="bundle-item-price-row">
                      <strong className="bundle-curr-price">{money(item.price)}</strong>
                      {item.mrp > item.price && (
                        <del className="bundle-mrp">{money(item.mrp)}</del>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Bundle Summary & Add Button */}
        <div className="aura-bundle-action-box">
          <div className="bundle-pricing-summary">
            <span className="bundle-total-label">Total for {activeItems.length} Sacred Items:</span>
            <div className="bundle-total-numbers">
              <span className="bundle-total-price">{money(totalPrice)}</span>
              {totalMrp > totalPrice && (
                <del className="bundle-total-mrp">{money(totalMrp)}</del>
              )}
            </div>
            {bundleSavings > 0 && (
              <span className="bundle-save-pill">
                <CheckCircle2 size={12} /> Bundle Savings: {money(bundleSavings)}
              </span>
            )}
          </div>

          <button
            type="button"
            className={`aura-add-bundle-btn ${added ? "added" : ""}`}
            onClick={handleAddBundle}
            disabled={activeItems.length === 0}
          >
            {added ? (
              <>
                <Check size={17} strokeWidth={2.6} />
                <span>Bundle Added to Cart ✓</span>
              </>
            ) : (
              <>
                <ShoppingCart size={17} />
                <span>Add Selected to Cart ({money(totalPrice)})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
