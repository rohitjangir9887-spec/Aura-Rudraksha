import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Sparkles, 
  Layers, 
  Smartphone, 
  ArrowLeft, 
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Eye
} from "lucide-react";
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
      {/* 1. Master Showcase Control Bar (Top Navigation for Evaluator) */}
      <div
        style={{
          width: "100%",
          background: "#2b170d",
          borderBottom: "1.5px solid #dfc7af",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 4px 14px rgba(0,0,0,0.18)"
        }}
      >
        {/* Left: Brand & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "radial-gradient(circle, #b88a58 0%, #7a4a24 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              fontWeight: "700"
            }}
          >
            ॐ
          </div>
          <div>
            <div style={{ color: "#ffffff", fontFamily: '"Cormorant Garamond", serif', fontSize: "17px", fontWeight: "700" }}>
              AURA RUDRAKSHA — MOBILE UI/UX SYSTEM
            </div>
            <div style={{ color: "#dfc7af", fontSize: "10px", fontWeight: "600" }}>
              High-Fidelity 390 × 844 px Smartphone Viewport
            </div>
          </div>
        </div>

        {/* Center: 5 Screen Switcher Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "rgba(255,255,255,0.08)",
            padding: "4px",
            borderRadius: "10px",
            border: "1px solid rgba(223, 199, 175, 0.2)"
          }}
        >
          {[1, 2, 3, 4, 5].map((num) => {
            const isCurrent = currentScreen === num && viewMode === "single";
            return (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setViewMode("single");
                  setCurrentScreen(num);
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: isCurrent ? "1px solid #b88a58" : "none",
                  background: isCurrent ? "#b88a58" : "transparent",
                  color: isCurrent ? "#ffffff" : "#dfc7af",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span>Screen {num}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setViewMode("all_screens")}
            style={{
              padding: "5px 12px",
              borderRadius: "6px",
              border: viewMode === "all_screens" ? "1px solid #22c55e" : "1px solid rgba(255,255,255,0.15)",
              background: viewMode === "all_screens" ? "#166534" : "rgba(255,255,255,0.05)",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginLeft: "4px"
            }}
          >
            <Layers size={12} />
            <span>All 5 Screens Walkthrough</span>
          </button>
        </div>

        {/* Right: Return to Store or Reset */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => {
              setCurrentScreen(1);
              setViewMode("single");
            }}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              background: "transparent",
              border: "1px solid #dfc7af",
              color: "#dfc7af",
              fontSize: "11px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer"
            }}
          >
            <RotateCcw size={11} />
            <span>Reset Flow</span>
          </button>

          <Link
            to="/"
            style={{
              padding: "5px 12px",
              borderRadius: "6px",
              background: "#b88a58",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: "700"
            }}
          >
            Store Home
          </Link>
        </div>
      </div>

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
