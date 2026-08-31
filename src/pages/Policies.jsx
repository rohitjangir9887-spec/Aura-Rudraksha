import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { 
  ShieldCheck, Truck, RotateCcw, FileText, 
  ArrowLeft, Headphones, Ban, Lock, CheckCircle2 
} from "lucide-react";
import { db, onStoreUpdate } from "../lib/db";

export function Policies() {
  const location = useLocation();
  const path = location.pathname;

  let initialTab = "shipping";
  if (path.includes("return")) initialTab = "returns";
  else if (path.includes("privacy")) initialTab = "privacy";
  else if (path.includes("terms")) initialTab = "terms";
  else if (path.includes("cancellation")) initialTab = "cancellation";
  else if (path.includes("secure-payment") || path.includes("payment")) initialTab = "payment";
  else if (path.includes("support") || path.includes("contact")) initialTab = "support";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [policies, setPolicies] = useState(() => db.getPolicies());

  useEffect(() => {
    setPolicies(db.getPolicies());
    const unsub = onStoreUpdate(() => {
      setPolicies(db.getPolicies());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (path.includes("return")) setActiveTab("returns");
    else if (path.includes("privacy")) setActiveTab("privacy");
    else if (path.includes("terms")) setActiveTab("terms");
    else if (path.includes("cancellation")) setActiveTab("cancellation");
    else if (path.includes("secure-payment") || path.includes("payment")) setActiveTab("payment");
    else if (path.includes("shipping")) setActiveTab("shipping");
    else if (path.includes("support") || path.includes("contact")) setActiveTab("support");
    window.scrollTo(0, 0);
  }, [path]);

  const getButtonStyle = (tabName) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "24px",
    border: activeTab === tabName ? "1.5px solid #a54d2b" : "1.5px solid #ebdccb",
    background: activeTab === tabName ? "#a54d2b" : "#ffffff",
    color: activeTab === tabName ? "#ffffff" : "#4a3b32",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease"
  });

  return (
    <Shell>
      <div className="policies-page" style={{ background: "#fdfbf7", minHeight: "100vh", padding: "40px 16px 80px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          
          <div style={{ marginBottom: "20px" }}>
            <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#a54d2b", fontWeight: "600", textDecoration: "none" }}>
              <ArrowLeft size={16} /> Back to Home
            </Link>
          </div>

          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <span style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#a54d2b", fontWeight: "700" }}>
              AURA RUDRAKSHA ASSURANCE
            </span>
            <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "34px", color: "#2b170d", margin: "6px 0 10px" }}>
              Store Policies & Customer Protection
            </h1>
            <p style={{ color: "#7d6d62", fontSize: "14px", maxWidth: "560px", margin: "0 auto" }}>
              Transparent, fair, and devotee-first guidelines ensuring peace of mind for every sacred artifact purchase.
            </p>
          </div>

          {/* Tab Selection */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "32px",
            flexWrap: "wrap",
            borderBottom: "1px solid #ebdccb",
            paddingBottom: "16px"
          }}>
            <button onClick={() => setActiveTab("shipping")} style={getButtonStyle("shipping")}>
              <Truck size={14} /> Shipping Policy
            </button>

            <button onClick={() => setActiveTab("returns")} style={getButtonStyle("returns")}>
              <RotateCcw size={14} /> Refund & Returns
            </button>

            <button onClick={() => setActiveTab("privacy")} style={getButtonStyle("privacy")}>
              <ShieldCheck size={14} /> Privacy Policy
            </button>

            <button onClick={() => setActiveTab("terms")} style={getButtonStyle("terms")}>
              <FileText size={14} /> Terms of Service
            </button>

            <button onClick={() => setActiveTab("cancellation")} style={getButtonStyle("cancellation")}>
              <Ban size={14} /> Cancellation Policy
            </button>

            <button onClick={() => setActiveTab("payment")} style={getButtonStyle("payment")}>
              <Lock size={14} /> Secure Payment
            </button>

            <button onClick={() => setActiveTab("support")} style={getButtonStyle("support")}>
              <Headphones size={14} /> Contact Support
            </button>
          </div>

          {/* Content Box */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #ebdccb",
            borderRadius: "16px",
            padding: "32px 28px",
            boxShadow: "0 4px 20px rgba(43,23,13,0.04)"
          }}>
            {activeTab === "shipping" && (
              <div>
                <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "26px", color: "#2b170d", marginBottom: "14px" }}>
                  Shipping & Delivery Policy
                </h2>
                <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "13.5px" }}>
                  {policies?.shippingPolicy || `At Aura Rudraksha, every order is treated with spiritual reverence and care. Each sacred Rudraksha bead, Mala, and divine item is energized and quality-inspected prior to dispatch.

• Dispatch Timeline: Orders are processed, consecrated in our temple altar, and dispatched within 24–48 business hours.
• Free Shipping: Complimentary nationwide air express shipping on orders above ₹499 across all pincodes in India.
• Express Couriers: We ship exclusively through insured express courier partners (DTDC Express, Blue Dart, and Delhivery Air).
• Standard Delivery Time: Metros and tier-1 cities: 2–3 days. Rest of India: 3–5 business days.
• Sanctified Packaging: Shipped in velvet & silk pouches along with a holy Gangajal droplet vial and laboratory certificate card.
• Real-time Tracking: Live AWB tracking number is sent via WhatsApp and Email upon dispatch.`}
                </div>
              </div>
            )}

            {activeTab === "returns" && (
              <div>
                <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "26px", color: "#2b170d", marginBottom: "14px" }}>
                  Refund & Return Policy
                </h2>
                <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "13.5px" }}>
                  {policies?.returnPolicy || `Your satisfaction and trust in our authentic lab-certified Rudraksha are paramount. We offer a hassle-free 7-day return window for damaged, defective, or mismatched orders.

• 7-Day Return Window: You may request a return within 7 calendar days of receiving your package.
• Condition of Returned Artifact: The Rudraksha bead or Mala must be returned unused in its original wooden/velvet packaging with the accompanying Lab Certificate intact.
• 100% Money-Back Authenticity Guarantee: If any certified bead fails independent laboratory X-Ray testing at an accredited gemological institute, we offer an immediate 100% full refund plus reimbursement of testing fees.
• Return Pickup: We arrange doorstep reverse pickup across 18,000+ pincodes in India.
• Refund Settlement: Once received and verified, refunds are credited back to your original payment mode (UPI/Card/Bank) within 3–5 working days.`}
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div>
                <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "26px", color: "#2b170d", marginBottom: "14px" }}>
                  Privacy Policy & Data Security
                </h2>
                <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "13.5px" }}>
                  {policies?.privacyPolicy || `Aura Rudraksha is strictly committed to protecting your personal information, birth chart details, and privacy.

• Strict Data Confidentiality: We never sell, rent, or trade your contact numbers, addresses, or purchase history to any third-party marketing networks.
• Astrological Privacy: Any Date/Time/Place of Birth submitted for Kundali analysis is encrypted and used exclusively for your personalized Mukhi consultation.
• 256-Bit SSL Encryption: All transactions are processed over end-to-end encrypted HTTPS protocol.
• Account Control: You have complete rights to view, update, or request permanent deletion of your profile data at any time.`}
                </div>
              </div>
            )}

            {activeTab === "terms" && (
              <div>
                <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "26px", color: "#2b170d", marginBottom: "14px" }}>
                  Terms of Service & Spiritual Usage
                </h2>
                <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "13.5px" }}>
                  {policies?.termsPolicy || `Welcome to Aura Rudraksha. By using this website and acquiring our sacred items, you agree to the following terms and conditions:

• Natural Variations: Rudraksha beads are 100% organic seeds produced by Mother Nature. Slight natural variations in grain texture, bead diameter (±1mm), and amber-brown hues are intrinsic signs of botanical authenticity.
• Spiritual Intent: Our consecrated beads, Malas, and Yantras are provided for meditation, spiritual wellness, and astrological alignment. They are not intended as medical prescriptions.
• Authenticity Guarantee: All beads are guaranteed genuine Nepali/Indonesian origin and lab-certified.
• Intellectual Property: All images, mantras, design assets, and content on Aura Rudraksha are protected by copyright.`}
                </div>
              </div>
            )}

            {activeTab === "cancellation" && (
              <div>
                <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "26px", color: "#2b170d", marginBottom: "14px" }}>
                  Order Cancellation Policy
                </h2>
                <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "13.5px" }}>
{`We understand plans change. We offer clear and generous cancellation options:

• Prior to Temple Consecration & Dispatch: You can cancel your order anytime before the bead is consecrated and handed over to the courier (usually within 12 to 24 hours of placing the order) for a 100% instant full refund.
• How to Cancel: Send an instant WhatsApp message to +91 9672996531 with your Order ID or email support@aurarudraksha.com.
• Post-Dispatch Cancellation: If the package has already been handed over to the express courier, you can simply refuse delivery when the courier partner arrives at your doorstep, and a full refund will be processed upon return confirmation.
• Custom Gold / Silver Capped Orders: Items custom-crafted in hallmarked silver or gold with personalized measurements can be cancelled before metalwork fabrication begins.`}
                </div>
              </div>
            )}

            {activeTab === "payment" && (
              <div>
                <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "26px", color: "#2b170d", marginBottom: "14px" }}>
                  Secure Payment & Fraud Protection
                </h2>
                <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "13.5px" }}>
{`At Aura Rudraksha, your financial security is guarded with highest banking-grade standards:

• 100% PCI-DSS Level 1 Compliant: Payment processing is handled by RBI-approved premier payment gateways (Razorpay, Cashfree, UPI Gateway).
• Supported Payment Modes:
   - All UPI Apps (Google Pay, PhonePe, Paytm, BHIM, Cred)
   - Credit & Debit Cards (Visa, MasterCard, RuPay, American Express)
   - Net Banking across 50+ Indian banks
   - Cash on Delivery (COD) available with verification
• Zero Card Data Storage: Aura Rudraksha never sees or stores your CVV or Card numbers on our servers.
• Bank-Grade 256-Bit SSL: Every session is encrypted from start to finish.`}
                </div>
              </div>
            )}

            {activeTab === "support" && (
              <div>
                <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "26px", color: "#2b170d", marginBottom: "14px" }}>
                  Customer Care & Support
                </h2>
                <div style={{ lineHeight: "1.8", color: "#4a3b32", whiteSpace: "pre-wrap", fontSize: "13.5px", marginBottom: "20px" }}>
                  {policies?.contactSupport || `Dedicated Spiritual Support & Customer Care:
• Email: support@aurarudraksha.com
• Direct Helpline: +91 9672996531
• WhatsApp Astrologer: +91 9672996531
• Timings: Monday to Saturday, 9:00 AM – 7:30 PM IST
• Ashram & Office: Aura Rudraksha, Sikar, Rajasthan - 332001`}
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Link 
                    to="/contact" 
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#a54d2b",
                      color: "#ffffff",
                      padding: "9px 18px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 700,
                      textDecoration: "none"
                    }}
                  >
                    Open Contact Desk Page
                  </Link>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </Shell>
  );
}
