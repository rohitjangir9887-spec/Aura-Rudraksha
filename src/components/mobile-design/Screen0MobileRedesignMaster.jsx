import React, { useState } from "react";
import { 
  Menu, 
  Search, 
  Sparkles, 
  Heart, 
  ShoppingCart, 
  User, 
  Volume2, 
  RotateCcw, 
  Copy, 
  Share2, 
  Mic, 
  Send, 
  Check, 
  Plus, 
  SlidersHorizontal, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  Home, 
  ShoppingBag, 
  PackageCheck, 
  ChevronRight,
  Flame,
  Star,
  CheckCircle2,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { emitToast } from "../../context/ToastContext";

/**
 * Screen0MobileRedesignMaster
 * 
 * Complete 2026 Mobile UI Screenshot Redesign for Aura Rudraksha
 * 
 * Color Palette:
 * - Ivory / Warm Cream (#FCFAF7, #F5EFE6, #FAF5ED)
 * - Deep Chocolate Brown (#2A140A, #1F0D05)
 * - Coffee Brown (#4E2A18, #60341F)
 * - Antique Gold (#C59B27, #D4AF37, #B3861B)
 * - Subtle Saffron (#E07A22)
 * - Terracotta Accents (#C04D28)
 * 
 * Strict viewport & layout discipline:
 * - 390px mobile viewport fidelity
 * - Exact information density
 * - Redesigned Header, Logo, Buttons, Chips, Panditji Panel, Inputs, Bottom Navigation
 */
export function Screen0MobileRedesignMaster({
  onNavigateTab,
  onOpenAuraAi,
  onOpenMenu,
  onOpenSearch
}) {
  const [activeTab, setActiveTab] = useState("home");
  const [quickAiEnabled, setQuickAiEnabled] = useState(true);
  const [activePanditTab, setActivePanditTab] = useState("chat"); // "chat" | "kundli_form" | "saved"
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [activeKundli, setActiveKundli] = useState({
    name: "Rohit Sharma",
    rashi: "मेष (Aries)",
    nakshatra: "अश्विनी (Ashwini)",
    dob: "14 May 1994, 08:30 AM"
  });

  const categories = [
    { id: "all", label: "All Sacred", active: true },
    { id: "1-14", label: "1-14 Mukhi", active: false },
    { id: "siddha", label: "Siddha Mala", active: false },
    { id: "gauri", label: "Gauri Shankar", active: false },
    { id: "kundli", label: "Kundli AI Match", active: false }
  ];

  const suggestedQuestions = [
    "5 मुखी रुद्राक्ष के मुख्य आध्यात्मिक लाभ बताएं",
    "सही धारण विधि, दिन एवं शुद्धिकरण नियम क्या हैं?",
    "मेरी कुंडली के अनुसार सबसे उपयुक्त रुद्राक्ष कौन सा है?",
    "नेपाली बनाम इंडोनेशियाई रुद्राक्ष में क्या अंतर है?"
  ];

  const handleCopy = () => {
    setCopied(true);
    emitToast("मंत्र एवं सलाह कॉपी हो गई!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAudioToggle = () => {
    setIsPlayingAudio(!isPlayingAudio);
    if (!isPlayingAudio) {
      emitToast("🔊 पंडित जी की वाणी प्रारंभ हो रही है...", "info");
    }
  };

  const handleContinueReading = () => {
    emitToast("✨ आगे का वैदिक विवरण एवं संपूर्ण विश्लेषण जोड़ा जा रहा है...", "success");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Aura Rudraksha - AI Panditji Vedic Reading",
        text: "मेरी कुंडली अनुसार रुद्राक्ष परामर्श: 5 मुखी एवं 11 मुखी नेपाली रुद्राक्ष धारण करना सर्वोत्तम रहेगा।",
        url: window.location.href
      }).catch(() => {});
    } else {
      emitToast("परामर्श लिंक कॉपी किया गया!", "info");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "390px",
        margin: "0 auto",
        background: "#FCFAF7",
        minHeight: "844px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxSizing: "border-box",
        fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
        color: "#2A140A",
        paddingBottom: "76px",
        boxShadow: "0 10px 40px rgba(42, 20, 10, 0.08)",
        borderRadius: "28px",
        overflow: "hidden"
      }}
    >
      {/* =========================================================================
          1. TOP PROMOTIONAL VEDIC RIBBON
         ========================================================================= */}
      <div
        style={{
          background: "linear-gradient(90deg, #2A140A 0%, #4E2A18 50%, #2A140A 100%)",
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(197, 155, 39, 0.35)",
          color: "#FAF5ED",
          fontSize: "10.5px",
          fontWeight: 600,
          letterSpacing: "0.2px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ color: "#E07A22", fontSize: "12px" }}>🕉️</span>
          <span>100% Authentic Nepali Rudraksha</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#D4AF37", fontSize: "10px" }}>
          <ShieldCheck size={12} strokeWidth={2.2} />
          <span>Lab Certified</span>
        </div>
      </div>

      {/* =========================================================================
          2. REDESIGNED LUXURY MOBILE HEADER
         ========================================================================= */}
      <header
        style={{
          height: "58px",
          background: "rgba(252, 250, 247, 0.96)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid #EFE6DA",
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40
        }}
      >
        {/* Left: Modern Outline Hamburger Menu */}
        <button
          type="button"
          onClick={onOpenMenu || (() => emitToast("Menu opened", "info"))}
          aria-label="Navigation Menu"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "#F5EFE6",
            border: "1px solid #E8DEC7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#2A140A",
            cursor: "pointer",
            padding: 0
          }}
        >
          <Menu size={18} strokeWidth={2} />
        </button>

        {/* Center: Redesigned Logo Presentation */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none"
          }}
          onClick={() => setActiveTab("home")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            {/* Antique Gold Sacred Bead Mark */}
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 35%, #D4AF37 0%, #996515 100%)",
                boxShadow: "0 1px 4px rgba(153, 101, 21, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: "8px",
                fontWeight: 800
              }}
            >
              ✦
            </div>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', 'Cinzel', serif",
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "1.2px",
                color: "#2A140A",
                lineHeight: 1
              }}
            >
              AURA RUDRAKSHA
            </span>
          </div>
          <span
            style={{
              fontSize: "7.5px",
              fontWeight: 700,
              letterSpacing: "2.2px",
              color: "#C59B27",
              marginTop: "2px",
              textTransform: "uppercase"
            }}
          >
            Sacred Vedic Heritage
          </span>
        </div>

        {/* Right: Icon System (Search, Aura AI, Wishlist, Cart, Account) */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Search Icon */}
          <button
            type="button"
            onClick={onOpenSearch || (() => emitToast("Search Rudraksha & Mala", "info"))}
            aria-label="Search"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4E2A18",
              cursor: "pointer",
              padding: 0
            }}
          >
            <Search size={18} strokeWidth={1.8} />
          </button>

          {/* Aura AI Glow Button */}
          <button
            type="button"
            onClick={onOpenAuraAi || (() => emitToast("Aura AI Assistant Activated", "info"))}
            style={{
              height: "28px",
              padding: "0 8px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #2A140A 0%, #4E2A18 100%)",
              border: "1px solid #D4AF37",
              boxShadow: "0 2px 6px rgba(212, 175, 55, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#FAF5ED",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            <Sparkles size={11} color="#D4AF37" strokeWidth={2.2} />
            <span style={{ color: "#D4AF37" }}>Aura AI</span>
          </button>

          {/* Wishlist */}
          <button
            type="button"
            aria-label="Wishlist"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4E2A18",
              cursor: "pointer",
              padding: 0
            }}
          >
            <Heart size={18} strokeWidth={1.8} />
          </button>

          {/* Cart Icon & Badge */}
          <div
            style={{
              position: "relative",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
            onClick={() => emitToast("Cart has 2 items", "info")}
          >
            <ShoppingCart size={18} color="#2A140A" strokeWidth={1.8} />
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "0px",
                minWidth: "15px",
                height: "15px",
                borderRadius: "8px",
                background: "#C04D28",
                border: "1.5px solid #FCFAF7",
                color: "#FFFFFF",
                fontSize: "9px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 2px"
              }}
            >
              2
            </span>
          </div>

          {/* Account Profile */}
          <button
            type="button"
            aria-label="User Profile"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4E2A18",
              cursor: "pointer",
              padding: 0
            }}
          >
            <User size={18} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* =========================================================================
          3. SCROLLABLE MAIN CONTENT AREA
         ========================================================================= */}
      <main style={{ padding: "12px 12px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {/* HERO BANNER: Premium Himalayan Rudraksha Card */}
        <div
          style={{
            position: "relative",
            borderRadius: "18px",
            background: "linear-gradient(135deg, #2A140A 0%, #3B1B0B 45%, #4E2A18 100%)",
            border: "1px solid rgba(212, 175, 55, 0.4)",
            boxShadow: "0 6px 20px rgba(42, 20, 10, 0.12)",
            overflow: "hidden",
            padding: "16px 14px",
            color: "#FAF5ED"
          }}
        >
          {/* Subtle Golden Sri Yantra / Himalayan Contour Watermark */}
          <div
            style={{
              position: "absolute",
              right: "-20px",
              bottom: "-20px",
              width: "140px",
              height: "140px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0) 70%)",
              pointerEvents: "none"
            }}
          />

          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <span
                style={{
                  background: "rgba(197, 155, 39, 0.2)",
                  border: "1px solid #D4AF37",
                  color: "#D4AF37",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}
              >
                Vedic Sanctified
              </span>
              <span style={{ fontSize: "10px", color: "#E8DEC7" }}>• Free Astro Puja</span>
            </div>

            <h1
              style={{
                fontFamily: "'Cormorant Garamond', 'Cinzel', serif",
                fontSize: "20px",
                fontWeight: 700,
                lineHeight: 1.15,
                color: "#FAF5ED",
                margin: "0 0 6px"
              }}
            >
              Authentic Nepali Rudraksha & AI Vedic Guidance
            </h1>

            <p
              style={{
                fontSize: "11px",
                lineHeight: 1.4,
                color: "#E8DEC7",
                margin: "0 0 12px",
                maxWidth: "280px"
              }}
            >
              Sourced directly from Pashupatinath foothills, X-ray tested & astrologically energized for your birth chart.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                style={{
                  height: "32px",
                  padding: "0 14px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #D4AF37 0%, #B3861B 100%)",
                  border: "none",
                  color: "#2A140A",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                  boxShadow: "0 3px 10px rgba(212, 175, 55, 0.35)"
                }}
              >
                <span>Explore Collection</span>
                <ChevronRight size={13} strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={() => emitToast("Consulting Vedic Acharyas", "info")}
                style={{
                  height: "32px",
                  padding: "0 10px",
                  borderRadius: "16px",
                  background: "rgba(250, 245, 237, 0.12)",
                  border: "1px solid rgba(232, 222, 199, 0.4)",
                  color: "#FAF5ED",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Vedic Guide
              </button>
            </div>
          </div>
        </div>

        {/* CATEGORY SCROLL CHIPS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            padding: "2px 0"
          }}
        >
          {categories.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              style={{
                whiteSpace: "nowrap",
                padding: "6px 12px",
                borderRadius: "16px",
                fontSize: "11px",
                fontWeight: idx === 0 ? 700 : 500,
                background: idx === 0 ? "#2A140A" : "#F5EFE6",
                color: idx === 0 ? "#FAF5ED" : "#4E2A18",
                border: idx === 0 ? "1px solid #4E2A18" : "1px solid #E8DEC7",
                cursor: "pointer",
                boxShadow: idx === 0 ? "0 2px 6px rgba(42, 20, 10, 0.15)" : "none"
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* =========================================================================
            4. AI PANDITJI MASTER PANEL (CENTERPIECE REDESIGN)
           ========================================================================= */}
        <div
          style={{
            borderRadius: "20px",
            background: "#FFFFFF",
            border: "1.5px solid #EFE6DA",
            boxShadow: "0 6px 24px rgba(42, 20, 10, 0.06)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Panditji Header Bar */}
          <div
            style={{
              padding: "12px 14px",
              background: "linear-gradient(135deg, #FCFAF7 0%, #F5EFE6 100%)",
              borderBottom: "1px solid #EFE6DA",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            {/* Panditji Profile Avatar & Title */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #E07A22 0%, #C04D28 100%)",
                    border: "2px solid #D4AF37",
                    boxShadow: "0 2px 8px rgba(224, 122, 34, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                    fontSize: "20px"
                  }}
                >
                  🧘‍♂️
                </div>
                {/* Online Pulse Indicator */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-1px",
                    right: "-1px",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: "#16A34A",
                    border: "2px solid #FFFFFF",
                    boxShadow: "0 0 4px #16A34A"
                  }}
                />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <h2
                    style={{
                      fontFamily: "'Cormorant Garamond', 'Cinzel', serif",
                      fontSize: "17px",
                      fontWeight: 700,
                      color: "#2A140A",
                      margin: 0,
                      lineHeight: 1.1
                    }}
                  >
                    AI Panditji
                  </h2>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#16A34A",
                      background: "rgba(22, 163, 74, 0.12)",
                      padding: "1px 5px",
                      borderRadius: "6px"
                    }}
                  >
                    Online
                  </span>
                </div>
                <p style={{ fontSize: "10.5px", color: "#60341F", margin: "2px 0 0", fontWeight: 500 }}>
                  Vedic Astrologer & Rudraksha Guide
                </p>
              </div>
            </div>

            {/* Quick AI Toggle & New Chat Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Quick AI Switch */}
              <div
                onClick={() => setQuickAiEnabled(!quickAiEnabled)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: quickAiEnabled ? "rgba(197, 155, 39, 0.15)" : "#EFE6DA",
                  border: "1px solid",
                  borderColor: quickAiEnabled ? "#D4AF37" : "#DDD1C1",
                  borderRadius: "12px",
                  padding: "2px 6px",
                  cursor: "pointer"
                }}
              >
                <Sparkles size={10} color={quickAiEnabled ? "#B3861B" : "#8C796D"} />
                <span style={{ fontSize: "9px", fontWeight: 700, color: quickAiEnabled ? "#60341F" : "#8C796D" }}>
                  Quick AI
                </span>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: quickAiEnabled ? "#16A34A" : "#A8988B",
                    transition: "all 0.2s"
                  }}
                />
              </div>

              {/* New Chat Button */}
              <button
                type="button"
                onClick={() => emitToast("नई वैदिक चर्चा प्रारंभ की गई", "info")}
                title="New Chat"
                style={{
                  height: "26px",
                  padding: "0 8px",
                  borderRadius: "8px",
                  background: "#2A140A",
                  border: "none",
                  color: "#FAF5ED",
                  fontSize: "10px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  cursor: "pointer"
                }}
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* Panditji Secondary Tabs Bar */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #EFE6DA",
              background: "#FCFAF7"
            }}
          >
            <button
              type="button"
              onClick={() => setActivePanditTab("chat")}
              style={{
                flex: 1,
                padding: "8px 4px",
                fontSize: "11px",
                fontWeight: activePanditTab === "chat" ? 700 : 500,
                color: activePanditTab === "chat" ? "#2A140A" : "#8C796D",
                borderBottom: activePanditTab === "chat" ? "2px solid #C59B27" : "none",
                background: activePanditTab === "chat" ? "#FFFFFF" : "transparent",
                border: "none",
                cursor: "pointer"
              }}
            >
              AI Panditji
            </button>
            <button
              type="button"
              onClick={() => setActivePanditTab("kundli_form")}
              style={{
                flex: 1,
                padding: "8px 4px",
                fontSize: "11px",
                fontWeight: activePanditTab === "kundli_form" ? 700 : 500,
                color: activePanditTab === "kundli_form" ? "#2A140A" : "#8C796D",
                borderBottom: activePanditTab === "kundli_form" ? "2px solid #C59B27" : "none",
                background: activePanditTab === "kundli_form" ? "#FFFFFF" : "transparent",
                border: "none",
                cursor: "pointer"
              }}
            >
              Kundli Form
            </button>
            <button
              type="button"
              onClick={() => setActivePanditTab("saved")}
              style={{
                flex: 1,
                padding: "8px 4px",
                fontSize: "11px",
                fontWeight: activePanditTab === "saved" ? 700 : 500,
                color: activePanditTab === "saved" ? "#2A140A" : "#8C796D",
                borderBottom: activePanditTab === "saved" ? "2px solid #C59B27" : "none",
                background: activePanditTab === "saved" ? "#FFFFFF" : "transparent",
                border: "none",
                cursor: "pointer"
              }}
            >
              Saved Kundalis (2)
            </button>
          </div>

          {/* Active Kundli Bar */}
          <div
            style={{
              padding: "8px 12px",
              background: "#FAF5ED",
              borderBottom: "1px dashed #E8DEC7",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "10.5px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#E07A22" }}>📜</span>
              <span>
                <strong>Active Kundli:</strong> {activeKundli.name} ({activeKundli.rashi})
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                onClick={() => emitToast("कुण्डली बदलने का विकल्प खुला", "info")}
                style={{
                  padding: "2px 6px",
                  borderRadius: "6px",
                  background: "#FFFFFF",
                  border: "1px solid #D4AF37",
                  color: "#4E2A18",
                  fontSize: "9.5px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => emitToast("सक्रिय कुण्डली हटाई गई", "info")}
                style={{
                  padding: "2px 5px",
                  borderRadius: "6px",
                  background: "#FEE2E2",
                  border: "1px solid #FCA5A5",
                  color: "#991B1B",
                  fontSize: "9.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>

          {/* Panditji Chat Content Body */}
          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            
            {/* AI Assistant Message Bubble (Hindi Astrological Guidance) */}
            <div
              style={{
                borderRadius: "14px",
                background: "#FAF5ED",
                border: "1px solid #EFE6DA",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxShadow: "0 2px 6px rgba(42, 20, 10, 0.03)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "14px" }}>🕉️</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#2A140A" }}>
                  वैदिक परामर्श (Vedic Astrological Guidance)
                </span>
              </div>

              <div
                style={{
                  fontSize: "12px",
                  lineHeight: "1.6",
                  color: "#2A140A",
                  fontFamily: "'Noto Sans Devanagari', 'Plus Jakarta Sans', sans-serif"
                }}
              >
                <strong>नमस्ते रोहित जी!</strong> आपकी जन्म पत्रिका (मेष लग्न, अश्विनी नक्षत्र) के सूक्ष्म विश्लेषण अनुसार वर्तमान में बृहस्पति की शुभ दृष्टि व सूर्य का प्रभाव सक्रिय है।
                <br /><br />
                व्यापार में स्थिरता, उच्च एकाग्रता, आत्मबल तथा शारीरिक ऊर्जा की रक्षा हेतु <strong>5 मुखी एवं 11 मुखी नेपाली रुद्राक्ष</strong> धारण करना सर्वोत्तम व तत्काल फलदायी सिद्ध होगा।
              </div>

              {/* Action Toolbar directly below the message: Voice TTS + Continue + Copy + Share */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "6px",
                  paddingTop: "6px",
                  borderTop: "1px solid #EAE0D2"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {/* TTS Voice Reader Button */}
                  <button
                    type="button"
                    onClick={handleAudioToggle}
                    style={{
                      height: "26px",
                      padding: "0 8px",
                      borderRadius: "13px",
                      background: isPlayingAudio ? "#2A140A" : "#FFFFFF",
                      color: isPlayingAudio ? "#D4AF37" : "#4E2A18",
                      border: "1px solid #D4AF37",
                      fontSize: "10px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer"
                    }}
                  >
                    <Volume2 size={11} strokeWidth={2.2} />
                    <span>{isPlayingAudio ? "पंडित जी बोल रहे हैं..." : "पंडित जी से सुनें"}</span>
                  </button>

                  {/* "✨ शुरू करें (आगे पूरा करें)" Auto-Continuation Button */}
                  <button
                    type="button"
                    onClick={handleContinueReading}
                    style={{
                      height: "26px",
                      padding: "0 8px",
                      borderRadius: "13px",
                      background: "linear-gradient(135deg, #2A140A 0%, #4E2A18 100%)",
                      color: "#FAF5ED",
                      border: "1px solid #D4AF37",
                      fontSize: "10px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(212, 175, 55, 0.2)"
                    }}
                  >
                    <Sparkles size={10} color="#D4AF37" strokeWidth={2.2} />
                    <span>✨ शुरू करें (आगे पूरा करें)</span>
                  </button>
                </div>

                {/* Copy & Share Icons */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy Message"
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "6px",
                      background: "#FFFFFF",
                      border: "1px solid #DDD1C1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#4E2A18",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    {copied ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Share Reading"
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "6px",
                      background: "#FFFFFF",
                      border: "1px solid #DDD1C1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#4E2A18",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    <Share2 size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Suggested Question Chips (Hindi Astrological Quick Actions) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#60341F", letterSpacing: "0.2px" }}>
                सुझाए गए प्रश्न (Suggested Actions):
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputValue(q);
                      emitToast(`प्रश्न चुना गया: ${q.slice(0, 24)}...`, "info");
                    }}
                    style={{
                      textAlign: "left",
                      padding: "7px 10px",
                      borderRadius: "10px",
                      background: "#FCFAF7",
                      border: "1px solid #E8DEC7",
                      fontSize: "11px",
                      color: "#2A140A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "6px",
                      cursor: "pointer",
                      fontFamily: "'Noto Sans Devanagari', 'Plus Jakarta Sans', sans-serif"
                    }}
                  >
                    <span>{q}</span>
                    <ChevronRight size={12} color="#C59B27" strokeWidth={2} style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input Container */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inputValue.trim()) return;
                emitToast("पंडित जी से उत्तर प्राप्त हो रहा है...", "info");
                setInputValue("");
              }}
              style={{
                marginTop: "4px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#FCFAF7",
                border: "1.5px solid #D4AF37",
                borderRadius: "24px",
                padding: "4px 6px 4px 12px",
                boxShadow: "0 2px 8px rgba(212, 175, 55, 0.15)"
              }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="पंडित जी से अपना प्रश्न पूछें..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "11.5px",
                  color: "#2A140A",
                  fontFamily: "'Noto Sans Devanagari', 'Plus Jakarta Sans', sans-serif"
                }}
              />

              {/* Microphone Voice Input */}
              <button
                type="button"
                onClick={() => emitToast("🎤 बोलकर प्रश्न पूछें (Mic Active)", "info")}
                aria-label="Voice Input"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#F5EFE6",
                  border: "1px solid #E8DEC7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#4E2A18",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                <Mic size={14} strokeWidth={2} />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                aria-label="Send Message"
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #2A140A 0%, #4E2A18 100%)",
                  border: "1px solid #D4AF37",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#D4AF37",
                  cursor: "pointer",
                  padding: 0,
                  boxShadow: "0 2px 6px rgba(42, 20, 10, 0.2)"
                }}
              >
                <Send size={13} strokeWidth={2.2} />
              </button>
            </form>

            {/* Authentic Vedic Guidance Trust Stamp */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                fontSize: "9.5px",
                color: "#8C796D",
                marginTop: "2px"
              }}
            >
              <ShieldCheck size={11} color="#C59B27" strokeWidth={2} />
              <span>Authentic Vedic & Astrological Guidance • 100% Private</span>
            </div>

          </div>
        </div>

        {/* FEATURED SACRED RUDRAKSHA PRODUCT CARD (Exact density matching) */}
        <div
          style={{
            borderRadius: "18px",
            background: "#FFFFFF",
            border: "1px solid #EFE6DA",
            padding: "12px",
            boxShadow: "0 4px 14px rgba(42, 20, 10, 0.04)",
            display: "flex",
            gap: "12px"
          }}
        >
          {/* Product Thumbnail */}
          <div
            style={{
              width: "84px",
              height: "84px",
              borderRadius: "12px",
              background: "#FAF5ED",
              border: "1px solid #E8DEC7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: "34px" }}>📿</span>
            <span
              style={{
                position: "absolute",
                top: "4px",
                left: "4px",
                background: "#C04D28",
                color: "#FFFFFF",
                fontSize: "7.5px",
                fontWeight: 800,
                padding: "1px 4px",
                borderRadius: "4px"
              }}
            >
              37% OFF
            </span>
          </div>

          {/* Product Details */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#C59B27", letterSpacing: "0.5px" }}>
                  LAB CERTIFIED NEPALI
                </span>
                <span style={{ fontSize: "9px", color: "#16A34A" }}>✓ In Stock</span>
              </div>
              <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: "#2A140A", margin: "0 0 4px", lineHeight: 1.2 }}>
                Original 5 Mukhi Nepali Rudraksha Kantha
              </h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#2A140A" }}>₹36,950</span>
                <span style={{ fontSize: "10.5px", color: "#8C796D", textDecoration: "line-through" }}>₹59,000</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => emitToast("5 Mukhi Added to Cart", "success")}
                style={{
                  flex: 1,
                  height: "26px",
                  borderRadius: "13px",
                  background: "#2A140A",
                  border: "none",
                  color: "#FAF5ED",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Add to Cart
              </button>
              <button
                type="button"
                aria-label="Wishlist"
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "13px",
                  background: "#FAF5ED",
                  border: "1px solid #DDD1C1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#4E2A18",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                <Heart size={12} />
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* =========================================================================
          5. REDESIGNED LUXURY BOTTOM NAVIGATION DOCK
         ========================================================================= */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "390px",
          height: "64px",
          background: "rgba(255, 253, 249, 0.98)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderTop: "1px solid #EFE6DA",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          zIndex: 50,
          boxShadow: "0 -4px 16px rgba(42, 20, 10, 0.05)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)"
        }}
      >
        {/* Home Tab (Active) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("home");
            if (onNavigateTab) onNavigateTab("home");
          }}
          style={{
            flex: 1,
            height: "100%",
            background: "none",
            border: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            cursor: "pointer",
            padding: "4px 0",
            color: activeTab === "home" ? "#2A140A" : "#8C796D"
          }}
        >
          <div
            style={{
              position: "relative",
              width: "28px",
              height: "28px",
              borderRadius: "10px",
              background: activeTab === "home" ? "rgba(197, 155, 39, 0.15)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Home
              size={18}
              strokeWidth={activeTab === "home" ? 2.4 : 1.8}
              color={activeTab === "home" ? "#B3861B" : "#8C796D"}
            />
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: activeTab === "home" ? 700 : 500,
              color: activeTab === "home" ? "#2A140A" : "#8C796D"
            }}
          >
            Home
          </span>
          {activeTab === "home" && (
            <div
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                background: "#D4AF37",
                marginTop: "-1px"
              }}
            />
          )}
        </button>

        {/* Shop Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("shop");
            if (onNavigateTab) onNavigateTab("shop");
          }}
          style={{
            flex: 1,
            height: "100%",
            background: "none",
            border: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            cursor: "pointer",
            padding: "4px 0",
            color: activeTab === "shop" ? "#2A140A" : "#8C796D"
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "10px",
              background: activeTab === "shop" ? "rgba(197, 155, 39, 0.15)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <ShoppingBag
              size={18}
              strokeWidth={activeTab === "shop" ? 2.4 : 1.8}
              color={activeTab === "shop" ? "#B3861B" : "#8C796D"}
            />
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: activeTab === "shop" ? 700 : 500,
              color: activeTab === "shop" ? "#2A140A" : "#8C796D"
            }}
          >
            Shop
          </span>
        </button>

        {/* Cart Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("cart");
            if (onNavigateTab) onNavigateTab("cart");
          }}
          style={{
            flex: 1,
            height: "100%",
            background: "none",
            border: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            cursor: "pointer",
            padding: "4px 0",
            color: activeTab === "cart" ? "#2A140A" : "#8C796D"
          }}
        >
          <div
            style={{
              position: "relative",
              width: "28px",
              height: "28px",
              borderRadius: "10px",
              background: activeTab === "cart" ? "rgba(197, 155, 39, 0.15)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <ShoppingCart
              size={18}
              strokeWidth={activeTab === "cart" ? 2.4 : 1.8}
              color={activeTab === "cart" ? "#B3861B" : "#8C796D"}
            />
            <span
              style={{
                position: "absolute",
                top: "1px",
                right: "1px",
                minWidth: "13px",
                height: "13px",
                borderRadius: "7px",
                background: "#C04D28",
                color: "#FFFFFF",
                fontSize: "8px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 1px"
              }}
            >
              2
            </span>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: activeTab === "cart" ? 700 : 500,
              color: activeTab === "cart" ? "#2A140A" : "#8C796D"
            }}
          >
            Cart
          </span>
        </button>

        {/* Orders Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("orders");
            if (onNavigateTab) onNavigateTab("orders");
          }}
          style={{
            flex: 1,
            height: "100%",
            background: "none",
            border: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            cursor: "pointer",
            padding: "4px 0",
            color: activeTab === "orders" ? "#2A140A" : "#8C796D"
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "10px",
              background: activeTab === "orders" ? "rgba(197, 155, 39, 0.15)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <PackageCheck
              size={18}
              strokeWidth={activeTab === "orders" ? 2.4 : 1.8}
              color={activeTab === "orders" ? "#B3861B" : "#8C796D"}
            />
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: activeTab === "orders" ? 700 : 500,
              color: activeTab === "orders" ? "#2A140A" : "#8C796D"
            }}
          >
            Orders
          </span>
        </button>

        {/* Account Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("account");
            if (onNavigateTab) onNavigateTab("account");
          }}
          style={{
            flex: 1,
            height: "100%",
            background: "none",
            border: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            cursor: "pointer",
            padding: "4px 0",
            color: activeTab === "account" ? "#2A140A" : "#8C796D"
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "10px",
              background: activeTab === "account" ? "rgba(197, 155, 39, 0.15)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <User
              size={18}
              strokeWidth={activeTab === "account" ? 2.4 : 1.8}
              color={activeTab === "account" ? "#B3861B" : "#8C796D"}
            />
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: activeTab === "account" ? 700 : 500,
              color: activeTab === "account" ? "#2A140A" : "#8C796D"
            }}
          >
            Account
          </span>
        </button>
      </nav>
    </div>
  );
}
