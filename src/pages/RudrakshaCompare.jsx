import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { db } from "../lib/db";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { money } from "../data";
import { OptimizedImage } from "../components/OptimizedImage";
import { 
  Sparkles, 
  ShoppingCart, 
  Check, 
  Volume2, 
  ShieldCheck, 
  ArrowLeftRight, 
  Star,
  Plus,
  X
} from "lucide-react";

// Vedic details mapping for authentic bead comparison
const VEDIC_COMPARISON_DATA = {
  "1-mukhi": {
    mukhi: "1 Mukhi (एक मुखी)",
    deity: "भगवान शिव (साक्षात ओंकार)",
    planet: "सूर्य (Sun)",
    mantra: "ॐ ह्रीं नमः (Om Hreem Namah)",
    chakra: "सहस्रार चक्र (Sahasrara - Crown Chakra)",
    benefits: "आत्म-साक्षात्कार, नेतृत्व क्षमता, सरकारी व प्रशासनिक कार्यों में सफलता, अपार सम्मान एवं मोक्ष।",
    bestFor: "उच्च अधिकारी, राजनेता, सीईओ, और आध्यात्मिक साधक।",
    origin: "नेपाल (दुर्लभ काजू दाना / गोल दाना)"
  },
  "2-mukhi": {
    mukhi: "2 Mukhi (दो मुखी)",
    deity: "अर्धनारीश्वर (शिव-शक्ति)",
    planet: "चंद्रमा (Moon)",
    mantra: "ॐ नमः (Om Namah)",
    chakra: "स्वाधिष्ठान चक्र (Swadhisthana Chakra)",
    benefits: "वैवाहिक सुख, पारिवारिक सामंजस्य, मानसिक तनाव मुक्ति, रिश्तों में मधुरता एवं भावनात्मक स्थिरता।",
    bestFor: "दंपति, अनिद्रा या डिप्रेशन से ग्रस्त व्यक्ति, और साझेदारी व्यवसाय।",
    origin: "नेपाल"
  },
  "3-mukhi": {
    mukhi: "3 Mukhi (तीन मुखी)",
    deity: "अग्नि देव (Agni Deva)",
    planet: "मंगल (Mars)",
    mantra: "ॐ क्लीं नमः (Om Kleem Namah)",
    chakra: "मणिपुर चक्र (Solar Plexus)",
    benefits: "आलस्य निवारण, हीनभावना मुक्ति, आंतरिक साहस व पराक्रम, ऊर्जा संचार और भूतकाल के पापों का दहन।",
    bestFor: "खिलाड़ी, छात्र, और आत्मबल व ऊर्जा बढ़ाने के इच्छुक व्यक्ति।",
    origin: "नेपाल"
  },
  "4-mukhi": {
    mukhi: "4 Mukhi (चार मुखी)",
    deity: "ब्रह्मा जी (Lord Brahma)",
    planet: "बुध (Mercury)",
    mantra: "ॐ ह्रीं नमः (Om Hreem Namah)",
    chakra: "विशुद्ध चक्र (Throat Chakra)",
    benefits: "स्मरण शक्ति में वृद्धि, बौद्धिक कुशाग्रता, वाक्पटुता, संचार कौशल एवं एकाग्रता।",
    bestFor: "विद्यार्थी, लेखक, पत्रकार, वकील, और शिक्षक।",
    origin: "नेपाल"
  },
  "5-mukhi": {
    mukhi: "5 Mukhi (पंच मुखी)",
    deity: "कालाग्नि रुद्र (Kalagni Rudra)",
    planet: "बृहस्पति (Jupiter)",
    mantra: "ॐ ह्रीं हुं नमः (Om Hreem Hoom Namah)",
    chakra: "विशुद्ध व अनाहत चक्र",
    benefits: "मानसिक शांति, रक्तचाप नियंत्रण, नकारात्मक ऊर्जा से रक्षा, ज्ञान संचय और संपूर्ण परिवार की सुरक्षा।",
    bestFor: "सभी आयु वर्ग के साधक, संपूर्ण परिवार और दैनिक जप।",
    origin: "नेपाल"
  },
  "6-mukhi": {
    mukhi: "6 Mukhi (छह मुखी)",
    deity: "भगवान कार्तिकेय (Lord Kartikeya)",
    planet: "शुक्र (Venus)",
    mantra: "ॐ ह्रीं हुं नमः (Om Hreem Hoom Namah)",
    chakra: "मूलाधार चक्र (Root Chakra)",
    benefits: "इच्छाशक्ति में वृद्धि, आकर्षण शक्ति, कलात्मक प्रतिभा, सुख-सुविधाओं की प्राप्ति और वाणी प्रभाव।",
    bestFor: "कलाकार, अभिनेता, प्रबंधक, और मार्केटिंग प्रोफेशनल्स।",
    origin: "नेपाल"
  },
  "7-mukhi": {
    mukhi: "7 Mukhi (सात मुखी)",
    deity: "महालक्ष्मी (Goddess Mahalaxmi)",
    planet: "शनि (Saturn)",
    mantra: "ॐ हुं नमः (Om Hoom Namah)",
    chakra: "मणिपुर चक्र",
    benefits: "आर्थिक समृद्धि, व्यापारिक लाभ, ऋण मुक्ति, शनि साढ़ेसाती निवारण और अचानक धन प्राप्ति के योग।",
    bestFor: "व्यापारी, उद्यमी, वित्त सलाहकार, और शनि दोष से पीड़ित जातक।",
    origin: "नेपाल"
  },
  "8-mukhi": {
    mukhi: "8 Mukhi (आठ मुखी)",
    deity: "भगवान गणेश (Lord Ganesha)",
    planet: "राहु (Rahu)",
    mantra: "ॐ हुं नमः (Om Hoom Namah)",
    chakra: "मूलाधार चक्र",
    benefits: "कार्यों में विघ्न बाधाओं का नाश, राहु के दुष्प्रभाव से मुक्ति, सफलता के नए द्वार खुलना।",
    bestFor: "जो लोग बार-बार असफलताओं या रुकावटों का सामना कर रहे हैं।",
    origin: "नेपाल"
  },
  "9-mukhi": {
    mukhi: "9 Mukhi (नौ मुखी)",
    deity: "माँ नवदुर्गा (Maa Durga)",
    planet: "केतु (Ketu)",
    mantra: "ॐ ह्रीं हुं नमः (Om Hreem Hoom Namah)",
    chakra: "सहस्रार चक्र",
    benefits: "भय मुक्ति, आंतरिक शक्ति व संबल, केतु दोष निवारण, आध्यात्मिक सिद्धि और बुरी नजर से अभेद्य रक्षा।",
    bestFor: "महिलाएं, आध्यात्मिक साधक, और आत्मरक्षा व साहस के इच्छुक जातक।",
    origin: "नेपाल"
  },
  "10-mukhi": {
    mukhi: "10 Mukhi (दस मुखी)",
    deity: "भगवान विष्णु (Lord Vishnu)",
    planet: "नवग्रह शांति (All 9 Planets)",
    mantra: "ॐ ह्रीं नमः (Om Hreem Namah)",
    chakra: "अनाहत चक्र",
    benefits: "दस दिशाओं से रक्षा, नवग्रहों के कुप्रभाव का शमन, कानूनी मुकदमों में जीत और मानसिक अभय।",
    bestFor: "सभी ग्रहों की पीड़ा से मुक्ति और सुरक्षा कवच चाहने वाले व्यक्ति।",
    origin: "नेपाल"
  },
  "11-mukhi": {
    mukhi: "11 Mukhi (ग्यारह मुखी)",
    deity: "श्री हनुमान जी (Lord Hanuman)",
    planet: "मंगल व शनि (Mars & Saturn)",
    mantra: "ॐ ह्रीं हुं नमः (Om Hreem Hoom Namah)",
    chakra: "अनाहत व आज्ञा चक्र",
    benefits: "शारीरिक बल, साहस, दुर्घटनाओं से रक्षा, शत्रु विजय, योग साधना और ध्यान में पूर्ण एकाग्रता।",
    bestFor: "योगाभ्यासी, सुरक्षा बल, एथलीट्स, और हनुमान भक्त।",
    origin: "नेपाल"
  },
  "12-mukhi": {
    mukhi: "12 Mukhi (बारह मुखी)",
    deity: "द्वादश आदित्य / सूर्य (Lord Surya)",
    planet: "सूर्य (Sun)",
    mantra: "ॐ क्रौं क्षौं ग्लौं नमः (Om Kroum Kshaum Glaum Namah)",
    chakra: "मणिपुर चक्र",
    benefits: "सूर्य के समान तेज, मान-सम्मान, प्रशासनिक यश, नेत्र व हृदय स्वास्थ्य और आत्मविश्वास।",
    bestFor: "डॉक्टर्स, प्रशासनिक अधिकारी, नेता, और व्यवसायी।",
    origin: "नेपाल"
  },
  "13-mukhi": {
    mukhi: "13 Mukhi (तेरह मुखी)",
    deity: "कामदेव व इंद्रदेव (Kamadeva & Indra)",
    planet: "शुक्र (Venus)",
    mantra: "ॐ ह्रीं नमः (Om Hreem Namah)",
    chakra: "स्वाधिष्ठान चक्र",
    benefits: "आकर्षण शक्ति (वशीकरण प्रभाव), वाक सिद्धि, ऐश्वर्य, भोग विलास, उत्तम दांपत्य और उच्च पद।",
    bestFor: "मार्केटिंग हेड, जनसंपर्क अधिकारी, और ऐश्वर्य की कामना करने वाले।",
    origin: "नेपाल"
  },
  "14-mukhi": {
    mukhi: "14 Mukhi (चौदह मुखी / देव मणि)",
    deity: "भगवान शिव (हनुमान जी स्वरूप)",
    planet: "शनि व मंगल (Saturn & Mars)",
    mantra: "ॐ नमः (Om Namah)",
    chakra: "आज्ञा चक्र (Ajna - Third Eye)",
    benefits: "छठी इंद्री (Intuition) का जागरण, भविष्य का पूर्वाभास, शनि की महादशा से पूर्ण सुरक्षा, दुर्लभतम सुरक्षा कवच।",
    bestFor: "सटोरिये, निवेशक, उच्च निर्णयकर्ता, और तपस्वी साधक।",
    origin: "नेपाल (अति दुर्लभ)"
  },
  "gauri-shankar": {
    mukhi: "गौरी शंकर रुद्राक्ष",
    deity: "शिव-पार्वती युगल स्वरूप",
    planet: "चंद्रमा व सूर्य (Moon & Sun)",
    mantra: "ॐ गौरीशंकराय नमः (Om Gauri-Shankaraya Namah)",
    chakra: "हृदय चक्र (Heart Chakra)",
    benefits: "वैवाहिक जीवन में परम प्रेम, योग्य वर/वधू की प्राप्ति, संतान सुख, घर में सुख-शांति एवं पारिवारिक एकता।",
    bestFor: "विवाहित दंपत्ति, विवाह योग्य युवक-युवतियां, और गृहस्थ साधक।",
    origin: "नेपाल"
  },
  "ganesh": {
    mukhi: "गणेश रुद्राक्ष (सूंड आकृति)",
    deity: "प्रथम पूज्य श्री गणेश जी",
    planet: "केतु व बुध",
    mantra: "ॐ गं गणपतये नमः (Om Gam Ganapataye Namah)",
    chakra: "मूलाधार चक्र",
    benefits: "विद्या, बुद्धि, स्मरण शक्ति, व्यापार में वृद्धि और समस्त शुभ कार्यों में सफलता।",
    bestFor: "छात्र, शिक्षक, व्यापारी, और नए कार्य प्रारंभ करने वाले व्यक्ति।",
    origin: "नेपाल"
  }
};

export function RudrakshaCompare() {
  const { add } = useCart();
  const allProducts = useMemo(() => db.getProducts() || [], []);

  // Filter rudraksha products that can be compared
  const comparableProducts = useMemo(() => {
    return allProducts.filter(p => p.category === "Rudraksha" || p.name?.toLowerCase().includes("mukhi") || p.name?.toLowerCase().includes("rudraksha"));
  }, [allProducts]);

  // Selected products for comparison (defaults: 1 Mukhi, 5 Mukhi, 14 Mukhi)
  const [selectedIds, setSelectedIds] = useState(() => {
    const p1 = comparableProducts.find(p => p.id === "1-mukhi" || p.name?.includes("1 Mukhi"))?.id || comparableProducts[0]?.id;
    const p2 = comparableProducts.find(p => p.id === "5-mukhi" || p.name?.includes("5 Mukhi"))?.id || comparableProducts[1]?.id;
    const p3 = comparableProducts.find(p => p.id === "14-mukhi" || p.name?.includes("14 Mukhi"))?.id || comparableProducts[2]?.id;
    return [p1, p2, p3].filter(Boolean);
  });

  const selectedProducts = useMemo(() => {
    return selectedIds.map(id => comparableProducts.find(p => p.id === id)).filter(Boolean);
  }, [selectedIds, comparableProducts]);

  const handleSelectSlot = (slotIdx, newId) => {
    const updated = [...selectedIds];
    updated[slotIdx] = newId;
    setSelectedIds(updated);
  };

  const handleRemoveSlot = (slotIdx) => {
    if (selectedIds.length <= 2) {
      emitToast("तुलना के लिए कम से कम 2 रुद्राक्ष आवश्यक हैं", "info");
      return;
    }
    const updated = selectedIds.filter((_, idx) => idx !== slotIdx);
    setSelectedIds(updated);
  };

  const handleAddSlot = () => {
    if (selectedIds.length >= 3) {
      emitToast("अधिकतम 3 रुद्राक्ष एक साथ तुलना किए जा सकते हैं", "info");
      return;
    }
    const available = comparableProducts.find(p => !selectedIds.includes(p.id));
    if (available) {
      setSelectedIds([...selectedIds, available.id]);
    }
  };

  const handleAddToCart = (product) => {
    add(product.id, 1);
    emitToast(`${product.name} कार्ट में जोड़ा गया! ✨`, "success");
  };

  // Web Speech Beej Mantra Pronunciation
  const handleSpeakMantra = (mantraText) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(mantraText);
      utterance.lang = "hi-IN";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getVedicData = (p) => {
    if (!p) return null;
    const key = p.id || p.slug || "";
    for (const [vKey, data] of Object.entries(VEDIC_COMPARISON_DATA)) {
      if (key.includes(vKey) || p.name?.toLowerCase().includes(vKey.replace("-", " "))) {
        return data;
      }
    }
    return {
      mukhi: p.name,
      deity: p.deity || "भगवान शिव (Lord Shiva)",
      planet: p.rulingPlanet || "नवग्रह",
      mantra: "ॐ नमः शिवाय",
      chakra: "हृदय / अनाहत चक्र",
      benefits: p.description?.slice(0, 120) || "आत्मिक शांति व सुरक्षा।",
      bestFor: "समस्त साधक व भक्तजन।",
      origin: p.origin || "नेपाल"
    };
  };

  return (
    <Shell>
      <div className="compare-page-container" style={{ maxWidth: "1200px", margin: "24px auto 60px", padding: "0 16px" }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <span style={{ 
            fontSize: "12px", 
            fontWeight: 700, 
            letterSpacing: "1.2px", 
            textTransform: "uppercase", 
            color: "#9a3412",
            background: "#fff1e7",
            padding: "4px 14px",
            borderRadius: "20px",
            display: "inline-block",
            marginBottom: "8px"
          }}>
            ✦ वैदिक तुलना टूल • RUDRAKSHA COMPARISON MATRIX
          </span>
          <h1 style={{ fontSize: "30px", fontWeight: 800, color: "#2b170d", margin: "4px 0 8px" }}>
            रुद्राक्ष तुलना व वैदिक चयन मैट्रिक्स
          </h1>
          <p style={{ color: "#7c5e4c", fontSize: "15px", maxWidth: "680px", margin: "0 auto", lineHeight: "1.6" }}>
            अपनी आवश्यकता, राशि व ग्रहों के आधार पर विभिन्न मुखी रुद्राक्षों के दैवीय प्रभाव, बीज मंत्र, चक्र व फल की आमने-सामने तुलना करें।
          </p>
        </div>

        {/* Top Control: Add Slot button if < 3 */}
        {selectedIds.length < 3 && (
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <button
              type="button"
              onClick={handleAddSlot}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "#fff7ed",
                border: "1px dashed #ea580c",
                borderRadius: "10px",
                color: "#9a3412",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              <Plus size={16} /> तीसरा रुद्राक्ष तुलना में जोड़ें (+ Add Product)
            </button>
          </div>
        )}

        {/* Comparison Table Grid */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #ebd8c5",
          borderRadius: "16px",
          overflowX: "auto",
          boxShadow: "0 6px 24px rgba(43,23,13,0.06)"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
            <thead>
              <tr style={{ background: "#fbf6f0", borderBottom: "2px solid #e8dac9" }}>
                <th style={{ width: "20%", padding: "16px", textAlign: "left", fontSize: "14px", color: "#6e5241", fontWeight: 700 }}>
                  तुलना पैरामीटर
                </th>
                {selectedProducts.map((p, idx) => (
                  <th key={p.id} style={{ width: `${80 / selectedProducts.length}%`, padding: "16px", textAlign: "center", position: "relative" }}>
                    {selectedProducts.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(idx)}
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: "#fee2e2",
                          border: "none",
                          color: "#ef4444",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          cursor: "pointer",
                          display: "grid",
                          placeItems: "center"
                        }}
                        title="हटाएं"
                      >
                        <X size={14} />
                      </button>
                    )}
                    {/* Selector Dropdown to easily switch */}
                    <select
                      value={p.id}
                      onChange={(e) => handleSelectSlot(idx, e.target.value)}
                      style={{
                        padding: "6px 10px",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        color: "#7c2d12",
                        background: "#ffffff",
                        border: "1px solid #dcd1c6",
                        borderRadius: "8px",
                        maxWidth: "90%",
                        cursor: "pointer",
                        outline: "none"
                      }}
                    >
                      {comparableProducts.map(cp => (
                        <option key={cp.id} value={cp.id}>{cp.name}</option>
                      ))}
                    </select>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Row 1: Product Photo & Price */}
              <tr style={{ borderBottom: "1px solid #f0e4d7" }}>
                <td style={{ padding: "18px 16px", fontWeight: 700, color: "#2b170d", fontSize: "13.5px" }}>
                  उत्पाद व स्वरूप
                </td>
                {selectedProducts.map(p => (
                  <td key={p.id} style={{ padding: "18px 16px", textAlign: "center", verticalAlign: "top" }}>
                    <div style={{ width: "110px", height: "110px", margin: "0 auto 10px", borderRadius: "12px", overflow: "hidden", background: "#fcf9f5", border: "1px solid #f0dfcc" }}>
                      <OptimizedImage
                        src={p.images?.[0] || p.img || "/images/placeholder.svg"}
                        alt={p.name}
                        width={220}
                        quality={80}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <strong style={{ display: "block", fontSize: "14.5px", color: "#2b170d", marginBottom: "4px" }}>
                      {p.name}
                    </strong>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#9a3412", marginBottom: "8px" }}>
                      {money(p.price)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(p)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#7c2d12",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        touchAction: "manipulation"
                      }}
                    >
                      <ShoppingCart size={13} /> खरीदें
                    </button>
                  </td>
                ))}
              </tr>

              {/* Row 2: Ruling Deity */}
              <tr style={{ borderBottom: "1px solid #f0e4d7", background: "#fdfbf9" }}>
                <td style={{ padding: "14px 16px", fontWeight: 700, color: "#2b170d", fontSize: "13.5px" }}>
                  🕉️ अधिष्ठाता देव (Ruling Deity)
                </td>
                {selectedProducts.map(p => {
                  const vedic = getVedicData(p);
                  return (
                    <td key={p.id} style={{ padding: "14px 16px", textAlign: "center", fontSize: "14px", fontWeight: 700, color: "#7c2d12" }}>
                      {vedic.deity}
                    </td>
                  );
                })}
              </tr>

              {/* Row 3: Ruling Planet */}
              <tr style={{ borderBottom: "1px solid #f0e4d7" }}>
                <td style={{ padding: "14px 16px", fontWeight: 700, color: "#2b170d", fontSize: "13.5px" }}>
                  🪐 शासक ग्रह (Ruling Planet)
                </td>
                {selectedProducts.map(p => {
                  const vedic = getVedicData(p);
                  return (
                    <td key={p.id} style={{ padding: "14px 16px", textAlign: "center", fontSize: "13.5px", color: "#374151" }}>
                      <b>{vedic.planet}</b>
                    </td>
                  );
                })}
              </tr>

              {/* Row 4: Beeja Mantra with Audio Player */}
              <tr style={{ borderBottom: "1px solid #f0e4d7", background: "#fdfbf9" }}>
                <td style={{ padding: "14px 16px", fontWeight: 700, color: "#2b170d", fontSize: "13.5px" }}>
                  📿 सिद्ध बीज मंत्र (Beeja Mantra)
                </td>
                {selectedProducts.map(p => {
                  const vedic = getVedicData(p);
                  return (
                    <td key={p.id} style={{ padding: "14px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#9a3412", marginBottom: "4px" }}>
                        {vedic.mantra}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSpeakMantra(vedic.mantra)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#7c2d12",
                          background: "#fff",
                          border: "1px solid #fed7aa",
                          borderRadius: "6px",
                          cursor: "pointer"
                        }}
                        title="शुद्ध उच्चारण सुनें"
                      >
                        <Volume2 size={12} /> उच्चारण सुनें
                      </button>
                    </td>
                  );
                })}
              </tr>

              {/* Row 5: Chakra */}
              <tr style={{ borderBottom: "1px solid #f0e4d7" }}>
                <td style={{ padding: "14px 16px", fontWeight: 700, color: "#2b170d", fontSize: "13.5px" }}>
                  🌀 जाग्रत चक्र (Chakra Energy)
                </td>
                {selectedProducts.map(p => {
                  const vedic = getVedicData(p);
                  return (
                    <td key={p.id} style={{ padding: "14px 16px", textAlign: "center", fontSize: "13px", color: "#4b5563" }}>
                      {vedic.chakra}
                    </td>
                  );
                })}
              </tr>

              {/* Row 6: Key Spiritual Benefits */}
              <tr style={{ borderBottom: "1px solid #f0e4d7", background: "#fdfbf9" }}>
                <td style={{ padding: "14px 16px", fontWeight: 700, color: "#2b170d", fontSize: "13.5px" }}>
                  ✨ प्रमुख आध्यात्मिक लाभ (Benefits)
                </td>
                {selectedProducts.map(p => {
                  const vedic = getVedicData(p);
                  return (
                    <td key={p.id} style={{ padding: "14px 16px", fontSize: "13px", color: "#374151", lineHeight: "1.6", textAlign: "left" }}>
                      {vedic.benefits}
                    </td>
                  );
                })}
              </tr>

              {/* Row 7: Best For (Profession / Purpose) */}
              <tr style={{ borderBottom: "1px solid #f0e4d7" }}>
                <td style={{ padding: "14px 16px", fontWeight: 700, color: "#2b170d", fontSize: "13.5px" }}>
                  🎯 किसके लिए सर्वोत्तम (Recommended For)
                </td>
                {selectedProducts.map(p => {
                  const vedic = getVedicData(p);
                  return (
                    <td key={p.id} style={{ padding: "14px 16px", fontSize: "13px", color: "#1f2937", textAlign: "center" }}>
                      <b>{vedic.bestFor}</b>
                    </td>
                  );
                })}
              </tr>

              {/* Row 8: Origin & Authenticity */}
              <tr style={{ background: "#fffdfb" }}>
                <td style={{ padding: "14px 16px", fontWeight: 700, color: "#2b170d", fontSize: "13.5px" }}>
                  📜 उत्पत्ति व प्रमाण (Origin)
                </td>
                {selectedProducts.map(p => {
                  const vedic = getVedicData(p);
                  return (
                    <td key={p.id} style={{ padding: "14px 16px", textAlign: "center", fontSize: "12.5px", color: "#047857", fontWeight: 600 }}>
                      <ShieldCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                      {vedic.origin} • 100% Lab Certified
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom Help Callout */}
        <div style={{
          marginTop: "32px",
          background: "linear-gradient(135deg, #fefbf6 0%, #faede2 100%)",
          border: "1px solid #e8dac9",
          borderRadius: "14px",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px"
        }}>
          <div>
            <h4 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#2b170d" }}>
              क्या आप अपनी कुंडली के अनुसार सटीक रुद्राक्ष जानना चाहते हैं?
            </h4>
            <p style={{ margin: 0, fontSize: "13.5px", color: "#7a5e4e" }}>
              हमारे वैदिक पंडित जी व ऑरा एआई से निःशुल्क कुंडली विश्लेषण प्राप्त करें।
            </p>
          </div>
          <Link
            to="/rudraksha-calculator"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#9a3412",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none"
            }}
          >
            <Sparkles size={14} /> वैदिक कैलकुलेटर देखें
          </Link>
        </div>

      </div>
    </Shell>
  );
}

export default RudrakshaCompare;
