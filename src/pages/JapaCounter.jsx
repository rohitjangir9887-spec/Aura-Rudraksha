import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useCart } from "../hooks/useCart";
import { db } from "../lib/db";
import { emitToast } from "../context/ToastContext";
import { triggerHaptic } from "../lib/haptics";
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Flame, 
  CheckCircle2, 
  Award, 
  ShoppingCart, 
  ChevronRight, 
  Info,
  Calendar,
  Share2
} from "lucide-react";

// Web Audio API authentic Tibetan Bell / Singing Bowl Chime synthesizer
function playSacredChime(isMeru = false) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.25, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Fundamental frequencies: 432 Hz (Vedic A tuning) or 864 Hz for Meru
    const baseFreq = isMeru ? 576 : 432;
    const harmonics = [1, 2.76, 5.4, 8.9];

    harmonics.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(baseFreq * ratio, ctx.currentTime);

      const decayTime = isMeru ? 3.5 : 1.2;
      const initialGain = 1 / (idx + 1);

      gain.gain.setValueAtTime(initialGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decayTime);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start();
      osc.stop(ctx.currentTime + decayTime);
    });
  } catch (_) {}
}

const MANTRAS = [
  {
    id: "panchakshari",
    name: "ॐ नमः शिवाय",
    transliteration: "Om Namah Shivaya",
    deity: "भगवान शिव (Lord Shiva)",
    meaning: "मैं परब्रह्म शिव के पावन स्वरूप को नमन करता हूँ। यह मन को शांत और चित्त को शुद्ध करता है।",
    recommendedMala: "5 Mukhi Nepal Mala (108+1)"
  },
  {
    id: "mahamrityunjaya",
    name: "महामृत्युंजय मंत्र",
    devanagari: "ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्। उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्॥",
    transliteration: "Om Tryambakam Yajamahe Sugandhim Pushti-Vardhanam...",
    deity: "त्रिनेत्र शिव (Rudra)",
    meaning: "समस्त व्याधियों, भय और मृत्यु तुल्य कष्टों से मुक्ति प्रदान करने वाला महाकल्याणकारी मंत्र।",
    recommendedMala: "5 Mukhi / 14 Mukhi Rudraksha"
  },
  {
    id: "gayatri",
    name: "गायत्री मंत्र",
    devanagari: "ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्॥",
    transliteration: "Om Bhur Bhuvaḥ Svaḥ Tat-Savitur-Vareṇyaṁ...",
    deity: "सविता (सूर्यदेव / Gayatri)",
    meaning: "सृष्टि के प्रकाशक सूर्यदेव का दिव्य तेज हमारी बुद्धि और अंतःकरण को सही मार्ग दिखाए।",
    recommendedMala: "1 Mukhi / 5 Mukhi Nepal Mala"
  },
  {
    id: "surya_beej",
    name: "1 मुखी सूर्य बीज मंत्र",
    devanagari: "ॐ ह्रीं नमः",
    transliteration: "Om Hreem Namah",
    deity: "सूर्यदेव व शिव (Sun God & Shiva)",
    meaning: "आत्मबल, तेज, उच्च प्रतिष्ठा, नेतृत्व क्षमता और मोक्ष प्रदाता परम शक्तिशाली बीज मंत्र।",
    recommendedMala: "1 Mukhi Nepali Rudraksha"
  },
  {
    id: "kalagni_beej",
    name: "5 मुखी कालाग्नि रुद्र मंत्र",
    devanagari: "ॐ ह्रीं हुं नमः",
    transliteration: "Om Hreem Hoom Namah",
    deity: "कालाग्नि रुद्र (Lord Shiva)",
    meaning: "पंचतत्वों को संतुलित करने, पापों का शमन करने और रक्तचाप व मानसिक शांति हेतु सर्वोत्तम।",
    recommendedMala: "5 Mukhi Japa Mala"
  },
  {
    id: "ganesh",
    name: "श्री गणेश मंत्र",
    devanagari: "ॐ गं गणपतये नमः",
    transliteration: "Om Gam Ganapataye Namah",
    deity: "विघ्नहर्ता गणेश (Ganesha)",
    meaning: "सभी कार्यों में विघ्न बाधाओं का नाश, विद्या, व्यापार में अपार सिद्धि और शुभ लाभ हेतु।",
    recommendedMala: "Ganesh Rudraksha"
  }
];

export function JapaCounter() {
  const { add } = useCart();
  const [selectedMantra, setSelectedMantra] = useState(MANTRAS[0]);
  const [count, setCount] = useState(() => {
    try {
      return parseInt(localStorage.getItem("aura_japa_current_count") || "0", 10);
    } catch { return 0; }
  });
  const [laps, setLaps] = useState(() => {
    try {
      return parseInt(localStorage.getItem("aura_japa_completed_laps") || "0", 10);
    } catch { return 0; }
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const [streak, setStreak] = useState(() => {
    try {
      const savedDate = localStorage.getItem("aura_japa_last_date");
      const savedStreak = parseInt(localStorage.getItem("aura_japa_streak") || "1", 10);
      const today = new Date().toDateString();
      if (savedDate === today) return savedStreak;
      return savedStreak;
    } catch { return 1; }
  });
  const [animatingBead, setAnimatingBead] = useState(false);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);

  // Sync count to storage
  useEffect(() => {
    try {
      localStorage.setItem("aura_japa_current_count", String(count));
      localStorage.setItem("aura_japa_completed_laps", String(laps));
    } catch (_) {}
  }, [count, laps]);

  // Handle single chant increment
  const handleChant = useCallback(() => {
    setAnimatingBead(true);
    setTimeout(() => setAnimatingBead(false), 180);

    // Haptics
    if (vibrateEnabled) {
      triggerHaptic("selection");
    }

    const nextCount = count + 1;

    if (nextCount >= 108) {
      // Completed 1 full mala (108 chants)
      if (soundEnabled) playSacredChime(true);
      if (vibrateEnabled) triggerHaptic("success");

      setCount(0);
      const newLaps = laps + 1;
      setLaps(newLaps);
      setIsCompletedModalOpen(true);

      // Update daily streak
      try {
        const today = new Date().toDateString();
        const lastDate = localStorage.getItem("aura_japa_last_date");
        let newStreak = streak;
        if (lastDate !== today) {
          newStreak = streak + 1;
          setStreak(newStreak);
          localStorage.setItem("aura_japa_last_date", today);
          localStorage.setItem("aura_japa_streak", String(newStreak));
        }
      } catch (_) {}
    } else {
      if (soundEnabled) playSacredChime(false);
      setCount(nextCount);
    }
  }, [count, laps, soundEnabled, vibrateEnabled, streak]);

  // Spacebar to chant
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        handleChant();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleChant]);

  const handleReset = () => {
    if (window.confirm("क्या आप वर्तमान जप गिनती को रीसेट (0) करना चाहते हैं?")) {
      setCount(0);
      emitToast("जप माला रीसेट हो गई है", "info");
    }
  };

  const handleAddJapaMala = () => {
    const japaProduct = (db.getProducts() || []).find(p => 
      p.id === "108-japa-mala" || p.slug?.includes("japa") || p.name?.includes("Japa") || p.name?.includes("Mala")
    );
    const targetId = japaProduct?.id || "108-japa-mala";
    add(targetId, 1);
    emitToast("108+1 सिद्ध नेपाली जप माला कार्ट में जोड़ी गई! ✨", "success");
  };

  // 108 Bead Ring Coordinates
  const totalBeads = 108;
  const beadProgress = (count / totalBeads) * 100;

  return (
    <Shell>
      <div className="japa-page-wrapper" style={{ maxWidth: "1080px", margin: "24px auto 60px", padding: "0 16px" }}>
        
        {/* Breadcrumb & Title */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <span style={{ 
            fontSize: "12px", 
            fontWeight: 700, 
            letterSpacing: "1.2px", 
            textTransform: "uppercase", 
            color: "#9a3412",
            background: "#fff1e7",
            padding: "4px 12px",
            borderRadius: "20px",
            display: "inline-block",
            marginBottom: "8px"
          }}>
            ✦ दिव्य साधना टूल • 108 SACRED JAPA MALA
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#2b170d", margin: "4px 0 8px" }}>
            दैनिक मंत्र साधना व डिजिटल जप माला
          </h1>
          <p style={{ color: "#7c5e4c", fontSize: "14.5px", maxWidth: "620px", margin: "0 auto", lineHeight: "1.6" }}>
            अपने मन को शांत करें, आध्यात्मिक ऊर्जा को जागृत करें और प्रतिदिन 108 दिव्य मनकों के साथ जप पूर्ण करें। (Spacebar दबाकर या केंद्र में टैप करके जप करें)
          </p>
        </div>

        {/* Top Control Bar: Streak & Sound & Reset */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          background: "#fffdfa",
          border: "1px solid #ebd8c5",
          borderRadius: "14px",
          padding: "12px 18px",
          marginBottom: "24px",
          boxShadow: "0 2px 8px rgba(43,23,13,0.04)"
        }}>
          {/* Daily Streak */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "#fef3c7", color: "#b45309", width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center" }}>
              <Flame size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#8c6f5d", fontWeight: 600 }}>दैनिक साधना स्ट्रीक</div>
              <strong style={{ fontSize: "15px", color: "#2b170d" }}>{streak} दिन लगातार</strong>
            </div>
          </div>

          {/* Completed Laps */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "#ecfdf5", color: "#047857", width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center" }}>
              <Award size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#8c6f5d", fontWeight: 600 }}>पूर्ण की गई मालाएं</div>
              <strong style={{ fontSize: "15px", color: "#047857" }}>{laps} माला ({laps * 108 + count} मंत्र)</strong>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: soundEnabled ? "#fff7ed" : "#f4f4f5",
                color: soundEnabled ? "#9a3412" : "#71717a",
                border: "1px solid #fed7aa",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                touchAction: "manipulation"
              }}
              title={soundEnabled ? "घंटी ध्वनि बंद करें" : "घंटी ध्वनि चालू करें"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{soundEnabled ? "ध्वनि ON" : "ध्वनि OFF"}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "#ffffff",
                color: "#7c2d12",
                border: "1px solid #ebd8c5",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                touchAction: "manipulation"
              }}
              title="रीसेट करें"
            >
              <RotateCcw size={15} />
              <span>रीसेट</span>
            </button>
          </div>
        </div>

        {/* Main Grid: Counter Left / Mantra Picker Right */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", alignItems: "start" }}>
          
          {/* Card 1: Interactive Sacred Japa Beads Wheel */}
          <div style={{
            background: "linear-gradient(145deg, #ffffff 0%, #fdfbf7 100%)",
            border: "1px solid #eadecd",
            borderRadius: "20px",
            padding: "28px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 6px 24px rgba(43,23,13,0.06)",
            position: "relative"
          }}>
            <div style={{ marginBottom: "16px", textAlign: "center" }}>
              <span style={{ fontSize: "12px", color: "#a54d2b", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
                {selectedMantra.name}
              </span>
              <div style={{ fontSize: "13px", color: "#6e594d", marginTop: "2px" }}>
                {selectedMantra.transliteration}
              </div>
            </div>

            {/* Circular Beads Display */}
            <div style={{ position: "relative", width: "260px", height: "260px", margin: "10px auto" }}>
              {/* Circular SVG Ring */}
              <svg width="260" height="260" style={{ transform: "rotate(-90deg)" }}>
                {/* Background Ring */}
                <circle
                  cx="130"
                  cy="130"
                  r="110"
                  fill="none"
                  stroke="#f1e7db"
                  strokeWidth="8"
                  strokeDasharray="4 6"
                />
                {/* Progress Glow Ring */}
                <circle
                  cx="130"
                  cy="130"
                  r="110"
                  fill="none"
                  stroke="url(#japaGoldGradient)"
                  strokeWidth="10"
                  strokeDasharray="691"
                  strokeDashoffset={691 - (691 * beadProgress) / 100}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.2s ease-out" }}
                />
                <defs>
                  <linearGradient id="japaGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="50%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#9a3412" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Meru Bead Indicator (Top Center) */}
              <div 
                style={{
                  position: "absolute",
                  top: "6px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: count === 0 ? "#16a34a" : "#b45309",
                  border: "2px solid #fff",
                  boxShadow: "0 0 8px rgba(180,83,9,0.5)",
                  zIndex: 2
                }}
                title="मेरु मनका (Guru Bead)"
              />

              {/* Giant Clickable Sacred Rudraksha Bead in Center */}
              <button
                type="button"
                onClick={handleChant}
                aria-label="Tap to chant"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%, -50%) scale(${animatingBead ? 0.93 : 1})`,
                  width: "180px",
                  height: "180px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 35%, #fff1e3 0%, #fbd5b5 40%, #e09462 80%, #9a431a 100%)",
                  border: "4px solid #fff",
                  boxShadow: "0 10px 30px rgba(124,45,18,0.22), inset 0 2px 10px rgba(255,255,255,0.7)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  touchAction: "manipulation",
                  userSelect: "none"
                }}
              >
                <span style={{ fontSize: "38px", fontWeight: 900, color: "#451a03", lineHeight: 1 }}>
                  {count}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#78350f", marginTop: "2px", letterSpacing: "1px" }}>
                  / 108 मनके
                </span>
                <span style={{ fontSize: "10.5px", background: "rgba(255,255,255,0.75)", color: "#9a3412", padding: "2px 8px", borderRadius: "10px", marginTop: "6px", fontWeight: 700 }}>
                  ✦ टैप करें (TAP)
                </span>
              </button>
            </div>

            {/* Instruction Tip */}
            <div style={{ marginTop: "16px", fontSize: "12px", color: "#8c6f5d", textAlign: "center" }}>
              💡 <b>टिप:</b> लैपटॉप/डेस्कटॉप पर <b>Spacebar</b> दबाकर भी जप कर सकते हैं।
            </div>
          </div>

          {/* Card 2: Mantra Library & Meaning */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              background: "#fff",
              border: "1px solid #eadecd",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 4px 16px rgba(43,23,13,0.04)"
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#2b170d", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} color="#b45309" /> पवित्र मंत्र चयन (Select Mantra)
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {MANTRAS.map((m) => {
                  const isSelected = selectedMantra.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMantra(m)}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        background: isSelected ? "#fff5eb" : "#fdfbf9",
                        border: isSelected ? "2px solid #ea580c" : "1px solid #f0e1d2",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        touchAction: "manipulation"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "14px", color: isSelected ? "#9a3412" : "#2b170d" }}>
                          {m.name}
                        </strong>
                        {isSelected && (
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#ea580c", background: "#fff", padding: "2px 8px", borderRadius: "10px", border: "1px solid #fdba74" }}>
                            सक्रिय
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#7a6254", marginTop: "3px" }}>
                        {m.transliteration} • <b>{m.deity}</b>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Mantra Full Vedic Meaning */}
            <div style={{
              background: "linear-gradient(135deg, #fefbf6 0%, #faede2 100%)",
              border: "1px solid #e8dac9",
              borderRadius: "16px",
              padding: "18px",
              boxShadow: "0 2px 8px rgba(43,23,13,0.04)"
            }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#9a3412", letterSpacing: "1px", textTransform: "uppercase" }}>
                वैदिक अर्थ व महत्व (Vedic Significance)
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#2b170d", margin: "6px 0 8px", fontFamily: "'Cinzel', serif" }}>
                {selectedMantra.devanagari || selectedMantra.name}
              </div>
              <p style={{ fontSize: "13px", color: "#5c4333", lineHeight: "1.6", margin: 0 }}>
                {selectedMantra.meaning}
              </p>

              {/* Sacred Mala Recommendation Card */}
              <div style={{ 
                marginTop: "16px", 
                padding: "12px 14px", 
                background: "#ffffff", 
                borderRadius: "12px", 
                border: "1px solid #fed7aa",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                flexWrap: "wrap"
              }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#9a3412", fontWeight: 700 }}>सुझाव: सर्वोत्तम जप माला</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#2b170d" }}>{selectedMantra.recommendedMala}</div>
                </div>
                <button
                  type="button"
                  onClick={handleAddJapaMala}
                  style={{
                    background: "#7c2d12",
                    color: "#fff",
                    border: "none",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    touchAction: "manipulation"
                  }}
                >
                  <ShoppingCart size={13} />
                  <span>माला खरीदें (₹1,899)</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Mala Completion Modal */}
        {isCompletedModalOpen && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 99999,
            padding: "16px"
          }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "32px 24px",
              maxWidth: "440px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: "2px solid #f97316"
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#ecfdf5",
                color: "#059669",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px"
              }}>
                <CheckCircle2 size={36} />
              </div>

              <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>
                🕉️ साधना पूर्ण! हर हर महादेव
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.6", margin: "0 0 20px" }}>
                आपने <b>108 मंत्रों</b> की एक पवित्र माला पूर्ण कर ली है। आपकी एकाग्रता और भक्ति आपको मानसिक शांति व सकारात्मक ऊर्जा प्रदान करे।
              </p>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", marginBottom: "20px", fontSize: "13px", color: "#334155" }}>
                कुल पूर्ण मालाएं: <b>{laps}</b> • आज की कुल आहुतियां: <b>{laps * 108} मंत्र</b>
              </div>

              <button
                type="button"
                onClick={() => setIsCompletedModalOpen(false)}
                style={{
                  width: "100%",
                  background: "#7c2d12",
                  color: "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                अगली माला प्रारंभ करें (Start Next Mala)
              </button>
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}

export default JapaCounter;
