import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useCart } from "../hooks/useCart";
import { db } from "../lib/db";
import { emitToast } from "../context/ToastContext";
import { auraChatStore } from "../lib/auraChatStore";

import { CONCERN_OPTIONS, calculateRashi } from "./panditji/utils";
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
