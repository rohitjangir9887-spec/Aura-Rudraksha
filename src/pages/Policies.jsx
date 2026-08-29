import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { ShieldCheck, Truck, RotateCcw, FileText, ArrowLeft, Headphones } from "lucide-react";
import { db, onStoreUpdate } from "../lib/db";

export function Policies() {
  const location = useLocation();
  const path = location.pathname;

  let initialTab = "shipping";
  if (path.includes("return")) initialTab = "returns";
  else if (path.includes("privacy")) initialTab = "privacy";
  else if (path.includes("terms")) initialTab = "terms";
  else if (path.includes("support")) initialTab = "support";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [policies, setPolicies] = useState(() => db.getPolicies());

  useEffect(() => {
    setPolicies(db.getPolicies());
    const unsub = onStoreUpdate(() => {
      setPolicies(db.getPolicies());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (path.includes("return")) setActiveTab("returns");
    else if (path.includes("privacy")) setActiveTab("privacy");
    else if (path.includes("terms")) setActiveTab("terms");
    else if (path.includes("shipping")) setActiveTab("shipping");
    else if (path.includes("support")) setActiveTab("support");
    window.scrollTo(0, 0);
  }, [path]);

  const getButtonStyle = (tabName) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    borderRadius: "30px",
    border: activeTab === tabName ? "1.5px solid #7a320c" : "1.5px solid #e8dac9",
    background: activeTab === tabName ? "#7a320c" : "#fff",
    color: activeTab === tabName ? "#fff" : "#4a3b32",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s"
  });

  return (
    <Shell>
      <div className="container" style={{ padding: "40px 16px 80px", maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#8c3208", fontWeight: "600", textDecoration: "none" }}>
            <ArrowLeft size={16} /> Back to Store
          </Link>
        </div>

        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span style={{ fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: "#8c3208", fontWeight: "700" }}>
            Aura Rudraksha Assurance
          </span>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "38px", color: "#2b170d", margin: "8px 0 12px" }}>
            Store Policies & Customer Care
          </h1>
          <p style={{ color: "#6b584c", fontSize: "15px", maxWidth: "600px", margin: "0 auto" }}>
            Transparent guidelines designed to ensure absolute peace of mind for every sacred purchase.
          </p>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "36px",
          flexWrap: "wrap",
          borderBottom: "1px solid #e8dac9",
          paddingBottom: "16px"
        }}>
          <button onClick={() => setActiveTab("shipping")} style={getButtonStyle("shipping")}>
            <Truck size={16} /> Shipping Policy
          </button>

          <button onClick={() => setActiveTab("returns")} style={getButtonStyle("returns")}>
            <RotateCcw size={16} /> Return & Refund
          </button>

          <button onClick={() => setActiveTab("privacy")} style={getButtonStyle("privacy")}>
            <ShieldCheck size={16} /> Privacy Policy
          </button>

          <button onClick={() => setActiveTab("terms")} style={getButtonStyle("terms")}>
            <FileText size={16} /> Terms & Conditions
          </button>

          <button onClick={() => setActiveTab("support")} style={getButtonStyle("support")}>
            <Headphones size={16} /> Contact Support
          </button>
        </div>

        {/* Content Box */}
        <div style={{
          background: "#fff",
          border: "1px solid #e8dac9",
          borderRadius: "16px",
          padding: "32px 28px",
          boxShadow: "0 8px 30px rgba(43,23,13,0.04)"
        }}>
          {activeTab === "shipping" && (
            <div>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "28px", color: "#2b170d", marginBottom: "16px" }}>
                Shipping & Delivery Policy
              </h2>
              <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "14px" }}>
                {policies.shippingPolicy}
              </div>
            </div>
          )}

          {activeTab === "returns" && (
            <div>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "28px", color: "#2b170d", marginBottom: "16px" }}>
                Return & Refund Policy
              </h2>
              <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "14px" }}>
                {policies.returnPolicy}
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "28px", color: "#2b170d", marginBottom: "16px" }}>
                Privacy Policy & Security
              </h2>
              <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "14px" }}>
                {policies.privacyPolicy}
              </div>
            </div>
          )}

          {activeTab === "terms" && (
            <div>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "28px", color: "#2b170d", marginBottom: "16px" }}>
                Terms & Conditions of Service
              </h2>
              <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "14px" }}>
                {policies.termsPolicy}
              </div>
            </div>
          )}

          {activeTab === "support" && (
            <div>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "28px", color: "#2b170d", marginBottom: "16px" }}>
                Contact Support & Care
              </h2>
              <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "14px" }}>
                {policies.contactSupport}
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
