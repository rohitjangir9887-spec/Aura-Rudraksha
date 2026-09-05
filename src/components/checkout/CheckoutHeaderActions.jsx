import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, ShoppingCart, Lock, Menu, X } from "lucide-react";
import { useCart } from "../../hooks/useCart";

export function CheckoutHeaderActions({ mobileMenuOpen, setMobileMenuOpen }) {
  const { count } = useCart();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
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
  );
}
