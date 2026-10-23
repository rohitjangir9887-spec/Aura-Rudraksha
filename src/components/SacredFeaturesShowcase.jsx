import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck, Flame, ArrowLeftRight, BookOpen, Volume2 } from "lucide-react";

export function SacredFeaturesShowcase() {
  const features = [
    {
      badge: "✦ डिजिटल साधना टूल",
      title: "108 दैनिक जप माला",
      desc: "मंदिर घंटी ध्वनि, 6 सिद्ध वैदिक मंत्र और दैनिक स्ट्रीक ट्रैकर के साथ अपनी दैनिक साधना पूर्ण करें।",
      icon: <Flame size={24} color="#ea580c" />,
      link: "/japa",
      linkText: "जप साधना प्रारंभ करें",
      accentBg: "#fff7ed",
      accentBorder: "#fed7aa"
    },
    {
      badge: "✦ शास्त्रसम्मत तुलना",
      title: "रुद्राक्ष तुलना मैट्रिक्स",
      desc: "ग्रह, देवता, चक्र, बीज मंत्र व औषधीय लाभों की आमने-सामने तुलना करके सही रुद्राक्ष चुनें।",
      icon: <ArrowLeftRight size={24} color="#b45309" />,
      link: "/compare",
      linkText: "रुद्राक्ष तुलना करें",
      accentBg: "#fef3c7",
      accentBorder: "#fde68a"
    },
    {
      badge: "✦ संपूर्ण शास्त्र विधि",
      title: "प्राण-प्रतिष्ठा व धारण विधि",
      desc: "घर पर रुद्राक्ष शुद्धिकरण, 108 बीज मंत्र जप और ब्रह्म मुहूर्त धारण विधि की संपूर्ण गाइड।",
      icon: <BookOpen size={24} color="#047857" />,
      link: "/pran-pratishtha",
      linkText: "धारण विधि देखें",
      accentBg: "#ecfdf5",
      accentBorder: "#a7f3d0"
    },
    {
      badge: "✦ निःशुल्क जन्मपत्री",
      title: "वैदिक कुंडली कैलकुलेटर",
      desc: "अपनी जन्म तिथि, समय व स्थान से सटीक लग्न, राशि व महादशा अनुसार अनुकूल रुद्राक्ष जानें।",
      icon: <Sparkles size={24} color="#7c2d12" />,
      link: "/rudraksha-calculator",
      linkText: "कुंडली विश्लेषण करें",
      accentBg: "#faede2",
      accentBorder: "#e8dac9"
    }
  ];

  return (
    <section 
      style={{ 
        maxWidth: "1200px", 
        margin: "40px auto 30px", 
        padding: "0 16px" 
      }}
      aria-label="Aura Sacred Features"
    >
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
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
          ✦ ऑरा विशेष सुविधाएं • SACRED DEVOTIONAL TOOLS
        </span>
        <h2 style={{ fontSize: "26px", fontWeight: 800, color: "#2b170d", margin: "4px 0 8px", fontFamily: "'Cinzel', serif" }}>
          आपकी आध्यात्मिक यात्रा के लिए विशेष वैदिक टूल्स
        </h2>
        <p style={{ color: "#7c5e4c", fontSize: "14.5px", maxWidth: "620px", margin: "0 auto", lineHeight: "1.6" }}>
          नेपाली रुद्राक्षों की प्रामाणिकता के साथ-साथ दैनिक जप, शास्त्रोक्त धारण विधि और सटीक वैदिक तुलना का संपूर्ण अनुभव।
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "18px"
      }}>
        {features.map((item, i) => (
          <div
            key={i}
            style={{
              background: "#ffffff",
              border: `1px solid ${item.accentBorder}`,
              borderRadius: "16px",
              padding: "22px 20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 4px 16px rgba(43,23,13,0.04)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div style={{
                  width: 46,
                  height: 46,
                  borderRadius: "12px",
                  background: item.accentBg,
                  display: "grid",
                  placeItems: "center",
                  border: `1px solid ${item.accentBorder}`
                }}>
                  {item.icon}
                </div>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#9a3412",
                  background: "#fef3e7",
                  padding: "3px 8px",
                  borderRadius: "6px"
                }}>
                  {item.badge}
                </span>
              </div>

              <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#2b170d", margin: "0 0 8px" }}>
                {item.title}
              </h3>

              <p style={{ fontSize: "13px", color: "#6e5241", lineHeight: "1.6", margin: "0 0 18px" }}>
                {item.desc}
              </p>
            </div>

            <Link
              to={item.link}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "8px",
                background: item.accentBg,
                color: "#7c2d12",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
                border: `1px solid ${item.accentBorder}`
              }}
            >
              <span>{item.linkText}</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export default SacredFeaturesShowcase;
