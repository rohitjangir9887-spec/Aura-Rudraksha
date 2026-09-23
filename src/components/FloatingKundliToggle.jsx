import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  User,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  ShoppingCart,
  MessageCircle,
  Check,
  ChevronRight,
  ShieldCheck,
  Compass,
  Star,
  Award,
  BookOpen,
  Share2,
  ExternalLink,
  Flame,
  Info
} from "lucide-react";
import { VedicKundaliChart } from "./VedicKundaliChart";
import { auraAiClient } from "../lib/auraAiClient";
import { auraChatStore } from "../lib/auraChatStore";
import { authClient } from "../lib/authClient";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { db } from "../lib/db";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CONCERN_OPTIONS } from "./panditji/utils";

const POPULAR_CITIES = [
  "Sikar, Rajasthan",
  "Jaipur, Rajasthan",
  "New Delhi, Delhi",
  "Mumbai, Maharashtra",
  "Varanasi, UP",
  "Haridwar, Uttarakhand",
  "Ahmedabad, Gujarat",
  "Bengaluru, Karnataka",
  "Kolkata, West Bengal",
  "Lucknow, UP",
  "Indore, MP",
  "Patna, Bihar"
];

export function FloatingKundliToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("d1"); // 'd1' (Lagna) or 'd9' (Navamsha)
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeBirthDetails, setActiveBirthDetails] = useState(() => auraChatStore.getVerifiedBirthDetails());
  const [kundaliResult, setKundaliResult] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const { add } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Form Fields
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [gender, setGender] = useState("Male");
  const [concern, setConcern] = useState("career");

  // Sync with store
  useEffect(() => {
    const handleBirthDetailsUpdate = (e) => {
      const details = e.detail?.details || auraChatStore.getVerifiedBirthDetails();
      setActiveBirthDetails(details);
    };
    const handleBirthDetailsCleared = () => {
      setActiveBirthDetails(null);
      setKundaliResult(null);
      setShowEditForm(true);
    };
    const handleOpenKundliModal = (e) => {
      setIsOpen(true);
      if (e.detail?.birthDetails) {
        populateForm(e.detail.birthDetails);
      }
    };

    window.addEventListener("aura_ai_birth_details_updated", handleBirthDetailsUpdate);
    window.addEventListener("aura_ai_birth_details_cleared", handleBirthDetailsCleared);
    window.addEventListener("open_floating_kundli_modal", handleOpenKundliModal);

    return () => {
      window.removeEventListener("aura_ai_birth_details_updated", handleBirthDetailsUpdate);
      window.removeEventListener("aura_ai_birth_details_cleared", handleBirthDetailsCleared);
      window.removeEventListener("open_floating_kundli_modal", handleOpenKundliModal);
    };
  }, []);

  // Initialize or populate form from verified data or logged in user
  const populateForm = (details) => {
    if (details) {
      setName(details.name || "");
      setDob(details.dob || "");
      setBirthTime(details.birthTime || details.time || "12:00");
      setBirthPlace(details.birthPlace || details.place || "");
      setGender(details.gender || "Male");
      setConcern(details.concern || "career");
    } else {
      const user = authClient.getUser();
      if (user) {
        setName(user.displayName || user.name || "");
      }
    }
  };

  // Auto-calculate on open if birth details exist and not already calculated
  useEffect(() => {
    if (isOpen) {
      const verified = auraChatStore.getVerifiedBirthDetails();
      if (verified && verified.dob && verified.birthTime && verified.birthPlace) {
        setActiveBirthDetails(verified);
        populateForm(verified);
        if (!kundaliResult || kundaliResult.verifiedBirthData?.dob !== verified.dob) {
          calculateFromDetails(verified);
        }
      } else {
        setShowEditForm(true);
        populateForm(null);
      }
    }
  }, [isOpen]);

  const calculateFromDetails = async (details) => {
    setIsCalculating(true);
    try {
      const response = await auraAiClient.calculateKundali({
        name: details.name || "Devotee",
        dob: details.dob,
        birthTime: details.birthTime || details.time || "12:00",
        birthPlace: details.birthPlace || details.place || "India",
        gender: details.gender || "Male",
        concern: details.concern || "career"
      });

      if (response?.success && response?.data) {
        setKundaliResult(response.data);
        setShowEditForm(false);
        // Save to verified store
        auraChatStore.saveVerifiedBirthDetails({
          name: details.name || "Devotee",
          dob: details.dob,
          birthTime: details.birthTime || details.time || "12:00",
          birthPlace: details.birthPlace || details.place || "India",
          gender: details.gender || "Male",
          concern: details.concern || "career"
        });
      } else {
        setShowEditForm(true);
      }
    } catch (err) {
      console.warn("Kundali calculation error:", err);
      setShowEditForm(true);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      emitToast("कृपया अपना नाम दर्ज करें (Please enter your name)", "warning");
      return;
    }
    if (!dob) {
      emitToast("कृपया अपनी जन्म तिथि (DOB) चुनें", "warning");
      return;
    }
    if (!birthTime) {
      emitToast("कृपया अपना जन्म समय (Birth Time) चुनें", "warning");
      return;
    }
    if (!birthPlace.trim()) {
      emitToast("कृपया अपना जन्म स्थान दर्ज करें", "warning");
      return;
    }

    const payload = {
      name: name.trim(),
      dob,
      birthTime,
      birthPlace: birthPlace.trim(),
      gender,
      concern
    };

    setIsCalculating(true);
    try {
      const response = await auraAiClient.calculateKundali(payload);
      if (response?.success && response?.data) {
        setKundaliResult(response.data);
        setActiveBirthDetails(payload);
        auraChatStore.saveVerifiedBirthDetails(payload);
        setShowEditForm(false);
        emitToast("✨ आपकी वैदिक कुण्डली सफलतापूर्वक तैयार हो गई!", "success");
      } else {
        emitToast(response?.message || "कुण्डली गणना में समस्या आई, कृपया पुनः जांचें।", "error");
      }
    } catch (err) {
      emitToast("वैदिक कुण्डली सर्वर त्रुटि। कृपया पुनः प्रयास करें।", "error");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFillDemoData = () => {
    setName("Rohit Jangir");
    setDob("2006-05-11");
    setBirthTime("12:15");
    setBirthPlace("Sikar, Rajasthan, India");
    setGender("Male");
    setConcern("career");
    emitToast("रोहित जांगिड़ जी का प्रामाणिक विवरण भर दिया गया", "info");
  };

  const handleAddToCart = (product) => {
    if (!product) return;
    add(product.id, 1);
    setAddedSuccess(true);
    emitToast(`${product.name || "रुद्राक्ष"} कार्ट में जोड़ दिया गया!`, "success");
    setTimeout(() => setAddedSuccess(false), 2500);
  };

  const handleConsultPanditJiInChat = () => {
    setIsOpen(false);
    const birth = kundaliResult?.verifiedBirthData || activeBirthDetails;
    const astro = kundaliResult?.astronomicalKundali;
    const rashiName = astro?.chandraRashi?.rashiHindi || "वैदिक";
    const mukhi = astro?.rudrakshaRecommendations?.[0]?.mukhi || "रुद्राक्ष";

    const promptText = birth?.dob
      ? `🙏 प्रणाम पंडित जी! मेरा नाम ${birth.name} है (जन्म: ${birth.dob}, ${birth.birthTime}, ${birth.birthPlace})। मेरी राशि ${rashiName} है और अनुशंसित रुद्राक्ष ${mukhi} है। कृपया मेरी कुण्डली अनुसार करियर, ग्रह गोचर और रुद्राक्ष धारण विधि का मार्गदर्शन करें।`
      : `🙏 प्रणाम पंडित जी! कृपया मेरी जन्म कुण्डली का वैदिक विश्लेषण एवं शुभ रुद्राक्ष परामर्श बताएं।`;

    auraChatStore.triggerChat(promptText, "panditji");
  };

  const handleShareOnWhatsApp = () => {
    if (!kundaliResult) return;
    const birth = kundaliResult.verifiedBirthData || {};
    const astro = kundaliResult.astronomicalKundali || {};
    const text = `🕉️ *मेरी वैदिक जन्म कुण्डली — Aura Rudraksha*\n\n👤 जातक: ${birth.name}\n📅 जन्म: ${birth.dob} (${birth.birthTime}, ${birth.birthPlace})\n♈ लग्न: ${astro.lagna?.rashiHindi || ""}\n🌙 चंद्र राशि: ${astro.chandraRashi?.rashiHindi || ""}\n🪐 नक्षत्र: ${astro.chandraRashi?.nakshatra || ""}\n⏱️ वर्तमान महादशा: ${astro.vimshottariDasha?.currentMahadashaHindi || ""}\n📿 अनुशंसित रुद्राक्ष: ${astro.rudrakshaRecommendations?.[0]?.mukhi || "रुद्राक्ष"}\n\n👉 अपनी कुण्डली व सिद्ध रुद्राक्ष जानने के लिए देखें: https://aurarudraksha.bond`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const astro = kundaliResult?.astronomicalKundali;
  const verifiedBirth = kundaliResult?.verifiedBirthData || activeBirthDetails;
  const recommendedBead = astro?.rudrakshaRecommendations?.[0];
  const matchedProduct = kundaliResult?.matchedProduct || (db.getProducts ? db.getProducts()[0] : null);

  return (
    <>
      {/* 1. FLOATING KUNDLI TOGGLE BUTTON (Main Page) */}
      {location.pathname === "/" && (
        <div
          className="aura-floating-kundli-btn-wrap"
          style={{
            position: "fixed",
            bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
            right: "14px",
            zIndex: 10018,
            display: "inline-flex",
            alignItems: "center",
            userSelect: "none",
            WebkitBackfaceVisibility: "hidden"
          }}
        >
          <motion.button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Open Vedic Kundli Consultation"
            className="aura-floating-kundli-btn"
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "9px 15px",
              borderRadius: "32px",
              background: "linear-gradient(135deg, #7A1C06 0%, #B45309 55%, #9A3412 100%)",
              color: "#FFFDF7",
              border: "1.5px solid #F59E0B",
              boxShadow: "0 4px 18px rgba(180, 83, 9, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "0.02em",
              backdropFilter: "blur(8px)",
              textShadow: "0 1px 2px rgba(0,0,0,0.4)"
            }}
          >
            <span style={{ fontSize: "16px", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>🕉️</span>
            <span style={{ fontFamily: '"Cinzel", "Noto Serif Devanagari", serif' }}>
              कुण्डली
            </span>
            {activeBirthDetails?.dob ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(16, 185, 129, 0.9)",
                  color: "#FFFFFF",
                  fontSize: "9.5px",
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.4)",
                  marginLeft: "2px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
                }}
              >
                ✓ सक्रिय
              </span>
            ) : (
              <Sparkles size={13} className="text-amber-300 animate-pulse" />
            )}
          </motion.button>
        </div>
      )}

      {/* 2. DETAILED KUNDLI & BIRTH DETAILS MODAL */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="aura-kundli-modal-backdrop"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10025,
              background: "rgba(26, 12, 6, 0.72)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px",
              boxSizing: "border-box",
              overflowY: "auto"
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}
          >
            <motion.div
              className="aura-kundli-modal-card"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: "100%",
                maxWidth: "760px",
                maxHeight: "92vh",
                background: "linear-gradient(135deg, #FFFDF9 0%, #FAF3E8 100%)",
                borderRadius: "18px",
                border: "2px solid #D4AF37",
                boxShadow: "0 16px 48px rgba(74, 14, 23, 0.35), 0 0 0 1px rgba(212, 175, 55, 0.3)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Sacred Header */}
              <div
                style={{
                  background: "linear-gradient(135deg, #4A0E17 0%, #7A1C06 50%, #681523 100%)",
                  color: "#FFFDF7",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1.5px solid #D4AF37",
                  position: "sticky",
                  top: 0,
                  zIndex: 10
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "24px", lineHeight: 1 }}>🕉️</span>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "17px",
                        fontWeight: 700,
                        fontFamily: '"Cormorant Garamond", serif',
                        color: "#FFFDF7",
                        letterSpacing: "0.02em"
                      }}
                    >
                      प्रामाणिक वैदिक जन्म पत्रिका (Kundli)
                    </h3>
                    <div style={{ fontSize: "11px", color: "#FDE68A", marginTop: "1px" }}>
                      लहिरी अयनांश • दृक् पंचांग खगोल गणित • महर्षि पराशर पद्धति
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Modal"
                  style={{
                    background: "rgba(255, 255, 255, 0.12)",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    color: "#FFFDF7",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <X size={17} />
                </button>
              </div>

              {/* Modal Body Scroll Area */}
              <div
                style={{
                  padding: "16px 18px",
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                  flex: 1
                }}
              >
                {/* CASE A: BIRTH DETAILS ENTRY FORM */}
                {(showEditForm || !kundaliResult) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div
                      style={{
                        background: "rgba(217, 119, 6, 0.08)",
                        border: "1px solid rgba(217, 119, 6, 0.3)",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "8px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Compass size={16} className="text-amber-700 flex-shrink-0" />
                        <span style={{ fontSize: "12px", color: "#7A1C06", fontWeight: 600 }}>
                          सटीक कुण्डली चक्र व रुद्राक्ष परामर्श हेतु जन्म विवरण भरें:
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleFillDemoData}
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #D97706",
                          color: "#9A3412",
                          borderRadius: "6px",
                          padding: "3px 8px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        ⚡ टेस्ट डेटा (रोहित जांगिड़)
                      </button>
                    </div>

                    <form onSubmit={handleFormSubmit}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: "12px 14px",
                          marginBottom: "14px"
                        }}
                      >
                        {/* 1. Name */}
                        <div>
                          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "#4A0E17", marginBottom: "4px" }}>
                            <User size={13} className="text-amber-700" />
                            <span>जातक का पूरा नाम (Full Name) *</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="उदा. रोहित जांगिड़ / Rohit"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "9px 12px",
                              border: "1.5px solid #D1BBA3",
                              borderRadius: "8px",
                              background: "#FFFFFF",
                              fontSize: "13.5px",
                              color: "#2B170D",
                              outline: "none",
                              boxSizing: "border-box"
                            }}
                          />
                        </div>

                        {/* 2. Date of Birth */}
                        <div>
                          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "#4A0E17", marginBottom: "4px" }}>
                            <Calendar size={13} className="text-amber-700" />
                            <span>जन्म तिथि (Date of Birth) *</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1.5px solid #D1BBA3",
                              borderRadius: "8px",
                              background: "#FFFFFF",
                              fontSize: "13.5px",
                              color: "#2B170D",
                              outline: "none",
                              boxSizing: "border-box"
                            }}
                          />
                        </div>

                        {/* 3. Birth Time */}
                        <div>
                          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "#4A0E17", marginBottom: "4px" }}>
                            <Clock size={13} className="text-amber-700" />
                            <span>जन्म समय (Time of Birth) *</span>
                          </label>
                          <input
                            type="time"
                            required
                            value={birthTime}
                            onChange={(e) => setBirthTime(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1.5px solid #D1BBA3",
                              borderRadius: "8px",
                              background: "#FFFFFF",
                              fontSize: "13.5px",
                              color: "#2B170D",
                              outline: "none",
                              boxSizing: "border-box"
                            }}
                          />
                        </div>

                        {/* 4. Birth Place */}
                        <div>
                          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "#4A0E17", marginBottom: "4px" }}>
                            <MapPin size={13} className="text-amber-700" />
                            <span>जन्म स्थान (City / Place) *</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="उदा. Sikar / Jaipur / Delhi"
                            value={birthPlace}
                            onChange={(e) => setBirthPlace(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "9px 12px",
                              border: "1.5px solid #D1BBA3",
                              borderRadius: "8px",
                              background: "#FFFFFF",
                              fontSize: "13.5px",
                              color: "#2B170D",
                              outline: "none",
                              boxSizing: "border-box"
                            }}
                          />
                        </div>

                        {/* 5. Gender */}
                        <div>
                          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "#4A0E17", marginBottom: "4px" }}>
                            <ShieldCheck size={13} className="text-amber-700" />
                            <span>लिंग (Gender)</span>
                          </label>
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "9px 12px",
                              border: "1.5px solid #D1BBA3",
                              borderRadius: "8px",
                              background: "#FFFFFF",
                              fontSize: "13.5px",
                              color: "#2B170D",
                              outline: "none",
                              boxSizing: "border-box"
                            }}
                          >
                            <option value="Male">पुरुष (Male)</option>
                            <option value="Female">महिला (Female)</option>
                            <option value="Other">अन्य (Other)</option>
                          </select>
                        </div>

                        {/* 6. Primary Concern */}
                        <div>
                          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "#4A0E17", marginBottom: "4px" }}>
                            <Flame size={13} className="text-amber-700" />
                            <span>परामर्श का मुख्य विषय (Focus Area)</span>
                          </label>
                          <select
                            value={concern}
                            onChange={(e) => setConcern(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "9px 12px",
                              border: "1.5px solid #D1BBA3",
                              borderRadius: "8px",
                              background: "#FFFFFF",
                              fontSize: "13.5px",
                              color: "#2B170D",
                              outline: "none",
                              boxSizing: "border-box"
                            }}
                          >
                            {CONCERN_OPTIONS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* City Quick Chips */}
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "11px", color: "#8C786A", marginBottom: "6px" }}>लोकप्रिय जन्म स्थान (Quick Select):</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {POPULAR_CITIES.map((city) => (
                            <button
                              key={city}
                              type="button"
                              onClick={() => setBirthPlace(city)}
                              style={{
                                background: birthPlace === city ? "#FEF3C7" : "#FFFFFF",
                                border: birthPlace === city ? "1.5px solid #D97706" : "1px solid #E2D2BC",
                                color: birthPlace === city ? "#9A3412" : "#5C4A3E",
                                borderRadius: "14px",
                                padding: "3px 9px",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Submit Action */}
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          type="submit"
                          disabled={isCalculating}
                          style={{
                            flex: 1,
                            minWidth: "220px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "12px 20px",
                            borderRadius: "10px",
                            background: isCalculating
                              ? "#9CA3AF"
                              : "linear-gradient(135deg, #7A1C06 0%, #B45309 60%, #9A3412 100%)",
                            color: "#FFFDF7",
                            border: "1.5px solid #F59E0B",
                            fontSize: "14.5px",
                            fontWeight: 700,
                            cursor: isCalculating ? "wait" : "pointer",
                            boxShadow: "0 4px 14px rgba(180, 83, 9, 0.3)"
                          }}
                        >
                          {isCalculating ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              <span>वैदिक खगोलीय गणना चल रही है...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} className="text-amber-300" />
                              <span>🕉️ कुण्डली बनाएं व विस्तृत विश्लेषण देखें</span>
                            </>
                          )}
                        </button>

                        {kundaliResult && (
                          <button
                            type="button"
                            onClick={() => setShowEditForm(false)}
                            style={{
                              padding: "12px 16px",
                              borderRadius: "10px",
                              background: "#FFFFFF",
                              border: "1.5px solid #C89B3C",
                              color: "#4A0E17",
                              fontWeight: 600,
                              fontSize: "13px",
                              cursor: "pointer"
                            }}
                          >
                            वापस कुण्डली देखें
                          </button>
                        )}
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* CASE B: DETAILED KUNDLI VIEW */}
                {!showEditForm && kundaliResult && astro && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* Top Devotee Strip */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)",
                        border: "1.5px solid #FCD34D",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        marginBottom: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "10px",
                        boxShadow: "0 2px 8px rgba(74, 14, 23, 0.05)"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "16px" }}>🕉️</span>
                          <h4 style={{ margin: 0, fontSize: "16px", color: "#4A0E17", fontWeight: 700 }}>
                            श्री {verifiedBirth.name} जी की जन्म कुण्डली
                          </h4>
                        </div>
                        <div style={{ fontSize: "12px", color: "#78350F", marginTop: "3px" }}>
                          जन्म: <b>{verifiedBirth.dob}</b> • समय: <b>{verifiedBirth.birthTime}</b> • स्थान: <b>{verifiedBirth.birthPlace}</b>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => setShowEditForm(true)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "#FFFFFF",
                            border: "1px solid #D97706",
                            color: "#9A3412",
                            padding: "5px 10px",
                            borderRadius: "7px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          <RefreshCw size={12} /> विवरण बदलें
                        </button>
                        <button
                          type="button"
                          onClick={handleShareOnWhatsApp}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "#25D366",
                            border: "none",
                            color: "#FFFFFF",
                            padding: "5px 10px",
                            borderRadius: "7px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          <Share2 size={12} /> शेयर
                        </button>
                      </div>
                    </div>

                    {/* 4 Astrological Pillars Bar */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: "8px",
                        marginBottom: "14px"
                      }}
                    >
                      <div style={{ background: "#FFFFFF", border: "1px solid #E2D2BC", borderRadius: "8px", padding: "8px 12px" }}>
                        <div style={{ fontSize: "10px", color: "#8C786A", textTransform: "uppercase" }}>जन्म लग्न (Ascendant)</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#4A0E17", marginTop: "2px" }}>
                          {astro.lagna?.rashiHindi || "सिंह"} ({astro.lagna?.degree || "0°"})
                        </div>
                      </div>

                      <div style={{ background: "#FFFFFF", border: "1px solid #E2D2BC", borderRadius: "8px", padding: "8px 12px" }}>
                        <div style={{ fontSize: "10px", color: "#8C786A", textTransform: "uppercase" }}>चंद्र राशि (Moon Sign)</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#4A0E17", marginTop: "2px" }}>
                          🌙 {astro.chandraRashi?.rashiHindi || "कन्या"}
                        </div>
                      </div>

                      <div style={{ background: "#FFFFFF", border: "1px solid #E2D2BC", borderRadius: "8px", padding: "8px 12px" }}>
                        <div style={{ fontSize: "10px", color: "#8C786A", textTransform: "uppercase" }}>नक्षत्र व पाद</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#4A0E17", marginTop: "2px" }}>
                          ✨ {astro.chandraRashi?.nakshatra || "हस्त"} (पद {astro.chandraRashi?.pada || "1"})
                        </div>
                      </div>

                      <div style={{ background: "#FFFFFF", border: "1px solid #E2D2BC", borderRadius: "8px", padding: "8px 12px" }}>
                        <div style={{ fontSize: "10px", color: "#8C786A", textTransform: "uppercase" }}>वर्तमान महादशा</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#B45309", marginTop: "2px" }}>
                          ⏱️ {astro.vimshottariDasha?.currentMahadashaHindi || "सूर्य"} ({astro.vimshottariDasha?.currentAntardashaHindi || ""})
                        </div>
                      </div>
                    </div>

                    {/* Vedic Kundali Chart Display */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#4A0E17" }}>
                          🏛️ उत्तर भारतीय वैदिक लग्न कुण्डली चक्र (D1 & D9)
                        </div>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setActiveTab("d1")}
                            style={{
                              background: activeTab === "d1" ? "#7A1C06" : "#FFFFFF",
                              color: activeTab === "d1" ? "#FFFDF7" : "#4A0E17",
                              border: "1px solid #D97706",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            D1 लग्न चक्र
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab("d9")}
                            style={{
                              background: activeTab === "d9" ? "#7A1C06" : "#FFFFFF",
                              color: activeTab === "d9" ? "#FFFDF7" : "#4A0E17",
                              border: "1px solid #D97706",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            D9 नवमांश
                          </button>
                        </div>
                      </div>

                      <VedicKundaliChart
                        lagnaRashiNumber={activeTab === "d9" ? (astro.lagna?.navamshaRashiIndex || astro.lagna?.rashiIndex || 1) : (astro.lagna?.rashiIndex || 1)}
                        navamshaLagnaRashiNumber={astro.lagna?.navamshaRashiIndex || astro.lagna?.rashiIndex}
                        planets={astro.planets || []}
                        title={activeTab === "d9" ? "नवमांश कुण्डली (D9 Navamsha)" : "वैदिक लग्न कुण्डली (D1 Lagna)"}
                        subtitle="उत्तर भारतीय वैदिक चक्र"
                        birthData={verifiedBirth}
                        fullKundaliData={kundaliResult}
                      />
                    </div>

                    {/* Recommended Consecrated Rudraksha Bead Card */}
                    {recommendedBead && (
                      <div
                        style={{
                          background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
                          border: "1.5px solid #F59E0B",
                          borderRadius: "14px",
                          padding: "14px 16px",
                          marginBottom: "16px",
                          boxShadow: "0 4px 14px rgba(217, 119, 6, 0.12)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "#9A3412", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            ★ कुण्डली अनुसार सर्वोत्तम रुद्राक्ष:
                          </span>
                          <span style={{ fontSize: "11px", background: "#7A1C06", color: "#FFFDF7", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                            {recommendedBead.role || "शुभ रुद्राक्ष"}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                          <div>
                            <div style={{ fontSize: "17px", fontWeight: 800, color: "#4A0E17", fontFamily: '"Cormorant Garamond", serif' }}>
                              {recommendedBead.mukhi}
                            </div>
                            <div style={{ fontSize: "12px", color: "#78350F", marginTop: "2px" }}>
                              {recommendedBead.reason || "लग्न व राशि स्वामी की अनुकूलता हेतु सर्वोत्तम"}
                            </div>
                            {recommendedBead.beejMantra && (
                              <div style={{ fontSize: "11.5px", color: "#B45309", fontWeight: 700, marginTop: "4px" }}>
                                📿 बीज मंत्र: <span style={{ color: "#7A1C06" }}>{recommendedBead.beejMantra}</span>
                              </div>
                            )}
                          </div>

                          {matchedProduct && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "14px", fontWeight: 800, color: "#7A1C06" }}>
                                  ₹{matchedProduct.price?.toLocaleString("en-IN")}
                                </div>
                                <div style={{ fontSize: "10px", color: "#16A34A", fontWeight: 700 }}>
                                  100% प्राण-प्रतिष्ठित
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddToCart(matchedProduct)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  background: "linear-gradient(135deg, #7A1C06 0%, #B45309 100%)",
                                  color: "#FFFDF7",
                                  border: "1px solid #F59E0B",
                                  borderRadius: "8px",
                                  padding: "8px 12px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  boxShadow: "0 2px 8px rgba(122, 28, 6, 0.25)"
                                }}
                              >
                                {addedSuccess ? <Check size={14} /> : <ShoppingCart size={14} />}
                                <span>{addedSuccess ? "जोड़ा गया!" : "कार्ट में डालें"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Direct Ask AI Pandit Ji Consultation Action */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #4A0E17 0%, #681523 100%)",
                        borderRadius: "12px",
                        padding: "14px 16px",
                        color: "#FFFDF7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                        border: "1px solid #D4AF37"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "14.5px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>💬</span> क्या आपके मन में कोई विशेष प्रश्न है?
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#FDE68A", marginTop: "2px" }}>
                          करियर, विवाह, धन, स्वास्थ्य या रुद्राक्ष धारण विधि पर AI पंडित जी से लाइव पूछें
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleConsultPanditJiInChat}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                          color: "#4A0E17",
                          border: "none",
                          borderRadius: "8px",
                          padding: "9px 16px",
                          fontSize: "13px",
                          fontWeight: 800,
                          cursor: "pointer",
                          boxShadow: "0 3px 10px rgba(0,0,0,0.3)"
                        }}
                      >
                        <MessageCircle size={15} />
                        <span>पंडित जी से लाइव पूछें (Ask AI)</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
