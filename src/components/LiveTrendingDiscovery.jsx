import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Search, Sparkles, ShieldCheck, Flame, ArrowRight, Compass } from "lucide-react";

const TRENDING_SEARCH_TOPICS = [
  {
    id: "5-mukhi-health",
    title: "5 Mukhi for BP & Stress Relief",
    tag: "Trending #1",
    query: "5 Mukhi",
    reason: "High Google Search Volume in India & Global",
    icon: "🧘"
  },
  {
    id: "nepali-collector",
    title: "Nepali Collector Beads (Large Size)",
    tag: "High Demand",
    query: "Nepali",
    reason: "Highest Spiritual Energy & Clear Mukhi Lines",
    icon: "🏔️"
  },
  {
    id: "ek-mukhi-kaaju",
    title: "1 Mukhi Half-Moon (Rameshwaram)",
    tag: "Popular",
    query: "1 Mukhi",
    reason: "Best for Focus, Leadership & Lord Shiva Blessings",
    icon: "🕉️"
  },
  {
    id: "siddha-mala-combination",
    title: "1-14 Mukhi Complete Siddha Mala",
    tag: "Premium",
    query: "Siddha Mala",
    reason: "Complete Multi-Mukhi Astro Alignment",
    icon: "📿"
  },
  {
    id: "lab-certification-guide",
    title: "Government Certified Lab Testing",
    tag: "Authenticity",
    query: "Certified",
    reason: "X-Ray & ISO 9001:2015 Verified Authenticity",
    icon: "🔬"
  }
];

export function LiveTrendingDiscovery() {
  const navigate = useNavigate();
  const [activeTopic, setActiveTopic] = useState(TRENDING_SEARCH_TOPICS[0]);

  const handleSelectTopic = (topic) => {
    setActiveTopic(topic);
    if (topic.query) {
      navigate(`/shop?search=${encodeURIComponent(topic.query)}`);
    }
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #fffcf9 0%, #fef3e7 100%)",
      border: "1.5px solid #fed7aa",
      borderRadius: "16px",
      padding: "20px 24px",
      margin: "24px 0",
      boxShadow: "0 6px 20px rgba(154, 52, 18, 0.05)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            background: "linear-gradient(135deg, #ea580c, #c2410c)",
            color: "#fff",
            padding: "8px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#7c2d12", display: "flex", alignItems: "center", gap: "6px" }}>
              Live Search &amp; Vedic Discovery <Flame size={16} color="#ea580c" />
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#9a3412" }}>
              Real-time trending queries &amp; authentic Vedic guidelines based on live search data
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/shop")}
          style={{
            background: "none",
            border: "1.5px solid #ea580c",
            color: "#c2410c",
            borderRadius: "20px",
            padding: "6px 14px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          Explore All Categories <ArrowRight size={14} />
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "6px", scrollbarWidth: "thin" }}>
        {TRENDING_SEARCH_TOPICS.map((topic) => {
          const isSelected = activeTopic.id === topic.id;
          return (
            <button
              key={topic.id}
              onClick={() => handleSelectTopic(topic)}
              style={{
                flex: "0 0 auto",
                background: isSelected ? "#7c2d12" : "#fff",
                color: isSelected ? "#fff" : "#431407",
                border: isSelected ? "1.5px solid #7c2d12" : "1.5px solid #fed7aa",
                borderRadius: "12px",
                padding: "10px 14px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
                boxShadow: isSelected ? "0 4px 12px rgba(124, 45, 18, 0.2)" : "0 2px 6px rgba(0,0,0,0.02)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "14px" }}>{topic.icon}</span>
                <span style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "10px",
                  background: isSelected ? "rgba(255,255,255,0.2)" : "#ffedd5",
                  color: isSelected ? "#ffedd5" : "#9a3412"
                }}>
                  {topic.tag}
                </span>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" }}>{topic.title}</div>
              <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>{topic.reason}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
