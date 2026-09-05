import React, { useState } from "react";
import { 
  Sparkles, 
  Smartphone, 
  ArrowLeft, 
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Eye
} from "lucide-react";
import { MobileFlowControlBar } from "./MobileFlowControlBar";
import { Screen1MobileCart } from "./Screen1MobileCart";
import { Screen2MobileCheckout } from "./Screen2MobileCheckout";
import { Screen3MobilePaymentMethod } from "./Screen3MobilePaymentMethod";
import { Screen4MobileUpiPayment } from "./Screen4MobileUpiPayment";
import { Screen5MobilePaymentSuccess } from "./Screen5MobilePaymentSuccess";
import { MobileDeviceFrame } from "./MobileDeviceFrame";

/**
 * MobileFlowContainer
 * 
 * Master container hosting the 5 high-fidelity mobile designs:
 * - Interactive single-screen smartphone simulator (390 x 844 px)
 * - Viewport Switcher for Screen 1, Screen 2, Screen 3, Screen 4, Screen 5
 * - Side-by-Side 5-Screen Walkthrough Grid View
 */
export function MobileFlowContainer() {
  const [currentScreen, setCurrentScreen] = useState(1);
  const [viewMode, setViewMode] = useState("single"); // "single" | "all_screens"
  const [showMenuAlert, setShowMenuAlert] = useState(false);

  const screensMeta = [
    { id: 1, title: "Screen 1 — Product / Cart", subtitle: "Product card, badges, Vedic info, sticky bar" },
    { id: 2, title: "Screen 2 — Checkout & Address", subtitle: "Shipping card, review card, accordion summary" },
    { id: 3, title: "Screen 3 — Payment Method", subtitle: "PayU powered UPI, Cards, Net Banking, Wallets" },
    { id: 4, title: "Screen 4 — UPI Payment", subtitle: "Google Pay, PhonePe, Paytm, BHIM & QR" },
    { id: 5, title: "Screen 5 — Payment Success", subtitle: "Green circular check, order details & bottom nav" }
  ];

  const handleOpenAuraAi = () => {
    window.dispatchEvent(
      new CustomEvent("aura_ai_trigger_chat", {
        detail: { prompt: "Namaste Aura AI! Can you explain the spiritual benefits of the 14 Mukhi Rudraksha?" }
      })
    );
  };

  const renderActiveScreen = (screenNumber = currentScreen) => {
    switch (screenNumber) {
      case 1:
        return (
          <Screen1MobileCart
            onProceed={() => setCurrentScreen(2)}
            onOpenMenu={() => setShowMenuAlert(true)}
            onOpenSearch={() => alert("Search rudraksha collections")}
          />
        );
      case 2:
        return (
          <Screen2MobileCheckout
            onBack={() => setCurrentScreen(1)}
            onContinueToPayment={() => setCurrentScreen(3)}
          />
        );
      case 3:
        return (
          <Screen3MobilePaymentMethod
            onBack={() => setCurrentScreen(2)}
            onProceedToUpi={() => setCurrentScreen(4)}
            onDirectPay={() => setCurrentScreen(5)}
          />
        );
      case 4:
        return (
          <Screen4MobileUpiPayment
            onBack={() => setCurrentScreen(3)}
            onPaymentSuccess={() => setCurrentScreen(5)}
          />
        );
      case 5:
        return (
          <Screen5MobilePaymentSuccess
            onViewOrder={() => alert("Navigating to detailed order tracking page #AUR-88942")}
            onContinueShopping={() => setCurrentScreen(1)}
            onTabChange={(tab) => {
              if (tab === "home" || tab === "shop") setCurrentScreen(1);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f3ee",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
    >
      <MobileFlowControlBar
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* 2. MODE A: Interactive Single Mobile Smartphone View */}
      {viewMode === "single" && (
        <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "16px 0 40px" }}>
          <MobileDeviceFrame
            onOpenAuraAi={handleOpenAuraAi}
            activeScreenTitle={screensMeta[currentScreen - 1]?.title || `Screen ${currentScreen}`}
          >
            {renderActiveScreen(currentScreen)}
          </MobileDeviceFrame>
        </div>
      )}

      {/* 3. MODE B: Side-by-Side 5 Screens Walkthrough */}
      {viewMode === "all_screens" && (
        <div
          style={{
            width: "100%",
            maxWidth: "1920px",
            padding: "24px 16px 60px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px"
          }}
        >
          {/* Header Banner */}
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: "28px",
                fontWeight: "700",
                color: "#2b170d",
                margin: "0 0 6px"
              }}
            >
              Complete Mobile Checkout & Payment User Journey
            </h2>
            <p style={{ fontSize: "13px", color: "#6e5d50", margin: 0 }}>
              Seamless high-fidelity 390 × 844 px mobile viewports for each requested phase:
            </p>
          </div>

          {/* Horizontal / Grid of all 5 phone frames */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: "30px",
              flexWrap: "wrap",
              width: "100%"
            }}
          >
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <MobileDeviceFrame
                  onOpenAuraAi={handleOpenAuraAi}
                  activeScreenTitle={screensMeta[num - 1].title}
                >
                  {renderActiveScreen(num)}
                </MobileDeviceFrame>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
