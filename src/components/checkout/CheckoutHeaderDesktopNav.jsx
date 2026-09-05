import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export const navLinkStyle = {
  fontSize: "13.5px",
  fontWeight: "600",
  color: "#3f2b20",
  textDecoration: "none",
  letterSpacing: "0.2px",
  transition: "color 0.2s ease"
};

export function CheckoutHeaderDesktopNav() {
  return (
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
  );
}
