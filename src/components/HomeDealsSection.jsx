import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Copy, Check, Tag, ShieldCheck, Gift } from "lucide-react";
import { db, onStoreUpdate } from "../lib/db";
import { emitToast } from "../context/ToastContext";
import { motion } from "framer-motion";

export function HomeDealsSection() {
  const [deals, setDeals] = useState([]);
  const [copiedCode, setCopiedCode] = useState("");

  const loadDeals = () => {
    const now = Date.now();
    const activeDeals = db.getOffers().filter(o => {
      if (o.status !== "Active") return false;
      if (o.startDate && new Date(o.startDate).getTime() > now) return false;
      if (o.expiry && new Date(o.expiry).getTime() <= now) return false;
      return true;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));

    setDeals(activeDeals);
  };

  useEffect(() => {
    loadDeals();
    const unsub = onStoreUpdate(loadDeals);
    return () => unsub();
  }, []);

  if (!deals || deals.length === 0) return null;

  const handleCopy = (e, code) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!code) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).catch(() => {});
      } else {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.left = "-999999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch (_) {}
    setCopiedCode(code);
    emitToast(`Coupon code ${code} copied to clipboard! ✨`, "success");
    setTimeout(() => setCopiedCode(""), 2400);
  };

  return (
    <section className="section home-deals-section container" aria-label="Exclusive Home Deals">
      <div className="section-heading">
        <div>
          <span style={{ color: "#c89b3c", letterSpacing: "1.5px", fontSize: "11px", fontWeight: 700 }}>
            SACRED OFFERS &amp; DEALS
          </span>
          <h2 style={{ fontSize: "28px", margin: "4px 0", color: "#2b170d" }}>
            Special Consecrated Deals
          </h2>
          <p style={{ color: "#7a6b61", fontSize: "14px", margin: 0 }}>
            Handcrafted Himalayan Rudrakshas with authentic lab certificates and special blessings
          </p>
        </div>
      </div>

      <div className="home-deals-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "18px",
        marginTop: "16px"
      }}>
        {deals.map((deal) => {
          const isCopied = copiedCode === deal.couponCode;
          const bg = deal.theme === "dark" 
            ? "linear-gradient(135deg, #261309 0%, #150904 100%)" 
            : deal.theme === "gold"
            ? "linear-gradient(135deg, #3d220f 0%, #201007 100%)"
            : "linear-gradient(135deg, #fdfaf6 0%, #f7eee4 100%)";
          
          const isDark = deal.theme === "dark" || deal.theme === "gold" || !deal.theme;
          const textCol = isDark ? "#fbf5ef" : "#2b170d";
          const borderCol = isDark ? "#4d2612" : "#ebd8c5";

          return (
            <motion.div
              key={deal.id}
              className="home-deal-card"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
              style={{
                background: bg,
                borderRadius: "16px",
                border: `1.5px solid ${borderCol}`,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(43,23,13,0.08)"
              }}
            >


              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  {deal.label && (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(200, 155, 60, 0.18)",
                      border: "1px solid rgba(200, 155, 60, 0.4)",
                      color: "#c89b3c",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700
                    }}>
                      <Sparkles size={11} /> {deal.label}
                    </span>
                  )}
                  {deal.discountValue > 0 && (
                    <span style={{
                      background: "#c89b3c",
                      color: "#1a0d06",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "11px",
                      fontWeight: 800
                    }}>
                      {deal.type === "Percentage" ? `${deal.discountValue}% OFF` : `₹${deal.discountValue} OFF`}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0", color: textCol }}>
                  {deal.title}
                </h3>
                {deal.description && (
                  <p style={{ fontSize: "13px", color: isDark ? "#d9c8bc" : "#685b52", margin: "0 0 14px 0", lineHeight: "1.45" }}>
                    {deal.description}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                {deal.couponCode ? (
                  <button
                    type="button"
                    onClick={(e) => handleCopy(e, deal.couponCode)}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px dashed #c89b3c",
                      color: textCol,
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 700
                    }}
                    title="Click to copy coupon code"
                  >
                    {isCopied ? <Check size={13} color="#22c55e" /> : <Copy size={13} color="#c89b3c" />}
                    <span>{deal.couponCode}</span>
                    <small style={{ color: isCopied ? "#22c55e" : "#c89b3c", fontSize: "10px" }}>
                      {isCopied ? "COPIED!" : "COPY"}
                    </small>
                  </button>
                ) : <div />}

                <Link
                  to={deal.link || "/shop"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#c89b3c",
                    color: "#1a0d06",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    textDecoration: "none"
                  }}
                >
                  <span>{deal.buttonText || "Shop Now"}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
