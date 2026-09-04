import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  Compass, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  ShoppingCart, 
  MessageCircle, 
  Award, 
  Lock, 
  Truck, 
  Headphones,
  Flame,
  Check,
  Zap,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../hooks/useCart";
import { db } from "../lib/db";
import { auraChatStore } from "../lib/auraChatStore";
import { emitToast } from "../context/ToastContext";

// Astrological Rashi & Rudraksha mapping rules
const RASHI_DATA = [
  { nameHindi: "मेष", nameEng: "Aries", symbol: "♈", lord: "मंगल देव (Mars)", element: "अग्नि (Fire)", start: [3, 21], end: [4, 19], primaryMukhi: "3 Mukhi", fallbackMukhi: "11 Mukhi", mantra: "ॐ क्लीं नमः", day: "मंगलवार (Tuesday)", productId: "5" },
  { nameHindi: "वृषभ", nameEng: "Taurus", symbol: "♉", lord: "शुक्र देव (Venus)", element: "पृथ्वी (Earth)", start: [4, 20], end: [5, 20], primaryMukhi: "6 Mukhi", fallbackMukhi: "7 Mukhi", mantra: "ॐ ह्रीं हुं नमः", day: "शुक्रवार (Friday)", productId: "7" },
  { nameHindi: "मिथुन", nameEng: "Gemini", symbol: "♊", lord: "बुध देव (Mercury)", element: "वायु (Air)", start: [5, 21], end: [6, 20], primaryMukhi: "4 Mukhi", fallbackMukhi: "5 Mukhi", mantra: "ॐ ह्रीं नमः", day: "बुधवार (Wednesday)", productId: "5" },
  { nameHindi: "कर्क", nameEng: "Cancer", symbol: "♋", lord: "चंद्र देव (Moon)", element: "जल (Water)", start: [6, 21], end: [7, 22], primaryMukhi: "2 Mukhi", fallbackMukhi: "5 Mukhi", mantra: "ॐ नमः शिवाय", day: "सोमवार (Monday)", productId: "5" },
  { nameHindi: "सिंह", nameEng: "Leo", symbol: "♌", lord: "सूर्य देव (Sun)", element: "अग्नि (Fire)", start: [7, 23], end: [8, 22], primaryMukhi: "1 Mukhi", fallbackMukhi: "12 Mukhi", mantra: "ॐ ह्रीं नमः", day: "रविवार या सोमवार (Sunday/Monday)", productId: "1" },
  { nameHindi: "कन्या", nameEng: "Virgo", symbol: "♍", lord: "बुध देव (Mercury)", element: "पृथ्वी (Earth)", start: [8, 23], end: [9, 22], primaryMukhi: "4 Mukhi", fallbackMukhi: "5 Mukhi", mantra: "ॐ ह्रीं नमः", day: "बुधवार (Wednesday)", productId: "5" },
  { nameHindi: "तुला", nameEng: "Libra", symbol: "♎", lord: "शुक्र देव (Venus)", element: "वायु (Air)", start: [9, 23], end: [10, 22], primaryMukhi: "6 Mukhi", fallbackMukhi: "7 Mukhi", mantra: "ॐ ह्रीं हुं नमः", day: "शुक्रवार (Friday)", productId: "7" },
  { nameHindi: "वृश्चिक", nameEng: "Scorpio", symbol: "♏", lord: "मंगल देव (Mars)", element: "जल (Water)", start: [10, 23], end: [11, 21], primaryMukhi: "3 Mukhi", fallbackMukhi: "11 Mukhi", mantra: "ॐ क्लीं नमः", day: "मंगलवार (Tuesday)", productId: "11" },
  { nameHindi: "धनु", nameEng: "Sagittarius", symbol: "♐", lord: "बृहस्पति देव (Jupiter)", element: "अग्नि (Fire)", start: [11, 22], end: [12, 21], primaryMukhi: "5 Mukhi", fallbackMukhi: "1 Mukhi", mantra: "ॐ ह्रीं नमः", day: "गुरुवार (Thursday)", productId: "5" },
  { nameHindi: "मकर", nameEng: "Capricorn", symbol: "♑", lord: "शनि देव (Saturn)", element: "पृथ्वी (Earth)", start: [12, 22], end: [1, 19], primaryMukhi: "7 Mukhi", fallbackMukhi: "14 Mukhi", mantra: "ॐ हुं नमः", day: "शनिवार (Saturday)", productId: "7" },
  { nameHindi: "कुंभ", nameEng: "Aquarius", symbol: "♒", lord: "शनि देव (Saturn)", element: "वायु (Air)", start: [1, 20], end: [2, 18], primaryMukhi: "7 Mukhi", fallbackMukhi: "11 Mukhi", mantra: "ॐ हुं नमः", day: "शनिवार (Saturday)", productId: "7" },
  { nameHindi: "मीन", nameEng: "Pisces", symbol: "♓", lord: "बृहस्पति देव (Jupiter)", element: "जल (Water)", start: [2, 19], end: [3, 20], primaryMukhi: "5 Mukhi", fallbackMukhi: "1 Mukhi", mantra: "ॐ ह्रीं नमः", day: "गुरुवार (Thursday)", productId: "5" },
];

const CONCERN_OPTIONS = [
  { id: "career", label: "⚡ व्यापार, नौकरी व धन वृद्धि (Career & Wealth)", bead: "7 Mukhi / 1 Mukhi" },
  { id: "peace", label: "🧘 मानसिक शांति, एकाग्रता व तनाव मुक्ति (Peace & Focus)", bead: "5 Mukhi / 2 Mukhi" },
  { id: "shani_dosha", label: "🛡️ शनि साढ़े साती, राहु-केतु व ग्रह दोष निवारण (Dosha Shanti)", bead: "7 Mukhi / 11 Mukhi" },
  { id: "marriage", label: "❤️ विवाह, प्रेम व पारिवारिक सद्भाव (Relationships)", bead: "2 Mukhi / 6 Mukhi" },
  { id: "health", label: "🩺 स्वास्थ्य, ऊर्जा व दीर्घायु (Health & Vitality)", bead: "3 Mukhi / 5 Mukhi" },
  { id: "spiritual", label: "🕉️ आध्यात्मिक उन्नति व शिव कृपा (Moksha & Sadhana)", bead: "1 Mukhi / Rudraksha Mala" },
];

export function PanditjiSection() {
  const { add } = useCart();
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [concern, setConcern] = useState("career");

  // Flow State
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Helper to get Rashi from DOB
  const calculateRashi = (dateStr) => {
    if (!dateStr) return RASHI_DATA[4]; // Default to Leo (Simha)
    const dateObj = new Date(dateStr);
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();

    for (const r of RASHI_DATA) {
      const [sm, sd] = r.start;
      const [em, ed] = r.end;
      if (sm === em) {
        if (month === sm && day >= sd && day <= ed) return r;
      } else if (sm < em) {
        if ((month === sm && day >= sd) || (month === em && day <= ed)) return r;
      } else {
        // Capricorn wraps year end (Dec 22 - Jan 19)
        if ((month === sm && day >= sd) || (month === em && day <= ed)) return r;
      }
    }
    return RASHI_DATA[0];
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      emitToast("कृपया अपना नाम दर्ज करें (Please enter your name)", "error");
      return;
    }
    if (!dob) {
      emitToast("कृपया अपनी जन्म तिथि (DOB) चुनें", "error");
      return;
    }
    if (!birthPlace.trim()) {
      emitToast("कृपया अपना जन्म स्थान दर्ज करें", "error");
      return;
    }

    setIsCalculating(true);
    setAddedSuccess(false);

    setTimeout(() => {
      const rashi = calculateRashi(dob);
      const dayOfBirth = new Date(dob).getDate();
      const mulank = ((dayOfBirth - 1) % 9) + 1; // 1-9 numerology
      
      // Determine recommended Mukhi based on Rashi + Concern
      let recommendedName = rashi.primaryMukhi;
      let targetProductId = rashi.productId;

      if (concern === "career") {
        recommendedName = "7 Mukhi Rudraksha (महालक्ष्मी स्वरूप)";
        targetProductId = "7";
      } else if (concern === "shani_dosha") {
        recommendedName = "7 Mukhi + 11 Mukhi Rudraksha (शनि व हनुमत रक्षा)";
        targetProductId = "7";
      } else if (concern === "spiritual") {
        recommendedName = "1 Mukhi Rudraksha (साक्षात शिव स्वरूप)";
        targetProductId = "1";
      } else if (concern === "health" || concern === "peace") {
        recommendedName = "5 Mukhi Rudraksha Mala (कालाग्नि रुद्र स्वरूप)";
        targetProductId = "5";
      } else if (concern === "marriage") {
        recommendedName = "2 Mukhi / 6 Mukhi Rudraksha (अर्धनारीश्वर कृपा)";
        targetProductId = "5";
      } else {
        recommendedName = `${rashi.primaryMukhi} Rudraksha (${rashi.lord} कृपा)`;
      }

      // Fetch matched product from DB
      const allProds = db.getProducts();
      let matchedProd = allProds.find(p => String(p.id) === String(targetProductId)) || allProds[0];

      setResult({
        devoteeName: name.trim(),
        rashiHindi: rashi.nameHindi,
        rashiEng: rashi.nameEng,
        symbol: rashi.symbol,
        lord: rashi.lord,
        element: rashi.element,
        mulank,
        dob,
        birthPlace: birthPlace.trim(),
        birthTime: birthTime || "प्रातः काल (Default)",
        concernObj: CONCERN_OPTIONS.find(c => c.id === concern),
        recommendedMukhi: recommendedName,
        beejMantra: rashi.mantra,
        wearingDay: rashi.day,
        matchedProduct: matchedProd,
        astroReason: `आपकी जन्म कुंडली में ${rashi.nameHindi} राशि एवं मूलांक ${mulank} का प्रभाव है। ${rashi.lord} की अनुकूलता तथा आपके संकल्प की सिद्धि हेतु ${recommendedName} को सिद्ध व प्राण-प्रतिष्ठित करवा कर धारण करना अत्यंत शुभ व लाभकारी सिद्ध होगा।`
      });

      setIsCalculating(false);
      emitToast("पंडित जी द्वारा आपकी कुंडली का वैदिक विश्लेषण तैयार है!", "success");
    }, 1200);
  };

  const handleAddToCart = () => {
    if (result?.matchedProduct) {
      add(result.matchedProduct.id, 1);
      setAddedSuccess(true);
      emitToast(`${result.matchedProduct.name} को कार्ट में जोड़ दिया गया है!`, "success");
      setTimeout(() => setAddedSuccess(false), 3000);
    }
  };

  const handleAskInChat = (customPrompt = null) => {
    let promptText = customPrompt;
    if (!promptText) {
      if (result) {
        promptText = `नमस्ते पंडित जी 🙏 मेरा नाम ${result.devoteeName} है। मेरी जन्म तिथि ${result.dob} है (स्थान: ${result.birthPlace}, समय: ${result.birthTime})। मेरी राशि ${result.rashiHindi} (${result.rashiEng}) है, स्वामी ग्रह ${result.lord}, मूलांक ${result.mulank} और संकल्प "${result.concernObj?.label}" है। आपने मुझे ${result.recommendedMukhi} का परामर्श दिया है। कृपया मुझे इसे धारण करने की संपूर्ण वैदिक विधि, शुभ मुहूर्त, शुद्धिकरण, बीज मंत्र और दैनिक नियम बताएं।`;
      } else {
        promptText = `नमस्ते पंडित जी 🙏 मुझे अपनी जन्म कुंडली, राशि और समस्याओं के निवारण हेतु सही रुद्राक्ष व वैदिक विधि के बारे में संपूर्ण मार्गदर्शन चाहिए।`;
      }
    }
    
    // Dispatch event to open floating chat in Panditji mode and auto-send prompt
    window.dispatchEvent(new CustomEvent("aura_ai_trigger_chat", { detail: { prompt: promptText, mode: "panditji" } }));

    // Fallback if floating button is present
    const floatBtn = document.getElementById("aura-ai-floating-toggle");
    if (floatBtn && !document.querySelector(".aura-ai-chat-window")) {
      floatBtn.click();
    }
  };

  return (
    <section 
      id="aura-panditji-section"
      className="aura-panditji-section" 
      aria-label="Aura AI Vedic Astrologer Rudraksha Guidance"
    >
      <div className="aura-panditji-container">
        {/* TEMPLE & SPIRITUAL BACKGROUND AMBIENCE */}
        <div className="aura-panditji-temple-bg" aria-hidden="true">
          <div className="aura-panditji-arch-glow" />
          <div className="aura-panditji-diya left-diya">
            <div className="diya-base" />
            <div className="diya-flame" />
            <div className="diya-glow" />
          </div>
          <div className="aura-panditji-diya right-diya">
            <div className="diya-base" />
            <div className="diya-flame" />
            <div className="diya-glow" />
          </div>
        </div>

        {/* SECTION HEADER WITH PANDIT JI AVATAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: '1px solid rgba(200, 155, 60, 0.25)',
          position: 'relative',
          zIndex: 4
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {/* Pandit Ji Photo / Avatar with Divine Halo */}
            <div style={{
              position: 'relative',
              width: 64,
              height: 64,
              borderRadius: '50%',
              padding: 2,
              background: 'linear-gradient(135deg, #D4AF37 0%, #8A6014 50%, #E5C158 100%)',
              boxShadow: '0 3px 12px rgba(138, 96, 20, 0.35)',
              flexShrink: 0
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'radial-gradient(circle, #ffe8cc 0%, #fbd5a5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {/* PNG Image Source with fallback to SVG */}
                <img 
                  src="https://i.ibb.co/XxDccpPX/file-0000000089808211b252c5213cf8063e.png" 
                  alt="Aura Panditji" 
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement.querySelector('svg');
                    if (fallback) fallback.style.display = 'block';
                  }}
                  referrerPolicy="no-referrer"
                />
                {/* High Definition Vedic Acharya Icon (Fallback) */}
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'none' }}>
                  <defs>
                    <radialGradient id="headerHalo" cx="50%" cy="40%" r="50%">
                      <stop offset="0%" stopColor="#FFF9E6" />
                      <stop offset="60%" stopColor="#FFD54F" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#FF8F00" stopOpacity="0.2" />
                    </radialGradient>
                    <linearGradient id="headerSkin" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#F9D7B7" />
                      <stop offset="100%" stopColor="#E0AC7E" />
                    </linearGradient>
                    <linearGradient id="headerRobe" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF8A00" />
                      <stop offset="50%" stopColor="#E65100" />
                      <stop offset="100%" stopColor="#BF360C" />
                    </linearGradient>
                    <linearGradient id="headerTurban" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFA000" />
                      <stop offset="70%" stopColor="#E65100" />
                      <stop offset="100%" stopColor="#D84315" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="42" r="38" fill="url(#headerHalo)" />
                  <path d="M12 92 C14 74 30 68 50 68 C70 68 86 74 88 92 Z" fill="url(#headerRobe)" />
                  <path d="M22 92 C28 78 45 74 50 74 C55 74 72 78 78 92" stroke="#FFD54F" strokeWidth="2.2" fill="none" />
                  <circle cx="36" cy="72" r="2.2" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
                  <circle cx="43" cy="77" r="2.4" fill="#6E371C" stroke="#DAA520" strokeWidth="0.6" />
                  <circle cx="50" cy="79" r="2.8" fill="#8B4513" stroke="#FFD700" strokeWidth="0.8" />
                  <circle cx="57" cy="77" r="2.4" fill="#6E371C" stroke="#DAA520" strokeWidth="0.6" />
                  <circle cx="64" cy="72" r="2.2" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
                  <path d="M43 56 L43 68 C43 71 57 71 57 68 L57 56 Z" fill="url(#headerSkin)" />
                  <ellipse cx="50" cy="46" rx="14" ry="16" fill="url(#headerSkin)" />
                  <circle cx="35" cy="47" r="3.2" fill="#E0AC7E" />
                  <circle cx="65" cy="47" r="3.2" fill="#E0AC7E" />
                  <path d="M38 52 C38 64 45 68 50 68 C55 68 62 64 62 52 C58 58 42 58 38 52 Z" fill="#F5F5F5" />
                  <ellipse cx="44" cy="44" rx="2.5" ry="1.4" fill="#3D2314" />
                  <ellipse cx="56" cy="44" rx="2.5" ry="1.4" fill="#3D2314" />
                  <path d="M41 41 Q44 39.5 47 41" stroke="#424242" strokeWidth="1.1" strokeLinecap="round" fill="none" />
                  <path d="M53 41 Q56 39.5 59 41" stroke="#424242" strokeWidth="1.1" strokeLinecap="round" fill="none" />
                  <path d="M50 42 L48.8 48.5 Q50 50 51.2 48.5" stroke="#BF8050" strokeWidth="0.9" fill="none" />
                  <path d="M46 53 Q50 55.5 54 53" stroke="#8D4528" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  <path d="M44 35.5 L56 35.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
                  <path d="M43.5 37 L56.5 37" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
                  <path d="M44 38.5 L56 38.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
                  <circle cx="50" cy="37" r="1.1" fill="#C62828" />
                  <path d="M33 34 C33 22 40 18 50 18 C60 18 67 22 67 34 C63 31 37 31 33 34 Z" fill="url(#headerTurban)" />
                  <circle cx="50" cy="23" r="2.2" fill="#C62828" stroke="#FFD700" strokeWidth="0.8" />
                </svg>
              </div>
              {/* Online indicator */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#16a34a',
                border: '2.5px solid #FFFDF9',
                boxShadow: '0 0 6px rgba(22, 163, 74, 0.7)'
              }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="aura-panditji-badge" style={{ margin: 0, padding: '2px 8px', fontSize: '9.5px', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(74, 14, 23, 0.08) 100%)', border: '1px solid rgba(200, 155, 60, 0.45)' }}>
                  <Sparkles size={11} className="aura-panditji-badge-icon" />
                  AURA VEDIC AI ASTROLOGER
                </span>
                <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 700, background: '#dcfce7', border: '1px solid #bbf7d0', padding: '1px 7px', borderRadius: 10 }}>
                  ● लाइव निशुल्क परामर्श
                </span>
              </div>
              <h2 style={{
                color: '#4A0E17',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 'clamp(18px, 3.5vw, 22px)',
                fontWeight: 700,
                margin: '3px 0 0 0',
                lineHeight: 1.25,
                wordBreak: 'break-word'
              }}>
                अपनी जन्म कुंडली अनुसार जानिए सही रुद्राक्ष
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#665548', maxWidth: '380px', lineHeight: 1.35 }}>
              नाम, जन्म तिथि (DOB) और जन्म स्थान दर्ज करें — वैदिक ज्योतिष के आधार पर पंडित जी बताएंगे सर्वोत्तम रुद्राक्ष।
            </p>
            <button
              type="button"
              onClick={() => handleAskInChat("नमस्ते पंडित जी 🙏 मुझे रुद्राक्ष चयन और कुंडली विश्लेषण के बारे में मार्गदर्शन दीजिए।")}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'linear-gradient(135deg, #FFF8EC 0%, #FEEFD8 100%)',
                border: '1px solid #d4af37',
                color: '#78350f',
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(212, 175, 55, 0.2)',
                transition: 'all 0.2s'
              }}
            >
              <MessageCircle size={13} color="#a54d2b" />
              <span>पंडित जी से चैट करें</span>
            </button>
          </div>
        </div>

        {/* MAIN INTERACTIVE GRID: FORM / RESULT & VEDIC SHOWCASE */}
        <div className="aura-panditji-grid" style={{ minHeight: 'auto', gap: 20 }}>
          
          {/* LEFT: INTERACTIVE FORM OR KUNDALI RESULT */}
          <div style={{ width: '100%', minWidth: 0, zIndex: 3 }}>
            <AnimatePresence mode="wait">
              {!result ? (
                /* FORM VIEW */
                <motion.form 
                  key="form"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  onSubmit={handleCalculate}
                  style={{
                    background: 'rgba(255, 253, 249, 0.94)',
                    border: '1px solid rgba(200, 155, 60, 0.45)',
                    borderRadius: 12,
                    padding: '16px 18px',
                    boxShadow: '0 4px 16px rgba(74, 14, 23, 0.04)',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
                >
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                    gap: '10px 14px', 
                    marginBottom: '12px' 
                  }}>
                    
                    {/* 1. NAME FIELD */}
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#4A0E17', marginBottom: '4px', overflowWrap: 'break-word' }}>
                        <span style={{ display: 'inline-flex', padding: 2, background: 'rgba(212, 175, 55, 0.15)', borderRadius: 4 }}>
                          <User size={12} color="#8A6014" style={{ flexShrink: 0 }} />
                        </span>
                        <span>आपका पूरा नाम (Name) *</span>
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="उदा. राहुल शर्मा / Rahul"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="aura-input-field"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1.5px solid #E2D2BC',
                          borderRadius: 7,
                          background: '#FFFFFF',
                          fontSize: '13px',
                          color: '#2b170d',
                          outline: 'none',
                          boxSizing: 'border-box',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </div>

                    {/* 2. DATE OF BIRTH FIELD */}
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#4A0E17', marginBottom: '4px', overflowWrap: 'break-word' }}>
                        <span style={{ display: 'inline-flex', padding: 2, background: 'rgba(212, 175, 55, 0.15)', borderRadius: 4 }}>
                          <Calendar size={12} color="#8A6014" style={{ flexShrink: 0 }} />
                        </span>
                        <span>जन्म तिथि (DOB) *</span>
                      </label>
                      <input 
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="aura-input-field"
                        style={{
                          width: '100%',
                          padding: '7px 12px',
                          border: '1.5px solid #E2D2BC',
                          borderRadius: 7,
                          background: '#FFFFFF',
                          fontSize: '13px',
                          color: '#2b170d',
                          outline: 'none',
                          boxSizing: 'border-box',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </div>

                    {/* 3. BIRTH PLACE FIELD */}
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#4A0E17', marginBottom: '4px', overflowWrap: 'break-word' }}>
                        <span style={{ display: 'inline-flex', padding: 2, background: 'rgba(212, 175, 55, 0.15)', borderRadius: 4 }}>
                          <MapPin size={12} color="#8A6014" style={{ flexShrink: 0 }} />
                        </span>
                        <span>जन्म स्थान (City / Place) *</span>
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="उदा. जयपुर / Mumbai"
                        value={birthPlace}
                        onChange={(e) => setBirthPlace(e.target.value)}
                        className="aura-input-field"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1.5px solid #E2D2BC',
                          borderRadius: 7,
                          background: '#FFFFFF',
                          fontSize: '13px',
                          color: '#2b170d',
                          outline: 'none',
                          boxSizing: 'border-box',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </div>

                    {/* 4. BIRTH TIME (OPTIONAL) */}
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#4A0E17', marginBottom: '4px', overflowWrap: 'break-word' }}>
                        <span style={{ display: 'inline-flex', padding: 2, background: 'rgba(212, 175, 55, 0.15)', borderRadius: 4 }}>
                          <Clock size={12} color="#8A6014" style={{ flexShrink: 0 }} />
                        </span>
                        <span>जन्म समय (Time - Optional)</span>
                      </label>
                      <input 
                        type="time"
                        value={birthTime}
                        onChange={(e) => setBirthTime(e.target.value)}
                        className="aura-input-field"
                        style={{
                          width: '100%',
                          padding: '7px 12px',
                          border: '1.5px solid #E2D2BC',
                          borderRadius: 7,
                          background: '#FFFFFF',
                          fontSize: '13px',
                          color: '#2b170d',
                          outline: 'none',
                          boxSizing: 'border-box',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </div>

                  </div>

                  {/* 5. PRIMARY GOAL / CONCERN SELECTION */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#4A0E17', marginBottom: '6px' }}>
                      <span style={{ display: 'inline-flex', padding: 2, background: 'rgba(212, 175, 55, 0.15)', borderRadius: 4 }}>
                        <Compass size={12} color="#8A6014" style={{ flexShrink: 0 }} />
                      </span>
                      <span>आप किस उद्देश्य / समस्या हेतु रुद्राक्ष धारण करना चाहते हैं?</span>
                    </label>
                    <select
                      value={concern}
                      onChange={(e) => setConcern(e.target.value)}
                      className="aura-input-field"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1.5px solid #E2D2BC',
                        borderRadius: 7,
                        background: '#FFFFFF',
                        fontSize: '13px',
                        color: '#2b170d',
                        outline: 'none',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {CONCERN_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <button
                      type="submit"
                      disabled={isCalculating}
                      className="aura-panditji-cta-btn"
                      style={{
                        width: '100%',
                        maxWidth: '340px',
                        padding: '11px 20px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        background: 'linear-gradient(135deg, #60121D 0%, #4A0E17 50%, #781827 100%)',
                        boxShadow: '0 4px 14px rgba(74, 14, 23, 0.28)',
                        border: '1px solid #E5C158'
                      }}
                    >
                      {isCalculating ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>ग्रह नक्षत्रों का विश्लेषण हो रहा है...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>पंडित जी से रुद्राक्ष परामर्श प्राप्त करें</span>
                          <ArrowRight size={15} className="aura-cta-arrow" />
                        </>
                      )}
                    </button>

                    <span style={{ fontSize: '11px', color: '#7a685b', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(22, 163, 74, 0.07)', border: '1px solid rgba(22, 163, 74, 0.2)', padding: '3px 8px', borderRadius: 6 }}>
                      <ShieldCheck size={13} color="#16a34a" /> 100% गोपनीय व प्रामाणिक गणना
                    </span>
                  </div>
                </motion.form>
              ) : (
                /* RESULT VIEW: VEDIC KUNDALI RECOMMENDATION CARD */
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  style={{
                    background: 'linear-gradient(135deg, #FFFDF9 0%, #FAF4EB 100%)',
                    border: '2px solid #D4AF37',
                    borderRadius: 12,
                    padding: '16px 18px',
                    boxShadow: '0 4px 18px rgba(74, 14, 23, 0.07)',
                    position: 'relative',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Card Header with Devotee details & recalculate */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    flexWrap: 'wrap', 
                    gap: 8, 
                    marginBottom: 12, 
                    borderBottom: '1px dashed #ebd6bf', 
                    paddingBottom: 10 
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 18 }}>🕉️</span>
                        <h3 style={{ 
                          margin: 0, 
                          fontSize: 'clamp(15px, 3.5vw, 17px)', 
                          color: '#4A0E17', 
                          fontFamily: '"Cormorant Garamond", serif', 
                          fontWeight: 700,
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere'
                        }}>
                          श्री {result.devoteeName} जी का वैदिक रुद्राक्ष परामर्श
                        </h3>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#7a685b', marginTop: 2, wordBreak: 'break-word' }}>
                        जन्म: {new Date(result.dob).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {result.birthPlace}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setResult(null)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'transparent',
                        border: '1px solid #C89B3C',
                        color: '#4A0E17',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <RefreshCw size={11} /> अन्य कुंडली
                    </button>
                  </div>

                  {/* 4 Pillars: Rashi, Planet, Element, Numerology */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
                    gap: 8,
                    marginBottom: 12
                  }}>
                    <div style={{ background: '#ffffff', border: '1px solid #ebdccb', borderRadius: 7, padding: '6px 10px', minWidth: 0 }}>
                      <div style={{ fontSize: '9.5px', color: '#8c786a', textTransform: 'uppercase' }}>राशि (Rashi)</div>
                      <b style={{ fontSize: '12px', color: '#4A0E17', display: 'block', wordBreak: 'break-word' }}>
                        {result.symbol} {result.rashiHindi} ({result.rashiEng})
                      </b>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #ebdccb', borderRadius: 7, padding: '6px 10px', minWidth: 0 }}>
                      <div style={{ fontSize: '9.5px', color: '#8c786a', textTransform: 'uppercase' }}>स्वामी ग्रह</div>
                      <b style={{ fontSize: '11.5px', color: '#4A0E17', display: 'block', wordBreak: 'break-word' }}>
                        {result.lord}
                      </b>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #ebdccb', borderRadius: 7, padding: '6px 10px', minWidth: 0 }}>
                      <div style={{ fontSize: '9.5px', color: '#8c786a', textTransform: 'uppercase' }}>तत्व (Element)</div>
                      <b style={{ fontSize: '11.5px', color: '#4A0E17', display: 'block', wordBreak: 'break-word' }}>
                        {result.element}
                      </b>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #ebdccb', borderRadius: 7, padding: '6px 10px', minWidth: 0 }}>
                      <div style={{ fontSize: '9.5px', color: '#8c786a', textTransform: 'uppercase' }}>भाग्यांक (Mulank)</div>
                      <b style={{ fontSize: '11.5px', color: '#4A0E17', display: 'block' }}>
                        अंक {result.mulank}
                      </b>
                    </div>
                  </div>

                  {/* Core Recommendation Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, #4A0E17 0%, #681523 100%)',
                    color: '#FFFDF7',
                    borderRadius: 9,
                    padding: '12px 14px',
                    marginBottom: 12,
                    border: '1px solid #D4AF37'
                  }}>
                    <div style={{ fontSize: '10px', color: '#FFE082', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>
                      ★ पंडित जी द्वारा अनुशंसित सर्वोत्तम रुद्राक्ष:
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: 4, wordBreak: 'break-word' }}>
                      {result.recommendedMukhi}
                    </div>
                    <p style={{ fontSize: '11.5px', color: '#f5e6d3', margin: '0 0 8px 0', lineHeight: 1.45, wordBreak: 'break-word' }}>
                      {result.astroReason}
                    </p>
                    
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 6 }}>
                      <span>📿 बीज मंत्र: <b style={{ color: '#FFE082' }}>{result.beejMantra}</b></span>
                      <span>🗓️ शुभ धारण वार: <b style={{ color: '#FFE082' }}>{result.wearingDay}</b></span>
                    </div>
                  </div>

                  {/* Matched Product & Instant Purchase CTA */}
                  {result.matchedProduct && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                      background: '#ffffff',
                      border: '1px solid #e8dac9',
                      borderRadius: 8,
                      padding: '10px 12px',
                      marginBottom: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <img 
                          src={result.matchedProduct.img || "/images/product-5mukhi.jpg"} 
                          alt={result.matchedProduct.name}
                          style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid #ebdccb', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <b style={{ fontSize: '13px', color: '#2b170d', display: 'block', wordBreak: 'break-word' }}>
                            {result.matchedProduct.name}
                          </b>
                          <div style={{ fontSize: '11px', color: '#8a6850' }}>
                            100% नेपाल रुद्राक्ष • सिद्ध लैब प्रमाणित
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#a54d2b' }}>
                            ₹{result.matchedProduct.price.toLocaleString('en-IN')}
                          </span>
                          {result.matchedProduct.mrp && (
                            <span style={{ fontSize: '10px', color: '#999', textDecoration: 'line-through', marginLeft: 3 }}>
                              ₹{result.matchedProduct.mrp.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleAddToCart}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: addedSuccess ? '#16a34a' : '#a54d2b',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '7px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {addedSuccess ? (
                            <>
                              <Check size={13} /> कार्ट में जोड़ा
                            </>
                          ) : (
                            <>
                              <ShoppingCart size={13} /> अभी खरीदें
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* QUICK VEDIC QUERY CHIPS FOR INSTANT AI CHAT */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#78350f', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Sparkles size={11} color="#C89B3C" /> पंडित जी से तुरंत पूछें (1-क्लिक AI प्रश्न):
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        "धारण विधि व शुभ मुहूर्त बताएं",
                        "क्या महिलाएं इसे पहन सकती हैं?",
                        "खान-पान और नित्य नियम क्या हैं?",
                        "शनि साढ़े साती निवारण कैसे करें?",
                        "ओरिजिनल रुद्राक्ष की पहचान कैसे करें?"
                      ].map((qText, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleAskInChat(`नमस्ते पंडित जी 🙏 ${qText} (मेरी राशि: ${result.rashiHindi}, अनुशंसित: ${result.recommendedMukhi})`)}
                          style={{
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            color: '#92400e',
                            padding: '3px 8px',
                            borderRadius: 14,
                            fontSize: '10.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          {qText}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions: Ask More to Pandit Ji via AI Chat */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleAskInChat()}
                      style={{
                        flex: 1,
                        minWidth: '180px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        background: '#fdf3e7',
                        border: '1px solid #d4af37',
                        color: '#4A0E17',
                        padding: '8px 14px',
                        borderRadius: 7,
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <MessageCircle size={15} color="#a54d2b" />
                      <span>पंडित जी से AI Chat में और पूछें</span>
                    </button>

                    <Link
                      to="/shop?category=Rudraksha"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        padding: '8px 12px',
                        borderRadius: 7,
                        fontSize: '12px',
                        color: '#665548',
                        textDecoration: 'none',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>सभी रुद्राक्ष</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: WELCOMING TRADITIONAL PANDITJI PORTRAIT & CONSULTATION CARD */}
          <div className="aura-panditji-content" style={{ padding: 0, minWidth: 0 }}>
            {/* TRADITIONAL PANDITJI PORTRAIT CARD */}
            <div className="aura-panditji-portrait-card" style={{
              background: 'linear-gradient(135deg, #FFFDF8 0%, #FAF2E6 100%)',
              border: '1.5px solid #D4AF37',
              borderRadius: 12,
              padding: '12px 14px',
              boxShadow: '0 4px 18px rgba(74, 14, 23, 0.06)',
              marginBottom: 10,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Subtle background sacred geometric watermarks */}
              <div style={{
                position: 'absolute',
                top: -15,
                right: -15,
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />

              {/* Auspicious Sacred Sanskrit Header Ribbon */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '9.5px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#8A6014',
                borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
                paddingBottom: 6,
                marginBottom: 8
              }}>
                <span>॥ ॐ नमः शिवाय ॥</span>
                <span style={{ color: '#C89B3C' }}>★ वैदिक पीठ परंपरा ★</span>
                <span>॥ शुभम् करोति ॥</span>
              </div>

              {/* Portrait & Title Header */}
              <div className="aura-panditji-portrait-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                {/* Traditional Panditji Portrait Artwork */}
                <div className="aura-panditji-portrait-circle" style={{
                  position: 'relative',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  padding: 2,
                  background: 'linear-gradient(135deg, #D4AF37 0%, #996515 50%, #F3E5AB 100%)',
                  boxShadow: '0 4px 14px rgba(153, 101, 21, 0.35)',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'radial-gradient(circle, #ffe8cc 0%, #fbd5a5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                     {/* PNG Image Source with fallback to SVG */}
                     <img 
                       src="https://i.ibb.co/XxDccpPX/file-0000000089808211b252c5213cf8063e.png" 
                       alt="Acharya Panditji" 
                       style={{
                         width: '100%',
                         height: '100%',
                         borderRadius: '50%',
                         objectFit: 'cover',
                         display: 'block'
                       }}
                       onError={(e) => {
                         e.currentTarget.style.display = 'none';
                         const fallback = e.currentTarget.parentElement.querySelector('svg');
                         if (fallback) fallback.style.display = 'block';
                       }}
                       referrerPolicy="no-referrer"
                     />
                    {/* High Quality Traditional Panditji Vector Portrait (Fallback) */}
                    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'none' }}>
                      <defs>
                        {/* Divine Golden Halo Gradient */}
                        <radialGradient id="divineHalo" cx="50%" cy="40%" r="50%">
                          <stop offset="0%" stopColor="#FFF9E6" />
                          <stop offset="60%" stopColor="#FFD54F" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#FF8F00" stopOpacity="0.1" />
                        </radialGradient>
                        {/* Skin Tone Gradient */}
                        <linearGradient id="skinTone" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#F9D7B7" />
                          <stop offset="100%" stopColor="#E0AC7E" />
                        </linearGradient>
                        {/* Saffron Robe Gradient */}
                        <linearGradient id="saffronRobe" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FF8A00" />
                          <stop offset="50%" stopColor="#E65100" />
                          <stop offset="100%" stopColor="#BF360C" />
                        </linearGradient>
                        {/* Saffron Turban Gradient */}
                        <linearGradient id="saffronTurban" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFA000" />
                          <stop offset="70%" stopColor="#E65100" />
                          <stop offset="100%" stopColor="#D84315" />
                        </linearGradient>
                      </defs>

                      {/* 1. Divine Golden Halo */}
                      <circle cx="50" cy="42" r="38" fill="url(#divineHalo)" />

                      {/* 2. Temple Arch & Rays */}
                      <path d="M25 45 Q50 20 75 45" stroke="#FFE082" strokeWidth="1" fill="none" opacity="0.6" />
                      <circle cx="50" cy="18" r="1.5" fill="#FFA000" />
                      
                      {/* 3. Shoulders & Saffron Angavastram (Vedic Robes) */}
                      <path d="M12 92 C14 74 30 68 50 68 C70 68 86 74 88 92 Z" fill="url(#saffronRobe)" />
                      {/* Golden border on shawl */}
                      <path d="M22 92 C28 78 45 74 50 74 C55 74 72 78 78 92" stroke="#FFD54F" strokeWidth="2.5" fill="none" />
                      <path d="M22 92 C28 78 45 74 50 74 C55 74 72 78 78 92" stroke="#B8860B" strokeWidth="0.8" strokeDasharray="2,2" fill="none" />

                      {/* 4. Sacred Nepal Rudraksha Kantha Mala (Necklace) */}
                      <path d="M34 72 Q50 84 66 72" stroke="none" fill="none" id="malaPath" />
                      <circle cx="36" cy="72" r="2.2" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
                      <circle cx="41" cy="76" r="2.3" fill="#6E371C" stroke="#DAA520" strokeWidth="0.6" />
                      <circle cx="46" cy="78" r="2.4" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
                      <circle cx="50" cy="79" r="2.8" fill="#8B4513" stroke="#FFD700" strokeWidth="0.8" />
                      <circle cx="54" cy="78" r="2.4" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
                      <circle cx="59" cy="76" r="2.3" fill="#6E371C" stroke="#DAA520" strokeWidth="0.6" />
                      <circle cx="64" cy="72" r="2.2" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
                      {/* Mala Gold Guru Bead Tassel */}
                      <path d="M50 81.8 L50 87" stroke="#FFD700" strokeWidth="1.2" />
                      <circle cx="50" cy="87.5" r="1.2" fill="#E65100" />

                      {/* 5. Neck */}
                      <path d="M43 56 L43 68 C43 71 57 71 57 68 L57 56 Z" fill="url(#skinTone)" />

                      {/* 6. Face Contour */}
                      <ellipse cx="50" cy="46" rx="14" ry="16" fill="url(#skinTone)" />

                      {/* 7. Ears with Golden Kundal (Earrings) */}
                      <circle cx="35" cy="47" r="3.2" fill="#E0AC7E" />
                      <circle cx="65" cy="47" r="3.2" fill="#E0AC7E" />
                      <circle cx="35" cy="49" r="1.4" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
                      <circle cx="65" cy="49" r="1.4" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />

                      {/* 8. White/Grey Beard & Moustache (Wise Vedic Acharya) */}
                      <path d="M42 54 Q50 56 58 54 Q50 51 42 54 Z" fill="#E8E8E8" opacity="0.9" />
                      <path d="M38 52 C38 64 45 68 50 68 C55 68 62 64 62 52 C58 58 42 58 38 52 Z" fill="#F5F5F5" />
                      <path d="M40 54 Q50 65 60 54" stroke="#D6D6D6" strokeWidth="0.8" fill="none" />

                      {/* 9. Peaceful Gentle Facial Features */}
                      {/* Eyes - Serene & Compassionate */}
                      <ellipse cx="44" cy="44" rx="2.5" ry="1.4" fill="#3D2314" />
                      <ellipse cx="56" cy="44" rx="2.5" ry="1.4" fill="#3D2314" />
                      <circle cx="44.6" cy="43.6" r="0.6" fill="#FFFFFF" />
                      <circle cx="56.6" cy="43.6" r="0.6" fill="#FFFFFF" />
                      {/* Eyebrows */}
                      <path d="M41 41 Q44 39.5 47 41" stroke="#424242" strokeWidth="1.1" strokeLinecap="round" fill="none" />
                      <path d="M53 41 Q56 39.5 59 41" stroke="#424242" strokeWidth="1.1" strokeLinecap="round" fill="none" />
                      {/* Nose */}
                      <path d="M50 42 L48.8 48.5 Q50 50 51.2 48.5" stroke="#BF8050" strokeWidth="0.9" fill="none" />
                      {/* Serene Smile */}
                      <path d="M46 53 Q50 55.5 54 53" stroke="#8D4528" strokeWidth="1.2" strokeLinecap="round" fill="none" />

                      {/* 10. Sacred Chandan-Kumkum Tripundra Tilak on Forehead */}
                      {/* White Tripundra lines */}
                      <path d="M44 35.5 L56 35.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
                      <path d="M43.5 37 L56.5 37" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
                      <path d="M44 38.5 L56 38.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
                      {/* Red Kumkum / Roli Bindi in center */}
                      <circle cx="50" cy="37" r="1.1" fill="#C62828" />

                      {/* 11. Traditional Saffron Turban (साफा / Pagri) */}
                      <path d="M33 34 C33 22 40 18 50 18 C60 18 67 22 67 34 C63 31 37 31 33 34 Z" fill="url(#saffronTurban)" />
                      <path d="M32 33 Q50 25 68 33 Q50 29 32 33 Z" fill="#FFA000" />
                      <path d="M35 28 Q50 21 65 28" stroke="#FFD54F" strokeWidth="1.5" fill="none" />
                      {/* Turban Ruby/Gold Brooch (कलंगी / शिरोमणि) */}
                      <circle cx="50" cy="23" r="2.2" fill="#C62828" stroke="#FFD700" strokeWidth="0.8" />
                      <circle cx="50" cy="23" r="0.8" fill="#FFF" />
                    </svg>

                    {/* Auspicious Online Green Pulse */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: '#16a34a',
                      border: '2.5px solid #FFFFFF',
                      boxShadow: '0 0 5px rgba(22, 163, 74, 0.7)'
                    }} />
                  </div>
                </div>

                {/* Acharya Details */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                    <b style={{ fontSize: '13.5px', color: '#4A0E17', fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 700 }}>
                      आचार्य श्री विद्याधर शास्त्री
                    </b>
                    <span style={{ fontSize: '9px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>
                      ● वैदिक ज्योतिषाचार्य
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#7a6850', lineHeight: 1.3 }}>
                    काशी-हरिद्वार वैदिक पीठ परंपरा • 30+ वर्ष ज्योतिषीय अनुभव
                  </div>
                </div>
              </div>

              {/* Welcoming Panditji Quote */}
              <div className="aura-panditji-quote-box" style={{
                background: 'rgba(255, 255, 255, 0.8)',
                borderLeft: '3px solid #D4AF37',
                borderRadius: '0 6px 6px 0',
                padding: '6px 10px',
                marginBottom: 10,
                fontSize: '11.5px',
                color: '#523c2d',
                lineHeight: 1.4,
                fontStyle: 'italic'
              }}>
                "शुभम् करोति कल्याणम्! अपनी जन्म तिथि व संकल्प अनुसार सही रुद्राक्ष धारण करने से ग्रह दोष शांत होते हैं और मनोकामनाएं पूर्ण होती हैं।"
              </div>

              {/* 3 Core Vedic Promises */}
              <div className="aura-panditji-promises-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10.5px', color: '#4A0E17', fontWeight: 600 }}>
                  <CheckCircle2 size={13} color="#C89B3C" style={{ flexShrink: 0 }} />
                  <span>वैदिक कुंडली गणना</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10.5px', color: '#4A0E17', fontWeight: 600 }}>
                  <CheckCircle2 size={13} color="#C89B3C" style={{ flexShrink: 0 }} />
                  <span>100% प्राण-प्रतिष्ठित</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10.5px', color: '#4A0E17', fontWeight: 600 }}>
                  <CheckCircle2 size={13} color="#C89B3C" style={{ flexShrink: 0 }} />
                  <span>शुभ मुहूर्त व विधि</span>
                </div>
              </div>

              {/* Direct Interactive Panditji AI Chat Button */}
              <button
                className="aura-panditji-portrait-btn"
                type="button"
                onClick={() => handleAskInChat("नमस्ते पंडित जी 🙏 मुझे रुद्राक्ष चयन और कुंडली विश्लेषण के बारे में पूर्ण मार्गदर्शन दीजिए।")}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: 'linear-gradient(135deg, #a54d2b 0%, #7d3318 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 7,
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(165, 77, 43, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                <MessageCircle size={14} />
                <span>पंडित जी से AI चैट करें (निःशुल्क)</span>
              </button>
            </div>

            {/* QUICK 1-ON-1 WHATSAPP LINK */}
            <div className="aura-panditji-whatsapp-card" style={{
              background: '#f7fee7',
              border: '1px solid #bef264',
              borderRadius: 8,
              padding: '8px 12px',
              width: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 6
            }}>
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: '11.5px', color: '#365314', display: 'block' }}>
                  व्यक्तिगत आचार्य से बात करें?
                </b>
                <span style={{ fontSize: '10.5px', color: '#4d7c0f' }}>
                  WhatsApp पर 1-on-1 वैदिक परामर्श
                </span>
              </div>
              <a
                href="https://wa.me/919672996531?text=Namaste%20Panditji%2C%20mujhe%20apne%20liye%20sahi%20Rudraksha%20chahiye.%20Kripya%20guidance%20dein."
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#16a34a',
                  color: '#ffffff',
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: '11px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                <MessageCircle size={12} /> WhatsApp
              </a>
            </div>
          </div>

        </div>

        {/* COMPACT TRUST ROW BELOW HERO GRID */}
        <div className="aura-panditji-trust-row" style={{ marginTop: 18 }}>
          <div className="aura-trust-item">
            <ShieldCheck size={13} className="aura-trust-icon" />
            <span>100% AUTHENTIC NEPAL</span>
          </div>
          <div className="aura-trust-divider" />
          <div className="aura-trust-item">
            <Award size={13} className="aura-trust-icon" />
            <span>GOVT LAB CERTIFIED</span>
          </div>
          <div className="aura-trust-divider" />
          <div className="aura-trust-item">
            <Lock size={13} className="aura-trust-icon" />
            <span>SECURE CHECKOUT</span>
          </div>
          <div className="aura-trust-divider" />
          <div className="aura-trust-item">
            <Truck size={13} className="aura-trust-icon" />
            <span>FREE DEVOTIONAL DELIVERY</span>
          </div>
          <div className="aura-trust-divider" />
          <div className="aura-trust-item">
            <Headphones size={13} className="aura-trust-icon" />
            <span>24/7 VEDIC SUPPORT</span>
          </div>
        </div>
      </div>
    </section>
  );
}
