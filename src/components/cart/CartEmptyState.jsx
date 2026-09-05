import React from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export function CartEmptyState() {
  return (
    <motion.div
      id="cart-empty-state-view"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "16px",
        padding: "48px 20px",
        textAlign: "center",
        boxShadow: "0 4px 20px rgba(43,23,13,0.04)",
        maxWidth: "540px",
        margin: "20px auto"
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "#fbf5ee",
          border: "1px solid #ebdccb",
          color: "#b88a58",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px"
        }}
      >
        <ShoppingBag size={30} strokeWidth={1.8} />
      </div>

      <h2
        style={{
          fontFamily: '"Cormorant Garamond", serif',
          fontSize: "26px",
          color: "#2b170d",
          margin: "0 0 8px",
          fontWeight: "700"
        }}
      >
        Your Sacred Bag is Empty
      </h2>

      <p
        style={{
          color: "#7a675a",
          fontSize: "13.5px",
          maxWidth: "380px",
          margin: "0 auto 20px",
          lineHeight: "1.4"
        }}
      >
        Explore our authentic Nepali Rudraksha beads, energized malas, and sacred spiritual items.
      </p>

      <Link
        to="/shop"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "12px",
          fontWeight: "800",
          fontSize: "14.5px",
          textDecoration: "none",
          boxShadow: "0 4px 14px rgba(184,138,88,0.3)"
        }}
      >
        <span>Explore Collection</span>
        <ArrowRight size={16} strokeWidth={2.2} />
      </Link>
    </motion.div>
  );
}
