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
  ArrowRight, 
  QrCode, 
  Sparkles,
  Info,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Loader2
} from "lucide-react";
import { money } from "../../data";

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
          {/* CONTENT 1: UPI */}
          {selectedCategory === "upi" && (
            <div>
              {/* Category Subhead */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d" }}>
                    UPI Payment
                  </span>
                  <span style={{ fontSize: "10.5px", color: "#166534", background: "#eef9f2", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>
                    Zero Transaction Fees
                  </span>
                </div>

                {/* UPI Mode Tabs */}
                <div style={{ display: "flex", gap: "4px", background: "#f5eee6", padding: "3px", borderRadius: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setUpiMode("apps")}
                    style={{
                      background: upiMode === "apps" ? "#ffffff" : "transparent",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: upiMode === "apps" ? "700" : "500",
                      color: upiMode === "apps" ? "#2b170d" : "#6e5d50",
                      cursor: "pointer"
                    }}
                  >
                    UPI Apps
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpiMode("qr")}
                    style={{
                      background: upiMode === "qr" ? "#ffffff" : "transparent",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: upiMode === "qr" ? "700" : "500",
                      color: upiMode === "qr" ? "#2b170d" : "#6e5d50",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px"
                    }}
                  >
                    <QrCode size={11} /> Scan QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpiMode("id")}
                    style={{
                      background: upiMode === "id" ? "#ffffff" : "transparent",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: upiMode === "id" ? "700" : "500",
                      color: upiMode === "id" ? "#2b170d" : "#6e5d50",
                      cursor: "pointer"
                    }}
                  >
                    UPI ID
                  </button>
                </div>
              </div>

              {/* Submode A: UPI Apps Selection */}
              {upiMode === "apps" && (
                <div>
                  <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "10px" }}>
                    Select your preferred UPI app for direct, instant authentication:
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                    {/* Google Pay */}
                    <div 
                      onClick={() => setSelectedUpiApp("gpay")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        border: selectedUpiApp === "gpay" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                        borderRadius: "10px",
                        background: selectedUpiApp === "gpay" ? "#fbf6f0" : "#ffffff",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>Google Pay</div>
                        <div style={{ fontSize: "10px", color: "#806f62" }}>Instant UPI Intent</div>
                      </div>
                      {selectedUpiApp === "gpay" && <Check size={14} color="#b88a58" strokeWidth={3} />}
                    </div>

                    {/* PhonePe */}
                    <div 
                      onClick={() => setSelectedUpiApp("phonepe")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        border: selectedUpiApp === "phonepe" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                        borderRadius: "10px",
                        background: selectedUpiApp === "phonepe" ? "#fbf6f0" : "#ffffff",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#5f259f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "900" }}>
                        पे
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>PhonePe</div>
                        <div style={{ fontSize: "10px", color: "#806f62" }}>Fast Approval</div>
                      </div>
                      {selectedUpiApp === "phonepe" && <Check size={14} color="#b88a58" strokeWidth={3} />}
                    </div>

                    {/* Paytm */}
                    <div 
                      onClick={() => setSelectedUpiApp("paytm")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        border: selectedUpiApp === "paytm" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                        borderRadius: "10px",
                        background: selectedUpiApp === "paytm" ? "#fbf6f0" : "#ffffff",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontWeight: "900", fontSize: "11px" }}>
                          <span style={{ color: "#002e6e" }}>pay</span><span style={{ color: "#00b9f5" }}>tm</span>
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>Paytm UPI</div>
                        <div style={{ fontSize: "10px", color: "#806f62" }}>Seamless UPI</div>
                      </div>
                      {selectedUpiApp === "paytm" && <Check size={14} color="#b88a58" strokeWidth={3} />}
                    </div>

                    {/* BHIM / Other UPI */}
                    <div 
                      onClick={() => setSelectedUpiApp("bhim")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        border: selectedUpiApp === "bhim" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                        borderRadius: "10px",
                        background: selectedUpiApp === "bhim" ? "#fbf6f0" : "#ffffff",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="20" height="16" viewBox="0 0 40 32" fill="none">
                          <path d="M18 4L32 16L18 28L24 16L18 4Z" fill="#00833F" />
                          <path d="M8 4L22 16L8 28L14 16L8 4Z" fill="#F37021" />
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>BHIM / Any UPI</div>
                        <div style={{ fontSize: "10px", color: "#806f62" }}>All Banks Supported</div>
                      </div>
                      {selectedUpiApp === "bhim" && <Check size={14} color="#b88a58" strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              )}

              {/* Submode B: Instant QR Code Scan */}
              {upiMode === "qr" && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div 
                    style={{
                      width: "140px",
                      height: "140px",
                      background: "#ffffff",
                      border: "2px solid #b88a58",
                      borderRadius: "12px",
                      margin: "0 auto 12px",
                      padding: "8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative"
                    }}
                  >
                    <QrCode size={110} color="#2b170d" />
                    <div 
                      style={{
                        position: "absolute",
                        background: "#166534",
                        color: "#fff",
                        fontSize: "8px",
                        fontWeight: "800",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        bottom: "6px"
                      }}
                    >
                      LIVE PAYU QR
                    </div>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
                    Scan QR with Any UPI App
                  </div>
                  <div style={{ fontSize: "11px", color: "#806f62", marginTop: "2px" }}>
                    Open Google Pay, PhonePe, Paytm, or BHIM and scan to pay {money(finalTotal)}
                  </div>
                </div>
              )}

              {/* Submode C: Manual UPI ID */}
              {upiMode === "id" && (
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#2b170d", marginBottom: "6px" }}>
                    Enter Virtual Payment Address (VPA / UPI ID)
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input 
                      type="text"
                      placeholder="e.g. devotee@okhdfcbank"
                      value={upiIdInput}
                      onChange={(e) => setUpiIdInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #d4c5b9",
                        fontSize: "13px",
                        outline: "none"
                      }}
                    />
                    <button
                      type="button"
                      style={{
                        padding: "10px 16px",
                        borderRadius: "8px",
                        background: "#f7eee3",
                        border: "1px solid #e8dac9",
                        color: "#99582a",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      Verify
                    </button>
                  </div>
                  <div style={{ fontSize: "11px", color: "#806f62", marginTop: "6px" }}>
                    A payment collect request will be sent to your UPI app via PayU.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTENT 2: Cards */}
          {selectedCategory === "cards" && (
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
          )}

          {/* CONTENT 3: Net Banking */}
          {selectedCategory === "netbanking" && (
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d", marginBottom: "6px" }}>
                Popular Indian Banks
              </div>
              <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "12px" }}>
                Connect directly through PayU secure banking servers:
              </div>

              {/* Popular Banks Selector Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px", marginBottom: "14px" }}>
                {popularBanks.map((bank) => {
                  const isSel = selectedBank === bank.code;
                  return (
                    <div
                      key={bank.code}
                      onClick={() => setSelectedBank(bank.code)}
                      style={{
                        padding: "10px 8px",
                        borderRadius: "10px",
                        border: isSel ? "2px solid #b88a58" : "1px solid #ebd9c8",
                        background: isSel ? "#fbf6f0" : "#ffffff",
                        textAlign: "center",
                        cursor: "pointer",
                        boxShadow: isSel ? "0 2px 6px rgba(184, 138, 88, 0.15)" : "none"
                      }}
                    >
                      <div style={{ fontSize: "20px", marginBottom: "4px" }}>{bank.logo}</div>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d" }}>{bank.name}</div>
                      {isSel && <div style={{ fontSize: "9px", color: "#166534", fontWeight: "800", marginTop: "2px" }}>SELECTED</div>}
                    </div>
                  );
                })}
              </div>

              {/* All Other Banks Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
                  Or Choose Other Bank (50+ Banks Supported)
                </label>
                <select 
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d4c5b9",
                    background: "#ffffff",
                    fontSize: "13px",
                    color: "#2b170d",
                    outline: "none"
                  }}
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                >
                  <option value="HDFC">HDFC Bank</option>
                  <option value="SBI">State Bank of India</option>
                  <option value="ICICI">ICICI Bank</option>
                  <option value="AXIS">Axis Bank</option>
                  <option value="KOTAK">Kotak Mahindra Bank</option>
                  <option value="PNB">Punjab National Bank</option>
                  <option value="BOB">Bank of Baroda</option>
                  <option value="CANARA">Canara Bank</option>
                  <option value="IDBI">IDBI Bank</option>
                  <option value="YES">Yes Bank</option>
                  <option value="INDUSIND">IndusInd Bank</option>
                  <option value="UNION">Union Bank of India</option>
                </select>
              </div>
            </div>
          )}

          {/* CONTENT 4: Wallets */}
          {selectedCategory === "wallets" && (
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d", marginBottom: "6px" }}>
                Digital Wallets
              </div>
              <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "14px" }}>
                Pay quickly using your pre-funded wallet balance via PayU:
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                {/* Paytm Wallet */}
                <div 
                  onClick={() => setSelectedWallet("paytm")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    border: selectedWallet === "paytm" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                    borderRadius: "10px",
                    background: selectedWallet === "paytm" ? "#fbf6f0" : "#ffffff",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontWeight: "900", fontSize: "14px" }}>
                      <span style={{ color: "#002e6e" }}>pay</span><span style={{ color: "#00b9f5" }}>tm</span>
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>Paytm Wallet</span>
                  </div>
                  {selectedWallet === "paytm" && <Check size={16} color="#b88a58" strokeWidth={3} />}
                </div>

                {/* PhonePe Wallet */}
                <div 
                  onClick={() => setSelectedWallet("phonepe")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    border: selectedWallet === "phonepe" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                    borderRadius: "10px",
                    background: selectedWallet === "phonepe" ? "#fbf6f0" : "#ffffff",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#5f259f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>
                      पे
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>PhonePe Wallet</span>
                  </div>
                  {selectedWallet === "phonepe" && <Check size={16} color="#b88a58" strokeWidth={3} />}
                </div>

                {/* Mobikwik */}
                <div 
                  onClick={() => setSelectedWallet("mobikwik")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    border: selectedWallet === "mobikwik" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                    borderRadius: "10px",
                    background: selectedWallet === "mobikwik" ? "#fbf6f0" : "#ffffff",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#0073e6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>
                      M
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>MobiKwik / ZIP</span>
                  </div>
                  {selectedWallet === "mobikwik" && <Check size={16} color="#b88a58" strokeWidth={3} />}
                </div>
              </div>
            </div>
          )}

          {/* CONTENT 5: EMI / Pay Later */}
          {selectedCategory === "emi" && (
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d", marginBottom: "6px" }}>
                Easy Monthly Installments (EMI)
              </div>
              <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "14px" }}>
                Available on eligible Credit and Debit cards via PayU:
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                {/* 3 Months Plan */}
                <div 
                  onClick={() => setSelectedEmiPlan("3m")}
                  style={{
                    padding: "12px",
                    border: selectedEmiPlan === "3m" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                    borderRadius: "10px",
                    background: selectedEmiPlan === "3m" ? "#fbf6f0" : "#ffffff",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#99582a" }}>3 Months Plan</div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#2b170d", margin: "4px 0" }}>
                    {money(Math.round(finalTotal / 3))}/mo
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#166534", fontWeight: "700" }}>Low Interest</div>
                </div>

                {/* 6 Months Plan */}
                <div 
                  onClick={() => setSelectedEmiPlan("6m")}
                  style={{
                    padding: "12px",
                    border: selectedEmiPlan === "6m" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                    borderRadius: "10px",
                    background: selectedEmiPlan === "6m" ? "#fbf6f0" : "#ffffff",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#99582a" }}>6 Months Plan</div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#2b170d", margin: "4px 0" }}>
                    {money(Math.round(finalTotal / 6))}/mo
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#166534", fontWeight: "700" }}>Affordable Plan</div>
                </div>
              </div>

              <div style={{ fontSize: "11px", color: "#806f62", background: "#fcf9f5", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ebd9c8" }}>
                ℹ️ Bank interest rates are automatically configured on the PayU secure hosted screen upon card verification.
              </div>
            </div>
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
