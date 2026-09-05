import React from "react";
import { Link } from "react-router-dom";
import { 
  Award, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  ShieldCheck, 
  MessageCircle, 
  Calendar, 
  MapPin, 
  UserCheck, 
  Star,
  Flame,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { PanditjiPortraitSVG } from "./PanditjiPortraitSVG";
import { PanditjiStats } from "./PanditjiStats";

export function PanditjiBioSection({ className = "", compact = false }) {
  return (
    <section 
      id="panditji-bio" 
      className={`panditji-bio-section ${className}`}
      style={{
        background: "linear-gradient(135deg, #fdfbf7 0%, #f6eee3 100%)",
        borderTop: "1px solid #ebdccb",
        borderBottom: "1px solid #ebdccb",
        padding: compact ? "40px 16px" : "64px 20px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background Sacred Geometric Glow */}
      <div 
        style={{
          position: "absolute",
          top: "-60px",
          right: "-60px",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, transparent 70%)",
          pointerEvents: "none"
        }} 
      />
      <div 
        style={{
          position: "absolute",
          bottom: "-60px",
          left: "-60px",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(165, 77, 43, 0.08) 0%, transparent 70%)",
          pointerEvents: "none"
        }} 
      />

      <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        
        {/* Section Header */}
        <div style={{ textAlign: "center", marginBottom: compact ? "28px" : "40px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(165, 77, 43, 0.08)",
            border: "1px solid rgba(165, 77, 43, 0.25)",
            borderRadius: "30px",
            padding: "5px 14px",
            fontSize: "11.5px",
            fontWeight: 700,
            color: "#a54d2b",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            marginBottom: "10px"
          }}>
            <Sparkles size={13} /> Sacred Lineage & Vedic Authority
          </div>

          <h2 style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontSize: compact ? "26px" : "clamp(28px, 4vw, 38px)",
            fontWeight: 700,
            color: "#2b170d",
            lineHeight: 1.25,
            margin: "0 0 10px"
          }}>
            Meet Acharya Shri Vidyadhar Shastri
          </h2>

          <p style={{
            fontSize: "14.5px",
            color: "#6b584c",
            maxWidth: "640px",
            margin: "0 auto",
            lineHeight: 1.6
          }}>
            35+ years of dedicated practice in Kashi-Haridwar Vedic astrology, guiding over 50,000 spiritual seekers towards authenticity, planetary balance, and Rudraksha consecration.
          </p>
        </div>

        {/* Main Card Container */}
        <div style={{
          background: "#ffffff",
          borderRadius: "20px",
          border: "1px solid #e7d6c3",
          boxShadow: "0 12px 36px rgba(43, 23, 13, 0.07)",
          padding: compact ? "24px 18px" : "36px 32px",
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "minmax(280px, 340px) 1fr",
          gap: "36px",
          alignItems: "center"
        }}>

          {/* Left Column: Portrait, Credentials & Blessing */}
          <div style={{ textTransform: "none" }}>
            <div style={{
              position: "relative",
              width: "160px",
              height: "160px",
              margin: "0 auto 20px",
              borderRadius: "50%",
              padding: "4px",
              background: "linear-gradient(135deg, #D4AF37 0%, #996515 50%, #F3E5AB 100%)",
              boxShadow: "0 8px 24px rgba(153, 101, 21, 0.25)"
            }}>
              <div style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                background: "radial-gradient(circle, #ffe8cc 0%, #fbd5a5 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative"
              }}>
                <PanditjiPortraitSVG />

                {/* Verified Seal Badge */}
                <div style={{
                  position: "absolute",
                  bottom: "2px",
                  right: "2px",
                  background: "#16a34a",
                  color: "#ffffff",
                  borderRadius: "50%",
                  padding: "4px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  border: "2px solid #ffffff",
                  display: "grid",
                  placeItems: "center"
                }} title="Verified Vedic Astrologer">
                  <ShieldCheck size={14} />
                </div>
              </div>
            </div>

            {/* Panditji Title & Badge */}
            <div style={{ textAlign: "center" }}>
              <h3 style={{
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontSize: "22px",
                fontWeight: 700,
                color: "#2b170d",
                margin: "0 0 4px"
              }}>
                आचार्य विद्याधर शास्त्री
              </h3>
              <p style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#a54d2b",
                margin: "0 0 8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Jyotish Ratna & Vedic Peeth Scholar
              </p>
              
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: "20px",
                padding: "4px 12px",
                fontSize: "11.5px",
                color: "#92400e",
                fontWeight: 600,
                marginBottom: "16px"
              }}>
                <Award size={13} color="#b45309" /> Kashi Sanskrit Vishwavidyalaya
              </div>

              {/* Personal Quote */}
              <div style={{
                background: "#fdf8f2",
                borderLeft: "3px solid #c89b3c",
                borderRadius: "0 8px 8px 0",
                padding: "10px 14px",
                fontSize: "12.5px",
                color: "#544338",
                lineHeight: 1.5,
                fontStyle: "italic",
                textAlign: "left"
              }}>
                "शास्त्र सम्मत विधि से ही रुद्राक्ष का पूर्ण फल प्राप्त होता है। हर दाने में शिव का वास है।"
              </div>
            </div>
          </div>

          {/* Right Column: Bio Narrative, Experience Stats & Pillars */}
          <div>
            <h4 style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontSize: "24px",
              fontWeight: 700,
              color: "#2b170d",
              margin: "0 0 12px",
              borderBottom: "1px dashed #e2d1bf",
              paddingBottom: "8px"
            }}>
              Mastery in Shastric Wisdom & Consecration
            </h4>

            <p style={{ fontSize: "14px", color: "#524036", lineHeight: 1.7, margin: "0 0 16px" }}>
              Born into a traditional Vedic Brahmin family in Haridwar, Acharya Vidyadhar Shastri completed his Gold Medal Shastri degree in Jyotish Shastra from Sampurnanand Sanskrit Vishwavidyalaya, Varanasi. For over three decades, he has dedicated his life to studying the Shiva Purana, Padma Purana, and Vedic astronomy.
            </p>

            <p style={{ fontSize: "14px", color: "#524036", lineHeight: 1.7, margin: "0 0 24px" }}>
              Under his direct guidance, every Rudraksha at <strong>Aura Rudraksha</strong> undergoes authentic <em>Prana Pratishtha</em> — consecrated with holy Gangajal, Panchamrit, and 1,008 deity-specific Beej Mantra recitations during auspicious Shubh Muhoortas.
            </p>

            <PanditjiStats />

            {/* 4 Authority Highlights */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#3a271c", fontWeight: 600 }}>
                <CheckCircle2 size={15} color="#c89b3c" style={{ flexShrink: 0 }} />
                <span>Rashi & Graha Dasha Matching</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#3a271c", fontWeight: 600 }}>
                <CheckCircle2 size={15} color="#c89b3c" style={{ flexShrink: 0 }} />
                <span>1008 Beej Mantra Consecration</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#3a271c", fontWeight: 600 }}>
                <CheckCircle2 size={15} color="#c89b3c" style={{ flexShrink: 0 }} />
                <span>Personalized Shubh Muhoorta</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#3a271c", fontWeight: 600 }}>
                <CheckCircle2 size={15} color="#c89b3c" style={{ flexShrink: 0 }} />
                <span>Shiva Purana Vidhi Guidance</span>
              </div>
            </div>

            {/* Interactive Call to Action */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link 
                to="/aura-ai" 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, #a54d2b 0%, #7d3318 100%)",
                  color: "#ffffff",
                  padding: "11px 20px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(165, 77, 43, 0.25)"
                }}
              >
                <MessageCircle size={15} /> Consult Panditji via AI (Free)
              </Link>

              <a 
                href="https://wa.me/919672996531?text=Namaste%20Panditji%2C%20mujhe%20apne%20liye%20sahi%20Rudraksha%20chahiye.%20Kripya%20guidance%20dein."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#ffffff",
                  color: "#2b170d",
                  border: "1px solid #c89b3c",
                  padding: "11px 20px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                Direct WhatsApp Consultation <ArrowRight size={14} />
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
