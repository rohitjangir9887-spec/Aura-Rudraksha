import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../hooks/useCart";

export const mobileNavLinkStyle = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#2b170d",
  textDecoration: "none",
  padding: "6px 0"
};

export function CheckoutHeaderMobileMenu({ setMobileMenuOpen }) {
  const { count } = useCart();

  return (
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
  );
}
