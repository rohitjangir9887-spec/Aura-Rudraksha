import React from "react";
import { CreditCard, ShieldCheck, Lock, Smartphone, CheckCircle2 } from "lucide-react";

export function CheckoutPaymentMethod({ paymentMethod = "cashfree", setPaymentMethod }) {
  return (
    <div 
      id="checkout-payment-section"
      style={{
        background: "#fffdf9",
        border: "1px solid #e8dac9",
        borderRadius: "14px",
        padding: "18px 16px",
        marginBottom: "16px",
        boxShadow: "0 2px 10px rgba(43, 23, 13, 0.03)"
      }}
    >
      {/* Header */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px",
          paddingBottom: "10px",
          borderBottom: "1px solid #f0e6da"
        }}
      >
        <div 
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "50%",
            background: "#b85d25",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "700"
          }}
        >
          3
        </div>
        <div>
          <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: "700", margin: 0, color: "#2b170d" }}>
            Payment Method
          </h2>
          <div style={{ fontSize: "11px", color: "#806f62" }}>
            100% Secure Checkout via Cashfree Payment Gateway
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Cashfree PG Option */}
        <label 
          id="payment-option-cashfree"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "14px 16px",
            borderRadius: "10px",
            border: "1.5px solid #b85d25",
            background: "#fdf8f4",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(184, 93, 37, 0.08)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input 
                type="radio" 
                name="paymentMethod" 
                value="cashfree" 
                checked={true}
                readOnly
                style={{ accentColor: "#b85d25", width: "18px", height: "18px", cursor: "pointer" }}
              />
              <div 
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "#b85d25",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <CreditCard size={20} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#2b170d", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>Online Payment</span>
                  <span style={{ fontSize: "10px", color: "#b85d25", background: "#fbf0e6", padding: "1px 6px", borderRadius: "4px", border: "1px solid #ebdccb" }}>
                    Cashfree PG
                  </span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#806f62" }}>
                  UPI (GPay, PhonePe, Paytm, QR), Cards & Netbanking
                </div>
              </div>
            </div>

            <span 
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "#166534",
                background: "#eef6f0",
                padding: "3px 8px",
                borderRadius: "4px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <CheckCircle2 size={12} /> Instant Consecration
            </span>
          </div>

          {/* Supported Methods Badges */}
          <div 
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              paddingLeft: "30px",
              paddingTop: "4px",
              borderTop: "1px dashed #ecdac7"
            }}
          >
            {["UPI (GPay / PhonePe / Paytm / QR)", "Credit / Debit Cards", "RuPay / Visa / MC", "Net Banking (All Banks)", "Wallets"].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "10.5px",
                  fontWeight: "600",
                  color: "#5c483b",
                  background: "#ffffff",
                  border: "1px solid #e8dac9",
                  padding: "3px 8px",
                  borderRadius: "4px"
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </label>
      </div>

      {/* Security & RBI Compliance Guarantee */}
      <div 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          gap: "8px", 
          marginTop: "14px", 
          padding: "8px 12px", 
          background: "#f7f2eb", 
          borderRadius: "8px", 
          fontSize: "11px", 
          color: "#5c483b" 
        }}
      >
        <Lock size={13} color="#166534" />
        <span>256-Bit SSL Encryption • RBI Approved Payment Gateway • Certified Vedic Authenticity</span>
      </div>
    </div>
  );
}
