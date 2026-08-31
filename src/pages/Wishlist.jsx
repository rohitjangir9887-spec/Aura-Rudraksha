import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useWishlist } from "../hooks/useWishlist";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { db, onStoreUpdate } from "../lib/db";
import { money, pct } from "../data";
import { Heart, ShoppingCart, Trash2, ArrowRight, Star, ShoppingBag } from "lucide-react";

export function Wishlist() {
  const { wishlist, toggleWishlist } = useWishlist();
  const { add } = useCart();
  const [products, setProducts] = useState([]);
  const [addedIds, setAddedIds] = useState({});

  const loadProducts = () => {
    setProducts(db.getProducts());
  };

  useEffect(() => {
    loadProducts();
    const unsub = onStoreUpdate(() => loadProducts());
    return () => unsub();
  }, []);

  const wishlistedProducts = products.filter((p) => wishlist.includes(String(p.id)));

  const handleAddToCart = (p) => {
    add(p.id, 1);
    setAddedIds((prev) => ({ ...prev, [p.id]: true }));
    emitToast(`${p.name} added to cart`, "success");
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [p.id]: false }));
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
          <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
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

            {/* Recommended Products for Empty Wishlist */}
            {products.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
                  <div>
                    <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "24px", color: "#2b170d", margin: "0 0 4px" }}>
                      Popular Sacred Beads You Might Like
                    </h3>
                    <p style={{ fontSize: "12.5px", color: "#806f62", margin: 0 }}>
                      Most energized and cherished Nepali Rudrakshas
                    </p>
                  </div>
                  <Link to="/shop" className="outline-btn" style={{ fontSize: "11.5px" }}>
                    View All
                  </Link>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: "18px",
                  }}
                >
                  {products.slice(0, 4).map((p) => {
                    const displayImage = p.img || (p.images && p.images.length > 0 ? p.images[0] : "") || "/images/product-5mukhi.jpg";
                    const isAdded = !!addedIds[p.id];
                    return (
                      <div
                        key={p.id}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #ebdccb",
                          borderRadius: "14px",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
                        }}
                      >
                        <div style={{ height: "180px", background: "#f5eee6", overflow: "hidden" }}>
                          <Link to={`/product/${p.id}`}>
                            <img
                              src={displayImage}
                              alt={p.name}
                              onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </Link>
                        </div>
                        <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <Link to={`/product/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                              <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "17px", color: "#2b170d", margin: "0 0 6px" }}>
                                {p.name}
                              </h4>
                            </Link>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                              <b style={{ fontSize: "14.5px", color: "#a54d2b" }}>{money(p.price)}</b>
                              {p.mrp && <del style={{ fontSize: "11.5px", color: "#806f62" }}>{money(p.mrp)}</del>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(p)}
                            style={{
                              width: "100%",
                              padding: "8px",
                              borderRadius: "8px",
                              border: isAdded ? "1px solid #20a95a" : "none",
                              background: isAdded ? "#20a95a" : "#a54d2b",
                              color: "#ffffff",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                            }}
                          >
                            <ShoppingCart size={14} />
                            {isAdded ? "✓ Added" : "Add to Cart"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "24px",
            }}
          >
            {wishlistedProducts.map((p) => {
              const displayImage = p.img || (p.images && p.images.length > 0 ? p.images[0] : "") || "/images/product-5mukhi.jpg";
              const isAdded = !!addedIds[p.id];
              const discount = pct(p);

              return (
                <div
                  key={p.id}
                  style={{
                    background: "#fffdf9",
                    border: "1px solid #e8e0d8",
                    borderRadius: "14px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
                    position: "relative",
                  }}
                >
                  <div style={{ position: "relative", height: "220px", background: "#f5eee6", overflow: "hidden" }}>
                    <Link to={`/product/${p.id}`}>
                      <img
                        src={displayImage}
                        alt={p.name}
                        onError={(e) => {
                          e.target.src = "/images/product-5mukhi.jpg";
                        }}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </Link>
                    {p.badge && (
                      <span
                        style={{
                          position: "absolute",
                          top: "12px",
                          left: "12px",
                          background: "#a54d2b",
                          color: "#fff",
                          fontSize: "10px",
                          fontWeight: "700",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
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
                        top: "12px",
                        right: "12px",
                        background: "#ffffff",
                        border: "none",
                        width: "34px",
                        height: "34px",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        color: "#dc2626",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ padding: "18px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#d97706", marginBottom: "6px" }}>
                      <Star size={14} fill="currentColor" />
                      <span style={{ fontWeight: "600", color: "#2b170d" }}>{p.rating || 4.9}</span>
                      <span style={{ color: "#806f62" }}>({p.reviews || 0})</span>
                    </div>

                    <Link to={`/product/${p.id}`} style={{ textDecoration: "none" }}>
                      <h3
                        style={{
                          fontFamily: "Cormorant Garamond, serif",
                          fontSize: "20px",
                          color: "#2b170d",
                          margin: "0 0 10px",
                          lineHeight: "1.3",
                          fontWeight: "600",
                        }}
                      >
                        {p.name}
                      </h3>
                    </Link>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "auto", marginBottom: "16px" }}>
                      <b style={{ fontSize: "18px", color: "#2b170d" }}>{money(p.price)}</b>
                      {p.mrp > p.price && (
                        <del style={{ fontSize: "12px", color: "#958277" }}>{money(p.mrp)}</del>
                      )}
                      {discount > 0 && (
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "#20a95a", background: "#e8f7ee", padding: "2px 6px", borderRadius: "4px" }}>
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        style={{
                          padding: "10px",
                          borderRadius: "8px",
                          border: isAdded ? "1px solid #20a95a" : "none",
                          background: isAdded ? "#20a95a" : "#a54d2b",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.2s",
                        }}
                      >
                        <ShoppingCart size={15} />
                        {isAdded ? "✓ Added" : "Add to Cart"}
                      </button>
                      <Link
                        to={`/product/${p.id}`}
                        className="outline-btn"
                        style={{ padding: "10px 12px", fontSize: "12px", display: "grid", placeItems: "center" }}
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
      </main>
    </Shell>
  );
}
