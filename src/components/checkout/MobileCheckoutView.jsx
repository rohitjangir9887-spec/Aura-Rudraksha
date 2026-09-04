import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Lock, 
  ShoppingCart, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Tag, 
  Sparkles,
  Smartphone,
  CreditCard,
  Building2,
  Wallet,
  CalendarClock,
  Check,
  Award,
  Truck,
  RotateCcw,
  Loader2,
  X
} from "lucide-react";
import { money } from "../../data";
import { PaymentGuaranteeCard } from "./PaymentGuaranteeCard";
import { CheckoutAddressCard } from "./CheckoutAddressCard";

/**
 * MobileCheckoutView
 * 
 * True mobile-first checkout UI designed for iPhone/Android screens:
 * - Compact Header with Rudraksha emblem & Cart icon
 * - Mobile progress steps
 * - Shipping address card
 * - Product review card
 * - Collapsible Order Summary accordion
 * - Payment method accordion (UPI first & expanded, Cards, Net Banking, Wallets)
 * - PayU security information & Payment Guarantee card
 * - Sticky bottom payment bar
 */
export function MobileCheckoutView({
  lines = [],
  products = [],
  formData,
  onInputChange,
  savedAddress,
  usingSavedAddress,
  onUseSavedAddress,
  onUseDifferentAddress,
  onEditAddress,
  saveAddressCheck,
  onToggleSaveAddressCheck,
  totals = {},
  couponCode = "",
  setCouponCode,
  appliedCoupon = null,
  couponDiscount = 0,
  onApplyCoupon,
  onRemoveCoupon,
  couponError = "",
  loading = false,
  onPay,
  onUpdateQty
}) {
  // Accordion state
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [activePaymentAccordion, setActivePaymentAccordion] = useState("upi");
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");

  // Reference flagship item
  const referenceProduct = {
    name: "Original 14 Mukhi Rudraksha (Nepali) — Lab Certified Chaudah Mukhi Rudraksha",
    img: "/images/product-1mukhi.jpg",
    qty: 1,
    subtotal: 59000,
    discount: 22050,
    total: 36950
  };

  const hasLines = lines && lines.length > 0;
  const firstItem = hasLines ? (products.find(p => String(p.id) === String(lines[0]?.id)) || referenceProduct) : referenceProduct;
  const firstItemImg = firstItem.img || (firstItem.images && firstItem.images[0]) || "/images/product-1mukhi.jpg";
  const firstItemName = firstItem.name || referenceProduct.name;
  const itemCount = hasLines ? lines.reduce((sum, l) => sum + (l.qty || 1), 0) : 1;

  // Calculate pricing
  const subtotal = totals.subtotal ?? 59000;
  const productDiscount = totals.productSavings ?? 22050;
  const shipping = totals.shipping ?? 0;
  const totalSavings = (productDiscount + (couponDiscount || 0));
  const finalTotal = totals.finalTotal ?? Math.max(0, subtotal - productDiscount - (couponDiscount || 0) + shipping);

  return (
    <div 
      id="mobile-checkout-root"
      style={{
        width: "100%",
        maxWidth: "480px",
        margin: "0 auto",
        background: "#fcfaf7",
        minHeight: "100vh",
        paddingBottom: "110px",
        position: "relative",
        boxSizing: "border-box"
      }}
    >
      {/* 1. Mobile Compact Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          background: "#ffffff",
          borderBottom: "1px solid #ebd9c8",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 50,
          boxShadow: "0 2px 8px rgba(43, 23, 13, 0.04)"
        }}
      >
        {/* Brand Logo & Name */}
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <div 
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "radial-gradient(circle, #b88a58 0%, #7a4a24 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontFamily: '"Cormorant Garamond", serif',
              fontWeight: "700"
            }}
          >
            ॐ
          </div>
          <div>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "17px", fontWeight: "700", color: "#2b170d", lineHeight: "1.1" }}>
              AURA RUDRAKSHA
            </div>
            <div style={{ fontSize: "8px", fontWeight: "700", color: "#8c6b54", letterSpacing: "1px" }}>
              SACRED CHECKOUT
            </div>
          </div>
        </Link>

        {/* Security & Cart */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "3px", background: "#eef9f2", color: "#166534", padding: "3px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "700" }}>
            <Lock size={10} color="#16a34a" />
            <span>PayU 256-Bit</span>
          </div>

          <Link 
            to="/cart" 
            style={{
              position: "relative",
              color: "#2b170d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              borderRadius: "50%",
              background: "#fcf8f3",
              border: "1px solid #ebd9c8"
            }}
          >
            <ShoppingCart size={16} />
            {itemCount > 0 && (
              <span 
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  background: "#b85d25",
                  color: "#ffffff",
                  fontSize: "9px",
                  fontWeight: "800",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* 2. Top Trust Ticker */}
      <div 
        style={{
          background: "#2b170d",
          color: "#f5eee6",
          fontSize: "11px",
          padding: "6px 12px",
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <span>✓ 100% Authentic</span>
        <span style={{ opacity: 0.4 }}>•</span>
        <span>✓ Lab Tested</span>
        <span style={{ opacity: 0.4 }}>•</span>
        <span>✓ Free Express Delivery</span>
      </div>

      <div style={{ padding: "14px 14px 0" }}>
        {/* 3. Mobile Stepper */}
        <div 
          style={{
            background: "#ffffff",
            border: "1px solid #ebd9c8",
            borderRadius: "12px",
            padding: "10px 14px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px"
          }}
        >
          <span style={{ color: "#166534", fontWeight: "700" }}>✓ 1. Address</span>
          <span style={{ color: "#d9c6b3" }}>›</span>
          <span style={{ color: "#166534", fontWeight: "700" }}>✓ 2. Review</span>
          <span style={{ color: "#d9c6b3" }}>›</span>
          <span style={{ color: "#b88a58", fontWeight: "800" }}>● 3. Payment</span>
        </div>

        {/* 4. Order Summary Accordion */}
        <div 
          style={{
            background: "#ffffff",
            border: "1.5px solid #ebd9c8",
            borderRadius: "14px",
            marginBottom: "14px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(43, 23, 13, 0.03)"
          }}
        >
          <div 
            onClick={() => setSummaryOpen(!summaryOpen)}
            style={{
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#fcf9f5",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
                Order Summary ({itemCount} {itemCount === 1 ? "Item" : "Items"})
              </span>
              <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#99582a" }}>
                {money(finalTotal)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#806f62" }}>
              <span>{summaryOpen ? "Hide" : "View"}</span>
              {summaryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          {summaryOpen && (
            <div style={{ padding: "14px", borderTop: "1px solid #ebd9c8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#4a3528", marginBottom: "8px" }}>
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              {productDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#166534", marginBottom: "8px" }}>
                  <span>Product Discount</span>
                  <span>-{money(productDiscount)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#166534", marginBottom: "8px" }}>
                  <span>Coupon Discount ({appliedCoupon})</span>
                  <span>-{money(couponDiscount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#4a3528", marginBottom: "8px" }}>
                <span>Shipping</span>
                <span style={{ color: "#166534", fontWeight: "700" }}>FREE</span>
              </div>
              {totalSavings > 0 && (
                <div style={{ background: "#eef9f2", color: "#166534", padding: "6px 10px", borderRadius: "6px", fontSize: "11.5px", fontWeight: "700", display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span>Total Savings</span>
                  <span>{money(totalSavings)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "800", color: "#2b170d", paddingTop: "8px", borderTop: "1px solid #ebd9c8" }}>
                <span>Total Payable</span>
                <span>{money(finalTotal)}</span>
              </div>

              {/* Coupon Form in Accordion */}
              <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #ebd9c8" }}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (onApplyCoupon) onApplyCoupon(couponCode);
                  }}
                  style={{ display: "flex", gap: "6px" }}
                >
                  <input 
                    type="text"
                    placeholder="Coupon Code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={!!appliedCoupon}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: "6px", border: "1px solid #d4c5b9", fontSize: "12px", textTransform: "uppercase" }}
                  />
                  {appliedCoupon ? (
                    <button type="button" onClick={onRemoveCoupon} style={{ padding: "0 10px", background: "#fbebe8", border: "1px solid #f2c7bf", color: "#b91c1c", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                      Remove
                    </button>
                  ) : (
                    <button type="submit" disabled={!couponCode} style={{ padding: "0 14px", background: "#b88a58", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700" }}>
                      Apply
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>

        {/* 5. Shipping Address Card (Mobile Edition) */}
        <CheckoutAddressCard
          formData={formData}
          onInputChange={onInputChange}
          savedAddress={savedAddress}
          usingSavedAddress={usingSavedAddress}
          onUseSavedAddress={onUseSavedAddress}
          onUseDifferentAddress={onUseDifferentAddress}
          onEditAddress={onEditAddress}
          saveAddressCheck={saveAddressCheck}
          onToggleSaveAddressCheck={onToggleSaveAddressCheck}
        />

        {/* 6. Product Review Card (Mobile Edition) */}
        <div 
          style={{
            background: "#ffffff",
            border: "1.5px solid #ebd9c8",
            borderRadius: "16px",
            padding: "16px 14px",
            marginBottom: "16px",
            boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #f0e6da" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#b88a58", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>
                2
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d" }}>
                Sacred Item Review
              </span>
            </div>
            <Link to="/cart" style={{ fontSize: "11.5px", color: "#99582a", fontWeight: "700", textDecoration: "none" }}>
              Edit
            </Link>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <img 
              src={firstItemImg}
              alt={firstItemName}
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "10px",
                objectFit: "cover",
                border: "1.5px solid #dfc7af",
                background: "#f7eee3",
                flexShrink: 0
              }}
              onError={(e) => { e.target.src = "/images/product-1mukhi.jpg"; }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#99582a", background: "#fbf3eb", padding: "2px 6px", borderRadius: "4px" }}>
                Deva Mani • Lab Certified
              </span>
              <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d", margin: "4px 0", lineHeight: "1.25" }}>
                {firstItemName}
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "16px", fontWeight: "800", color: "#2b170d" }}>
                  ₹36,950
                </span>
                <del style={{ fontSize: "12px", color: "#8c796d" }}>₹59,000</del>
                <span style={{ fontSize: "10px", fontWeight: "800", color: "#166534", background: "#eef9f2", padding: "1px 6px", borderRadius: "4px" }}>
                  37% OFF
                </span>
              </div>

              <div style={{ fontSize: "11px", color: "#166534", fontWeight: "700", marginTop: "3px" }}>
                ✓ You save ₹22,050
              </div>
            </div>
          </div>
        </div>

        {/* 7. Payment Method Accordion (UPI first, Cards, Net Banking, Wallets) */}
        <div 
          style={{
            background: "#ffffff",
            border: "1.5px solid #ebd9c8",
            borderRadius: "16px",
            padding: "16px 14px",
            marginBottom: "16px",
            boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid #f0e6da" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#b88a58", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>
                3
              </div>
              <div>
                <span style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d" }}>
                  Select Payment Method
                </span>
                <div style={{ fontSize: "10.5px", color: "#806f62" }}>
                  Secure PayU Bank-Grade Channel
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "3px", background: "#eef9f2", color: "#166534", padding: "2px 6px", borderRadius: "10px", fontSize: "10px", fontWeight: "700" }}>
              <Lock size={10} color="#16a34a" />
              <span>Verified</span>
            </div>
          </div>

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

        {/* 8. PayU Payment Guarantee Card */}
        <PaymentGuaranteeCard />
      </div>

      {/* 9. Sticky Bottom Payment Bar (Mobile Only) */}
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
    </div>
  );
}
