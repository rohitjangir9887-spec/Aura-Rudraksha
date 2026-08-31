import React from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { 
  Sparkles, ArrowRight, Compass, ShieldCheck, 
  Flame, Gem, Layers
} from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES_DATA = [
  {
    id: "individual-mukhi",
    title: "Sacred Mukhi Beads (1 to 21 Mukhi)",
    tagline: "Individual Himalayan Power Seeds",
    description: "Each Mukhi (face) possesses distinct planetary vibrations, ruling deities, and chakra activations.",
    filterLink: "/shop?cat=Single%20Beads",
    items: [
      { name: "1 Mukhi (Ek Mukhi)", deity: "Lord Shiva", planet: "Sun (Surya)", img: "/images/product-1mukhi.jpg", link: "/shop?chip=1-mukhi" },
      { name: "2 Mukhi (Do Mukhi)", deity: "Ardhanarishvara", planet: "Moon (Chandra)", img: "/images/product-2mukhi.jpg", link: "/shop?chip=2-mukhi" },
      { name: "3 Mukhi (Teen Mukhi)", deity: "Agni Dev", planet: "Mars (Mangal)", img: "/images/product-3mukhi.jpg", link: "/shop?chip=3-mukhi" },
      { name: "4 Mukhi (Char Mukhi)", deity: "Lord Brahma", planet: "Mercury (Budh)", img: "/images/product-4mukhi.jpg", link: "/shop?chip=4-mukhi" },
      { name: "5 Mukhi (Panch Mukhi)", deity: "Kalagni Rudra", planet: "Jupiter (Guru)", img: "/images/product-5mukhi.jpg", link: "/shop?chip=5-mukhi" },
      { name: "6 Mukhi (Chhah Mukhi)", deity: "Lord Kartikeya", planet: "Venus (Shukra)", img: "/images/product-6mukhi.jpg", link: "/shop?chip=6-mukhi" },
      { name: "7 Mukhi (Saat Mukhi)", deity: "Goddess Mahalakshmi", planet: "Saturn (Shani)", img: "/images/product-7mukhi.jpg", link: "/shop?chip=7-mukhi" },
      { name: "8 Mukhi (Aath Mukhi)", deity: "Lord Ganesha", planet: "Rahu", img: "/images/product-8mukhi.jpg", link: "/shop?chip=8-mukhi" }
    ]
  },
  {
    id: "rare-collector",
    title: "Rare & Auspicious Formations",
    tagline: "Divine Miracle Creations of Nature",
    description: "Extraordinarily rare naturally conjoined and divine collector formations with profound energy field.",
    filterLink: "/shop?cat=Rare%20Collector",
    items: [
      { name: "Gauri Shankar", deity: "Shiva & Parvati", planet: "Moon & Sun", img: "/images/product-gaurishankar.jpg", link: "/shop?chip=gauri-shankar" },
      { name: "Ganesh Rudraksha", deity: "Lord Ganesha", planet: "Rahu & Ketu", img: "/images/product-ganesh.jpg", link: "/shop?chip=ganesh" },
      { name: "Garbh Gauri", deity: "Parvati & Ganesha", planet: "Fertility & Protection", img: "/images/product-garbhgauri.jpg", link: "/shop?chip=rare" },
      { name: "Trijuti (Trinity)", deity: "Brahma, Vishnu, Shiva", planet: "All 9 Planets", img: "/images/product-trijuti.jpg", link: "/shop?chip=rare" }
    ]
  },
  {
    id: "sacred-malas",
    title: "Japa Malas & Kanthas",
    tagline: "Consecrated 108+1 Meditation & Chanting Strings",
    description: "Handcrafted Japa and wearing strings in 5 Mukhi, 7 Mukhi, and multi-mukhi configurations with silk tassels.",
    filterLink: "/shop?cat=Malas",
    items: [
      { name: "108+1 Japa Mala (5 Mukhi)", deity: "Lord Shiva", planet: "Jupiter (Wisdom)", img: "/images/product-mala.jpg", link: "/shop?chip=mala" },
      { name: "Silver Capped Siddha Mala", deity: "All Deities", planet: "Navagraha Shanti", img: "/images/product-siddha.jpg", link: "/shop?chip=siddha" },
      { name: "Chikna Smooth Japa Mala", deity: "Mantra Sadhana", planet: "Calm Mind", img: "/images/product-mala.jpg", link: "/shop?chip=mala" },
      { name: "Himalayan Kantha Mala", deity: "Maha Rudra", planet: "Aura Shield", img: "/images/product-kantha.jpg", link: "/shop?chip=kantha" }
    ]
  },
  {
    id: "bracelets-wristlets",
    title: "Sacred Bracelets & Capped Wristlets",
    tagline: "Daily Protection & Continuous Bio-Resonance",
    description: "Contemporary handcrafted wristlets in genuine 925 sterling silver, Panchdhatu, and elastic cord.",
    filterLink: "/shop?cat=Bracelets",
    items: [
      { name: "Silver Capped 5 Mukhi Bracelet", deity: "Shiva Protection", planet: "Aura Shield", img: "/images/product-bracelet.jpg", link: "/shop?chip=bracelet" },
      { name: "Navagraha Balance Bracelet", deity: "9 Planetary Deities", planet: "Planetary Harmony", img: "/images/product-navagraha.jpg", link: "/shop?chip=bracelet" },
      { name: "Rudraksha & Sphatik Wristlet", deity: "Shiva-Shakti", planet: "Cooling & Peace", img: "/images/product-sphatik.jpg", link: "/shop?chip=bracelet" },
      { name: "Adjustable Macrame Bracelet", deity: "Daily Vitality", planet: "All Chakras", img: "/images/product-macrame.jpg", link: "/shop?chip=bracelet" }
    ]
  }
];

export function CategoriesPage() {
  return (
    <Shell>
      <div className="categories-directory-page" style={{ background: "#fdfbf7", minHeight: "100vh", padding: "40px 16px 80px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#fcf4ed",
              border: "1px solid #ebdccb",
              borderRadius: "30px",
              padding: "5px 14px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#a54d2b",
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              marginBottom: "10px"
            }}>
              <Layers size={13} /> SACRED VEDIC CATALOGUE
            </div>
            <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "36px", color: "#2b170d", margin: "0 0 10px" }}>
              Explore Sacred Collections by Category
            </h1>
            <p style={{ color: "#7d6d62", fontSize: "14.5px", maxWidth: "620px", margin: "0 auto" }}>
              Discover genuine Nepali Rudraksha beads, energised Japa Malas, protective wristlets, and rare collector artifacts.
            </p>
          </div>

          {/* Quick Filter Navigation Bar */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "40px"
          }}>
            {CATEGORIES_DATA.map(cat => (
              <a 
                key={cat.id} 
                href={`#${cat.id}`}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  background: "#ffffff",
                  border: "1px solid #ebdccb",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#4a3b32",
                  textDecoration: "none",
                  transition: "all 0.2s"
                }}
              >
                {cat.title.split("(")[0]}
              </a>
            ))}
          </div>

          {/* Categories Blocks */}
          <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
            {CATEGORIES_DATA.map((cat, idx) => (
              <div 
                key={cat.id} 
                id={cat.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #ebdccb",
                  padding: "28px 24px",
                  boxShadow: "0 4px 20px rgba(43, 23, 13, 0.04)"
                }}
              >
                {/* Category Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px", marginBottom: "22px", borderBottom: "1px solid #f2e6da", paddingBottom: "16px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#a54d2b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                      {cat.tagline}
                    </span>
                    <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "26px", color: "#2b170d", margin: "2px 0 6px" }}>
                      {cat.title}
                    </h2>
                    <p style={{ fontSize: "13px", color: "#7d6d62", margin: 0, maxWidth: "600px" }}>
                      {cat.description}
                    </p>
                  </div>

                  <Link 
                    to={cat.filterLink}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#fcf4ed",
                      color: "#a54d2b",
                      border: "1px solid #ebdccb",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      textDecoration: "none"
                    }}
                  >
                    View All in Catalog <ArrowRight size={14} />
                  </Link>
                </div>

                {/* Micro Cards Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "14px"
                }}>
                  {cat.items.map((item, itemIdx) => (
                    <Link
                      key={itemIdx}
                      to={item.link}
                      style={{
                        background: "#fdfbf7",
                        borderRadius: "10px",
                        border: "1px solid #ebdccb",
                        padding: "14px",
                        textDecoration: "none",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "10px", color: "#a54d2b", fontWeight: 700, background: "#fcf2ea", padding: "2px 6px", borderRadius: "4px" }}>
                            {item.planet}
                          </span>
                        </div>
                        <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "16px", color: "#2b170d", margin: "0 0 2px" }}>
                          {item.name}
                        </h4>
                        <span style={{ fontSize: "11.5px", color: "#7d6d62" }}>
                          Deity: <strong>{item.deity}</strong>
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "12px", fontSize: "11px", fontWeight: 700, color: "#a54d2b" }}>
                        Browse Collection <ArrowRight size={12} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* AI Helper Banner */}
          <div style={{
            marginTop: "48px",
            background: "linear-gradient(135deg, #2b170d 0%, #150904 100%)",
            borderRadius: "16px",
            padding: "32px 24px",
            color: "#fbf5ef",
            textAlign: "center",
            border: "1px solid rgba(200, 155, 60, 0.3)"
          }}>
            <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "26px", color: "#ffffff", margin: "0 0 8px" }}>
              Need Help Finding The Right Bead For Your Kundali?
            </h3>
            <p style={{ fontSize: "13.5px", color: "#d8c7b8", maxWidth: "540px", margin: "0 auto 20px" }}>
              Let our AI Spiritual Assistant recommend the exact Mukhi based on your date of birth, Rashi, and life intentions.
            </p>
            <Link 
              to="/aura-ai"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#c89b3c",
                color: "#1a0d06",
                padding: "11px 22px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none"
              }}
            >
              <Compass size={16} /> Consult Aura AI Assistant
            </Link>
          </div>

        </div>
      </div>
    </Shell>
  );
}
