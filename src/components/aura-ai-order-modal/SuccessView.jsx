import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Home, ShieldCheck, Sparkles, Truck } from "lucide-react";

export function SuccessView({ orderComplete, product, qty = 1, finalAmount = 0, address, city, pincode, onClose }) {
  const safeFinal = Math.max(0, Number(finalAmount) || 0);
  const safeQty = Math.max(1, Number(qty) || 1);
  const prodName = product?.name || "Sacred Himalayan Rudraksha";
  const orderId = orderComplete?.id || orderComplete?.orderId || "AR-" + Date.now().toString().slice(-6);

  return (
    <div className="aura-ai-order-success-view">
      <div className="aura-ai-order-success-icon">
        <CheckCircle2 size={44} />
      </div>
      <h3>Order Confirmed with Blessings! 🙏</h3>
      <p className="aura-ai-order-id-tag">
        Order ID: <b>#{orderId}</b>
      </p>
      <div className="aura-ai-order-success-box">
        <div className="aura-ai-order-success-item">
          <span>Item:</span>
          <strong>{prodName} (x{safeQty})</strong>
        </div>
        <div className="aura-ai-order-success-item">
          <span>Total Amount:</span>
          <strong className="aura-ai-gold-text">₹{safeFinal.toLocaleString('en-IN')}</strong>
        </div>
        <div className="aura-ai-order-success-item">
          <span>Payment:</span>
          <span>PayU Hosted (UPI / Cards / NetBanking)</span>
        </div>
        <div className="aura-ai-order-success-item">
          <span>Delivery to:</span>
          <span>{address || "Your Address"}, {city || "India"} - {pincode || ""}</span>
        </div>
      </div>

      <div className="aura-ai-order-badge-row">
        <span><ShieldCheck size={12} /> Lab Certified</span>
        <span><Sparkles size={12} /> Vedic Energized</span>
        <span><Truck size={12} /> Dispatches in 24h</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <Link
          to="/"
          onClick={onClose}
          className="aura-ai-order-btn-primary"
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            textDecoration: "none",
            background: "#fff",
            color: "#8c2b10",
            border: "1.5px solid #d4af37"
          }}
        >
          <Home size={14} /> Back to Home
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="aura-ai-order-btn-primary"
          style={{ flex: 1 }}
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
