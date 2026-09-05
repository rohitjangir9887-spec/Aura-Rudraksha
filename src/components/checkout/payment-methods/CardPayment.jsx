import React from "react";

export function CardPayment({
  cardType,
  setCardType,
  cardDetails,
  setCardDetails,
  saveCardCheck,
  setSaveCardCheck
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d" }}>
          Credit or Debit Card
        </div>

        {/* Card Type Selector */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setCardType("credit")}
            style={{
              background: cardType === "credit" ? "#b88a58" : "#f5eee6",
              color: cardType === "credit" ? "#ffffff" : "#4a3528",
              border: "none",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer"
            }}
          >
            Credit Card
          </button>
          <button
            type="button"
            onClick={() => setCardType("debit")}
            style={{
              background: cardType === "debit" ? "#b88a58" : "#f5eee6",
              color: cardType === "debit" ? "#ffffff" : "#4a3528",
              border: "none",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer"
            }}
          >
            Debit Card
          </button>
        </div>
      </div>

      {/* Supported Card Networks Row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", padding: "8px 12px", background: "#fcf9f5", borderRadius: "8px", border: "1px solid #ebd9c8" }}>
        <span style={{ fontSize: "11.5px", color: "#6e5d50" }}>Supported Networks:</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: "900", fontStyle: "italic", color: "#1a1f71", fontSize: "13px" }}>VISA</span>
          <span style={{ fontWeight: "900", color: "#163f73", fontSize: "12px" }}>RuPay <span style={{ color: "#e84e1b" }}>❯</span></span>
          <span style={{ fontWeight: "800", color: "#eb001b", fontSize: "12px" }}>Mastercard</span>
        </div>
      </div>

      {/* Interactive Card Form Inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
        <div>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
            Card Number
          </label>
          <input
            type="text"
            placeholder="4532 •••• •••• 8920"
            value={cardDetails.number}
            onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d4c5b9",
              fontSize: "13px",
              outline: "none"
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
              Valid Thru (MM / YY)
            </label>
            <input
              type="text"
              placeholder="MM / YY"
              value={cardDetails.expiry}
              onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #d4c5b9",
                fontSize: "13px",
                outline: "none"
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
              CVV / CVC
            </label>
            <input
              type="password"
              placeholder="•••"
              maxLength={4}
              value={cardDetails.cvv}
              onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #d4c5b9",
                fontSize: "13px",
                outline: "none"
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
            Name on Card
          </label>
          <input
            type="text"
            placeholder="Devotee Name"
            value={cardDetails.name}
            onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d4c5b9",
              fontSize: "13px",
              outline: "none"
            }}
          />
        </div>
      </div>

      {/* RBI Security Compliance Checkbox */}
      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#6e5d50", cursor: "pointer", marginBottom: "12px" }}>
        <input
          type="checkbox"
          checked={saveCardCheck}
          onChange={(e) => setSaveCardCheck(e.target.checked)}
          style={{ accentColor: "#b88a58" }}
        />
        <span>Securely save card for future purchases as per RBI tokenization norms</span>
      </label>
    </div>
  );
}
