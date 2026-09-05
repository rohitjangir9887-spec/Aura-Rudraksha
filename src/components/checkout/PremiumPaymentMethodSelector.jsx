import React, { useState } from "react";
import { 
  ShieldCheck, 
  Lock, 
  Smartphone, 
  CreditCard, 
  Building2, 
  Wallet, 
  CalendarClock, 
  Check, 
  ChevronDown,
  ChevronRight,
  Loader2
} from "lucide-react";
import { money } from "../../data";

import { UPIPayment } from "./payment-methods/UPIPayment";
import { CardPayment } from "./payment-methods/CardPayment";
import { NetBankingPayment } from "./payment-methods/NetBankingPayment";
import { WalletPayment } from "./payment-methods/WalletPayment";
import { EMIPayment } from "./payment-methods/EMIPayment";

/**
 * PremiumPaymentMethodSelector
 * 
 * Elegant Indian spiritual luxury payment method selector designed strictly around PayU Gateway:
 * - Left side: Payment categories (UPI, Cards, Net Banking, Wallets, EMI)
 * - Right/content area: Selected category details
 * - Selected state with elegant brown/gold border (#b88a58 / #7a4a24)
 * - Small green security indicator ("✓ Verified PayU 256-Bit SSL Pipeline")
 * - Clear "Pay ₹36,950 Securely →" CTA
 * - Subtle PayU trust row
 * - Mobile responsive accordion view
 */
export function PremiumPaymentMethodSelector({
  finalTotal = 36950,
  loading = false,
  onPay,
  className = ""
}) {
  // Category state: 'upi' | 'cards' | 'netbanking' | 'wallets' | 'emi'
  const [selectedCategory, setSelectedCategory] = useState("upi");

  // Sub-method states
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [upiIdInput, setUpiIdInput] = useState("");
  const [upiMode, setUpiMode] = useState("apps"); // 'apps' | 'id' | 'qr'
  const [cardType, setCardType] = useState("credit"); // 'credit' | 'debit'
  const [selectedBank, setSelectedBank] = useState("HDFC");
  const [selectedWallet, setSelectedWallet] = useState("paytm");
  const [selectedEmiPlan, setSelectedEmiPlan] = useState("3m");
  const [saveCardCheck, setSaveCardCheck] = useState(true);

  // Card sample form state for high-fidelity experience
  const [cardDetails, setCardDetails] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: ""
  });

  const categories = [
    {
      id: "upi",
      name: "UPI",
      desc: "Google Pay, PhonePe, Paytm, BHIM",
      icon: Smartphone,
      badge: "Instant & Free"
    },
    {
      id: "cards",
      name: "Cards",
      desc: "Credit & Debit Cards (Visa, RuPay, Master)",
      icon: CreditCard,
      badge: null
    },
    {
      id: "netbanking",
      name: "Net Banking",
      desc: "SBI, HDFC, ICICI, Axis & 50+ Banks",
      icon: Building2,
      badge: null
    },
    {
      id: "wallets",
      name: "Wallets",
      desc: "Paytm, PhonePe & Other Wallets",
      icon: Wallet,
      badge: null
    },
    {
      id: "emi",
      name: "EMI Options",
      desc: "Credit & Debit Card Monthly EMI",
      icon: CalendarClock,
      badge: "Pay Later"
    }
  ];

  const popularBanks = [
    { code: "HDFC", name: "HDFC Bank", logo: "🏦", color: "#004c8f" },
    { code: "SBI", name: "State Bank of India", logo: "🏛️", color: "#280071" },
    { code: "ICICI", name: "ICICI Bank", logo: "🏢", color: "#bd2026" },
    { code: "AXIS", name: "Axis Bank", logo: "🏦", color: "#97144d" },
    { code: "KOTAK", name: "Kotak Mahindra", logo: "🏛️", color: "#ed1c24" }
  ];

  return (
    <div 
      id="checkout-payment-selector-container"
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "20px",
        boxShadow: "0 4px 16px rgba(43, 23, 13, 0.04)"
      }}
      className={className}
    >
      {/* Header */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "18px",
          paddingBottom: "14px",
          borderBottom: "1px solid #f0e6da"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div 
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12.5px",
              fontWeight: "800"
            }}
          >
            3
          </div>
          <div>
            <h2 
              style={{ 
                fontFamily: '"Cormorant Garamond", serif', 
                fontSize: "22px", 
                fontWeight: "700", 
                margin: 0, 
                color: "#2b170d" 
              }}
            >
              Select Payment Method
            </h2>
            <div style={{ fontSize: "12px", color: "#806f62" }}>
              Encrypted 256-Bit Bank-Grade Gateway
            </div>
          </div>
        </div>

        {/* Small Green Security Indicator */}
        <div 
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "#eef9f2",
            border: "1px solid #cce8d4",
            color: "#166534",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700"
          }}
        >
          <Lock size={12} color="#16a34a" />
          <span>PayU Verified</span>
        </div>
      </div>

      {/* DESKTOP VIEW: Left Categories / Right Selected Method Area */}
      <div className="desktop-payment-selector-grid">
        {/* Left Side: Payment Categories Navigation */}
        <div 
          className="payment-category-tabs"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            background: "#fcf9f5",
            padding: "10px",
            borderRadius: "14px",
            border: "1px solid #ebd9c8"
          }}
        >
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                id={`pay-cat-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: isSelected ? "1.5px solid #b88a58" : "1px solid transparent",
                  background: isSelected ? "#ffffff" : "transparent",
                  color: isSelected ? "#2b170d" : "#5a4537",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: isSelected ? "0 2px 8px rgba(184, 138, 88, 0.12)" : "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div 
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: isSelected ? "#fbf3eb" : "#f0e6da",
                      color: isSelected ? "#99582a" : "#806f62",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Icon size={16} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: isSelected ? "700" : "600", color: isSelected ? "#2b170d" : "#4a3528" }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#806f62", maxWidth: "160px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {cat.desc}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {cat.badge && (
                    <span 
                      style={{
                        fontSize: "9.5px",
                        fontWeight: "800",
                        color: "#166534",
                        background: "#e5f6ea",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}
                    >
                      {cat.badge}
                    </span>
                  )}
                  {isSelected && (
                    <div 
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background: "#b88a58",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Selected Payment Method Detail Content */}
        <div 
          className="payment-method-content"
          style={{
            background: "#ffffff",
            border: "1.5px solid #b88a58",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 4px 14px rgba(184, 138, 88, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          {selectedCategory === "upi" && (
            <UPIPayment
              finalTotal={finalTotal}
              upiMode={upiMode}
              setUpiMode={setUpiMode}
              selectedUpiApp={selectedUpiApp}
              setSelectedUpiApp={setSelectedUpiApp}
              upiIdInput={upiIdInput}
              setUpiIdInput={setUpiIdInput}
            />
          )}

          {selectedCategory === "cards" && (
            <CardPayment
              cardType={cardType}
              setCardType={setCardType}
              cardDetails={cardDetails}
              setCardDetails={setCardDetails}
              saveCardCheck={saveCardCheck}
              setSaveCardCheck={setSaveCardCheck}
            />
          )}

          {selectedCategory === "netbanking" && (
            <NetBankingPayment
              selectedBank={selectedBank}
              setSelectedBank={setSelectedBank}
              popularBanks={popularBanks}
            />
          )}

          {selectedCategory === "wallets" && (
            <WalletPayment
              selectedWallet={selectedWallet}
              setSelectedWallet={setSelectedWallet}
            />
          )}

          {selectedCategory === "emi" && (
            <EMIPayment
              finalTotal={finalTotal}
              selectedEmiPlan={selectedEmiPlan}
              setSelectedEmiPlan={setSelectedEmiPlan}
            />
          )}

          {/* Integrated CTA & PayU Trust Footer Row */}
          <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid #f0e6da" }}>
            <button
              type="button"
              id="btn-pay-securely-selector"
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
                padding: "14px 20px",
                fontSize: "15px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 14px rgba(184, 138, 88, 0.35)",
                transition: "all 0.2s ease"
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Connecting to PayU...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Pay {money(finalTotal)} Securely →</span>
                </>
              )}
            </button>

            {/* PayU Trust UI: Subtle Premium Trust Row */}
            <div 
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                marginTop: "12px",
                fontSize: "11px",
                color: "#6e5d50",
                flexWrap: "wrap"
              }}
            >
              <span>🔒 Secure payment powered by <b>PayU</b></span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>256-bit SSL encryption</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>Instant payment confirmation</span>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE ACCORDION VIEW (Only active on mobile screens via CSS) */}
      <div className="mobile-payment-accordion-view">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isOpen = selectedCategory === cat.id;

          return (
            <div 
              key={cat.id}
              style={{
                border: isOpen ? "1.5px solid #b88a58" : "1px solid #ebd9c8",
                borderRadius: "12px",
                marginBottom: "10px",
                background: isOpen ? "#fffdfb" : "#ffffff",
                overflow: "hidden"
              }}
            >
              <div 
                onClick={() => setSelectedCategory(isOpen ? "" : cat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div 
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: isOpen ? "#fbf3eb" : "#f5ede4",
                      color: isOpen ? "#99582a" : "#6e5d50",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Icon size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#2b170d" }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#806f62" }}>
                      {cat.desc}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {cat.badge && (
                    <span style={{ fontSize: "9px", fontWeight: "800", color: "#166534", background: "#e5f6ea", padding: "2px 6px", borderRadius: "4px" }}>
                      {cat.badge}
                    </span>
                  )}
                  {isOpen ? <ChevronDown size={18} color="#b88a58" /> : <ChevronRight size={18} color="#8c796d" />}
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f0e6da", paddingTop: "12px" }}>
                  {cat.id === "upi" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                      <div 
                        onClick={() => setSelectedUpiApp("gpay")}
                        style={{ padding: "8px 10px", borderRadius: "8px", border: selectedUpiApp === "gpay" ? "2px solid #b88a58" : "1px solid #ebd9c8", display: "flex", alignItems: "center", gap: "8px" }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: "700" }}>Google Pay</span>
                      </div>
                      <div 
                        onClick={() => setSelectedUpiApp("phonepe")}
                        style={{ padding: "8px 10px", borderRadius: "8px", border: selectedUpiApp === "phonepe" ? "2px solid #b88a58" : "1px solid #ebd9c8", display: "flex", alignItems: "center", gap: "8px" }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: "700" }}>PhonePe</span>
                      </div>
                      <div 
                        onClick={() => setSelectedUpiApp("paytm")}
                        style={{ padding: "8px 10px", borderRadius: "8px", border: selectedUpiApp === "paytm" ? "2px solid #b88a58" : "1px solid #ebd9c8", display: "flex", alignItems: "center", gap: "8px" }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: "700" }}>Paytm UPI</span>
                      </div>
                      <div 
                        onClick={() => setSelectedUpiApp("bhim")}
                        style={{ padding: "8px 10px", borderRadius: "8px", border: selectedUpiApp === "bhim" ? "2px solid #b88a58" : "1px solid #ebd9c8", display: "flex", alignItems: "center", gap: "8px" }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: "700" }}>BHIM / QR</span>
                      </div>
                    </div>
                  )}

                  {cat.id === "cards" && (
                    <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "10px" }}>
                      Pay with Visa, RuPay, or Mastercard via PayU 256-bit SSL portal.
                    </div>
                  )}

                  {cat.id === "netbanking" && (
                    <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "10px" }}>
                      SBI, HDFC, ICICI, Axis, and 50+ scheduled banks supported.
                    </div>
                  )}

                  {cat.id === "wallets" && (
                    <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "10px" }}>
                      Paytm, PhonePe, and Mobikwik digital wallet balances.
                    </div>
                  )}

                  {cat.id === "emi" && (
                    <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "10px" }}>
                      Pay in 3 or 6 monthly installments with eligible bank cards.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onPay}
                    disabled={loading}
                    style={{
                      width: "100%",
                      background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: "700",
                      cursor: loading ? "wait" : "pointer"
                    }}
                  >
                    Pay {money(finalTotal)} Securely →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
