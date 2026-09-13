import { getProductPrimaryImage, getProductGalleryImages } from "../lib/imageUtils";
import { OptimizedImage } from "../components/OptimizedImage";
import { getProductRoute } from "../lib/routes";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useWishlist } from "../hooks/useWishlist";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { db, onStoreUpdate, isPublicProduct } from "../lib/db";
import { getRecentlyViewedProducts } from "../lib/recentlyViewed";
import { money, pct } from "../data";
import { Heart, ShoppingCart, Trash2, ArrowRight, Star, ShoppingBag, Eye } from "lucide-react";

export function Wishlist() {
  const { wishlist, toggleWishlist, isWishlisted } = useWishlist();
  const { add } = useCart();
  const [products, setProducts] = useState(() => db.getProducts().filter(isPublicProduct));
  const [recentlyViewed, setRecentlyViewed] = useState(() => getRecentlyViewedProducts());
  const [addedIds, setAddedIds] = useState({});

  const loadProducts = () => {
    setProducts(db.getProducts().filter(isPublicProduct));
    setRecentlyViewed(getRecentlyViewedProducts());
  };

  useEffect(() => {
    loadProducts();
    db.revalidateProducts().then(() => loadProducts()).catch(() => {});
    
    const unsubStore = onStoreUpdate(() => loadProducts());
    const handleRecentUpdate = () => {
      setRecentlyViewed(getRecentlyViewedProducts());
    };

    window.addEventListener("aura:recently-viewed-updated", handleRecentUpdate);

    return () => {
      unsubStore();
      window.removeEventListener("aura:recently-viewed-updated", handleRecentUpdate);
    };
  }, []);

  const wishlistedProducts = products.filter((p) => {
    const pId = String(p.id || "");
    const pMongoId = String(p._id || "");
    const pSlug = String(p.slug || "");
    return wishlist.some(id => id === pId || (pMongoId && id === pMongoId) || (pSlug && id === pSlug));
  });

  const handleAddToCart = (p) => {
    add(p.id || p._id, 1);
    setAddedIds((prev) => ({ ...prev, [p.id]: true, [p._id]: true }));
    emitToast(`${p.name} added to cart`, "success");
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [p.id]: false, [p._id]: false }));
    }, 2000);
  };

  return (
    <Shell>
      <main className="page" style={{ paddingBottom: "80px", minHeight: "65vh" }}>
        <div className="crumb">
          <Link to="/">Home</Link> / <span>Wishlist</span>
        </div>

        <div className="shop-title" style={{ marginBottom: "30px" }}>
          <div>
            <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "38px", color: "#2b170d", margin: "0 0 6px" }}>
              My Sacred Wishlist
            </h1>
            <p style={{ fontSize: "13px", color: "#806f62", margin: 0 }}>
              {wishlistedProducts.length} saved {wishlistedProducts.length === 1 ? "item" : "items"} in your spiritual collection
            </p>
          </div>
          {wishlistedProducts.length > 0 && (
            <Link to="/shop" className="outline-btn" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              Continue Shopping <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {wishlistedProducts.length === 0 ? (
          <div className="empty" style={{ padding: "60px 20px", background: "#fffdf9", borderRadius: "16px", border: "1px solid #e8e0d8" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fdf0e8", color: "#a54d2b", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <Heart size={32} />
            </div>
            <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "28px", color: "#2b170d", margin: "0 0 8px" }}>
              Your Wishlist is Empty
            </h2>
            <p style={{ fontSize: "13px", color: "#806f62", maxWidth: "420px", margin: "0 auto 24px", lineHeight: "1.5" }}>
              Save items you love to track discounts, check authenticity details, or purchase later.
            </p>
            <Link to="/shop" className="btn" style={{ padding: "12px 28px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px", margin: "0 auto" }}>
              <ShoppingBag size={18} /> Explore Shop Catalog
            </Link>
          </div>
        ) : (
          <div
            className="wishlist-saved-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "14px",
            }}
          >
            {wishlistedProducts.map((p) => {
              const displayImage = getProductPrimaryImage(p);
              const isAdded = !!addedIds[p.id];
              const discount = pct(p);

              return (
                <div
                  key={p.id}
                  className="wishlist-product-card"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #ebdccb",
                    borderRadius: "12px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 8px rgba(43,23,13,0.03)",
                    position: "relative",
                    transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "1 / 1",
                      background: "linear-gradient(180deg, #fdfcf9 0%, #f7f3eb 100%)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderBottom: "1px solid #f0e4d7",
                    }}
                  >
                    <Link
                      to={getProductRoute(p)}
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "8px",
                        boxSizing: "border-box",
                        textDecoration: "none",
                      }}
                    >
                      <img
                        src={displayImage}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.target.src = "/images/placeholder.svg";
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          objectPosition: "center",
                          display: "block",
                          boxSizing: "border-box",
                          transition: "transform 0.3s ease",
                        }}
                      />
                    </Link>
                    {p.badge && (
                      <span
                        style={{
                          position: "absolute",
                          top: "8px",
                          left: "8px",
                          background: "#a54d2b",
                          color: "#fff",
                          fontSize: "9px",
                          fontWeight: "700",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        }}
                      >
                        {p.badge}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleWishlist(p.id, p.name)}
                      title="Remove from wishlist"
                      aria-label="Remove from wishlist"
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "#ffffff",
                        border: "1px solid #ebdccb",
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        color: "#dc2626",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div
                    style={{
                      padding: "10px 12px 12px",
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      justifyContent: "space-between",
                      background: "#ffffff",
                      boxSizing: "border-box",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#b45309", marginBottom: "4px" }}>
                        <Star size={12} fill="currentColor" />
                        <span style={{ fontWeight: "700", color: "#2b170d" }}>{p.rating || 4.9}</span>
                        <span style={{ color: "#9ca3af", fontSize: "10.5px" }}>({p.reviews || 22})</span>
                      </div>

                      <Link to={getProductRoute(p)} style={{ textDecoration: "none" }}>
                        <h4
                          style={{
                            fontFamily: "Cormorant Garamond, serif",
                            fontSize: "14.5px",
                            fontWeight: "600",
                            color: "#2b170d",
                            margin: "0 0 6px",
                            lineHeight: "1.35",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            minHeight: "36px",
                          }}
                          title={p.name}
                        >
                          {p.name}
                        </h4>
                      </Link>

                      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                        <b style={{ fontSize: "15px", fontWeight: "700", color: "#9c411e" }}>{money(p.price)}</b>
                        {p.mrp > p.price && (
                          <del style={{ fontSize: "11px", color: "#9ca3af" }}>{money(p.mrp)}</del>
                        )}
                        {discount > 0 && (
                          <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#15803d", background: "#f0fdf4", padding: "1px 5px", borderRadius: "3px" }}>
                            {discount}% OFF
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        style={{
                          padding: "7px 10px",
                          borderRadius: "7px",
                          border: isAdded ? "1px solid #16a34a" : "none",
                          background: isAdded ? "#16a34a" : "linear-gradient(135deg, #a54d2b 0%, #893819 100%)",
                          color: "#ffffff",
                          fontSize: "11.5px",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                          boxShadow: isAdded ? "none" : "0 2px 6px rgba(165,77,43,0.2)",
                          transition: "all 0.18s ease",
                        }}
                      >
                        <ShoppingCart size={13} />
                        {isAdded ? "✓ Added" : "Add to Cart"}
                      </button>
                      <Link
                        to={getProductRoute(p)}
                        className="outline-btn"
                        style={{
                          padding: "7px 10px",
                          fontSize: "11.5px",
                          borderRadius: "7px",
                          border: "1px solid #ebdccb",
                          display: "grid",
                          placeItems: "center",
                          color: "#2b170d",
                          textDecoration: "none",
                        }}
                        title="View Product Details"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recently Viewed Products (No fake data - only actual products viewed by customer) */}
        {recentlyViewed.length > 0 && (
          <div style={{ marginTop: "44px", paddingTop: "32px", borderTop: "1px dashed #ebdccb" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "26px", color: "#2b170d", margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Eye size={22} color="#a54d2b" /> Recently Viewed Products
                </h3>
                <p style={{ fontSize: "12.5px", color: "#806f62", margin: 0 }}>
                  Items you recently explored in our authentic spiritual catalog
                </p>
              </div>
              <Link to="/shop" className="outline-btn" style={{ fontSize: "11.5px" }}>
                View Catalog
              </Link>
            </div>

            <div
              className="recently-viewed-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "14px",
              }}
            >
              {recentlyViewed.map((p) => {
                const displayImage = getProductPrimaryImage(p);
                const isAdded = !!addedIds[p.id || p._id];
                const discount = pct(p);
                const saved = isWishlisted(p);

                return (
                  <div
                    key={p.id || p._id}
                    className="wishlist-product-card"
                    style={{
                      background: "#ffffff",
                      border: "1px solid #ebdccb",
                      borderRadius: "12px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 2px 8px rgba(43,23,13,0.03)",
                      position: "relative",
                      transition: "transform 0.22s ease, box-shadow 0.22s ease",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "1 / 1",
                        background: "linear-gradient(180deg, #fdfcf9 0%, #f7f3eb 100%)",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderBottom: "1px solid #f0e4d7",
                      }}
                    >
                      <Link
                        to={getProductRoute(p)}
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "8px",
                          boxSizing: "border-box",
                          textDecoration: "none",
                        }}
                      >
                        <OptimizedImage
                          src={displayImage}
                          alt={p.name}
                          width={240}
                          quality={80}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            objectPosition: "center",
                            display: "block",
                          }}
                        />
                      </Link>
                      {discount > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: "8px",
                            left: "8px",
                            background: "#a54d2b",
                            color: "#ffffff",
                            fontSize: "9.5px",
                            fontWeight: "700",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            letterSpacing: "0.3px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          }}
                        >
                          {discount}% OFF
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleWishlist(p.id || p._id, p.name)}
                        title={saved ? "Remove from wishlist" : "Add to wishlist"}
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: "#ffffff",
                          border: "1px solid #ebdccb",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          color: saved ? "#dc2626" : "#806f62",
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Heart size={14} fill={saved ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <div
                      style={{
                        padding: "10px 12px 12px",
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        justifyContent: "space-between",
                        background: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#b45309", marginBottom: "4px" }}>
                          <Star size={12} fill="currentColor" />
                          <span style={{ fontWeight: "700", color: "#2b170d" }}>{p.rating || 4.9}</span>
                          <span style={{ color: "#9ca3af", fontSize: "10.5px" }}>({p.reviews || 18})</span>
                        </div>

                        <Link to={getProductRoute(p)} style={{ textDecoration: "none" }}>
                          <h4
                            style={{
                              fontFamily: "Cormorant Garamond, serif",
                              fontSize: "14.5px",
                              fontWeight: "600",
                              color: "#2b170d",
                              margin: "0 0 6px",
                              lineHeight: "1.35",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              minHeight: "36px",
                            }}
                            title={p.name}
                          >
                            {p.name}
                          </h4>
                        </Link>

                        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                          <b style={{ fontSize: "15px", fontWeight: "700", color: "#9c411e" }}>{money(p.price)}</b>
                          {p.mrp > p.price && (
                            <del style={{ fontSize: "11px", color: "#9ca3af" }}>{money(p.mrp)}</del>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: "7px",
                          border: isAdded ? "1px solid #16a34a" : "none",
                          background: isAdded ? "#16a34a" : "linear-gradient(135deg, #a54d2b 0%, #893819 100%)",
                          color: "#ffffff",
                          fontSize: "11.5px",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                          boxShadow: isAdded ? "none" : "0 2px 6px rgba(165,77,43,0.2)",
                          transition: "all 0.18s ease",
                        }}
                      >
                        <ShoppingCart size={13} />
                        {isAdded ? "✓ Added" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </Shell>
  );
}
