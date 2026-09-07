import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useCart } from "../hooks/useCart";
import { db } from "../lib/db";
import { auraAiClient } from "../lib/auraAiClient";
import { emitToast } from "../context/ToastContext";
import { auraChatStore } from "../lib/auraChatStore";

import { CONCERN_OPTIONS } from "./panditji/utils";
import { PanditjiHeader } from "./panditji/PanditjiHeader";
import { PanditjiForm } from "./panditji/PanditjiForm";
import { PanditjiResult } from "./panditji/PanditjiResult";
import { PanditjiPortrait } from "./panditji/PanditjiPortrait";
import { PanditjiTrustRow } from "./panditji/PanditjiTrustRow";

export function PanditjiSection() {
  const { add } = useCart();

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

  const handleCalculate = async (e) => {
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
      // Real server-side Astronomical Kundali calculation & NVIDIA NIM interpretation
      const response = await auraAiClient.calculateKundali({
        name: name.trim(),
        dob,
        birthTime: birthTime || "12:00",
        birthPlace: birthPlace.trim(),
        concern
      });

      const serverKundali = response?.data || response?.kundali;

      if (serverKundali) {
        const astro = serverKundali.astronomicalKundali || serverKundali;
        const birth = serverKundali.verifiedBirthData || {};
        const chandra = astro.chandraRashi || serverKundali.rashi || {};
        const matchedProd = serverKundali.matchedProduct || (db.getProducts()[0]);

        setResult({
          devoteeName: birth.name || name.trim(),
          rashiHindi: chandra.rashiHindi || chandra.nameHindi || "वैदिक",
          rashiEng: chandra.rashiEnglish || chandra.nameEng || "Vedic",
          symbol: chandra.rashiSymbol || chandra.symbol || "✨",
          lord: chandra.lord || "शिव",
          element: chandra.element || "Agni",
          mulank: astro.mulank || serverKundali.numerology?.mulank || (((new Date(dob).getDate() - 1) % 9) + 1),
          dob: birth.dob || dob,
          birthPlace: birth.birthPlace || birthPlace.trim(),
          birthTime: birth.birthTime || birthTime || "12:00",
          concernObj: CONCERN_OPTIONS.find(c => c.id === concern),
          recommendedMukhi: astro.rudrakshaRecommendations?.[0]?.mukhi || serverKundali.recommendedRudraksha?.mukhi || "7 Mukhi Rudraksha",
          beejMantra: astro.rudrakshaRecommendations?.[0]?.beejMantra || serverKundali.beejMantra || chandra.mantra || "Om Namah Shivaya",
          wearingDay: serverKundali.wearingDay || chandra.day || "सोमवार / शिव तिथि",
          matchedProduct: matchedProd,
          astroReason: serverKundali.aiInterpretation || serverKundali.astroAnalysis || `आपकी जन्म कुंडली के प्रामाणिक वैदिक विश्लेषण अनुसार आपकी राशि ${chandra.rashiHindi || chandra.nameHindi || "वैदिक"} है।`
        });
        setIsCalculating(false);
        emitToast("पंडित जी द्वारा आपकी कुंडली का वैदिक विश्लेषण तैयार है!", "success");
        return;
      } else {
        const errMsg = response?.message || "वैदिक कुंडली गणना वर्तमान में उपलब्ध नहीं है। कृपया विवरण पुनः जांचें।";
        emitToast(errMsg, "error");
      }
    } catch (err) {
      console.warn("Backend Kundali calculation error:", err);
      emitToast("वैदिक कुंडली गणना में समस्या आई। कृपया कुछ समय पश्चात पुनः प्रयास करें।", "error");
    } finally {
      setIsCalculating(false);
    }
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

        <PanditjiHeader handleAskInChat={handleAskInChat} />

        {/* MAIN INTERACTIVE GRID: FORM / RESULT & VEDIC SHOWCASE */}
        <div className="aura-panditji-grid" style={{ minHeight: 'auto', gap: 20 }}>
          
          {/* LEFT: INTERACTIVE FORM OR KUNDALI RESULT */}
          <div style={{ width: '100%', minWidth: 0, zIndex: 3 }}>
            <AnimatePresence mode="wait">
              {!result ? (
                <PanditjiForm
                  name={name} setName={setName}
                  dob={dob} setDob={setDob}
                  birthPlace={birthPlace} setBirthPlace={setBirthPlace}
                  birthTime={birthTime} setBirthTime={setBirthTime}
                  concern={concern} setConcern={setConcern}
                  isCalculating={isCalculating}
                  handleCalculate={handleCalculate}
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
          </div>

          {/* RIGHT: WELCOMING TRADITIONAL PANDITJI PORTRAIT & CONSULTATION CARD */}
          <PanditjiPortrait handleAskInChat={handleAskInChat} />

        </div>

        {/* COMPACT TRUST ROW BELOW HERO GRID */}
        <PanditjiTrustRow />
      </div>
    </section>
  );
}
