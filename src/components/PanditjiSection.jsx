import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useCart } from "../hooks/useCart";
import { db } from "../lib/db";
import { auraAiClient } from "../lib/auraAiClient";
import { emitToast } from "../context/ToastContext";
import { auraChatStore } from "../lib/auraChatStore";
import { calculateAuthenticKundali, isExactMukhiProduct } from "../lib/vedicAstrology";

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
      // 1. Calculate authentic astronomical Kundali & recommendations
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

      // Infallible Vedic calculation engine fallback
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

        // Fetch store products to guarantee exact bead match
        const allStoreProds = (db.getProducts() || []).filter(p => !p.status || p.status === "Published" || p.status === "published");

        const findStoreProductForMukhi = (mNum, mStr = "") => {
          if (!mNum && !mStr) return null;
          return allStoreProds.find(p => {
            if (!p) return false;
            if (mNum && isExactMukhiProduct(p, mNum)) return true;
            const pName = String(p.name || "").toLowerCase();
            const pSlug = String(p.slug || "").toLowerCase();
            const regex = new RegExp(`(?:^|[^0-9])${mNum}\\s*[-]?\\s*mukhi(?:[^0-9]|$)`, "i");
            if (regex.test(pName) || regex.test(pSlug)) return true;
            if (mStr && mStr.includes("gauri shankar") && (pName.includes("gauri shankar") || pSlug.includes("gauri-shankar"))) return true;
            if (mStr && mStr.includes("ganesh") && (pName.includes("ganesh") || pSlug.includes("ganesh"))) return true;
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
        const errMsg = "वैदिक कुंडली गणना में समस्या आई। कृपया विवरण पुनः जांचें।";
        emitToast(errMsg, "error");
      }
    } catch (err) {
      console.warn("Backend Kundali calculation error:", err);
      emitToast("वैदिक कुंडली गणना में समस्या आई। कृपया पुनः प्रयास करें।", "error");
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
