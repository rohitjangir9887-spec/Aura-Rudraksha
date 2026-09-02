import React from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { PanditjiBioSection } from "../components/PanditjiBioSection";
import { 
  ShieldCheck, Award, Flame, HeartHandshake, 
  Sparkles, CheckCircle2, ArrowRight, Compass,
  MapPin, Droplets, Gem, BookOpen
} from "lucide-react";
import { motion } from "framer-motion";

export function AboutUs() {
  return (
    <Shell>
      <div className="about-page-container" style={{ background: "#fdfbf7", minHeight: "100vh", paddingBottom: "80px" }}>
        
        {/* 1. Hero Banner */}
        <section style={{
          background: "linear-gradient(135deg, #2b170d 0%, #150904 100%)",
          color: "#fbf5ef",
          padding: "64px 20px 72px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(200, 155, 60, 0.3)"
        }}>
          {/* Subtle gold decorative glow */}
          <div style={{
            position: "absolute",
            top: "-50%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "400px",
            background: "radial-gradient(circle, rgba(200,155,60,0.15) 0%, rgba(0,0,0,0) 70%)",
            pointerEvents: "none"
          }} />

          <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(200, 155, 60, 0.15)",
              border: "1px solid rgba(200, 155, 60, 0.4)",
              borderRadius: "30px",
              padding: "6px 16px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: "#f7dfa5",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              marginBottom: "18px"
            }}>
              <Sparkles size={13} /> The Sacred Origin of Aura Rudraksha
            </div>

            <h1 style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontSize: "clamp(32px, 5vw, 46px)",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.2,
              margin: "0 0 16px"
            }}>
              Direct From Himalayan Groves To Your Soul's Altar
            </h1>

            <p style={{
              fontSize: "clamp(14px, 2.5vw, 16.5px)",
              lineHeight: 1.7,
              color: "#d8c7b8",
              maxWidth: "680px",
              margin: "0 auto 28px"
            }}>
              Founded with the singular mission of eradicating counterfeits and preserving ancient Shastric authenticity. We bridge ancient Vedic wisdom with modern scientific certification.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              <Link 
                to="/shop" 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#c89b3c",
                  color: "#1a0d06",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(200, 155, 60, 0.3)"
                }}
              >
                Explore Sacred Beads <ArrowRight size={15} />
              </Link>
              <Link 
                to="/aura-ai" 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fbf5ef",
                  border: "1px solid rgba(200,155,60,0.3)",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  textDecoration: "none"
                }}
              >
                <Compass size={15} /> Consult Aura AI Astrologer
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Core Pillars of Aura Rudraksha */}
        <section style={{ maxWidth: "1100px", margin: "-32px auto 60px", padding: "0 16px", position: "relative", zIndex: 2 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            background: "#ffffff",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #ebdccb",
            boxShadow: "0 8px 30px rgba(43, 23, 13, 0.06)"
          }}>
            <div style={{ padding: "14px", borderRight: "1px solid #f2e6da" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fcf4ed", display: "grid", placeItems: "center", color: "#a54d2b", marginBottom: "12px" }}>
                <MapPin size={22} />
              </div>
              <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "#2b170d", margin: "0 0 6px" }}>100% Nepali Origin</h3>
              <p style={{ fontSize: "13px", color: "#6b584c", lineHeight: 1.5, margin: 0 }}>
                Directly harvested from the sacred foothills of Eastern Nepal, renowned for possessing the highest bio-electromagnetic vitality.
              </p>
            </div>

            <div style={{ padding: "14px", borderRight: "1px solid #f2e6da" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fcf4ed", display: "grid", placeItems: "center", color: "#a54d2b", marginBottom: "12px" }}>
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "#2b170d", margin: "0 0 6px" }}>Lab Tested & Certified</h3>
              <p style={{ fontSize: "13px", color: "#6b584c", lineHeight: 1.5, margin: 0 }}>
                Every bead undergoes X-Ray verification, density analysis, and authenticity testing with an individual holographic QR certificate card.
              </p>
            </div>

            <div style={{ padding: "14px", borderRight: "1px solid #f2e6da" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fcf4ed", display: "grid", placeItems: "center", color: "#a54d2b", marginBottom: "12px" }}>
                <Flame size={22} />
              </div>
              <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "#2b170d", margin: "0 0 6px" }}>Vedic Prana Pratishtha</h3>
              <p style={{ fontSize: "13px", color: "#6b584c", lineHeight: 1.5, margin: 0 }}>
                Energized by learned Brahmins with holy Gangajal, Panchamrit, and 1,008 sacred Beej Mantra recitations before dispatch.
              </p>
            </div>

            <div style={{ padding: "14px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fcf4ed", display: "grid", placeItems: "center", color: "#a54d2b", marginBottom: "12px" }}>
                <HeartHandshake size={22} />
              </div>
              <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "#2b170d", margin: "0 0 6px" }}>Ethical & Devotional</h3>
              <p style={{ fontSize: "13px", color: "#6b584c", lineHeight: 1.5, margin: 0 }}>
                Fair-trade partnerships with Himalayan farmers, zero synthetic dyes or glued beads, and lifetime support for spiritual seekers.
              </p>
            </div>
          </div>
        </section>

        {/* 3. The Story & Philosophy */}
        <section style={{ maxWidth: "1000px", margin: "0 auto 60px", padding: "0 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "40px", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "11.5px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#a54d2b", fontWeight: 700 }}>
                OUR PHILOSOPHY
              </span>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "32px", color: "#2b170d", margin: "8px 0 16px" }}>
                "Rudraksha is not mere jewelry, it is Lord Shiva's divine tear of compassion."
              </h2>
              <p style={{ color: "#544338", lineHeight: 1.8, fontSize: "14.5px", marginBottom: "16px" }}>
                According to the Shiva Purana, Lord Shiva went into deep meditation for thousands of years for the welfare of all living beings. When he opened his eyes, compassionate tears fell upon the earth and blossomed as sacred Elaeocarpus Ganitrus trees.
              </p>
              <p style={{ color: "#544338", lineHeight: 1.8, fontSize: "14.5px", marginBottom: "20px" }}>
                At Aura Rudraksha, we treat each seed with absolute purity. Whether you seek inner calm, planetary alignment, career success, or protection from negative energies, our consecrated beads act as powerful focal points for spiritual evolution.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#332218", fontWeight: 600 }}>
                  <CheckCircle2 size={16} color="#a54d2b" /> Handpicked natural Mukhis with deep, unbroken grooves
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#332218", fontWeight: 600 }}>
                  <CheckCircle2 size={16} color="#a54d2b" /> Certified 100% genuine silver (92.5) and pure gold cappings
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#332218", fontWeight: 600 }}>
                  <CheckCircle2 size={16} color="#a54d2b" /> Sanctified Gangajal vial & Auspicious Red thread included free
                </li>
              </ul>
            </div>

            {/* Sacred Quality Card */}
            <div style={{
              background: "linear-gradient(135deg, #fcf7f0 0%, #f4eae0 100%)",
              border: "1.5px solid #dcc5ad",
              borderRadius: "16px",
              padding: "32px",
              boxShadow: "0 10px 30px rgba(43, 23, 13, 0.05)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#a54d2b", color: "#ffffff", display: "grid", placeItems: "center" }}>
                  <Gem size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontFamily: "Cormorant Garamond, serif", fontSize: "20px", color: "#2b170d" }}>
                    The 5-Stage Purity Guarantee
                  </h4>
                  <span style={{ fontSize: "11px", color: "#7d6d62", letterSpacing: "0.5px" }}>TESTED • ENERGIZED • SEALED</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ padding: "10px 12px", background: "#ffffff", borderRadius: "8px", border: "1px solid #ebdccb" }}>
                  <strong style={{ fontSize: "13px", color: "#2b170d", display: "block" }}>1. Grove Sorting & Maturity Test</strong>
                  <span style={{ fontSize: "11.5px", color: "#6b584c" }}>Only dense, ripe, naturally fallen fruits are harvested without hurting trees.</span>
                </div>
                <div style={{ padding: "10px 12px", background: "#ffffff", borderRadius: "8px", border: "1px solid #ebdccb" }}>
                  <strong style={{ fontSize: "13px", color: "#2b170d", display: "block" }}>2. Digital X-Ray Examination</strong>
                  <span style={{ fontSize: "11.5px", color: "#6b584c" }}>Verifies the exact number of internal seed compartments (Lokas) without cutting the bead.</span>
                </div>
                <div style={{ padding: "10px 12px", background: "#ffffff", borderRadius: "8px", border: "1px solid #ebdccb" }}>
                  <strong style={{ fontSize: "13px", color: "#2b170d", display: "block" }}>3. Copper Plate Bio-Electric Check</strong>
                  <span style={{ fontSize: "11.5px", color: "#6b584c" }}>Assesses natural clockwise rotational electromagnetic properties.</span>
                </div>
                <div style={{ padding: "10px 12px", background: "#ffffff", borderRadius: "8px", border: "1px solid #ebdccb" }}>
                  <strong style={{ fontSize: "13px", color: "#2b170d", display: "block" }}>4. Temple Consecration & Mantra Japa</strong>
                  <span style={{ fontSize: "11.5px", color: "#6b584c" }}>Bathed in Gangajal and charged with deity-specific Beej Mantras.</span>
                </div>
                <div style={{ padding: "10px 12px", background: "#ffffff", borderRadius: "8px", border: "1px solid #ebdccb" }}>
                  <strong style={{ fontSize: "13px", color: "#2b170d", display: "block" }}>5. Holographic QR Certification</strong>
                  <span style={{ fontSize: "11.5px", color: "#6b584c" }}>Tamper-proof certificate with scan-to-verify digital lab report.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dedicated Panditji Bio & Authority Section */}
        <PanditjiBioSection />

        {/* 4. Astrological Call to Action */}
        <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 20px" }}>
          <div style={{
            background: "linear-gradient(135deg, #2b170d 0%, #3a1c0d 100%)",
            border: "1.5px solid rgba(200, 155, 60, 0.4)",
            borderRadius: "18px",
            padding: "36px 28px",
            color: "#fbf5ef",
            textAlign: "center"
          }}>
            <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "28px", color: "#ffffff", margin: "0 0 10px" }}>
              Unsure Which Rudraksha Is Right For You?
            </h3>
            <p style={{ fontSize: "14px", color: "#d8c7b8", maxWidth: "600px", margin: "0 auto 24px", lineHeight: 1.6 }}>
              Our Astrologers and AI Spiritual Assistant analyze your date of birth, Kundali Rashi, and life intentions to recommend your ideal Mukhi combination.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
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
              <Link 
                to="/contact" 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(255,255,255,0.08)",
                  color: "#ffffff",
                  border: "1px solid rgba(200,155,60,0.3)",
                  padding: "11px 22px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13px",
                  textDecoration: "none"
                }}
              >
                Speak With Our Astrologer
              </Link>
            </div>
          </div>
        </section>

      </div>
    </Shell>
  );
}
