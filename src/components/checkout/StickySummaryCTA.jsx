import React from "react";
import { Lock, Loader2 } from "lucide-react";
import { money } from "../../data";

export function StickySummaryCTA({ onPay, loading, finalTotal }) {
  return (
    <>
      {/* Large Premium Payment CTA */}
      <button
        type="button"
        id="btn-sticky-pay-securely"
        onClick={onPay}
        disabled={loading}
        style={{
          width: "100%",
          background: loading
            ? "#a07343"
            : "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: "12px",
          padding: "15px 20px",
          fontSize: "16px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          cursor: loading ? "wait" : "pointer",
          boxShadow: "0 4px 16px rgba(184, 138, 88, 0.4)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease"
        }}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="spin" />
            <span>Connecting to PayU...</span>
          </>
        ) : (
          <>
            <Lock size={17} />
            <span>Pay {money(finalTotal)} Securely →</span>
          </>
        )}
      </button>

      {/* Subtext: Securely processed through PayU */}
      <div
        style={{
          textAlign: "center",
          marginTop: "8px",
          fontSize: "11.5px",
          color: "#6e5d50"
        }}
      >
        Securely processed through <b>PayU</b>
      </div>
    </>
  );
}
