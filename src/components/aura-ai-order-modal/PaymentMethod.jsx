import React from "react";
import { CreditCard, ShieldCheck, Banknote, CheckCircle2 } from "lucide-react";

export function PaymentMethod({
  paymentMethod = "ONLINE",
  onSelectPaymentMethod,
  enableCod = true,
  enableOnlinePayment = true,
  codFee = 0
}) {
  const isCod = paymentMethod === "COD";
  const isOnline = paymentMethod === "ONLINE" || paymentMethod === "PAYU";
  const numericCodFee = Number(codFee) || 0;

  return (
    <div className="aura-ai-order-section">
      <div className="aura-ai-order-section-title">
        <CreditCard size={13} /> Payment Method (Online / COD)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {enableOnlinePayment && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectPaymentMethod && onSelectPaymentMethod("ONLINE")}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: isOnline ? "2px solid #b88a58" : "1.5px solid #e6d7c8",
              background: isOnline ? "#fff9f2" : "#fcfaf8",
              fontSize: "12px",
              color: "#4a3528",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontWeight: "700", color: "#2b170d", display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                <ShieldCheck size={14} color="#9d5a2b" /> Online Payment (UPI / GPay / Cards)
              </div>
              <div style={{ fontSize: "11px", color: "#7c3114" }}>
                Instant confirmation • Zero extra fee
              </div>
            </div>
            {isOnline && <CheckCircle2 size={16} color="#9d5a2b" />}
          </div>
        )}

        {enableCod && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectPaymentMethod && onSelectPaymentMethod("COD")}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: isCod ? "2px solid #166534" : "1.5px solid #e6d7c8",
              background: isCod ? "#f2fbf5" : "#fcfaf8",
              fontSize: "12px",
              color: "#4a3528",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontWeight: "700", color: "#2b170d", display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                <Banknote size={14} color="#166534" /> Cash on Delivery (COD / कैश ऑन डिलीवरी)
              </div>
              <div style={{ fontSize: "11px", color: "#166534" }}>
                Pay Cash or UPI on delivery {numericCodFee > 0 ? `(+$₹${numericCodFee} COD Fee)` : "• FREE COD"}
              </div>
            </div>
            {isCod && <CheckCircle2 size={16} color="#166534" />}
          </div>
        )}
      </div>
    </div>
  );
}
