import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ShieldCheck, 
  Lock, 
  Search, 
  User, 
  ShoppingCart, 
  Sparkles, 
  CheckCircle2,
  Menu,
  X
} from "lucide-react";
import { useCart } from "../../hooks/useCart";

/**
 * CheckoutHeader
 * Premium Indian spiritual luxury checkout header.
 * Displays top trust announcement strip, sacred Rudraksha brand identity,
 * primary shop navigation, search, account, and cart count.
 */
export function CheckoutHeader({ onOpenSearch }) {
  const { count } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="checkout-luxury-header" style={{ width: "100%", background: "#ffffff", borderBottom: "1px solid #e8dac9" }}>
      {/* 1. Top Trust Announcement Strip */}
      <div 
        style={{
          background: "linear-gradient(90deg, #2b170d 0%, #3e2213 50%, #2b170d 100%)",
          color: "#fbf6ef",
          fontSize: "12px",
          letterSpacing: "0.4px",
          padding: "7px 16px",
          textAlign: "center",
          borderBottom: "1px solid rgba(212, 163, 115, 0.25)"
        }}
      >
        <div 
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            flexWrap: "wrap"
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#22c55e", fontWeight: "800" }}>✓</span> Authentic Products
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#22c55e", fontWeight: "800" }}>✓</span> Lab Tested
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#22c55e", fontWeight: "800" }}>✓</span> Free Shipping
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#22c55e", fontWeight: "800" }}>✓</span> Secure Payments
          </span>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div 
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px"
        }}
      >
        {/* Left: Brand Identity / Sacred Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link 
            to="/" 
            style={{ 
              textDecoration: "none", 
              display: "flex", 
              alignItems: "center", 
              gap: "10px" 
            }}
          >
            {/* Sacred Emblem */}
            <div 
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "radial-gradient(circle, #b88a58 0%, #7a4a24 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 3px 10px rgba(122, 74, 36, 0.25)",
                border: "1.5px solid #dfc7af",
                flexShrink: 0
              }}
            >
              <span style={{ fontSize: "20px", fontFamily: '"Cormorant Garamond", serif', fontWeight: "700" }}>ॐ</span>
            </div>

            <div>
              <div 
                style={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: "24px",
                  fontWeight: "700",
                  letterSpacing: "1.5px",
                  color: "#2b170d",
                  lineHeight: "1.1"
                }}
              >
                AURA RUDRAKSHA
              </div>
              <div 
                style={{
                  fontSize: "9px",
                  fontWeight: "700",
                  letterSpacing: "1.8px",
                  color: "#8c6b54",
                  textTransform: "uppercase"
                }}
              >
                Sacred Himalayan Seeds • Lab Certified
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav 
          className="desktop-checkout-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "22px"
          }}
        >
          <Link to="/" style={navLinkStyle}>Home</Link>
          <Link to="/shop" style={navLinkStyle}>Shop</Link>
          <Link to="/shop?category=Rudraksha" style={navLinkStyle}>Rudraksha</Link>
          <Link to="/shop?category=Mala" style={navLinkStyle}>Mala</Link>
          <Link to="/shop?category=Accessories" style={navLinkStyle}>Accessories</Link>
          <Link 
            to="/shop?offer=1" 
            style={{ 
              ...navLinkStyle, 
              color: "#b85d25", 
              fontWeight: "700",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <Sparkles size={13} />
            <span>Offers</span>
          </Link>
        </nav>

        {/* Right: Search, Account, Cart & Security Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Search Form (Desktop) */}
          <form 
            onSubmit={handleSearchSubmit}
            className="desktop-checkout-search"
            style={{
              position: "relative",
              width: "190px"
            }}
          >
            <input 
              type="text"
              placeholder="Search Rudraksha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: "20px",
                border: "1px solid #d4c5b9",
                background: "#fcfaf7",
                fontSize: "12px",
                outline: "none",
                color: "#2b170d"
              }}
            />
            <Search 
              size={14} 
              style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#8c796d" }} 
            />
          </form>

          {/* Account Icon */}
          <Link 
            to="/account" 
            aria-label="My Account"
            style={{
              color: "#2b170d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "7px",
              borderRadius: "50%",
              background: "#fcf8f3",
              border: "1px solid #efe4d5",
              textDecoration: "none"
            }}
          >
            <User size={17} />
          </Link>

          {/* Cart Icon with Count */}
          <Link 
            to="/cart" 
            aria-label="Shopping Cart"
            style={{
              position: "relative",
              color: "#2b170d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "7px",
              borderRadius: "50%",
              background: "#fcf8f3",
              border: "1px solid #efe4d5",
              textDecoration: "none"
            }}
          >
            <ShoppingCart size={17} />
            {count > 0 && (
              <span 
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  background: "#b85d25",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: "800",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.15)"
                }}
              >
                {count}
              </span>
            )}
          </Link>

          {/* Bank-Grade PayU Verified Indicator */}
          <div 
            className="checkout-ssl-pill"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#eef9f2",
              border: "1px solid #cce8d4",
              color: "#166534",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "700"
            }}
          >
            <Lock size={12} color="#16a34a" />
            <span>PayU 256-Bit SSL</span>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="mobile-checkout-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            style={{
              display: "none",
              background: "none",
              border: "none",
              color: "#2b170d",
              padding: "6px",
              cursor: "pointer"
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div 
          style={{
            background: "#fffdfa",
            borderTop: "1px solid #efe4d5",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >
          <Link to="/" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Home</Link>
          <Link to="/shop" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Shop All</Link>
          <Link to="/shop?category=Rudraksha" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Rudraksha Beads</Link>
          <Link to="/shop?category=Mala" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Sacred Malas</Link>
          <Link to="/shop?category=Accessories" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Accessories</Link>
          <Link to="/shop?offer=1" onClick={() => setMobileMenuOpen(false)} style={{ ...mobileNavLinkStyle, color: "#b85d25", fontWeight: "700" }}>Offers & Discounts</Link>
          <Link to="/cart" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Cart ({count})</Link>
        </div>
      )}
    </header>
  );
}

const navLinkStyle = {
  fontSize: "13.5px",
  fontWeight: "600",
  color: "#3f2b20",
  textDecoration: "none",
  letterSpacing: "0.2px",
  transition: "color 0.2s ease"
};

const mobileNavLinkStyle = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#2b170d",
  textDecoration: "none",
  padding: "6px 0"
};
