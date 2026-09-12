import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Sparkles, 
  Award, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  Droplet,
  Flame,
  Sun
} from "lucide-react";
import { useSeo } from "../hooks/useSeo";
import { getCanonicalUrl } from "../config/site";
import { Shell } from "../components/Shell";

export default function RudrakshaGuide() {
  const location = useLocation();
  const path = location.pathname;
  const [openFaq, setOpenFaq] = useState(0);

  // Content configuration based on guide route
  let guide = {
    type: "wear",
    h1: "How to Wear Rudraksha — Vedic Consecration, Mantras & Rules",
    title: "How to Wear Rudraksha — Consecration, Mantras & Rules | Aura Rudraksha",
    description: "Complete Vedic guide on wearing Rudraksha: auspicious days, Prana Pratishtha purification ritual, Beej mantras, and daily sacred guidelines.",
    canonical: getCanonicalUrl("/how-to-wear-rudraksha")
  };

  if (path.includes("benefits")) {
    guide = {
      type: "benefits",
      h1: "Rudraksha Benefits — Spiritual, Scientific & Bio-Electric Energy",
      title: "Rudraksha Benefits — Spiritual, Scientific & Health Energy | Aura Rudraksha",
      description: "Discover the spiritual and bio-magnetic benefits of Rudraksha: stress reduction, cardiac bio-frequency stabilization, mind focus, and planetary dosha pacification.",
      canonical: getCanonicalUrl("/rudraksha-benefits")
    };
  } else if (path.includes("authenticity")) {
    guide = {
      type: "authenticity",
      h1: "Rudraksha Authenticity & Lab Testing Guide — Real vs Fake",
      title: "Rudraksha Authenticity & Lab Testing Guide — Real vs Fake | Aura Rudraksha",
      description: "How to identify genuine Rudraksha: X-ray density radiography, copper coin myths vs science, natural mukhi continuity, and laboratory certificates.",
      canonical: getCanonicalUrl("/rudraksha-authenticity")
    };
  } else if (path.includes("care")) {
    guide = {
      type: "care",
      h1: "Rudraksha Care, Cleaning & Oiling Guide",
      title: "Rudraksha Care, Cleaning & Oiling Guide | Aura Rudraksha",
      description: "How to maintain, clean, oil, and store your sacred Rudraksha beads. Proper methods using Gangajal, natural mustard/sandalwood oil, and soft copper-bristle cleaning.",
      canonical: getCanonicalUrl("/rudraksha-care")
    };
  }

  useSeo({
    title: guide.title,
    description: guide.description,
    canonical: guide.canonical,
    ogType: "article"
  });

  const toggleFaq = (idx) => setOpenFaq(openFaq === idx ? -1 : idx);

  return (
    <Shell>
      <div className="bg-[#faf7f2] min-h-screen pb-20 text-[#2a160d]">
        {/* Breadcrumb Navigation */}
      <div className="border-b border-[#ebdccb] bg-white/70 backdrop-blur-sm sticky top-0 z-10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs sm:text-sm text-[#7a5843]">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 truncate">
            <Link to="/" className="hover:text-[#6f3518] transition">Home</Link>
            <ChevronRight className="w-3 h-3 text-[#bfa99b]" />
            <Link to="/rudraksha" className="hover:text-[#6f3518] transition">Sacred Guides</Link>
            <ChevronRight className="w-3 h-3 text-[#bfa99b]" />
            <span className="font-semibold text-[#6f3518] truncate">{guide.h1.split("—")[0]}</span>
          </nav>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 pt-10">
        {/* Guide Header */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#faeee4] text-[#8c3e1e] text-xs font-semibold tracking-wide uppercase mb-3 border border-[#ebdccb]">
            <BookOpen className="w-3.5 h-3.5" />
            Authentic Vedic Shastra Guide
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2a160d] tracking-tight leading-tight">
            {guide.h1}
          </h1>
          <p className="mt-4 text-[#6e5343] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {guide.description}
          </p>
        </header>

        {/* Dynamic Content Sections */}
        {guide.type === "wear" && (
          <div className="space-y-10">
            <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-2xl font-bold text-[#2a160d] mb-4 flex items-center gap-2">
                <Sun className="w-6 h-6 text-[#d4af37]" />
                1. Auspicious Days & Muhurta for First Wear
              </h2>
              <p className="text-[#5c493d] leading-relaxed mb-4">
                According to the Shiva Purana and classical Vedic tradition, Rudraksha should ideally be worn for the first time on an auspicious day:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#4a3427]">
                <li className="p-3 bg-[#fdfaf7] border border-[#ebdccb] rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#2f855a] shrink-0" />
                  <strong>Monday Morning:</strong> Sacred day of Lord Shiva during Brahma Muhurta (4:00 AM – 6:00 AM).
                </li>
                <li className="p-3 bg-[#fdfaf7] border border-[#ebdccb] rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#2f855a] shrink-0" />
                  <strong>Pradosh Vrat / Shivratri:</strong> Highly charged cosmic days for immediate spiritual alignment.
                </li>
                <li className="p-3 bg-[#fdfaf7] border border-[#ebdccb] rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#2f855a] shrink-0" />
                  <strong>Shravan Month:</strong> The holiest lunar month dedicated to Mahadeva.
                </li>
                <li className="p-3 bg-[#fdfaf7] border border-[#ebdccb] rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#2f855a] shrink-0" />
                  <strong>Guru Pushya Nakshatra:</strong> Auspicious for wealth and wisdom beads (5, 7, and 12 Mukhi).
                </li>
              </ul>
            </section>

            <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-2xl font-bold text-[#2a160d] mb-4 flex items-center gap-2">
                <Flame className="w-6 h-6 text-[#d9531e]" />
                2. Step-by-Step Vedic Prana Pratishtha (Purification Ritual)
              </h2>
              <p className="text-[#5c493d] leading-relaxed mb-4">
                If your Rudraksha has not been pre-energized by learned Vedic scholars, perform this simple Vedic sanctification at your home temple:
              </p>
              <ol className="space-y-4 text-sm sm:text-base text-[#4a3427]">
                <li className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-[#6f3518] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-[#2a160d]">Purify Your Body & Space:</strong> Take an early morning bath, wear clean traditional clothes, and sit facing East or North.
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-[#6f3518] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-[#2a160d]">Panchamrit / Ganga Jal Snan:</strong> Gently wash the sacred bead with holy Ganga water and unboiled cow milk in a copper or silver plate.
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-[#6f3518] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-[#2a160d]">Apply Sandalwood & Flowers:</strong> Pat the bead dry with a clean cloth, offer fragrant white sandalwood paste (Chandan), and fresh white or red flowers.
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-[#6f3518] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">4</span>
                  <div>
                    <strong className="text-[#2a160d]">Chant the Beej Mantra 108 Times:</strong> Hold the bead in your right hand and recite the Shiva Panchakshari Mantra <em>"Om Namah Shivaya"</em> or the specific Mukhi Beej mantra 108 times with focused devotion.
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-[#6f3518] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">5</span>
                  <div>
                    <strong className="text-[#2a160d]">Dharan (Wearing):</strong> Wear the bead around your neck with reverence, touching it lightly to your forehead (Ajna chakra) first.
                  </div>
                </li>
              </ol>
            </section>

            <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-2xl font-bold text-[#2a160d] mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-[#c05621]" />
                3. Daily Sacred Rules & Etiquette
              </h2>
              <ul className="space-y-2.5 text-sm sm:text-base text-[#4a3427]">
                <li className="flex items-start gap-2">
                  <span className="text-[#c05621] font-bold">•</span>
                  <span><strong>Bathing:</strong> Remove while taking a bath with commercial soap, shampoo, or chemical detergents to prevent drying out the bead's natural oils.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c05621] font-bold">•</span>
                  <span><strong>Sleeping:</strong> Removing Rudraksha before sleep prevents pressure damage and preserves its energetic sanctity. Keep it on your puja altar.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c05621] font-bold">•</span>
                  <span><strong>Funerals & Childbirth:</strong> Traditional texts recommend avoiding wearing Rudraksha during cremation grounds or sutak periods; re-energize with Ganga jal afterward.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c05621] font-bold">•</span>
                  <span><strong>Respect:</strong> Never touch Rudraksha with unwashed or unclean hands. Treat it as a living instrument of divine consciousness.</span>
                </li>
              </ul>
            </section>
          </div>
        )}

        {guide.type === "benefits" && (
          <div className="space-y-10">
            <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-2xl font-bold text-[#2a160d] mb-4">
                1. Scientific & Bio-Electric Properties
              </h2>
              <p className="text-[#5c493d] leading-relaxed mb-4">
                Modern bio-physical studies, including research conducted at Banaras Hindu University (BHU), demonstrate that genuine Rudraksha seeds exhibit unique dielectric, capacitive, and electromagnetic properties:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#4a3427]">
                <div className="p-4 bg-[#fdfaf7] border border-[#ebdccb] rounded-xl">
                  <strong className="text-[#2a160d] block mb-1">Dielectric Stabilization:</strong>
                  Acts as a capacitor that absorbs excess bio-electric currents, stabilizing human heart rhythms and reducing hyperactivity.
                </div>
                <div className="p-4 bg-[#fdfaf7] border border-[#ebdccb] rounded-xl">
                  <strong className="text-[#2a160d] block mb-1">Dynamic Polarity:</strong>
                  Exhibits diamagnetism and paramagnetic resonance that aligns with the earth's magnetic grid and soothes the central nervous system.
                </div>
              </div>
            </section>

            <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-2xl font-bold text-[#2a160d] mb-4">
                2. Vedic & Spiritual Benefits
              </h2>
              <ul className="space-y-3 text-sm sm:text-base text-[#4a3427]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-[#2f855a] shrink-0 mt-0.5" />
                  <span><strong>Aura Protection:</strong> Creates a protective energetic cocoon shielding against negative environmental vibrations and jealousy.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-[#2f855a] shrink-0 mt-0.5" />
                  <span><strong>Chakra Harmonization:</strong> Different Mukhi beads resonate with specific energy vortexes (Muladhara to Sahasrara) to dissolve mental blockages.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-[#2f855a] shrink-0 mt-0.5" />
                  <span><strong>Planetary Dosha Pacification:</strong> Pacifies afflicted planetary energies (such as Shani Sade Sati, Rahu/Ketu transit, and Mangal dosha) without the harsh rebound risks of gemstones.</span>
                </li>
              </ul>
            </section>
          </div>
        )}

        {guide.type === "authenticity" && (
          <div className="space-y-10">
            <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-2xl font-bold text-[#2a160d] mb-4">
                1. Scientific Laboratory Testing vs. Myths
              </h2>
              <p className="text-[#5c493d] leading-relaxed mb-4">
                Many street tests like the "copper coin rotation" or "floating in water" are unscientific myths. Let's examine the truth:
              </p>
              <div className="space-y-4 text-sm sm:text-base">
                <div className="p-4 bg-[#fff5f5] border border-[#fed7d7] rounded-xl text-[#742a2a]">
                  <strong>Myth — The Copper Coin Test:</strong> Rotating a bead between two coins is caused by moisture, natural surface friction, and minor involuntary hand tremors—not spiritual authenticity. Any round wooden bead can rotate.
                </div>
                <div className="p-4 bg-[#fff5f5] border border-[#fed7d7] rounded-xl text-[#742a2a]">
                  <strong>Myth — Sinking in Water:</strong> While unripe beads float and ripe beads sink, artificially weighted or chemically boiled fake wooden beads also sink. Water tests can also harm fragile seeds.
                </div>
                <div className="p-4 bg-[#f0fff4] border border-[#c6f6d5] rounded-xl text-[#22543d]">
                  <strong>Scientific Proof — X-Ray Radiography:</strong> Non-destructive X-ray imaging reveals the internal morphology. A genuine 5 Mukhi bead must show exactly 5 internal chambers (locules) with natural seeds inside. Carved or glued fakes reveal hollow air gaps or glue lines.
                </div>
              </div>
            </section>

            <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-2xl font-bold text-[#2a160d] mb-4">
                2. How Aura Rudraksha Guarantees 100% Purity
              </h2>
              <ul className="space-y-3 text-sm sm:text-base text-[#4a3427]">
                <li className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#8c3e1e] shrink-0 mt-0.5" />
                  <span><strong>Direct Himalayan Ashram Sourcing:</strong> Sourced directly from trusted plantations in eastern Nepal and Java without middlemen.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#8c3e1e] shrink-0 mt-0.5" />
                  <span><strong>Gemological Laboratory Certification:</strong> Each premium and collector bead comes with a government-recognized lab certificate card with report number and QR verification.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#8c3e1e] shrink-0 mt-0.5" />
                  <span><strong>Microscopic Line Inspection:</strong> We verify continuous natural ridges (mukhi grooves) under magnification to ensure no artificial carving.</span>
                </li>
              </ul>
            </section>
          </div>
        )}

        {guide.type === "care" && (
          <div className="space-y-10">
            <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-2xl font-bold text-[#2a160d] mb-4 flex items-center gap-2">
                <Droplet className="w-6 h-6 text-[#3182ce]" />
                1. Monthly Cleaning & Oiling Ritual
              </h2>
              <p className="text-[#5c493d] leading-relaxed mb-4">
                Rudraksha seeds are organic structures that absorb sweat, dirt, and body oils. Regular maintenance ensures they remain lustrous and crack-free for decades:
              </p>
              <ol className="space-y-3 text-sm sm:text-base text-[#4a3427]">
                <li className="flex gap-3">
                  <strong className="text-[#8c3e1e]">Step 1:</strong> Soak the bead in lukewarm pure water or Gangajal for 15 minutes to loosen trapped dust in the deep grooves.
                </li>
                <li className="flex gap-3">
                  <strong className="text-[#8c3e1e]">Step 2:</strong> Use a new soft toothbrush or copper-bristle brush to gently clean between the natural ridges without scratching the shell.
                </li>
                <li className="flex gap-3">
                  <strong className="text-[#8c3e1e]">Step 3:</strong> Allow the bead to air dry completely on a clean cotton towel.
                </li>
                <li className="flex gap-3">
                  <strong className="text-[#8c3e1e]">Step 4:</strong> Lightly coat the bead with pure natural mustard oil or pure sandalwood oil. Oil nourishes the seed and deepens its natural golden-brown aura.
                </li>
              </ol>
            </section>

            <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-2xl font-bold text-[#2a160d] mb-4">
                2. Storage & What to Avoid
              </h2>
              <ul className="space-y-2.5 text-sm sm:text-base text-[#4a3427]">
                <li className="flex items-start gap-2">
                  <span className="text-[#8c3e1e] font-bold">•</span>
                  <span><strong>Store in Natural Materials:</strong> Store in a wooden box, silver bowl, or pure cotton/silk pouch on your home altar when not worn. Avoid plastic containers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#8c3e1e] font-bold">•</span>
                  <span><strong>Avoid Synthetic Perfumes:</strong> Direct exposure to chemical perfumes, sprays, and hair dyes can damage the bead surface.</span>
                </li>
              </ul>
            </section>
          </div>
        )}

        {/* CTA to Shop Consecrated Beads */}
        <section className="mt-14 p-8 rounded-2xl bg-gradient-to-r from-[#2b170d] to-[#422112] text-white text-center shadow-md">
          <Sparkles className="w-10 h-10 text-[#d4af37] mx-auto mb-3" />
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#f7e3ce]">
            Explore Consecrated &amp; Lab-Certified Beads
          </h2>
          <p className="text-xs sm:text-sm text-[#ebdccb] mt-2 max-w-xl mx-auto leading-relaxed">
            Every sacred Rudraksha at Aura Rudraksha includes a verified gemological certificate, traditional Prana Pratishtha consecration, and free nationwide shipping.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link 
              to="/rudraksha" 
              className="px-6 py-2.5 bg-[#d4af37] text-[#2a160d] font-bold rounded-xl text-sm shadow-xs hover:bg-[#e5c04b] transition"
            >
              Browse Sacred Collection
            </Link>
            <Link 
              to="/rudraksha-calculator" 
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-medium transition"
            >
              Calculate Your Rashi Mukhi
            </Link>
          </div>
        </section>
      </article>
    </div>
    </Shell>
  );
}
