import React from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useSeo } from "../hooks/useSeo";
import { 
  Flame, 
  ArrowLeftRight, 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Compass, 
  CheckCircle2, 
  Award,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

const VEDIC_TOOLS = [
  {
    id: "japa",
    badge: "✦ डिजिटल साधना टूल",
    title: "108 दैनिक जप माला",
    subtitle: "Sacred Digital Japa Mala",
    desc: "मंदिर घंटी ध्वनि, 6 सिद्ध वैदिक मंत्र, 108 मणका काउंटर और दैनिक साधना स्ट्रीक ट्रैकर के साथ अपनी दैनिक शिव व गायत्री साधना पूर्ण करें।",
    features: [
      "प्रामाणिक तिब्बती सिंगिंग बाउल / मंदिर घंटी ध्वनि",
      "महामृत्युंजय, शिव पंचाक्षरी, गायत्री व ओंकार मंत्र",
      "दैनिक स्ट्रीक ट्रैकर और स्वतः माला रिकॉर्ड"
    ],
    icon: <Flame size={28} color="#ea580c" />,
    link: "/japa",
    btnText: "जप साधना प्रारंभ करें (Start Japa)",
    bgGradient: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
    borderColor: "#fed7aa",
    textColor: "#9a3412"
  },
  {
    id: "compare",
    badge: "✦ शास्त्रसम्मत तुलना",
    title: "रुद्राक्ष तुलना मैट्रिक्स",
    subtitle: "Rudraksha Mukhi Comparison",
    desc: "1 से 21 मुखी नेपाली रुद्राक्षों के ग्रह, देवता, चक्र, बीज मंत्र और औषधीय लाभों की आमने-सामने विस्तृत तुलना करके अपने लिए सर्वोत्तम रुद्राक्ष चुनें।",
    features: [
      "ग्रह व राशि अनुसार प्रत्यक्ष तुलना",
      "प्रत्येक मुखी का सिद्ध बीज मंत्र ऑडियो",
      "धारण करने के प्रमुख लाभ व चक्र सक्रियण"
    ],
    icon: <ArrowLeftRight size={28} color="#b45309" />,
    link: "/compare",
    btnText: "रुद्राक्ष तुलना करें (Compare Mukhis)",
    bgGradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
    borderColor: "#fcd34d",
    textColor: "#854d0e"
  },
  {
    id: "pran-pratishtha",
    badge: "✦ संपूर्ण शास्त्र विधि",
    title: "प्राण-प्रतिष्ठा व धारण विधि",
    subtitle: "Consecration & Wearing Ritual",
    desc: "शिव पुराण एवं पद्म पुराण अनुसार घर पर रुद्राक्ष शुद्धिकरण, पंचामृत अभिषेक, 108 बीज मंत्र जप और शुभ मुहूर्त धारण की संपूर्ण गाइड।",
    features: [
      "चरणबद्ध 5-चरणीय शुद्धिकरण एवं अभिषेक विधि",
      "सोमवार व शिवरात्रि हेतु शुभ चौघड़िया मुहूर्त",
      "दैनिक देखभाल व शास्त्रोक्त नियम"
    ],
    icon: <BookOpen size={28} color="#047857" />,
    link: "/pran-pratishtha",
    btnText: "धारण विधि देखें (View Ritual Guide)",
    bgGradient: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
    borderColor: "#a7f3d0",
    textColor: "#065f46"
  },
  {
    id: "calculator",
    badge: "✦ निःशुल्क जन्मपत्री विश्लेषण",
    title: "वैदिक कुंडली कैलकुलेटर",
    subtitle: "Birth Chart Recommendation",
    desc: "अपनी जन्म तिथि, समय व स्थान से सटीक लग्न, जन्म राशि, नक्षत्र व दशा अनुसार अनुकूल रुद्राक्ष जानें और सीधे पंडित जी से परामर्श लें।",
    features: [
      "सटीक वैदिक लग्न व जन्म राशि गणना",
      "दोष निवारण (कालसर्प, शनि साढ़ेसाती, मांगलिक)",
      "अनुशंसित मुखी रुद्राक्ष व अनुकूल रत्न"
    ],
    icon: <Sparkles size={28} color="#7c2d12" />,
    link: "/rudraksha-calculator",
    btnText: "कुंडली विश्लेषण करें (Calculate Kundali)",
    bgGradient: "linear-gradient(135deg, #faede2 0%, #f5dcc8 100%)",
    borderColor: "#e8dac9",
    textColor: "#7c2d12"
  }
];

export function VedicTools() {
  useSeo({
    title: "वैदिक टूल्स एवं साधना केंद्र | Aura Rudraksha",
    description: "आपकी आध्यात्मिक यात्रा के लिए विशेष वैदिक टूल्स: 108 डिजिटल जप माला, रुद्राक्ष तुलना मैट्रिक्स, प्राण-प्रतिष्ठा धारण विधि और वैदिक कुंडली कैलकुलेटर।",
    canonical: "https://aurarudraksha.bond/vedic-tools"
  });

  return (
    <Shell>
      <div style={{ maxWidth: "1140px", margin: "24px auto 60px", padding: "0 16px" }}>
        
        {/* Breadcrumb Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#8c6b54", marginBottom: "20px" }}>
          <Link to="/" style={{ color: "#8c6b54", textDecoration: "none" }}>होम (Home)</Link>
          <ChevronRight size={14} />
          <span style={{ color: "#9a3412", fontWeight: 600 }}>वैदिक टूल्स (Vedic Tools)</span>
        </div>

        {/* Hero Section */}
        <div style={{ 
          textAlign: "center", 
          marginBottom: "36px",
          background: "linear-gradient(180deg, #fffbf7 0%, #faf3eb 100%)",
          padding: "36px 20px",
          borderRadius: "20px",
          border: "1px solid #ebd8c5"
        }}>
          <span style={{ 
            fontSize: "12px", 
            fontWeight: 800, 
            letterSpacing: "1.2px", 
            textTransform: "uppercase", 
            color: "#9a3412",
            background: "#fff1e7",
            padding: "5px 16px",
            borderRadius: "20px",
            display: "inline-block",
            marginBottom: "12px",
            border: "1px solid #fed7aa"
          }}>
            ✦ ऑरा विशेष सुविधाएं • SACRED DEVOTIONAL SUITE
          </span>
          <h1 style={{ 
            fontSize: "clamp(24px, 4vw, 34px)", 
            fontWeight: 800, 
            color: "#2b170d", 
            margin: "8px 0 12px", 
            fontFamily: "'Cinzel', serif",
            lineHeight: "1.3"
          }}>
            आपकी आध्यात्मिक यात्रा के लिए विशेष वैदिक टूल्स
          </h1>
          <p style={{ 
            color: "#6e5241", 
            fontSize: "15px", 
            maxWidth: "680px", 
            margin: "0 auto", 
            lineHeight: "1.65" 
          }}>
            नेपाली रुद्राक्षों की 100% प्रामाणिकता के साथ-साथ दैनिक 108 जप साधना, शास्त्रोक्त प्राण-प्रतिष्ठा विधि, विस्तृत मुखी तुलना एवं सटीक वैदिक कुंडली विश्लेषण का संपूर्ण अनुभव।
          </p>
        </div>

        {/* 4 Tool Cards Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "22px",
          marginBottom: "40px"
        }}>
          {VEDIC_TOOLS.map((tool, idx) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              style={{
                background: "#ffffff",
                border: `1px solid ${tool.borderColor}`,
                borderRadius: "18px",
                padding: "24px 20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 6px 20px rgba(43,23,13,0.04)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease"
              }}
            >
              <div>
                {/* Header Icon + Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: "14px",
                    background: tool.bgGradient,
                    display: "grid",
                    placeItems: "center",
                    border: `1px solid ${tool.borderColor}`
                  }}>
                    {tool.icon}
                  </div>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: tool.textColor,
                    background: tool.bgGradient,
                    padding: "4px 10px",
                    borderRadius: "8px",
                    border: `1px solid ${tool.borderColor}`
                  }}>
                    {tool.badge}
                  </span>
                </div>

                {/* Titles */}
                <h2 style={{ fontSize: "19px", fontWeight: 800, color: "#2b170d", margin: "0 0 4px" }}>
                  {tool.title}
                </h2>
                <div style={{ fontSize: "12px", color: "#8c6b54", fontWeight: 600, marginBottom: "12px" }}>
                  {tool.subtitle}
                </div>

                {/* Description */}
                <p style={{ fontSize: "13.5px", color: "#5d4436", lineHeight: "1.6", margin: "0 0 16px" }}>
                  {tool.desc}
                </p>

                {/* Key feature bullets */}
                <ul style={{ margin: "0 0 20px", padding: "0 0 0 18px", fontSize: "12.5px", color: "#6e5241", lineHeight: "1.7" }}>
                  {tool.features.map((feat, fIdx) => (
                    <li key={fIdx}>{feat}</li>
                  ))}
                </ul>
              </div>

              {/* Action Link */}
              <Link
                to={tool.link}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: tool.bgGradient,
                  color: tool.textColor,
                  fontWeight: 700,
                  fontSize: "13.5px",
                  textDecoration: "none",
                  border: `1px solid ${tool.borderColor}`,
                  transition: "background 0.2s ease"
                }}
              >
                <span>{tool.btnText}</span>
                <ArrowRight size={16} />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Trust & Spiritual Guidance Banner */}
        <div style={{
          background: "#faf4ed",
          border: "1px solid #e8dac9",
          borderRadius: "16px",
          padding: "24px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#faede2",
              border: "1px solid #deb887",
              display: "grid",
              placeItems: "center",
              color: "#9a3412"
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: "#2b170d", fontSize: "15px" }}>
                100% शास्त्रसम्मत व वैदिक अनुसंधान आधारित
              </div>
              <div style={{ fontSize: "13px", color: "#7c5e4c" }}>
                प्रत्येक टूल प्राचीन शास्त्रों, ज्योतिष एवं प्रामाणिक लैब प्रमाणीकरण के नियमों पर आधारित है।
              </div>
            </div>
          </div>

          <Link
            to="/aura-ai?mode=panditji"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "linear-gradient(135deg, #9a3412 0%, #7c2d12 100%)",
              color: "#ffffff",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "13px",
              textDecoration: "none"
            }}
          >
            <Sparkles size={15} />
            पंडित जी से निःशुल्क परामर्श लें
          </Link>
        </div>

      </div>
    </Shell>
  );
}

export default VedicTools;
