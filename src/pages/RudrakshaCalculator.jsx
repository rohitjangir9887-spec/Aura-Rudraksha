import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { 
  Compass, 
  Sparkles, 
  Sun, 
  Moon, 
  ShieldCheck, 
  ChevronRight, 
  ArrowRight,
  HelpCircle,
  Award,
  CheckCircle
} from "lucide-react";
import { RASHI_RECOMMENDATIONS } from "../data/seoCatalogData";
import { useSeo } from "../hooks/useSeo";
import { Shell } from "../components/Shell";
import { triggerHaptic } from "../lib/haptics";
import { DailyPanchangaWidget } from "../components/DailyPanchangaWidget";
import { useCart } from "../hooks/useCart";
import { db } from "../lib/db";
import { auraAiClient } from "../lib/auraAiClient";
import { emitToast } from "../context/ToastContext";
import { PanditjiForm } from "../components/panditji/PanditjiForm";
import { PanditjiResult } from "../components/panditji/PanditjiResult";
import { CONCERN_OPTIONS } from "../components/panditji/utils";
import { calculateAuthenticKundali, isExactMukhiProduct } from "../lib/vedicAstrology";

export default function RudrakshaCalculator() {
  const { add } = useCart();
  const navigate = useNavigate();

  const calculatorSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://aurarudraksha.bond/rudraksha-calculator#app",
        "name": "Vedic Rudraksha Recommendation Calculator",
        "url": "https://aurarudraksha.bond/rudraksha-calculator",
        "applicationCategory": "LifestyleApplication",
        "operatingSystem": "All",
        "description": "Calculate authentic Mukhi Rudraksha recommendations based on Janma Rashi (Moon Sign), ruling planets, and spiritual goals according to Vedic scriptures.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "INR"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://aurarudraksha.bond/rudraksha-calculator#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://aurarudraksha.bond/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Sacred Collection",
            "item": "https://aurarudraksha.bond/rudraksha"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Rudraksha Recommendation Calculator",
            "item": "https://aurarudraksha.bond/rudraksha-calculator"
          }
        ]
      }
    ]
  };

  useSeo({
    title: "Vedic Rudraksha Recommendation Calculator & Rashi Guide | Aura Rudraksha",
    description: "Calculate your authentic Mukhi Rudraksha recommendation based on your Janma Rashi (Moon Sign), ruling planet, and life goals according to Vedic scriptures.",
    canonical: "https://aurarudraksha.bond/rudraksha-calculator",
    schema: calculatorSchema
  });

  const [activeMode, setActiveMode] = useState("kundali"); // "kundali", "rashi" or "goal"
  const [selectedRashi, setSelectedRashi] = useState(RASHI_RECOMMENDATIONS[0]);
  const [selectedGoal, setSelectedGoal] = useState("wealth");

  // Kundali Birth Details State
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [concern, setConcern] = useState("career");
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const handleCalculateKundali = async (e) => {
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

    try {
      let serverKundali = null;
      try {
        const response = await Promise.race([
          auraAiClient.calculateKundali({
            name: name.trim(),
            dob,
            birthTime: birthTime || "12:00",
            birthPlace: birthPlace.trim(),
            concern
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
        ]);
        serverKundali = response?.data || response?.kundali;
      } catch (callErr) {
        console.warn("Server calculateKundali fallback to client engine:", callErr?.message);
      }

      // Infallible Authentic Vedic calculation engine fallback
      if (!serverKundali) {
        serverKundali = calculateAuthenticKundali({
          name: name.trim(),
          dob,
          birthTime: birthTime || "12:00",
          birthPlace: birthPlace.trim(),
          concern
        });
      }

      if (serverKundali) {
        const astro = serverKundali.astronomicalKundali || serverKundali;
        const birth = serverKundali.verifiedBirthData || {};
        const chandra = astro.chandraRashi || serverKundali.rashi || {};
        const recList = astro.rudrakshaRecommendations || [];
        const primaryRec = recList[0] || {};
        const chandraRec = recList[1] || {};

        const recMukhi = primaryRec.mukhi || serverKundali.recommendedRudraksha?.mukhi || "5 Mukhi Rudraksha";
        const primaryMukhiNum = primaryRec.mukhiNumber || parseInt(recMukhi, 10);
        const chandraMukhiNum = chandraRec.mukhiNumber || parseInt(chandraRec.mukhi, 10);

        const allStoreProds = (db.getProducts() || []).filter(p => !p.status || p.status === "Published" || p.status === "published");

        const findStoreProductForMukhi = (mNum, mStr = "") => {
          if (!mNum && !mStr) return null;
          return allStoreProds.find(p => {
            if (!p) return false;
            if (mNum && isExactMukhiProduct(p, mNum)) return true;
            return false;
          });
        };

        const primaryProduct = 
          findStoreProductForMukhi(primaryMukhiNum, primaryRec.mukhi) || 
          (serverKundali.matchedProduct && isExactMukhiProduct(serverKundali.matchedProduct, primaryMukhiNum) ? serverKundali.matchedProduct : null) || 
          serverKundali.recommendedProducts?.find(p => isExactMukhiProduct(p, primaryMukhiNum)) || 
          allStoreProds.find(p => isExactMukhiProduct(p, primaryMukhiNum)) || 
          null;

        const dashaRec = recList[2] || {};
        const dashaMukhiNum = dashaRec.mukhiNumber || parseInt(dashaRec.mukhi, 10);

        const chandraProduct = 
          findStoreProductForMukhi(chandraMukhiNum, chandraRec.mukhi) || 
          serverKundali.recommendedProducts?.find(rp => isExactMukhiProduct(rp, chandraMukhiNum)) || 
          allStoreProds.find(p => isExactMukhiProduct(p, chandraMukhiNum)) || 
          null;

        const dashaProduct = 
          findStoreProductForMukhi(dashaMukhiNum, dashaRec.mukhi) || 
          serverKundali.recommendedProducts?.find(rp => isExactMukhiProduct(rp, dashaMukhiNum)) || 
          allStoreProds.find(p => isExactMukhiProduct(p, dashaMukhiNum)) || 
          null;

        const lagnaName = astro.lagna?.rashiHindi || astro.lagna?.rashiEnglish || "लग्न";
        const rashiName = chandra.rashiHindi || chandra.rashiEnglish || "राशि";
        const dashaName = astro.vimshottariDasha?.currentMahadashaHindi || astro.vimshottariDasha?.currentMahadasha || "";

        const cleanAstroReason = `आपकी जन्म पत्रिका के अनुसार आपका जन्म लग्न ${lagnaName} (स्वामी: ${astro.lagna?.lordHindi || astro.lagna?.lord || "ग्रह"}) एवं जन्म राशि ${rashiName} (स्वामी: ${chandra.lordHindi || chandra.lord || "ग्रह"}) है। वर्तमान में ${dashaName ? `${dashaName} महादशा का प्रभाव है। ` : ""}${primaryRec.significance || "कुंडली के ग्रह दोषों की शांति, आत्मबल एवं इष्ट देव की कृपा हेतु यह सिद्ध रुद्राक्ष सर्वश्रेष्ठ है।"}`;

        setResult({
          devoteeName: birth.name || name.trim(),
          lagnaHindi: lagnaName,
          rashiHindi: rashiName,
          rashiEng: chandra.rashiEnglish || chandra.nameEng || "Vedic",
          symbol: chandra.rashiSymbol || chandra.symbol || "✨",
          lord: chandra.lordHindi || chandra.lord || "शिव",
          element: chandra.element || "Agni",
          mulank: astro.mulank || serverKundali.numerology?.mulank || (((new Date(dob).getDate() - 1) % 9) + 1),
          dob: birth.dob || dob,
          birthPlace: birth.birthPlace || birthPlace.trim(),
          birthTime: birth.birthTime || birthTime || "12:00",
          concernObj: CONCERN_OPTIONS.find(c => c.id === concern),
          recommendedMukhi: primaryRec.mukhi || recMukhi,
          primaryMukhi: primaryRec.mukhi || recMukhi,
          chandraMukhi: chandraRec.mukhi || null,
          dashaMukhi: dashaRec.mukhi || null,
          dashaName: dashaName,
          beejMantra: primaryRec.beejMantra || chandra.mantra || "ॐ नमः शिवाय",
          wearingDay: serverKundali.wearingDay || chandra.day || "सोमवार / शिव तिथि",
          matchedProduct: primaryProduct,
          primaryProduct,
          chandraProduct,
          dashaProduct,
          astroReason: cleanAstroReason,
          fullKundaliData: serverKundali
        });
        setIsCalculating(false);
        emitToast("पंडित जी द्वारा आपकी कुंडली का वैदिक विश्लेषण तैयार है!", "success");
        return;
      } else {
        const errMsg = "वैदिक कुंडली गणना वर्तमान में उपलब्ध नहीं है। कृपया विवरण पुनः जांचें।";
        emitToast(errMsg, "error");
      }
    } catch (err) {
      console.warn("Backend Kundali calculation error:", err);
      emitToast("वैदिक कुंडली गणना में समस्या आई। कृपया कुछ समय पश्चात पुनः प्रयास करें।", "error");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleAddToCart = (productToAdd = null) => {
    const prod = productToAdd || result?.matchedProduct || result?.primaryProduct;
    if (prod) {
      add(prod.id, 1);
      setAddedSuccess(prod.id);
      emitToast(`${prod.name} को कार्ट में जोड़ दिया गया है!`, "success");
      setTimeout(() => setAddedSuccess(false), 3000);
    }
  };

  const handleAskInChat = (customPrompt = null) => {
    let promptText = customPrompt;
    if (!promptText) {
      if (result) {
        promptText = `नमस्ते पंडित जी 🙏 मेरा नाम ${result.devoteeName} है। मेरी जन्म तिथि ${result.dob} है (स्थान: ${result.birthPlace}, समय: ${result.birthTime})। मेरी राशि ${result.rashiHindi} (${result.rashiEng}) है, स्वामी ग्रह ${result.lord}, मूलांक ${result.mulank} और संकल्प "${result.concernObj?.label}" है। आपने मुझे ${result.recommendedMukhi} का परामर्श दिया है। कृपया मुझे इसे धारण करने की संपूर्ण वैदिक विधि, शुभ मुहूर्त, शुद्धिकरण, बीज मंत्र और दैनिक नियम बताएं।`;
      } else {
        promptText = "नमस्ते पंडित जी 🙏 कृपया मेरी जन्म कुंडली के अनुसार मेरे लिए सबसे उपयुक्त मुखी रुद्राक्ष एवं धारण विधि बताएं।";
      }
    }

    try {
      const activeData = {
        name: result?.devoteeName || name.trim() || "Devotee",
        dob: result?.dob || dob || "",
        birthTime: result?.birthTime || birthTime || "12:00",
        birthPlace: result?.birthPlace || birthPlace || "",
        concern: concern || "all",
        kundali: result?.fullKundaliData || null
      };
      sessionStorage.setItem("aura_pending_prompt", promptText);
      sessionStorage.setItem("aura_pending_birth_details", JSON.stringify(activeData));
    } catch (_) {}

    navigate("/aura-ai?mode=panditji");
  };

  const GOAL_OPTIONS = [
    {
      id: "wealth",
      name: "Wealth, Business & Career Growth",
      deity: "Goddess Mahalakshmi & Lord Surya",
      recommendedMukhi: "7 Mukhi & 12 Mukhi",
      slug: "7-mukhi",
      benefit: "Blessed by Goddess Lakshmi and the 12 Adityas for sustained business prosperity, executive leadership, and removal of financial stagnation."
    },
    {
      id: "peace",
      name: "Mental Peace, Stress Relief & Meditation",
      deity: "Lord Kalagni Rudra (Shiva)",
      recommendedMukhi: "5 Mukhi & 108+1 Japa Mala",
      slug: "5-mukhi",
      benefit: "Regulates nervous system bio-electricity, calms hyperactive thought patterns, and promotes profound inner dhyana stillness."
    },
    {
      id: "study",
      name: "Studies, Memory & Competitive Exams",
      deity: "Lord Brahma & Goddess Saraswati",
      recommendedMukhi: "4 Mukhi & Ganesh Rudraksha",
      slug: "4-mukhi",
      benefit: "Awakens analytical intellect, photographic memory retention, vocal clarity, and removes exam performance anxiety."
    },
    {
      id: "marriage",
      name: "Marriage, Relationship Harmony & Love",
      deity: "Lord Ardhanarishvara & Gauri Shankar",
      recommendedMukhi: "2 Mukhi & Gauri Shankar",
      slug: "2-mukhi",
      benefit: "Heals interpersonal conflicts, harmonizes male and female energies, and removes hurdles in finding a compatible life partner."
    },
    {
      id: "protection",
      name: "Protection, Shani Sade Sati & Rahu Dosha",
      deity: "Lord Hanuman, Maa Durga & Mahavishnu",
      recommendedMukhi: "8 Mukhi, 9 Mukhi & 10 Mukhi",
      slug: "8-mukhi",
      benefit: "Acts as a supreme spiritual shield (Vishnu & Durga Kavach) neutralizing malicious planetary transits and sudden negative hurdles."
    }
  ];

  const currentGoalData = GOAL_OPTIONS.find(g => g.id === selectedGoal) || GOAL_OPTIONS[0];

  return (
    <Shell>
      <div className="bg-[#faf7f2] min-h-screen pb-20 text-[#2a160d]">
        {/* Breadcrumbs */}
      <div className="border-b border-[#ebdccb] bg-white/70 backdrop-blur-sm sticky top-0 z-10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs sm:text-sm text-[#7a5843]">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2">
            <Link to="/" className="hover:text-[#6f3518] transition">Home</Link>
            <ChevronRight className="w-3 h-3 text-[#bfa99b]" />
            <Link to="/rudraksha" className="hover:text-[#6f3518] transition">Astrology</Link>
            <ChevronRight className="w-3 h-3 text-[#bfa99b]" />
            <span className="font-semibold text-[#6f3518]">Rudraksha Calculator</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-10">
        {/* Header */}
        <header className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#faeee4] text-[#8c3e1e] text-xs font-semibold uppercase tracking-wide mb-3 border border-[#ebdccb]">
            <Compass className="w-3.5 h-3.5" />
            Vedic Astrological Intelligence
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2a160d] tracking-tight leading-tight">
            Rudraksha Recommendation Calculator
          </h1>
          <p className="mt-3 text-[#6e5343] text-sm sm:text-base leading-relaxed">
            Select your Janma Rashi (Moon sign) or your current life focus to receive an authentic, scripture-aligned Mukhi recommendation.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="mt-8 flex flex-wrap justify-center p-1 rounded-xl bg-white border border-[#ebdccb] shadow-2xs gap-1">
            <button
              onClick={() => { triggerHaptic("selection"); setActiveMode("kundali"); }}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                activeMode === "kundali" 
                  ? "bg-[#6f3518] text-white shadow-xs" 
                  : "text-[#5c493d] hover:text-[#2a160d] hover:bg-[#faeee4]"
              }`}
            >
              <span>🕉️</span> Check by Kundali (जन्म पत्रिका अनुसार)
            </button>
            <button
              onClick={() => { triggerHaptic("selection"); setActiveMode("rashi"); }}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeMode === "rashi" 
                  ? "bg-[#6f3518] text-white shadow-xs" 
                  : "text-[#5c493d] hover:text-[#2a160d] hover:bg-[#faeee4]"
              }`}
            >
              Check by Rashi (Moon Sign)
            </button>
            <button
              onClick={() => { triggerHaptic("selection"); setActiveMode("goal"); }}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeMode === "goal" 
                  ? "bg-[#6f3518] text-white shadow-xs" 
                  : "text-[#5c493d] hover:text-[#2a160d] hover:bg-[#faeee4]"
              }`}
            >
              Check by Life Focus / Objective
            </button>
          </div>
        </header>

        {/* Mode: Kundali Calculation */}
        {activeMode === "kundali" && (
          <section className="bg-white border border-[#ebdccb] rounded-2xl p-4 sm:p-7 shadow-xs mb-10">
            <div className="text-center max-w-xl mx-auto mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold mb-2">
                <span>🛡️</span>
                <span>100% प्रामाणिक कुंडली विचार (Zero Fake Policy) — केवल वास्तविक जन्म पत्रिका देखकर ही परामर्श</span>
              </div>
              <span className="text-[11px] uppercase font-bold text-[#8c3e1e] tracking-wider block mb-1">
                Authentic Sidereal Vedic Jyotish Calculation
              </span>
              <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#2a160d]">
                जन्म कुंडली अनुसार व्यक्तिगत रुद्राक्ष परामर्श
              </h2>
              <p className="text-xs sm:text-sm text-[#7a5843] mt-1.5 leading-relaxed">
                वैदिक ज्योतिष के अनुसार प्रत्येक व्यक्ति की कुंडली का लग्न (Ascendant), चंद्र राशि (Moon Sign) तथा विंशोत्तरी महादशा भिन्न होती है। नीचे अपना सही जन्म विवरण दर्ज करें और अपनी कुंडली के अनुसार सिद्ध रुद्राक्ष प्राप्त करें।
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!result ? (
                <PanditjiForm
                  name={name}
                  setName={setName}
                  dob={dob}
                  setDob={setDob}
                  birthPlace={birthPlace}
                  setBirthPlace={setBirthPlace}
                  birthTime={birthTime}
                  setBirthTime={setBirthTime}
                  concern={concern}
                  setConcern={setConcern}
                  isCalculating={isCalculating}
                  handleCalculate={handleCalculateKundali}
                />
              ) : (
                <PanditjiResult
                  result={result}
                  setResult={setResult}
                  handleAddToCart={handleAddToCart}
                  handleAskInChat={handleAskInChat}
                  addedSuccess={addedSuccess}
                />
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Mode: Rashi Selector */}
        {activeMode === "rashi" && (
          <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs mb-10">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2a160d] mb-4 text-center">
              Select Your Janma Rashi (Moon Sign)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-8">
              {RASHI_RECOMMENDATIONS.map((r, i) => {
                const isSelected = selectedRashi.rashi === r.rashi;
                return (
                  <button
                    key={i}
                    onClick={() => { triggerHaptic("selection"); setSelectedRashi(r); }}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? "bg-[#6f3518] text-white border-[#6f3518] shadow-xs"
                        : "bg-[#fdfaf7] border-[#ebdccb] text-[#4a3427] hover:border-[#dfc4b0] hover:bg-[#faeee4]"
                    }`}
                  >
                    <div className="font-serif font-bold text-sm">{r.rashi.split(" ")[0]}</div>
                    <div className={`text-[11px] ${isSelected ? "text-[#f7e3ce]" : "text-[#7a5843]"}`}>
                      {r.rashi.includes("(") ? r.rashi.match(/\((.*?)\)/)?.[1] : ""} • {r.element}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Rashi Recommendation Result */}
            <div className="bg-[#faf7f2] border border-[#ebdccb] rounded-xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ebdccb]">
                <div>
                  <span className="text-xs uppercase font-semibold text-[#8c3e1e] tracking-wider">Astrological Recommendation</span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2a160d] mt-1">
                    {selectedRashi.rashi}
                  </h3>
                  <div className="text-xs sm:text-sm text-[#7a5843] mt-1">
                    Ruling Planet: <strong>{selectedRashi.ruler}</strong> • Element: <strong>{selectedRashi.element}</strong>
                  </div>
                </div>
                <div className="bg-white border border-[#ebdccb] px-4 py-2 rounded-xl text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-[#7a5843] block">Recommended Mukhi</span>
                  <span className="font-serif font-bold text-lg text-[#6f3518]">{selectedRashi.recommendedMukhi}</span>
                </div>
              </div>

              <div className="py-4">
                <h4 className="font-medium text-sm text-[#2a160d] mb-1">Vedic Astrological Significance:</h4>
                <p className="text-xs sm:text-sm text-[#5c493d] leading-relaxed">
                  {selectedRashi.primaryBenefit}
                </p>
              </div>

              <div className="pt-4 border-t border-[#ebdccb] flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#2f855a] font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  100% Genuine Lab Certified • Prana Pratishtha Consecrated
                </div>
                <Link
                  to={`/rudraksha/${selectedRashi.slug}`}
                  onClick={() => triggerHaptic("light")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#6f3518] text-white font-medium rounded-xl text-xs sm:text-sm hover:bg-[#5a2a12] transition shadow-xs"
                >
                  View Consecrated {selectedRashi.slug.replace("-", " ").toUpperCase()} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Mode: Life Challenge / Goal */}
        {activeMode === "goal" && (
          <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs mb-10">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2a160d] mb-4 text-center">
              What is Your Primary Spiritual or Life Objective?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {GOAL_OPTIONS.map(g => {
                const isSelected = selectedGoal === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => { triggerHaptic("selection"); setSelectedGoal(g.id); }}
                    className={`p-4 rounded-xl border text-left transition flex items-start justify-between ${
                      isSelected
                        ? "bg-[#6f3518] text-white border-[#6f3518] shadow-xs"
                        : "bg-[#fdfaf7] border-[#ebdccb] text-[#4a3427] hover:border-[#dfc4b0] hover:bg-[#faeee4]"
                    }`}
                  >
                    <div>
                      <div className="font-serif font-bold text-sm">{g.name}</div>
                      <div className={`text-[11px] mt-1 ${isSelected ? "text-[#f7e3ce]" : "text-[#7a5843]"}`}>
                        Deity: {g.deity}
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-[#f7e3ce] shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {/* Selected Goal Result */}
            <div className="bg-[#faf7f2] border border-[#ebdccb] rounded-xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ebdccb]">
                <div>
                  <span className="text-xs uppercase font-semibold text-[#8c3e1e] tracking-wider">Aspiration Recommendation</span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2a160d] mt-1">
                    {currentGoalData.name}
                  </h3>
                  <div className="text-xs sm:text-sm text-[#7a5843] mt-1">
                    Divine Blessing: <strong>{currentGoalData.deity}</strong>
                  </div>
                </div>
                <div className="bg-white border border-[#ebdccb] px-4 py-2 rounded-xl text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-[#7a5843] block">Recommended Bead</span>
                  <span className="font-serif font-bold text-lg text-[#6f3518]">{currentGoalData.recommendedMukhi}</span>
                </div>
              </div>

              <div className="py-4">
                <h4 className="font-medium text-sm text-[#2a160d] mb-1">Spiritual Vibration & Action:</h4>
                <p className="text-xs sm:text-sm text-[#5c493d] leading-relaxed">
                  {currentGoalData.benefit}
                </p>
              </div>

              <div className="pt-4 border-t border-[#ebdccb] flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#2f855a] font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  Government-Approved Lab Certified Bead
                </div>
                <Link
                  to={`/rudraksha/${currentGoalData.slug}`}
                  onClick={() => triggerHaptic("light")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#6f3518] text-white font-medium rounded-xl text-xs sm:text-sm hover:bg-[#5a2a12] transition shadow-xs"
                >
                  Explore {currentGoalData.recommendedMukhi.split("&")[0]} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Daily Vedic Panchanga & Auspicious Muhurta */}
        <section className="my-2">
          <DailyPanchangaWidget />
        </section>

        {/* Universal Auspiciousness Notice */}
        <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 text-center shadow-xs">
          <Sparkles className="w-8 h-8 text-[#d4af37] mx-auto mb-2" />
          <h3 className="font-serif text-xl font-bold text-[#2a160d]">
            The Universal Auspiciousness of 5 Mukhi (Panch Mukhi)
          </h3>
          <p className="text-xs sm:text-sm text-[#5c493d] max-w-xl mx-auto mt-2 leading-relaxed">
            In the Padma Purana, Lord Shiva states that the 5 Mukhi Rudraksha is governed by Kalagni Rudra and Jupiter, making it universally auspicious for all 12 zodiac signs without any astrological conflict. If you are uncertain of your birth chart, wearing a consecrated 5 Mukhi bead or 108+1 Japa Mala is always safe and spiritually uplifting.
          </p>
          <div className="mt-4">
            <Link
              to="/rudraksha/5-mukhi"
              onClick={() => triggerHaptic("light")}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#8c3e1e] hover:underline"
            >
              Learn about 5 Mukhi Universal Blessings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
    </Shell>
  );
}
