import React, { useState, useEffect } from "react";
import { X, HeartHandshake, Hash, Calendar, Compass, Sparkles, Search, Sun, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { auraAiClient } from "../lib/auraAiClient";

const MUKHI_1_TO_21_DATA = [
  { num: 1, name: "1 मुखी (Ek Mukhi)", deity: "भगवान शिव (परमशिव)", planet: "सूर्य (Sun)", chakra: "सहस्रार", mantra: "ॐ ह्रीं नमः", benefit: "आत्मबल, नेतृत्व, मोक्ष, एकाग्रता व उच्च सम्मान" },
  { num: 2, name: "2 मुखी (Do Mukhi)", deity: "अर्धनारीश्वर (शिव-पार्वती)", planet: "चंद्र (Moon)", chakra: "स्वाधिष्ठान", mantra: "ॐ नमः", benefit: "मानसिक शांति, दांपत्य सुख व विवाह सामंजस्य" },
  { num: 3, name: "3 मुखी (Teen Mukhi)", deity: "अग्नि देव", planet: "मंगल (Mars)", chakra: "मणिपुर", mantra: "ॐ क्लीं नमः", benefit: "आलस्य नाश, ऊर्जा, पाचन व मांगलिक दोष शांति" },
  { num: 4, name: "4 मुखी (Chaar Mukhi)", deity: "ब्रह्मा जी", planet: "बुध (Mercury)", chakra: "विशुद्ध", mantra: "ॐ ह्रीं नमः", benefit: "विद्या, तीव्र बुद्धि, स्मरण शक्ति व वाणी कौशल" },
  { num: 5, name: "5 मुखी (Paanch Mukhi)", deity: "कालाग्नि रुद्र", planet: "बृहस्पति (Jupiter)", chakra: "हृदय / सार्वभौमिक", mantra: "ॐ ह्रीं नमः", benefit: "मानसिक शांति, रक्तचाप संतुलन, स्वास्थ्य व सर्वकल्याण" },
  { num: 6, name: "6 मुखी (Chhe Mukhi)", deity: "भगवान कार्तिकेय", planet: "शुक्र (Venus)", chakra: "स्वाधिष्ठान", mantra: "ॐ ह्रीं हुं नमः", benefit: "इच्छाशक्ति, साहस, आकर्षण व कला/व्यापार वृद्धि" },
  { num: 7, name: "7 मुखी (Saat Mukhi)", deity: "माता महालक्ष्मी", planet: "शनि / शुक्र", chakra: "मणिपुर", mantra: "ॐ हुं नमः", benefit: "धन वृद्धि, व्यापार सफलता, कर्ज मुक्ति व शनि शांति" },
  { num: 8, name: "8 मुखी (Aath Mukhi)", deity: "भगवान श्री गणेश", planet: "राहु (Rahu)", chakra: "मूलाधार", mantra: "ॐ हुं नमः", benefit: "सर्व विघ्न निवारण, बुद्धि व राहु कालसर्प शांति" },
  { num: 9, name: "9 मुखी (Nau Mukhi)", deity: "माँ नवदुर्गा", planet: "केतु (Ketu)", chakra: "सहस्रार", mantra: "ॐ ह्रीं हुं नमः", benefit: "शत्रु भय मुक्ति, साहस, असीम शक्ति व देवी कृपा" },
  { num: 10, name: "10 मुखी (Das Mukhi)", deity: "भगवान श्री हरि विष्णु", planet: "नवग्रह शांति (दसों दिशाएं)", chakra: "समस्त चक्र", mantra: "ॐ ह्रीं नमः", benefit: "रक्षा कवच, नकारात्मक ऊर्जा व वास्तु/नजर दोष निवारण" },
  { num: 11, name: "11 मुखी (Gyarah Mukhi)", deity: "एकादश रुद्र (हनुमान जी)", planet: "मंगल / शनि", chakra: "विशुद्ध", mantra: "ॐ ह्रीं हुं नमः", benefit: "अदम्य साहस, भयमुक्ति, ध्यान व संकट निवारण" },
  { num: 12, name: "12 मुखी (Barah Mukhi)", deity: "द्वादश आदित्य (सूर्य देव)", planet: "सूर्य (Sun)", chakra: "मणिपुर", mantra: "ॐ क्रौं क्षौं रौं नमः", benefit: "तेज, यश, राजयोग, प्रशासनिक व उच्च पद प्राप्ति" },
  { num: 13, name: "13 मुखी (Terah Mukhi)", deity: "कामदेव व देवराज इंद्र", planet: "शुक्र (Venus)", chakra: "अनाहत / स्वाधिष्ठान", mantra: "ॐ ह्रीं नमः", benefit: "आकर्षण, मान-सम्मान, ऐश्वर्य व इच्छा पूर्ति" },
  { num: 14, name: "14 मुखी (देवमणि)", deity: "भगवान शिव व हनुमान जी", planet: "शनि (Saturn)", chakra: "आज्ञा (Third Eye)", mantra: "ॐ नमः", benefit: "आज्ञा चक्र जाग्रति, सटीक निर्णय व परम सुरक्षा" },
  { num: 15, name: "15 मुखी", deity: "भगवान पशुपतिनाथ", planet: "बुध (Mercury)", chakra: "अनाहत (Heart)", mantra: "ॐ पशुपतये नमः", benefit: "हृदय चक्र शुद्धि, करुणा व दीर्घकालिक समृद्धि" },
  { num: 16, name: "16 मुखी (जय रुद्राक्ष)", deity: "महामृत्युंजय शिव", planet: "चंद्र (Moon)", chakra: "हृदय / रक्षा", mantra: "ॐ ह्रीं हुं नमः", benefit: "सर्वत्र विजय, भयनाश व स्वास्थ्य रक्षा" },
  { num: 17, name: "17 मुखी", deity: "माता कात्यायनी व विश्वकर्मा", planet: "शनि (Saturn)", chakra: "आज्ञा / मणिपुर", mantra: "ॐ कात्यायन्यै नमः", benefit: "अकस्मात धन व संपत्ति प्राप्ति" },
  { num: 18, name: "18 मुखी (भूमि रुद्राक्ष)", deity: "माता भूमि देवी", planet: "मंगल / पृथ्वी", chakra: "मूलाधार", mantra: "ॐ ह्रीं श्रीं वसुन्धरायै नमः", benefit: "भूमि, भवन, रियल एस्टेट व निर्माण सफलता" },
  { num: 19, name: "19 मुखी", deity: "भगवान नारायण व महालक्ष्मी", planet: "बुध (Mercury)", chakra: "मणिपुर", mantra: "ॐ वं विष्णवे नमः", benefit: "अतुलनीय समृद्धि व व्यावसायिक उन्नति" },
  { num: 20, name: "20 मुखी", deity: "भगवान ब्रह्मा", planet: "पृथ्वी व गुरु", chakra: "सहस्रार", mantra: "ॐ ह्रीं ब्रह्माय नमः", benefit: "असीम ज्ञान, रचनात्मकता व आध्यात्मिक उत्थान" },
  { num: 21, name: "21 मुखी (कुबेर रुद्राक्ष)", deity: "भगवान कुबेर", planet: "समस्त नवग्रह", chakra: "सर्व चक्र", mantra: "ॐ यक्षाय कुबेराय नमः", benefit: "कुबेर खजाना, अपार वैभव व सर्व बाधा नाश" }
];

const SPECIAL_BANDHS_DATA = [
  {
    name: "गौरी शंकर रुद्राक्ष (Gauri Shankar)",
    combo: "प्राकृतिक रूप से जुड़े दो रुद्राक्ष (शिव-पार्वती)",
    focus: "शीघ्र विवाह, अटूट दांपत्य प्रेम व पारिवारिक सुख",
    query: "गौरी शंकर रुद्राक्ष के लाभ, मंत्र और धारण विधि विस्तार से बताएं।"
  },
  {
    name: "सरस्वती विद्या बंध (Students Combo)",
    combo: "4 मुखी + 6 मुखी + गणेश रुद्राक्ष",
    focus: "विद्या, एकाग्रता, परीक्षा सफलता व वाणी कौशल",
    query: "सरस्वती विद्या बंध (4+6 मुखी व गणेश रुद्राक्ष) विद्यार्थियों के लिए कैसे काम करता है?"
  },
  {
    name: "महालक्ष्मी धन व व्यापार बंध",
    combo: "7 मुखी + 8 मुखी + 12 मुखी",
    focus: "व्यापार विस्तार, ऋण मुक्ति, आर्थिक स्थिरता व नेतृत्व",
    query: "महालक्ष्मी धन बंध (7+8+12 मुखी रुद्राक्ष) व्यापार व धन वृद्धि के लिए कैसे धारण करें?"
  },
  {
    name: "शनि-राहु सुरक्षा कवच (Sade Sati Shield)",
    combo: "7 मुखी + 8 मुखी + 10 मुखी (या 14 मुखी देवमणि)",
    focus: "शनि साढ़े साती, ढैया, राहु दोष व नजर बाधा से रक्षा",
    query: "शनि साढ़े साती, राहु कालसर्प व रक्षा कवच के लिए कौन से रुद्राक्ष और लाल किताब उपाय श्रेष्ठ हैं?"
  },
  {
    name: "आरोग्य व मानसिक शांति बंध",
    combo: "2 मुखी + 3 मुखी + 5 मुखी",
    focus: "तनाव मुक्ति, रक्तचाप संतुलन, ऊर्जा व शांति",
    query: "मानसिक शांति, तनाव मुक्ति व स्वास्थ्य के लिए 2+3+5 मुखी रुद्राक्ष का महत्व समझाएं।"
  }
];

const CHAKRA_LIST = [
  { chakra: "1. मूलाधार (Root Chakra)", mukhi: "8 मुखी व गणेश रुद्राक्ष", element: "पृथ्वी", mantra: "लं (ॐ हुं नमः)" },
  { chakra: "2. स्वाधिष्ठान (Sacral Chakra)", mukhi: "2 मुखी, 6 मुखी व गौरी शंकर", element: "जल", mantra: "वं (ॐ ह्रीं हुं नमः)" },
  { chakra: "3. मणिपुर (Solar Plexus)", mukhi: "3 मुखी, 7 मुखी व 12 मुखी", element: "अग्नि", mantra: "रं (ॐ क्लीं नमः)" },
  { chakra: "4. अनाहत (Heart Chakra)", mukhi: "5 मुखी व 15 मुखी", element: "वायु", mantra: "यं (ॐ ह्रीं नमः)" },
  { chakra: "5. विशुद्ध (Throat Chakra)", mukhi: "4 मुखी व 11 मुखी", element: "आकाश", mantra: "हं (ॐ ह्रीं नमः)" },
  { chakra: "6. आज्ञा (Third Eye Chakra)", mukhi: "14 मुखी देवमणि व 17 मुखी", element: "मन/प्रकाश", mantra: "ॐ (ॐ नमः)" },
  { chakra: "7. सहस्रार (Crown Chakra)", mukhi: "1 मुखी, 9 मुखी व 20 मुखी", element: "चेतना", mantra: "ॐ अहं ब्रह्मास्मि" }
];

export function PanditJiVedicTools({
  isOpen,
  onClose,
  onAskPanditJi,
  defaultBirthDetails = null,
  initialTab = "milan"
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // 1. Kundali Milan state
  const [boyForm, setBoyForm] = useState({
    name: defaultBirthDetails?.name || "",
    dob: defaultBirthDetails?.dob || "1996-05-14",
    birthTime: defaultBirthDetails?.birthTime || "09:30",
    birthPlace: defaultBirthDetails?.birthPlace || "Jaipur, India"
  });
  const [girlForm, setGirlForm] = useState({
    name: "",
    dob: "1998-11-22",
    birthTime: "11:15",
    birthPlace: "Delhi, India"
  });
  const [milanResult, setMilanResult] = useState(null);
  const [milanLoading, setMilanLoading] = useState(false);
  const [milanError, setMilanError] = useState("");

  // 2. Numerology state
  const [numForm, setNumForm] = useState({
    name: defaultBirthDetails?.name || "",
    dob: defaultBirthDetails?.dob || "1995-08-15"
  });
  const [numResult, setNumResult] = useState(null);
  const [numLoading, setNumLoading] = useState(false);

  // 3. Panchang state
  const todayIso = new Date().toISOString().slice(0, 10);
  const [panchangDate, setPanchangDate] = useState(todayIso);
  const [panchangPlace, setPanchangPlace] = useState(defaultBirthDetails?.birthPlace || "Varanasi, India");
  const [panchangData, setPanchangData] = useState(null);
  const [panchangLoading, setPanchangLoading] = useState(false);

  // 4. Mukhi / Encyclopedia filter state
  const [mukhiSearch, setMukhiSearch] = useState("");
  const [encySection, setEncySection] = useState("mukhi"); // "mukhi" | "bandh" | "chakra" | "care"

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (isOpen && activeTab === "panchang" && !panchangData) {
      loadPanchang(panchangDate, panchangPlace);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleMilanSubmit = async (e) => {
    e.preventDefault();
    setMilanError("");
    if (!boyForm.dob || !girlForm.dob) {
      setMilanError("कृपया वर और कन्या दोनों की जन्म तिथि (DOB) चुनें।");
      return;
    }
    setMilanLoading(true);
    const res = await auraAiClient.calculateKundaliMilan({ boy: boyForm, girl: girlForm });
    setMilanLoading(false);
    if (res.success && res.data) {
      setMilanResult(res.data);
    } else {
      setMilanError(res.message || "गुण मिलान गणना में त्रुटि आई।");
    }
  };

  const handleNumerologySubmit = async (e) => {
    e.preventDefault();
    if (!numForm.dob) return;
    setNumLoading(true);
    const res = await auraAiClient.calculateNumerology(numForm);
    setNumLoading(false);
    if (res.success && res.data) {
      setNumResult(res.data);
    }
  };

  const loadPanchang = async (dateVal = panchangDate, placeVal = panchangPlace) => {
    setPanchangLoading(true);
    const res = await auraAiClient.getDailyPanchang(dateVal, placeVal);
    setPanchangLoading(false);
    if (res.success && res.data) {
      setPanchangData(res.data);
    }
  };

  const askInChat = (promptText) => {
    if (onAskPanditJi) {
      onAskPanditJi(promptText);
    }
    onClose?.();
  };

  const filteredMukhis = MUKHI_1_TO_21_DATA.filter((m) => {
    if (!mukhiSearch.trim()) return true;
    const q = mukhiSearch.toLowerCase();
    return (
      String(m.num).includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.deity.toLowerCase().includes(q) ||
      m.planet.toLowerCase().includes(q) ||
      m.benefit.toLowerCase().includes(q) ||
      m.chakra.toLowerCase().includes(q)
    );
  });

  const tabs = [
    { id: "milan", label: "गुण मिलान (36)", icon: HeartHandshake },
    { id: "numerology", label: "अंक ज्योतिष", icon: Hash },
    { id: "panchang", label: "पंचांग व मुहूर्त", icon: Calendar },
    { id: "rudraksha", label: "1-21 मुखी ज्ञानकोश", icon: Compass }
  ];

  return (
    <div
      className="fixed inset-0 z-[20050] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-2xl bg-[#fdfaf5] border border-[#dfc9aa] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#2b1408]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#8c2b10] to-[#5a1a09] text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles size={18} className="text-amber-300 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold tracking-wide truncate">
                AI पंडित जी — वैदिक ज्योतिष एवं रुद्राक्ष टूल्स
              </h3>
              <p className="text-[11px] text-amber-100/85 truncate">
                अष्टकूट गुण मिलान · मूलांक/भाग्यांक · लाइव पंचांग · 1-21 मुखी विश्वकोश
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-amber-100 shrink-0"
            aria-label="Close Vedic Tools"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#f7efe2] border-b border-[#e5d2b8] overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-[#8c2b10] text-white shadow-sm"
                    : "bg-white text-[#5c2a0c] hover:bg-[#fff6e5] border border-[#e2cbb0]"
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: ASHTAKOOTA KUNDALI MILAN */}
          {activeTab === "milan" && (
            <div className="space-y-4">
              <div className="text-xs text-[#6a3a1a] bg-[#fbf4e6] px-3 py-2 rounded-lg">
                वर और कन्या की जन्म तिथि, समय व स्थान के आधार पर सटीक <strong>36-गुण अष्टकूट मिलान</strong>, मांगलिक विचार व नाड़ी परीक्षण प्राप्त करें।
              </div>

              <form onSubmit={handleMilanSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Boy Details */}
                  <div className="p-3 bg-white rounded-xl border border-[#e6d5be] space-y-2">
                    <div className="text-xs font-bold text-[#8c2b10]">👨 वर का विवरण (Groom)</div>
                    <input
                      type="text"
                      placeholder="वर का नाम"
                      value={boyForm.name}
                      onChange={(e) => setBoyForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#fbf7ee] border border-[#dfc9aa] rounded-lg outline-none focus:border-[#8c2b10]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={boyForm.dob}
                        onChange={(e) => setBoyForm((p) => ({ ...p, dob: e.target.value }))}
                        required
                        className="w-full px-2 py-1.5 text-xs bg-[#fbf7ee] border border-[#dfc9aa] rounded-lg outline-none focus:border-[#8c2b10]"
                      />
                      <input
                        type="time"
                        value={boyForm.birthTime}
                        onChange={(e) => setBoyForm((p) => ({ ...p, birthTime: e.target.value }))}
                        className="w-full px-2 py-1.5 text-xs bg-[#fbf7ee] border border-[#dfc9aa] rounded-lg outline-none focus:border-[#8c2b10]"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="जन्म शहर (जैसे Jaipur)"
                      value={boyForm.birthPlace}
                      onChange={(e) => setBoyForm((p) => ({ ...p, birthPlace: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#fbf7ee] border border-[#dfc9aa] rounded-lg outline-none focus:border-[#8c2b10]"
                    />
                  </div>

                  {/* Girl Details */}
                  <div className="p-3 bg-white rounded-xl border border-[#e6d5be] space-y-2">
                    <div className="text-xs font-bold text-[#8c2b10]">👩 कन्या का विवरण (Bride)</div>
                    <input
                      type="text"
                      placeholder="कन्या का नाम"
                      value={girlForm.name}
                      onChange={(e) => setGirlForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#fbf7ee] border border-[#dfc9aa] rounded-lg outline-none focus:border-[#8c2b10]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={girlForm.dob}
                        onChange={(e) => setGirlForm((p) => ({ ...p, dob: e.target.value }))}
                        required
                        className="w-full px-2 py-1.5 text-xs bg-[#fbf7ee] border border-[#dfc9aa] rounded-lg outline-none focus:border-[#8c2b10]"
                      />
                      <input
                        type="time"
                        value={girlForm.birthTime}
                        onChange={(e) => setGirlForm((p) => ({ ...p, birthTime: e.target.value }))}
                        className="w-full px-2 py-1.5 text-xs bg-[#fbf7ee] border border-[#dfc9aa] rounded-lg outline-none focus:border-[#8c2b10]"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="जन्म शहर (जैसे Delhi)"
                      value={girlForm.birthPlace}
                      onChange={(e) => setGirlForm((p) => ({ ...p, birthPlace: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#fbf7ee] border border-[#dfc9aa] rounded-lg outline-none focus:border-[#8c2b10]"
                    />
                  </div>
                </div>

                {milanError && (
                  <div className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-lg">{milanError}</div>
                )}

                <button
                  type="submit"
                  disabled={milanLoading}
                  className="w-full py-2.5 bg-[#8c2b10] hover:bg-[#6f200a] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors"
                >
                  {milanLoading ? "अष्टकूट गणना हो रही है..." : "💞 36-गुण कुंडली मिलान निकालें"}
                </button>
              </form>

              {milanResult && (
                <div className="space-y-3 pt-2 border-t border-[#e5d2b8]">
                  {/* Summary Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-[#e2cbb0]">
                    <div>
                      <div className="text-xs text-[#78350f] font-semibold">
                        {milanResult.boy.name} ({milanResult.boy.rashi}) · {milanResult.girl.name} ({milanResult.girl.rashi})
                      </div>
                      <div className="text-base font-extrabold mt-0.5" style={{ color: milanResult.verdictColor }}>
                        {milanResult.totalScore} / 36 गुण ({milanResult.percentage}%) — {milanResult.verdict}
                      </div>
                      <div className="text-[11px] text-[#5c3014] mt-1">{milanResult.manglikStatus}</div>
                    </div>
                  </div>

                  {/* 8 Kootas Clean List */}
                  <div className="bg-white rounded-xl border border-[#e6d5be] divide-y divide-[#f1e5d2]">
                    {milanResult.kootas.map((k, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div>
                          <span className="font-bold text-[#3f1d0b]">{k.name}</span>
                          <span className="text-[11px] text-[#7c5338] ml-2">{k.meaning}</span>
                        </div>
                        <span className="font-bold text-[#8c2b10] shrink-0">
                          {k.obtained} / {k.max}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Remedies */}
                  <div className="bg-[#fbf4e6] rounded-xl p-3 space-y-1 text-xs text-[#4a2610]">
                    <div className="font-bold text-[#8c2b10] mb-1">📿 शास्त्रीय वैवाहिक व रुद्राक्ष उपाय:</div>
                    {milanResult.recommendedRemedies.map((r, idx) => (
                      <div key={idx}>• {r}</div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      askInChat(
                        `वर ${milanResult.boy.name} (${milanResult.boy.dob}, राशि: ${milanResult.boy.rashi}, नक्षत्र: ${milanResult.boy.nakshatra}) और कन्या ${milanResult.girl.name} (${milanResult.girl.dob}, राशि: ${milanResult.girl.rashi}, नक्षत्र: ${milanResult.girl.nakshatra}) का गुण मिलान ${milanResult.totalScore}/36 आया है (${milanResult.manglikStatus})। कृपया इस विवाह मिलान, नाड़ी/भकूट स्थिति व गौरी शंकर रुद्राक्ष उपाय पर विस्तृत परामर्श दें।`
                      )
                    }
                    className="w-full py-2 bg-[#fef3c7] hover:bg-[#fde68a] text-[#78350f] border border-[#d97706] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <span>पंडित जी से इस मिलान पर विस्तार से पूछें</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VEDIC NUMEROLOGY */}
          {activeTab === "numerology" && (
            <div className="space-y-4">
              <div className="text-xs text-[#6a3a1a] bg-[#fbf4e6] px-3 py-2 rounded-lg">
                अपनी जन्म तिथि और नाम से अपना <strong>मूलांक (Mulank)</strong>, <strong>भाग्यांक (Bhagyank)</strong>, <strong>चैल्डियन नामांक</strong>, शुभ रंग, शुभ दिन और उपयुक्त सिद्ध रुद्राक्ष जानें।
              </div>

              <form onSubmit={handleNumerologySubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-[#5c2a0c] mb-1">आपका नाम (Optional)</label>
                  <input
                    type="text"
                    placeholder="जैसे Rahul Sharma"
                    value={numForm.name}
                    onChange={(e) => setNumForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#dfc9aa] rounded-lg outline-none focus:border-[#8c2b10]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5c2a0c] mb-1">जन्म तिथि (DOB)</label>
                  <input
                    type="date"
                    value={numForm.dob}
                    onChange={(e) => setNumForm((p) => ({ ...p, dob: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#dfc9aa] rounded-lg outline-none focus:border-[#8c2b10]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={numLoading}
                  className="py-2 px-4 bg-[#8c2b10] hover:bg-[#6f200a] text-white text-xs font-bold rounded-lg transition-colors"
                >
                  {numLoading ? "गणना..." : "🔢 अंक फल देखें"}
                </button>
              </form>

              {numResult && (
                <div className="space-y-3 pt-2 border-t border-[#e5d2b8]">
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-3 bg-white rounded-xl border border-[#e6d5be]">
                      <div className="text-[11px] text-[#78350f]">मूलांक (Mulank)</div>
                      <div className="text-2xl font-extrabold text-[#8c2b10] mt-0.5">{numResult.mulank}</div>
                      <div className="text-[11px] font-semibold text-[#5c2a0c]">{numResult.mulankProfile?.planet}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#e6d5be]">
                      <div className="text-[11px] text-[#78350f]">भाग्यांक (Destiny)</div>
                      <div className="text-2xl font-extrabold text-[#8c2b10] mt-0.5">{numResult.bhagyank}</div>
                      <div className="text-[11px] font-semibold text-[#5c2a0c]">{numResult.bhagyankProfile?.planet}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#e6d5be]">
                      <div className="text-[11px] text-[#78350f]">नामांक (Namank)</div>
                      <div className="text-2xl font-extrabold text-[#8c2b10] mt-0.5">{numResult.namank}</div>
                      <div className="text-[11px] font-semibold text-[#5c2a0c]">कुल योग: {numResult.nameCompoundTotal}</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-[#e6d5be] p-3 space-y-2 text-xs text-[#3f1d0b]">
                    <div><strong>✨ स्वभाव व करियर दिशा:</strong> {numResult.mulankProfile?.traits} — <em>({numResult.mulankProfile?.bestCareers})</em></div>
                    <div><strong>🎨 शुभ रंग:</strong> {numResult.luckyColors} · <strong>📅 शुभ दिन:</strong> {numResult.luckyDays} · <strong>🔢 शुभ अंक:</strong> {numResult.luckyNumbers}</div>
                    <div><strong>📿 मुख्य सिद्ध रुद्राक्ष:</strong> <span className="font-bold text-[#8c2b10]">{numResult.primaryRudraksha}</span> · <strong>पूरक:</strong> {numResult.supportRudraksha}</div>
                    <div><strong>🕉️ बीज मंत्र:</strong> <code className="bg-[#fbf4e6] px-2 py-0.5 rounded font-semibold">{numResult.beejMantra}</code></div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      askInChat(
                        `मेरा अंक ज्योतिष विश्लेषण: नाम ${numResult.name}, DOB ${numResult.dob}, मूलांक ${numResult.mulank} (${numResult.mulankProfile?.planet}), भाग्यांक ${numResult.bhagyank}, नामांक ${numResult.namank}। कृपया मेरे लिए करियर, धन और ${numResult.primaryRudraksha} के लाभ विस्तार से बताएं।`
                      )
                    }
                    className="w-full py-2 bg-[#fef3c7] hover:bg-[#fde68a] text-[#78350f] border border-[#d97706] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <span>अंक ज्योतिष पर पंडित जी से विस्तार से बात करें</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DAILY VEDIC PANCHANG */}
          {activeTab === "panchang" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-[#5c2a0c] mb-1">तिथि चुनें (Date)</label>
                  <input
                    type="date"
                    value={panchangDate}
                    onChange={(e) => setPanchangDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#dfc9aa] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5c2a0c] mb-1">स्थान (City)</label>
                  <input
                    type="text"
                    value={panchangPlace}
                    onChange={(e) => setPanchangPlace(e.target.value)}
                    placeholder="Varanasi, India"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#dfc9aa] rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => loadPanchang(panchangDate, panchangPlace)}
                  disabled={panchangLoading}
                  className="py-2 px-4 bg-[#8c2b10] hover:bg-[#6f200a] text-white text-xs font-bold rounded-lg"
                >
                  {panchangLoading ? "लोड हो रहा..." : "🌞 पंचांग देखें"}
                </button>
              </div>

              {panchangData && (
                <div className="space-y-3">
                  <div className="bg-white rounded-xl border border-[#e6d5be] p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-[#f0e3cf] pb-2">
                      <span className="font-bold text-sm text-[#8c2b10]">
                        📅 {panchangData.dateFormatted} · {panchangData.panchanga?.vaar}
                      </span>
                      <span className="text-[11px] text-[#78350f] font-semibold">
                        स्वामी: {panchangData.panchanga?.vaarLord}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div><strong>🌙 तिथि:</strong> {panchangData.panchanga?.tithi}</div>
                      <div><strong>✨ नक्षत्र:</strong> {panchangData.nakshatra?.hindi} (पद {panchangData.nakshatra?.pada})</div>
                      <div><strong>🔮 योग:</strong> {panchangData.panchanga?.yoga}</div>
                      <div><strong>⚡ करण:</strong> {panchangData.panchanga?.karana}</div>
                      <div><strong>🌜 चंद्र राशि:</strong> {panchangData.moonRashi}</div>
                      <div><strong>☀️ सूर्य राशि:</strong> {panchangData.sunRashi}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl text-[#14532d]">
                      <div className="font-bold flex items-center gap-1.5"><Sun size={13} /> शुभ अभिजीत व ब्रह्म मुहूर्त</div>
                      <div className="mt-1">• <strong>अभिजीत मुहूर्त:</strong> {panchangData.abhijitMuhurat}</div>
                      <div>• <strong>ब्रह्म मुहूर्त:</strong> {panchangData.brahmaMuhurat}</div>
                    </div>
                    <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#7f1d1d]">
                      <div className="font-bold flex items-center gap-1.5"><AlertTriangle size={13} /> राहुकाल (अशुभ समय)</div>
                      <div className="mt-1 font-semibold">{panchangData.rahuKaal}</div>
                      <div className="text-[11px] opacity-85">इस समय नए शुभ कार्य या बड़ी खरीद टालना श्रेष्ठ है।</div>
                    </div>
                  </div>

                  <div className="bg-[#fbf4e6] rounded-xl p-3 text-xs text-[#4a2610] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div><strong>📿 आज का विशेष रुद्राक्ष:</strong> {panchangData.dailyRudraksha}</div>
                      <div><strong>🕉️ आज का जप मंत्र:</strong> <code className="font-bold">{panchangData.dailyMantra}</code></div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        askInChat(
                          `आज ${panchangData.dateFormatted} (${panchangData.panchanga?.vaar}, ${panchangData.panchanga?.tithi}, ${panchangData.nakshatra?.hindi} नक्षत्र) के शुभ मुहूर्त, पूजन विधि और ${panchangData.dailyRudraksha} के लाभ के बारे में मार्गदर्शन दें।`
                        )
                      }
                      className="px-3 py-1.5 bg-[#8c2b10] text-white font-bold rounded-lg shrink-0"
                    >
                      चैट में पूछें
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: 1-21 MUKHI, CHAKRAS, BANDHS & AUTHENTICITY */}
          {activeTab === "rudraksha" && (
            <div className="space-y-3">
              {/* Sub-section Selector */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "mukhi", label: "1 से 21 मुखी" },
                  { id: "bandh", label: "सिद्ध बंध कॉम्बो" },
                  { id: "chakra", label: "7 चक्र संतुलन" },
                  { id: "care", label: "नेपाल vs इंडोनेशिया व नियम" }
                ].map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setEncySection(sec.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      encySection === sec.id
                        ? "bg-[#78350f] text-white"
                        : "bg-white text-[#5c2a0c] border border-[#dfc9aa] hover:bg-[#fbf4e6]"
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>

              {encySection === "mukhi" && (
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c5a3c]" />
                    <input
                      type="text"
                      value={mukhiSearch}
                      onChange={(e) => setMukhiSearch(e.target.value)}
                      placeholder="मुखी नंबर, ग्रह (शनि/राहु/बुध), या लाभ खोजें (जैसे 7, लक्ष्मी, मंगल)..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#dfc9aa] rounded-lg outline-none focus:border-[#8c2b10]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredMukhis.map((m) => (
                      <div key={m.num} className="p-2.5 bg-white border border-[#e6d5be] rounded-xl text-xs flex flex-col justify-between gap-1.5">
                        <div>
                          <div className="font-bold text-[#8c2b10]">{m.name}</div>
                          <div className="text-[11px] text-[#6b3a1a] mt-0.5">
                            {m.deity} · ग्रह: <strong>{m.planet}</strong>
                          </div>
                          <div className="text-[11px] text-[#3f1d0b] mt-1">{m.benefit}</div>
                          <div className="text-[10.5px] text-[#78350f] mt-1">
                            मंत्र: <code>{m.mantra}</code> · चक्र: {m.chakra}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => askInChat(`${m.num} मुखी रुद्राक्ष के संपूर्ण शास्त्रीय लाभ, धारण विधि, बीज मंत्र और किस राशि/लग्न को धारण करना चाहिए, विस्तार से बताएं।`)}
                          className="self-start text-[11px] font-bold text-[#8c2b10] hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <span>पंडित जी से पूछें</span>
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {encySection === "bandh" && (
                <div className="space-y-2">
                  {SPECIAL_BANDHS_DATA.map((b, idx) => (
                    <div key={idx} className="p-3 bg-white border border-[#e6d5be] rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-[#8c2b10]">{b.name}</div>
                        <div className="text-[11px] font-semibold text-[#5c2a0c] mt-0.5">संयोजन: {b.combo}</div>
                        <div className="text-[11px] text-[#6b3a1a] mt-0.5">उद्देश्य: {b.focus}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => askInChat(b.query)}
                        className="px-3 py-1.5 bg-[#fef3c7] hover:bg-[#fde68a] text-[#78350f] border border-[#d97706] font-bold rounded-lg shrink-0"
                      >
                        विस्तार देखें
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {encySection === "chakra" && (
                <div className="bg-white border border-[#e6d5be] rounded-xl divide-y divide-[#f1e5d2]">
                  {CHAKRA_LIST.map((c, idx) => (
                    <div key={idx} className="p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div>
                        <div className="font-bold text-[#8c2b10]">{c.chakra} <span className="text-[11px] font-normal text-[#78350f]">({c.element} तत्व)</span></div>
                        <div className="text-[11px] text-[#3f1d0b]">रुद्राक्ष: <strong>{c.mukhi}</strong> · बीज मंत्र: <code>{c.mantra}</code></div>
                      </div>
                      <button
                        type="button"
                        onClick={() => askInChat(`${c.chakra} को जागृत व संतुलित करने के लिए ${c.mukhi} कैसे धारण करें और कौन सा ध्यान/मंत्र करें?`)}
                        className="text-[11px] font-bold text-[#8c2b10] hover:underline self-start sm:self-center shrink-0"
                      >
                        पूछें →
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {encySection === "care" && (
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-white border border-[#e6d5be] rounded-xl space-y-1.5">
                    <div className="font-bold text-[#8c2b10]">🏔️ नेपाली बनाम इंडोनेशियन रुद्राक्ष</div>
                    <div>• <strong>नेपाली (Nepali):</strong> बड़े दाने (16–26mm), गहरी प्राकृतिक धारियाँ (सीधी व स्पष्ट), शीघ्र आध्यात्मिक प्रभाव।</div>
                    <div>• <strong>इंडोनेशियन (Java):</strong> छोटे गोल दाने (6–14mm), हल्के वजन व 108 माला या ब्रेसलेट के लिए उत्तम।</div>
                  </div>
                  <div className="p-3 bg-white border border-[#e6d5be] rounded-xl space-y-1.5">
                    <div className="font-bold text-[#8c2b10]">🔬 असली व नकली की वैज्ञानिक परीक्षा (X-Ray Truth)</div>
                    <div>• असली रुद्राक्ष के अंदर जितने मुखी बाहर दिखते हैं, उतने ही प्राकृतिक बीज कक्ष (Seed Chambers) X-Ray स्कैन में दिखते हैं।</div>
                    <div>• पानी में डूबना (Water Sink Test) कोई पक्का प्रमाण नहीं है — कच्चा या तेल युक्त रुद्राक्ष तैर भी सकता है। लैब सर्टिफिकेट + X-Ray ही सच्ची पहचान है।</div>
                  </div>
                  <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl space-y-1 text-[#14532d]">
                    <div className="font-bold flex items-center gap-1.5"><CheckCircle2 size={13} /> प्राण-प्रतिष्ठा व दैनिक नियम</div>
                    <div>1. गंगाजल व कच्चे दूध से स्नान कर `ॐ नमः शिवाय` के 108 जप से शुद्ध करें।</div>
                    <div>2. लाल/पीले रेशमी धागे, चाँदी या सोने में धारण करें।</div>
                    <div>3. साबुन/शैम्पू से बचाएं, श्मशान या रात्रि शयन के समय उतार कर स्वच्छ पूजा स्थान पर रखें व माह में एक बार हल्का तिल/चंदन तेल लगाएं।</div>
                    <button
                      type="button"
                      onClick={() => askInChat("नेपाली और इंडोनेशियन रुद्राक्ष में अंतर, X-Ray लैब जांच, प्राण-प्रतिष्ठा विधि व धारण करने के सभी शास्त्रीय नियम विस्तार से समझाएं।")}
                      className="mt-1 inline-flex items-center gap-1 font-bold text-[#15803d] hover:underline"
                    >
                      पूरी विधि पंडित जी से पूछें →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
