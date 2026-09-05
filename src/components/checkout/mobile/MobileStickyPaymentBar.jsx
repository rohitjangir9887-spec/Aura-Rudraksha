import React from "react";
import { Lock, Loader2 } from "lucide-react";
import { money } from "../../../data";

export function MobileStickyPaymentBar({
  finalTotal,
  onPay,
  loading
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(180deg, #ffffff 0%, #fdfbf7 100%)",
        borderTop: "1.5px solid #ebd9c8",
        padding: "10px 16px max(12px, env(safe-area-inset-bottom))",
        boxShadow: "0 -4px 16px rgba(43, 23, 13, 0.08)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px"
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "#806f62" }}>Total:</span>
          <span style={{ fontSize: "19px", fontWeight: "800", color: "#2b170d" }}>
            {money(finalTotal)}
          </span>
        </div>
        <div style={{ fontSize: "10px", color: "#166534", fontWeight: "700" }}>
          ✓ Free Express Shipping
        </div>
      </div>

      <button
        type="button"
        onClick={onPay}
        disabled={loading}
        style={{
          flex: 1,
          maxWidth: "230px",
          background: loading
            ? "#a07343"
            : "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: "10px",
          padding: "12px 16px",
          fontSize: "14.5px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          cursor: loading ? "wait" : "pointer",
          boxShadow: "0 3px 10px rgba(184, 138, 88, 0.35)"
        }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Lock size={15} />
            <span>Pay Securely →</span>
          </>
        )}
      </button>
    </div>
  );
}
