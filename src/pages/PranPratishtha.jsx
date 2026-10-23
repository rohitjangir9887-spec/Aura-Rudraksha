import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Volume2, 
  AlertTriangle, 
  Download, 
  Share2, 
  BookOpen,
  ArrowRight
} from "lucide-react";
import { emitToast } from "../context/ToastContext";

const RITUAL_STEPS = [
  {
    step: 1,
    title: "शुद्धिकरण स्नान (Purification)",
    subtitle: "गंगाजल व पंचामृत से अभिषेक",
    desc: "रुद्राक्ष को एक तांबे अथवा चांदी की थाली में रखें। सर्वप्रथम शुद्ध गंगाजल, फिर कच्चा गाय का दूध, और अंत में पुनः गंगाजल से रुद्राक्ष को स्नान कराएं। तत्पश्चात स्वच्छ वस्त्र से धीरे-धीरे पोंछें।"
  },
  {
    step: 2,
    title: "चंदन व धूप अर्पण (Offerings)",
    subtitle: "श्वेत चंदन, धूप, दीप व बेलपत्र",
    desc: "भगवान शिव के सम्मुख पूर्व अथवा उत्तर दिशा की ओर मुख करके बैठें। रुद्राक्ष पर अष्टगंध या श्वेत चंदन का तिलक लगाएं। शुद्ध घी का दीपक प्रज्वलित करें और सुगंधित धूप व श्वेत पुष्प या बेलपत्र अर्पित करें।"
  },
  {
    step: 3,
    title: "108 बीज मंत्र जप (Mantra Consecration)",
    subtitle: "प्राण ऊर्जा का संचार",
    desc: "रुद्राक्ष को अपने दाहिने हाथ में अथवा शिवलिंग के समक्ष रखकर अपने मुखी के विशिष्ट बीज मंत्र अथवा 'ॐ नमः शिवाय' का कम से कम 108 बार श्रद्धापूर्वक जप करें। इससे रुद्राक्ष में ब्रह्मांडीय ऊर्जा जाग्रत होती है।"
  },
  {
    step: 4,
    title: "धारण संकल्प (Wearing with Resolve)",
    subtitle: "शिव कृपा की प्रार्थना",
    desc: "जप पूर्ण होने के पश्चात रुद्राक्ष को भगवान शिव के चरणों अथवा शिवलिंग से स्पर्श कराएं। अपने कल्याण व मनोकामना की प्रार्थना करते हुए इसे रेशमी लाल/पीले धागे या स्वर्ण/चांदी की चेन में गले या कलाई पर धारण करें।"
  }
];

const BEEJ_MANTRAS = [
  { mukhi: "1 मुखी", mantra: "ॐ ह्रीं नमः", devanagari: "Om Hreem Namah" },
  { mukhi: "2 मुखी", mantra: "ॐ नमः", devanagari: "Om Namah" },
  { mukhi: "3 मुखी", mantra: "ॐ क्लीं नमः", devanagari: "Om Kleem Namah" },
  { mukhi: "4 मुखी", mantra: "ॐ ह्रीं नमः", devanagari: "Om Hreem Namah" },
  { mukhi: "5 मुखी", mantra: "ॐ ह्रीं हुं नमः", devanagari: "Om Hreem Hoom Namah" },
  { mukhi: "6 मुखी", mantra: "ॐ ह्रीं हुं नमः", devanagari: "Om Hreem Hoom Namah" },
  { mukhi: "7 मुखी", mantra: "ॐ हुं नमः", devanagari: "Om Hoom Namah" },
  { mukhi: "8 मुखी", mantra: "ॐ हुं नमः", devanagari: "Om Hoom Namah" },
  { mukhi: "9 मुखी", mantra: "ॐ ह्रीं हुं नमः", devanagari: "Om Hreem Hoom Namah" },
  { mukhi: "10 मुखी", mantra: "ॐ ह्रीं नमः", devanagari: "Om Hreem Namah" },
  { mukhi: "11 मुखी", mantra: "ॐ ह्रीं हुं नमः", devanagari: "Om Hreem Hoom Namah" },
  { mukhi: "12 मुखी", mantra: "ॐ क्रौं क्षौं ग्लौं नमः", devanagari: "Om Kroum Kshaum Glaum Namah" },
  { mukhi: "13 मुखी", mantra: "ॐ ह्रीं नमः", devanagari: "Om Hreem Namah" },
  { mukhi: "14 मुखी", mantra: "ॐ नमः", devanagari: "Om Namah" },
  { mukhi: "गौरी शंकर", mantra: "ॐ गौरीशंकराय नमः", devanagari: "Om Gauri-Shankaraya Namah" },
  { mukhi: "गणेश रुद्राक्ष", mantra: "ॐ गं गणपतये नमः", devanagari: "Om Gam Ganapataye Namah" }
];

export function PranPratishtha() {
  const [activeTab, setActiveTab] = useState("vidhi"); // "vidhi" | "mantras" | "rules"

  const handleSpeakMantra = (mantraText) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(mantraText);
      utterance.lang = "hi-IN";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopyVidhi = () => {
    const text = `प्राण-प्रतिष्ठा व सिद्ध धारण विधि (Aura Rudraksha):\n1. गंगाजल व पंचामृत से शुद्धिकरण स्नान कराएं।\n2. श्वेत चंदन का तिलक व धूप-दीप अर्पित करें।\n3. 'ॐ नमः शिवाय' या मुखी बीज मंत्र का 108 बार जप करें।\n4. सोमवार प्रातः काल ब्रह्म मुहूर्त में धारण करें।`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      emitToast("धारण विधि कॉपी कर ली गई है! ✨", "success");
    }
  };

  return (
    <Shell>
      <div className="pran-pratishtha-page" style={{ maxWidth: "1040px", margin: "24px auto 60px", padding: "0 16px" }}>
        
        {/* Header Banner */}
        <div style={{
          background: "linear-gradient(135deg, #2b170d 0%, #4a1d09 60%, #1a0a03 100%)",
          borderRadius: "20px",
          padding: "36px 28px",
          color: "#fff",
          textAlign: "center",
          marginBottom: "32px",
          boxShadow: "0 10px 30px rgba(43,23,13,0.18)",
          position: "relative",
          overflow: "hidden"
        }}>
          <span style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#fdba74",
            background: "rgba(253,186,116,0.15)",
            border: "1px solid rgba(253,186,116,0.3)",
            padding: "4px 14px",
            borderRadius: "20px",
            display: "inline-block",
            marginBottom: "12px",
            letterSpacing: "1px"
          }}>
            ✦ शास्त्रोक्त वैदिक विधि • AUTHENTIC VEDIC CONSECRATION
          </span>

          <h1 style={{ fontSize: "32px", fontWeight: 800, margin: "0 0 12px", fontFamily: "'Cinzel', serif" }}>
            रुद्राक्ष प्राण-प्रतिष्ठा व सिद्ध धारण विधि
          </h1>

          <p style={{ color: "#fed7aa", fontSize: "15px", maxWidth: "640px", margin: "0 auto 20px", lineHeight: "1.6" }}>
            रुद्राक्ष केवल एक मनका नहीं, साक्षात देवाधिदेव महादेव का अश्रु अंश है। जानिए घर पर सरल व शास्त्रसम्मत विधि से रुद्राक्ष को चैतन्य व सिद्ध करने की संपूर्ण प्रक्रिया।
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleCopyVidhi}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#ea580c",
                color: "#fff",
                border: "none",
                padding: "9px 18px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              <Share2 size={14} /> विधि शेयर या सेव करें
            </button>
            <Link
              to="/japa"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.25)",
                padding: "9px 18px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none"
              }}
            >
              <Sparkles size={14} /> 108 जप माला काउंटर खोलें
            </Link>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{
          display: "flex",
          gap: "8px",
          borderBottom: "2px solid #ebd8c5",
          marginBottom: "24px",
          overflowX: "auto"
        }}>
          <button
            type="button"
            onClick={() => setActiveTab("vidhi")}
            style={{
              padding: "12px 18px",
              fontSize: "14px",
              fontWeight: 700,
              color: activeTab === "vidhi" ? "#9a3412" : "#64748b",
              borderBottom: activeTab === "vidhi" ? "3px solid #ea580c" : "3px solid transparent",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap"
            }}
          >
            १. चरणबद्ध धारण विधि (Step-by-Step)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mantras")}
            style={{
              padding: "12px 18px",
              fontSize: "14px",
              fontWeight: 700,
              color: activeTab === "mantras" ? "#9a3412" : "#64748b",
              borderBottom: activeTab === "mantras" ? "3px solid #ea580c" : "3px solid transparent",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap"
            }}
          >
            २. सभी मुखी बीज मंत्र (Beeja Mantras)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            style={{
              padding: "12px 18px",
              fontSize: "14px",
              fontWeight: 700,
              color: activeTab === "rules" ? "#9a3412" : "#64748b",
              borderBottom: activeTab === "rules" ? "3px solid #ea580c" : "3px solid transparent",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap"
            }}
          >
            ३. पवित्र नियम व सावधानियां (Rules & FAQs)
          </button>
        </div>

        {/* TAB 1: Step-by-Step Vidhi */}
        {activeTab === "vidhi" && (
          <div>
            {/* Auspicious Muhurat Callout */}
            <div style={{
              background: "#fffaf5",
              border: "1px solid #fbd5b5",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              flexWrap: "wrap"
            }}>
              <div style={{ background: "#ea580c", color: "#fff", width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Clock size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: "14.5px", color: "#2b170d", display: "block" }}>
                  शुभ दिन व मुहूर्त (Auspicious Timing):
                </strong>
                <span style={{ fontSize: "13px", color: "#6e4b37" }}>
                  रुद्राक्ष धारण के लिए <b>सोमवार</b>, <b>प्रदोष व्रत</b>, <b>मासिक शिवरात्रि</b>, अथवा किसी भी शुभ शुक्ल पक्ष की तिथि में <b>ब्रह्म मुहूर्त (प्रातः 4:00 से 7:00 बजे)</b> सर्वोत्तम माना गया है।
                </span>
              </div>
            </div>

            {/* 4 Process Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {RITUAL_STEPS.map((s) => (
                <div
                  key={s.step}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #ebd8c5",
                    borderRadius: "16px",
                    padding: "22px",
                    boxShadow: "0 4px 14px rgba(43,23,13,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      background: "#7c2d12",
                      color: "#fff",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      fontSize: "13px",
                      fontWeight: 800,
                      display: "grid",
                      placeItems: "center"
                    }}>
                      {s.step}
                    </span>
                    <strong style={{ fontSize: "15px", color: "#2b170d" }}>
                      {s.title}
                    </strong>
                  </div>

                  <span style={{ fontSize: "12px", color: "#ea580c", fontWeight: 700 }}>
                    {s.subtitle}
                  </span>

                  <p style={{ fontSize: "13px", color: "#524037", lineHeight: "1.6", margin: "4px 0 0" }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Aura Consecrated Guarantee */}
            <div style={{
              marginTop: "24px",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "14px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
              <ShieldCheck size={26} color="#059669" />
              <div style={{ fontSize: "13px", color: "#065f46", lineHeight: "1.5" }}>
                <b>ऑरा रुद्राक्ष विशेषाधिकार:</b> हमारी प्रत्येक रुद्राक्ष मणि हरिद्वार व काठमांडू (पशुपतिनाथ) के विद्वान वैदिक आचार्यों द्वारा पहले से ही प्राण-प्रतिष्ठित की जाती है। आप इसे सीधे भी धारण कर सकते हैं।
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Beeja Mantras Grid */}
        {activeTab === "mantras" && (
          <div>
            <p style={{ fontSize: "14px", color: "#6e4b37", marginBottom: "16px" }}>
              प्रत्येक रुद्राक्ष का अपना एक विशिष्ट अधिष्ठाता देव व बीज मंत्र होता है। धारण के समय अथवा दैनिक जप हेतु शुद्ध उच्चारण सुनें:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "12px" }}>
              {BEEJ_MANTRAS.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #f0e1d2",
                    borderRadius: "12px",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "8px",
                    boxShadow: "0 2px 6px rgba(43,23,13,0.03)"
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#9a3412" }}>
                      {item.mukhi}
                    </span>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#2b170d", margin: "2px 0" }}>
                      {item.mantra}
                    </div>
                    <div style={{ fontSize: "11px", color: "#78716c" }}>
                      {item.devanagari}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSpeakMantra(item.mantra)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 10px",
                      background: "#fff7ed",
                      border: "1px solid #fed7aa",
                      borderRadius: "6px",
                      color: "#9a3412",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      width: "fit-content"
                    }}
                  >
                    <Volume2 size={13} /> उच्चारण सुनें
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Rules & FAQs */}
        {activeTab === "rules" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#ffffff", border: "1px solid #ebd8c5", borderRadius: "14px", padding: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#166534", margin: "0 0 10px" }}>
                ✅ क्या अवश्य करें (Do's):
              </h3>
              <ul style={{ paddingLeft: "20px", margin: 0, fontSize: "13.5px", color: "#374151", lineHeight: "1.7" }}>
                <li>प्रातः स्नान के पश्चात ही रुद्राक्ष धारण करें और कम से कम 9 बार 'ॐ नमः शिवाय' का जप करें।</li>
                <li>रुद्राक्ष को महीने में एक बार शुद्ध जल व पंचामृत से धोकर हल्का सा चंदन या बादाम तेल लगाएं ताकि दाना कभी सूखे नहीं।</li>
                <li>रुद्राक्ष को सदैव रेशम के धागे, चांदी अथवा स्वर्ण में ही पिरोकर धारण करना सर्वोत्तम है।</li>
                <li>घर में पूजा स्थान पर रुद्राक्ष रखना अत्यधिक शुभ और वास्तु दोष निवारक होता है।</li>
              </ul>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #ebd8c5", borderRadius: "14px", padding: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#991b1b", margin: "0 0 10px" }}>
                ❌ क्या न करें (Don'ts):
              </h3>
              <ul style={{ paddingLeft: "20px", margin: 0, fontSize: "13.5px", color: "#374151", lineHeight: "1.7" }}>
                <li>शमशान भूमि अथवा शव यात्रा में जाते समय रुद्राक्ष उतारकर पवित्र स्थान पर रख दें।</li>
                <li>मांसाहार अथवा मदिरा का सेवन करते समय रुद्राक्ष धारण न करें।</li>
                <li>अपना पहना हुआ रुद्राक्ष किसी अन्य व्यक्ति को न दें और न ही किसी दूसरे का पहना हुआ रुद्राक्ष धारण करें।</li>
                <li>रुद्राक्ष पर कभी भी कृत्रिम साबुन, शैम्पू अथवा केमिकल युक्त इत्र का प्रयोग न करें।</li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}

export default PranPratishtha;
