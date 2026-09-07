import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Heart, ShoppingCart, User, Menu, X, Home, ShoppingBag, PackageCheck, MessageCircle } from "lucide-react";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { db, onStoreUpdate } from "../lib/db";
import { getOptimizedImageUrl, markProxyFailed } from "../lib/imageUtils";
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
  const [q, setQ] = useState("");
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

  const goSearch = (e) => {
    e?.preventDefault();
    const term = q.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
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
              <Link to="/wishlist" onPointerEnter={() => handlePreload("/wishlist")}>Wishlist</Link>
              <Link to="/shop?offer=1" onPointerEnter={() => handlePreload("/shop")}>Offers</Link>
              <Link to="/about" onPointerEnter={() => handlePreload("/about")}>About Us</Link>
              <Link to="/contact" onPointerEnter={() => handlePreload("/contact")}>Contact</Link>
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

          <div className="header-right">
            <form className="search desktop-search" onSubmit={goSearch}>
              <Search size={17}/>
              <input 
                placeholder="Search products..." 
                value={q} 
                onChange={(e)=>setQ(e.target.value)} 
                onFocus={() => handlePreload("/shop")}
              />
            </form>
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
          <form className="mobile-search-bar" onSubmit={goSearch}>
            <Search size={18}/>
            <input 
              autoFocus 
              placeholder="Search Rudraksha..." 
              value={q} 
              onChange={(e)=>setQ(e.target.value)} 
            />
            <button type="submit">Go</button>
          </form>
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
                  <Link to="/aura-ai" onClick={()=>setMenuOpen(false)} style={{ color: 'var(--copper)', fontWeight: '700' }}>✨ Aura AI Shopping Guide</Link>
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
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Home"
          >
            <div className="nav-icon-box"><Home size={22} strokeWidth={1.8} /></div>
            <span className="nav-label">Home</span>
          </Link>
          <Link 
            to="/shop" 
            className={isShopActive ? "active" : ""}
            onPointerEnter={() => handlePreload("/shop")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Shop"
          >
            <div className="nav-icon-box"><ShoppingBag size={22} strokeWidth={1.8} /></div>
            <span className="nav-label">Shop</span>
          </Link>
          <Link 
            to="/cart" 
            className={isCartActive ? "active" : ""}
            onPointerEnter={() => handlePreload("/cart")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Cart"
          >
            <div className="nav-icon-box" style={{ position: 'relative' }}>
              <ShoppingCart size={22} strokeWidth={1.8} />
              {count > 0 && <span className="mobile-nav-cart-badge">{count}</span>}
            </div>
            <span className="nav-label">Cart</span>
          </Link>
          <Link 
            to="/account/orders" 
            className={isOrdersActive ? "active" : ""}
            onPointerEnter={() => handlePreload("/account/orders")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Orders"
          >
            <div className="nav-icon-box"><PackageCheck size={22} strokeWidth={1.8} /></div>
            <span className="nav-label">Orders</span>
          </Link>
          <Link 
            to="/account" 
            className={isAccountActive ? "active" : ""}
            onPointerEnter={() => handlePreload("/account")}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Account"
          >
            <div className="nav-icon-box"><User size={22} strokeWidth={1.8} /></div>
            <span className="nav-label">Account</span>
          </Link>
        </div>
      )}
    </>
  );
}
