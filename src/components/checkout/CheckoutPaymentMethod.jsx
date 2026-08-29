import React from "react";
import { CreditCard, Banknote, ShieldCheck } from "lucide-react";

export function CheckoutPaymentMethod({ paymentMethod, setPaymentMethod }) {
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
            Choose your preferred mode of payment
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Option 1: COD */}
        <label 
          id="payment-option-cod"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            borderRadius: "10px",
            border: paymentMethod === "cod" ? "1.5px solid #b85d25" : "1px solid #e8dac9",
            background: paymentMethod === "cod" ? "#fdf8f4" : "#ffffff",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input 
              type="radio" 
              name="paymentMethod" 
              value="cod" 
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
              style={{ accentColor: "#b85d25", width: "16px", height: "16px", cursor: "pointer" }}
            />
            <div 
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#f7eee3",
                color: "#b85d25",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Banknote size={18} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
                Cash on Delivery (COD)
              </div>
              <div style={{ fontSize: "11px", color: "#806f62" }}>
                Pay cash at your doorstep upon receiving order
              </div>
            </div>
          </div>

          <span 
            style={{
              fontSize: "10.5px",
              fontWeight: "700",
              color: "#166534",
              background: "#eef6f0",
              padding: "3px 8px",
              borderRadius: "4px"
            }}
          >
            ✓ Available
          </span>
        </label>

        {/* Option 2: Online Payment (Coming Soon) */}
        <label 
          id="payment-option-online"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            borderRadius: "10px",
            border: "1px solid #e8dac9",
            background: "#faf6f0",
            opacity: 0.7,
            cursor: "not-allowed"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input 
              type="radio" 
              name="paymentMethod" 
              value="online" 
              disabled
              style={{ width: "16px", height: "16px" }}
            />
            <div 
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#eee4d8",
                color: "#806f62",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <CreditCard size={18} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#5a4032" }}>
                Online Payment (UPI / Cards / Netbanking)
              </div>
              <div style={{ fontSize: "11px", color: "#806f62" }}>
                Direct digital payments integration
              </div>
            </div>
          </div>

          <span 
            style={{
              fontSize: "10.5px",
              fontWeight: "700",
              color: "#b45309",
              background: "#fef3c7",
              padding: "3px 8px",
              borderRadius: "4px"
            }}
          >
            Coming Soon
          </span>
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px", fontSize: "11px", color: "#806f62", justifyContent: "center" }}>
        <ShieldCheck size={14} color="#166534" />
        <span>Cash upon inspection & safe delivery guaranteed</span>
      </div>
    </div>
  );
}
