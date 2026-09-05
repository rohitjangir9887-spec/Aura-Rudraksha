import React from "react";
import { ChevronDown, ChevronUp, Check, ShieldCheck, CreditCard, Building2, Wallet, Smartphone } from "lucide-react";

export function MobilePaymentMethods({
  activePaymentAccordion,
  setActivePaymentAccordion,
  selectedUpiApp,
  setSelectedUpiApp
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#2b170d", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
        <ShieldCheck size={16} color="#166534" />
        Select Payment Method
      </h3>

      {/* ACCORDION ITEM 1: UPI (Expanded by default) */}
      <div
        style={{
          border: activePaymentAccordion === "upi" ? "1.5px solid #b88a58" : "1px solid #ebd9c8",
          borderRadius: "12px",
          marginBottom: "10px",
          background: activePaymentAccordion === "upi" ? "#fffdfa" : "#ffffff",
          overflow: "hidden"
        }}
      >
        <div
          onClick={() => setActivePaymentAccordion(activePaymentAccordion === "upi" ? "" : "upi")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Smartphone size={16} color="#99582a" />
            <span style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d" }}>
              UPI (GPay, PhonePe, Paytm, QR)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "9px", fontWeight: "800", color: "#166534", background: "#e5f6ea", padding: "1px 6px", borderRadius: "4px" }}>
              Recommended
            </span>
            {activePaymentAccordion === "upi" ? <ChevronUp size={16} color="#b88a58" /> : <ChevronDown size={16} color="#8c796d" />}
          </div>
        </div>

        {activePaymentAccordion === "upi" && (
          <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f0e6da", paddingTop: "10px" }}>
            <div style={{ fontSize: "11.5px", color: "#6e5d50", marginBottom: "8px" }}>
              Tap your preferred UPI app to authenticate:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
              {/* Google Pay */}
              <div
                onClick={() => setSelectedUpiApp("gpay")}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: selectedUpiApp === "gpay" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                  background: selectedUpiApp === "gpay" ? "#fbf6f0" : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: "700" }}>Google Pay</span>
                {selectedUpiApp === "gpay" && <Check size={13} color="#b88a58" strokeWidth={3} style={{ marginLeft: "auto" }} />}
              </div>

              {/* PhonePe */}
              <div
                onClick={() => setSelectedUpiApp("phonepe")}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: selectedUpiApp === "phonepe" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                  background: selectedUpiApp === "phonepe" ? "#fbf6f0" : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#5f259f" }}>PhonePe</span>
                {selectedUpiApp === "phonepe" && <Check size={13} color="#b88a58" strokeWidth={3} style={{ marginLeft: "auto" }} />}
              </div>

              {/* Paytm */}
              <div
                onClick={() => setSelectedUpiApp("paytm")}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: selectedUpiApp === "paytm" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                  background: selectedUpiApp === "paytm" ? "#fbf6f0" : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#002e6e" }}>Paytm UPI</span>
                {selectedUpiApp === "paytm" && <Check size={13} color="#b88a58" strokeWidth={3} style={{ marginLeft: "auto" }} />}
              </div>

              {/* BHIM */}
              <div
                onClick={() => setSelectedUpiApp("bhim")}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: selectedUpiApp === "bhim" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                  background: selectedUpiApp === "bhim" ? "#fbf6f0" : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: "700" }}>BHIM / Other</span>
                {selectedUpiApp === "bhim" && <Check size={13} color="#b88a58" strokeWidth={3} style={{ marginLeft: "auto" }} />}
              </div>
            </div>

            <div style={{ fontSize: "11px", color: "#166534", display: "flex", alignItems: "center", gap: "4px" }}>
              <ShieldCheck size={12} /> Instant UPI Intent via PayU Secure Gateway
            </div>
          </div>
        )}
      </div>

      {/* ACCORDION ITEM 2: Cards */}
      <div
        style={{
          border: activePaymentAccordion === "cards" ? "1.5px solid #b88a58" : "1px solid #ebd9c8",
          borderRadius: "12px",
          marginBottom: "10px",
          background: activePaymentAccordion === "cards" ? "#fffdfa" : "#ffffff",
          overflow: "hidden"
        }}
      >
        <div
          onClick={() => setActivePaymentAccordion(activePaymentAccordion === "cards" ? "" : "cards")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CreditCard size={16} color="#99582a" />
            <span style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d" }}>
              Credit or Debit Card
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "10px", color: "#806f62" }}>Visa, RuPay, Master</span>
            {activePaymentAccordion === "cards" ? <ChevronUp size={16} color="#b88a58" /> : <ChevronDown size={16} color="#8c796d" />}
          </div>
        </div>

        {activePaymentAccordion === "cards" && (
          <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f0e6da", paddingTop: "10px", fontSize: "12px", color: "#6e5d50" }}>
            Card transactions are authenticated via PayU 256-bit SSL & 3D Secure OTP verification.
          </div>
        )}
      </div>

      {/* ACCORDION ITEM 3: Net Banking */}
      <div
        style={{
          border: activePaymentAccordion === "netbanking" ? "1.5px solid #b88a58" : "1px solid #ebd9c8",
          borderRadius: "12px",
          marginBottom: "10px",
          background: activePaymentAccordion === "netbanking" ? "#fffdfa" : "#ffffff",
          overflow: "hidden"
        }}
      >
        <div
          onClick={() => setActivePaymentAccordion(activePaymentAccordion === "netbanking" ? "" : "netbanking")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Building2 size={16} color="#99582a" />
            <span style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d" }}>
              Net Banking (SBI, HDFC, ICICI, Axis)
            </span>
          </div>
          {activePaymentAccordion === "netbanking" ? <ChevronUp size={16} color="#b88a58" /> : <ChevronDown size={16} color="#8c796d" />}
        </div>

        {activePaymentAccordion === "netbanking" && (
          <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f0e6da", paddingTop: "10px", fontSize: "12px", color: "#6e5d50" }}>
            Supports all 50+ Indian commercial & scheduled banks via PayU.
          </div>
        )}
      </div>

      {/* ACCORDION ITEM 4: Wallets */}
      <div
        style={{
          border: activePaymentAccordion === "wallets" ? "1.5px solid #b88a58" : "1px solid #ebd9c8",
          borderRadius: "12px",
          marginBottom: "10px",
          background: activePaymentAccordion === "wallets" ? "#fffdfa" : "#ffffff",
          overflow: "hidden"
        }}
      >
        <div
          onClick={() => setActivePaymentAccordion(activePaymentAccordion === "wallets" ? "" : "wallets")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Wallet size={16} color="#99582a" />
            <span style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d" }}>
              Digital Wallets (Paytm, PhonePe)
            </span>
          </div>
          {activePaymentAccordion === "wallets" ? <ChevronUp size={16} color="#b88a58" /> : <ChevronDown size={16} color="#8c796d" />}
        </div>

        {activePaymentAccordion === "wallets" && (
          <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f0e6da", paddingTop: "10px", fontSize: "12px", color: "#6e5d50" }}>
            Pay quickly with your pre-funded Paytm or PhonePe wallet balance.
          </div>
        )}
      </div>
    </div>
  );
}
