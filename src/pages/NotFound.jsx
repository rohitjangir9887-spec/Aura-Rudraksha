import React from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Compass, ArrowLeft, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

export function NotFound() {
  return (
    <Shell>
      <main className="page" style={{ minHeight: "65vh", display: "grid", placeItems: "center", padding: "60px 16px" }}>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            maxWidth: 500,
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #f2e6d9",
            borderRadius: "16px",
            padding: "40px 24px",
            boxShadow: "0 10px 30px rgba(100, 60, 30, 0.05)"
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#faf4ed",
              border: "1px solid #ebd8c5",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 20px",
              color: "#a54d2b"
            }}
          >
            <Compass size={32} />
          </div>

          <h1
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "32px",
              fontWeight: 700,
              color: "#2b170d",
              margin: "0 0 10px"
            }}
          >
            Page Not Found
          </h1>

          <p style={{ fontSize: "14px", color: "#806f62", lineHeight: 1.6, margin: "0 0 28px" }}>
            The page or divine Rudraksha collection you are looking for may have been moved, renamed, or is currently unavailable.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/"
              className="outline-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "99px",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              <ArrowLeft size={16} /> Back to Home
            </Link>

            <Link
              to="/shop"
              className="primary-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 22px",
                borderRadius: "99px",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              <ShoppingBag size={16} /> Explore Shop
            </Link>
          </div>
        </motion.div>
      </main>
    </Shell>
  );
}
