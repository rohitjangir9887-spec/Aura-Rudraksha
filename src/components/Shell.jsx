import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Heart, ShoppingCart, User, Menu, X, Home, ShoppingBag, PackageCheck, MessageCircle } from "lucide-react";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { db, onStoreUpdate } from "../lib/db";
import { getOptimizedImageUrl, getProductPrimaryImage, markProxyFailed } from "../lib/imageUtils";
import { extractMukhiNumber } from "../lib/searchUtils";
import { Footer } from "./Footer";
import { TopOfferStrip } from "./TopOfferStrip";
import { AuraAIPill } from "./AuraAIPill";
import { motion, AnimatePresence } from "framer-motion";
import { useActiveOffer } from "../hooks/useActiveOffer";
import { prefetchPath, prefetchRoute } from "../lib/prefetchRoutes";

export function Shell({children}) {
  const { count } = useCart();
  const { count: wishlistCount } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [q, setQ] = useState("");
  const searchWrapRef = useRef(null);
  const [settings, setSettings] = useState(() => db.getSettings());
  const { offer } = useActiveOffer();
  const [activeOffer, setActiveOffer] = useState(() => db.getActiveOffer());

  useEffect(() => {
    const unsub = onStoreUpdate(() => {
      const freshSettings = db.getSettings();
      setSettings((prev) => {
        if (
          prev &&
          prev.freeShippingThreshold === freshSettings?.freeShippingThreshold &&
          prev.supportPhone === freshSettings?.supportPhone &&
          prev.supportEmail === freshSettings?.supportEmail
        ) {
          return prev;
        }
        return freshSettings;
      });
      const freshOffer = db.getActiveOffer();
      setActiveOffer((prev) => {
        if (prev?.id === freshOffer?.id && prev?.updatedAt === freshOffer?.updatedAt) {
          return prev;
        }
        return freshOffer;
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const term = q.trim();
    if (!term) return [];
    return db.searchProducts(term).slice(0, 6);
  }, [q]);

  const handlePreload = useCallback((path) => {
    prefetchPath(path);
  }, []);

  const supportPhone = settings.supportPhone || "+91 9672996531";
  const supportEmail = settings.supportEmail || "aurarudrakshaofficial@gmail.com";
  const waCleanPhone = supportPhone.replace(/[^0-9]/g, "");

  const isHomeActive = pathname === "/";
  const isShopActive = pathname === "/shop";
  const isCartActive = pathname === "/cart";
  const isWishlistActive = pathname === "/wishlist";
  const isOrdersActive = pathname.startsWith("/account/orders");
  const isAccountActive = (pathname === "/account" || pathname.startsWith("/account")) && !isOrdersActive;

  const openProductDirect = (product) => {
    if (!product) return;
    const targetSlug = product.slug || product.id;
    setSearchFocused(false);
    setSearchOpen(false);
    setMenuOpen(false);
    navigate(`/product/${encodeURIComponent(targetSlug)}`);
  };

  const goSearch = (e) => {
    e?.preventDefault();
    const term = q.trim();
    if (!term) {
      navigate("/shop");
      setSearchFocused(false);
      setSearchOpen(false);
      setMenuOpen(false);
      return;
    }

    const matches = db.searchProducts(term);
    const mukhiNum = extractMukhiNumber(term);
    const lowerTerm = term.toLowerCase();

    if (matches.length === 1) {
      openProductDirect(matches[0]);
      return;
    }

    if (matches.length > 0) {
      const top = matches[0];
      const topName = (top.name || "").toLowerCase();
      const topSlug = (top.slug || "").toLowerCase();
      const isExactDirectMatch =
        topName === lowerTerm ||
        topSlug === lowerTerm ||
        String(top.id).toLowerCase() === lowerTerm ||
        (mukhiNum !== null && !lowerTerm.includes("mala") && Number(top.mukhi) === mukhiNum);

      if (isExactDirectMatch) {
        openProductDirect(top);
        return;
      }
    }

    navigate(`/shop?q=${encodeURIComponent(term)}`);
    setSearchFocused(false);
    setSearchOpen(false);
    setMenuOpen(false);
  };

  return (
    <>
      <div className="app">
        <TopOfferStrip />
        {offer?.marqueeEnabled !== false && (
          <div className="announce">
            <div className="announce-marquee">
              <span>✓ 100% Authentic | 🔬 Lab Tested | 🚚 Free Shipping | 🔒 Secure Payment | ❤️ Support | 📞 {supportPhone}</span>
              <span>✓ 100% Authentic | 🔬 Lab Tested | 🚚 Free Shipping | 🔒 Secure Payment | ❤️ Support | 📞 {supportPhone}</span>
            </div>
          </div>
        )}
        <header className="header glass-header">
          <div className="header-left">
            <button 
              className="mobile-menu" 
              aria-label="Menu" 
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              <Menu size={24}/>
            </button>
            <nav className="desktop-nav">
              <Link to="/" onPointerEnter={() => handlePreload("/")}>Home</Link>
              <Link to="/shop" onPointerEnter={() => handlePreload("/shop")}>Shop</Link>
              <Link to="/japa" onPointerEnter={() => handlePreload("/japa")} style={{ color: "var(--copper)", fontWeight: 700 }}>108 जप माला</Link>
              <Link to="/compare" onPointerEnter={() => handlePreload("/compare")}>तुलना</Link>
              <Link to="/pran-pratishtha" onPointerEnter={() => handlePreload("/pran-pratishtha")}>धारण विधि</Link>
              <Link to="/shop?offer=1" onPointerEnter={() => handlePreload("/shop")}>Offers</Link>
            </nav>
          </div>
          
          <div className="header-center">
            <Link className="brand" to="/" aria-label="Aura Rudraksha Home" onPointerEnter={() => handlePreload("/")}>
              <img 
                src={getOptimizedImageUrl("https://i.ibb.co/Q3C3gZTd/file-00000000fb188211907f8ce113ccb17a.png", { width: 360, quality: 85 })} 
                alt="Aura Rudraksha" 
                className="brand-logo-img" 
                referrerPolicy="no-referrer"
                onError={(e) => { 
                  const raw = "https://i.ibb.co/Q3C3gZTd/file-00000000fb188211907f8ce113ccb17a.png";
                  markProxyFailed(raw);
                  const target = e.currentTarget;
                  if (target.src.includes("wsrv.nl")) {
                    target.src = raw;
                  } else if (!target.src.includes("logo-header-horizontal.png")) { 
                    target.src = "/logo-header-horizontal.png"; 
                  } 
                }}
              />
            </Link>
          </div>

          <div className="header-right" ref={searchWrapRef}>
            <div style={{ position: "relative" }}>
              <form className="search desktop-search" onSubmit={goSearch}>
                <Search size={17}/>
                <input 
                  placeholder="Search Rudraksha (e.g. 5 Mukhi)..." 
                  value={q} 
                  onChange={(e) => {
                    setQ(e.target.value);
                    setSearchFocused(true);
                  }} 
                  onFocus={() => {
                    setSearchFocused(true);
                    handlePreload("/shop");
                  }}
                />
              </form>
              {searchFocused && q.trim() && searchResults.length > 0 && (
                <div
                  className="search-suggestions-dropdown"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "320px",
                    maxHeight: "380px",
                    overflowY: "auto",
                    background: "#FFFDF9",
                    border: "1px solid rgba(212, 175, 55, 0.35)",
                    borderRadius: "14px",
                    boxShadow: "0 14px 34px rgba(45, 22, 10, 0.16)",
                    zIndex: 1200,
                    padding: "6px"
                  }}
                >
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openProductDirect(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "8px 10px",
                        border: "none",
                        background: "transparent",
                        borderRadius: "10px",
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                    >
                      <img
                        src={getProductPrimaryImage(item)}
                        alt={item.name}
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "8px",
                          objectFit: "cover",
                          border: "1px solid rgba(212,175,55,0.25)",
                          flexShrink: 0
                        }}
                        onError={(e) => {
                          e.currentTarget.src = "/images/placeholder.svg";
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#2A1810", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#8C3E1E", fontWeight: 600 }}>
                          ₹{Number(item.price || 0).toLocaleString("en-IN")} • {item.category || "Sacred Rudraksha"}
                        </div>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
                      setSearchFocused(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      marginTop: "4px",
                      border: "none",
                      borderTop: "1px solid rgba(212,175,55,0.2)",
                      background: "transparent",
                      color: "#8C3E1E",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    View all results for "{q.trim()}" →
                  </button>
                </div>
              )}
            </div>
            <button 
              className="mobile-search" 
              aria-label="Search" 
              onClick={() => setSearchOpen(s => !s)}
              type="button"
            >
              <Search size={22}/>
            </button>
            
            {/* Aura AI Header Entry Pill */}
            <AuraAIPill />

            <Link 
              className="cart-icon" 
              to="/wishlist" 
              aria-label="Wishlist" 
              title="Wishlist"
              onPointerEnter={() => handlePreload("/wishlist")}
              onTouchStart={() => handlePreload("/wishlist")}
            >
              <Heart size={22}/>
              {wishlistCount > 0 && <b>{wishlistCount}</b>}
            </Link>

            <Link 
              className="cart-icon" 
              to="/cart" 
              aria-label="Cart" 
              title="Cart"
              onPointerEnter={() => handlePreload("/cart")}
              onTouchStart={() => handlePreload("/cart")}
            >
              <ShoppingCart size={22}/>
              <b>{count}</b>
            </Link>

            <Link 
              to="/account" 
              className="user-icon" 
              aria-label="My Account & Settings" 
              title="Account"
              onPointerEnter={() => handlePreload("/account")}
              onTouchStart={() => handlePreload("/account")}
            >
              <User size={22}/>
            </Link>
          </div>
        </header>

        {searchOpen && (
          <div style={{ position: "relative", zIndex: 1100 }}>
            <form className="mobile-search-bar" onSubmit={goSearch}>
              <Search size={18}/>
              <input 
                autoFocus 
                placeholder="Search Rudraksha (e.g. 5 Mukhi)..." 
                value={q} 
                onChange={(e)=>setQ(e.target.value)} 
              />
              <button type="submit">Go</button>
            </form>
            {q.trim() && searchResults.length > 0 && (
              <div
                style={{
                  background: "#FFFDF9",
                  borderBottom: "1px solid rgba(212, 175, 55, 0.35)",
                  boxShadow: "0 12px 28px rgba(45, 22, 10, 0.14)",
                  padding: "6px 12px",
                  maxHeight: "320px",
                  overflowY: "auto"
                }}
              >
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openProductDirect(item)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      width: "100%",
                      padding: "8px 6px",
                      border: "none",
                      borderBottom: "1px solid rgba(212,175,55,0.12)",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <img
                      src={getProductPrimaryImage(item)}
                      alt={item.name}
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "8px",
                        objectFit: "cover",
                        border: "1px solid rgba(212,175,55,0.25)",
                        flexShrink: 0
                      }}
                      onError={(e) => {
                        e.currentTarget.src = "/images/placeholder.svg";
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#2A1810", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#8C3E1E", fontWeight: 600 }}>
                        ₹{Number(item.price || 0).toLocaleString("en-IN")} • {item.category || "Sacred Rudraksha"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {menuOpen && (
            <motion.div className="drawer-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setMenuOpen(false)}>
              <motion.aside className="side-drawer" initial={{x:-280}} animate={{x:0}} exit={{x:-280}} transition={{type:"spring", stiffness:280, damping:28}} onClick={e=>e.stopPropagation()}>
                <div className="drawer-top">
                  <strong>Aura Rudraksha</strong>
                  <button onClick={()=>setMenuOpen(false)} aria-label="Close" type="button"><X size={20}/></button>
                </div>
                <nav>
                  <Link to="/" onClick={()=>setMenuOpen(false)}>Home</Link>
                  <Link to="/japa" onClick={()=>setMenuOpen(false)} style={{ color: 'var(--copper)', fontWeight: '700' }}>📿 108 डिजिटल जप माला</Link>
                  <Link to="/compare" onClick={()=>setMenuOpen(false)}>⚖️ रुद्राक्ष तुलना मैट्रिक्स</Link>
                  <Link to="/pran-pratishtha" onClick={()=>setMenuOpen(false)}>📜 प्राण-प्रतिष्ठा व धारण विधि</Link>
                  <Link to="/rudraksha-calculator" onClick={()=>setMenuOpen(false)}>✨ वैदिक कुंडली कैलकुलेटर</Link>
                  <Link to="/shop" onClick={()=>setMenuOpen(false)}>Shop Catalog</Link>
                  <Link to="/wishlist" onClick={()=>setMenuOpen(false)}>My Wishlist ({wishlistCount})</Link>
                  <Link to="/shop?offer=1" onClick={()=>setMenuOpen(false)}>Special Offers</Link>
                  <Link to="/about" onClick={()=>setMenuOpen(false)}>About Us</Link>
                  <Link to="/contact" onClick={()=>setMenuOpen(false)}>Contact Support</Link>
                  <Link to="/account" onClick={()=>setMenuOpen(false)}>Account & Settings</Link>
                </nav>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="main-content">
          {children}
        </div>

        <Footer />
      </div>

      {/* Hide bottom mobile navigation ONLY on checkout/payment pages */}
      {!pathname.startsWith("/checkout") && (
        <div className="mobile-nav" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10005,
          pointerEvents: 'auto',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))'
        }}>
          <Link 
            to="/" 
            className={isHomeActive ? "active" : ""}
            onPointerEnter={() => handlePreload("/")}
            onTouchStart={() => handlePreload("/")}
            onPointerDown={() => handlePreload("/")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Home"
          >
            <div className="nav-icon-box"><Home size={22} strokeWidth={1.8} style={{ pointerEvents: 'none' }} /></div>
            <span className="nav-label">Home</span>
          </Link>
          <Link 
            to="/shop" 
            className={isShopActive ? "active" : ""}
            onPointerEnter={() => handlePreload("/shop")}
            onTouchStart={() => handlePreload("/shop")}
            onPointerDown={() => handlePreload("/shop")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Shop"
          >
            <div className="nav-icon-box"><ShoppingBag size={22} strokeWidth={1.8} style={{ pointerEvents: 'none' }} /></div>
            <span className="nav-label">Shop</span>
          </Link>
          <Link 
            to="/cart" 
            className={isCartActive ? "active" : ""}
            onPointerEnter={() => handlePreload("/cart")}
            onTouchStart={() => handlePreload("/cart")}
            onPointerDown={() => handlePreload("/cart")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Cart"
          >
            <div className="nav-icon-box" style={{ position: 'relative' }}>
              <ShoppingCart size={22} strokeWidth={1.8} style={{ pointerEvents: 'none' }} />
              {count > 0 && <span className="mobile-nav-cart-badge">{count}</span>}
            </div>
            <span className="nav-label">Cart</span>
          </Link>
          <Link 
            to="/account/orders" 
            className={isOrdersActive ? "active" : ""}
            onPointerEnter={() => handlePreload("/account/orders")}
            onTouchStart={() => handlePreload("/account/orders")}
            onPointerDown={() => handlePreload("/account/orders")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Orders"
          >
            <div className="nav-icon-box"><PackageCheck size={22} strokeWidth={1.8} style={{ pointerEvents: 'none' }} /></div>
            <span className="nav-label">Orders</span>
          </Link>
          <Link 
            to="/account" 
            className={isAccountActive ? "active" : ""}
            onPointerEnter={() => handlePreload("/account")}
            onTouchStart={() => handlePreload("/account")}
            onPointerDown={() => handlePreload("/account")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Account"
          >
            <div className="nav-icon-box"><User size={22} strokeWidth={1.8} style={{ pointerEvents: 'none' }} /></div>
            <span className="nav-label">Account</span>
          </Link>
        </div>
      )}
    </>
  );
}
