import React from "react";
import { CheckCircle2, ShieldCheck, Sparkles, Truck } from "lucide-react";

export function SuccessView({ orderComplete, product, qty, finalAmount, address, city, pincode, onClose }) {
  return (
    <div className="aura-ai-order-success-view">
      <div className="aura-ai-order-success-icon">
        <CheckCircle2 size={44} />
      </div>
      <h3>Order Confirmed with Blessings! 🙏</h3>
      <p className="aura-ai-order-id-tag">
        Order ID: <b>#{orderComplete.id || orderComplete.orderId}</b>
      </p>
      <div className="aura-ai-order-success-box">
        <div className="aura-ai-order-success-item">
          <span>Item:</span>
          <strong>{product.name} (x{qty})</strong>
        </div>
        <div className="aura-ai-order-success-item">
          <span>Total Amount:</span>
          <strong className="aura-ai-gold-text">₹{finalAmount.toLocaleString('en-IN')}</strong>
        </div>
        <div className="aura-ai-order-success-item">
          <span>Payment:</span>
          <span>PayU Hosted (UPI / Cards / NetBanking)</span>
        </div>
        <div className="aura-ai-order-success-item">
          <span>Delivery to:</span>
          <span>{address}, {city} - {pincode}</span>
        </div>
      </div>

      <div className="aura-ai-order-badge-row">
        <span><ShieldCheck size={12} /> Lab Certified</span>
        <span><Sparkles size={12} /> Vedic Energized</span>
        <span><Truck size={12} /> Dispatches in 24h</span>
      </div>

      <button
        onClick={onClose}
        className="aura-ai-order-btn-primary"
        style={{ marginTop: 14 }}
      >
        Continue Chatting with Aura AI
      </button>
    </div>
  );
}
