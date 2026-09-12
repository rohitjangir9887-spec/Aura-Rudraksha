import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Compass, 
  Sparkles, 
  Sun, 
  Moon, 
  ShieldCheck, 
  ChevronRight, 
  ArrowRight,
  HelpCircle,
  Award,
  CheckCircle
} from "lucide-react";
import { RASHI_RECOMMENDATIONS } from "../data/seoCatalogData";
import { useSeo } from "../hooks/useSeo";
import { getCanonicalUrl } from "../config/site";
import { Shell } from "../components/Shell";

export default function RudrakshaCalculator() {
  useSeo({
    title: "Vedic Rudraksha Recommendation Calculator & Rashi Guide | Aura Rudraksha",
    description: "Calculate your authentic Mukhi Rudraksha recommendation based on your Janma Rashi (Moon Sign), ruling planet, and life goals according to Vedic scriptures.",
    canonical: getCanonicalUrl("/rudraksha-calculator")
  });

  const [activeMode, setActiveMode] = useState("rashi"); // "rashi" or "goal"
  const [selectedRashi, setSelectedRashi] = useState(RASHI_RECOMMENDATIONS[0]);
  const [selectedGoal, setSelectedGoal] = useState("wealth");

  const GOAL_OPTIONS = [
    {
      id: "wealth",
      name: "Wealth, Business & Career Growth",
      deity: "Goddess Mahalakshmi & Lord Surya",
      recommendedMukhi: "7 Mukhi & 12 Mukhi",
      slug: "7-mukhi",
      benefit: "Blessed by Goddess Lakshmi and the 12 Adityas for sustained business prosperity, executive leadership, and removal of financial stagnation."
    },
    {
      id: "peace",
      name: "Mental Peace, Stress Relief & Meditation",
      deity: "Lord Kalagni Rudra (Shiva)",
      recommendedMukhi: "5 Mukhi & 108+1 Japa Mala",
      slug: "5-mukhi",
      benefit: "Regulates nervous system bio-electricity, calms hyperactive thought patterns, and promotes profound inner dhyana stillness."
    },
    {
      id: "study",
      name: "Studies, Memory & Competitive Exams",
      deity: "Lord Brahma & Goddess Saraswati",
      recommendedMukhi: "4 Mukhi & Ganesh Rudraksha",
      slug: "4-mukhi",
      benefit: "Awakens analytical intellect, photographic memory retention, vocal clarity, and removes exam performance anxiety."
    },
    {
      id: "marriage",
      name: "Marriage, Relationship Harmony & Love",
      deity: "Lord Ardhanarishvara & Gauri Shankar",
      recommendedMukhi: "2 Mukhi & Gauri Shankar",
      slug: "2-mukhi",
      benefit: "Heals interpersonal conflicts, harmonizes male and female energies, and removes hurdles in finding a compatible life partner."
    },
    {
      id: "protection",
      name: "Protection, Shani Sade Sati & Rahu Dosha",
      deity: "Lord Hanuman, Maa Durga & Mahavishnu",
      recommendedMukhi: "8 Mukhi, 9 Mukhi & 10 Mukhi",
      slug: "8-mukhi",
      benefit: "Acts as a supreme spiritual shield (Vishnu & Durga Kavach) neutralizing malicious planetary transits and sudden negative hurdles."
    }
  ];

  const currentGoalData = GOAL_OPTIONS.find(g => g.id === selectedGoal) || GOAL_OPTIONS[0];

  return (
    <Shell>
      <div className="bg-[#faf7f2] min-h-screen pb-20 text-[#2a160d]">
        {/* Breadcrumbs */}
      <div className="border-b border-[#ebdccb] bg-white/70 backdrop-blur-sm sticky top-0 z-10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs sm:text-sm text-[#7a5843]">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2">
            <Link to="/" className="hover:text-[#6f3518] transition">Home</Link>
            <ChevronRight className="w-3 h-3 text-[#bfa99b]" />
            <Link to="/rudraksha" className="hover:text-[#6f3518] transition">Astrology</Link>
            <ChevronRight className="w-3 h-3 text-[#bfa99b]" />
            <span className="font-semibold text-[#6f3518]">Rudraksha Calculator</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-10">
        {/* Header */}
        <header className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#faeee4] text-[#8c3e1e] text-xs font-semibold uppercase tracking-wide mb-3 border border-[#ebdccb]">
            <Compass className="w-3.5 h-3.5" />
            Vedic Astrological Intelligence
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2a160d] tracking-tight leading-tight">
            Rudraksha Recommendation Calculator
          </h1>
          <p className="mt-3 text-[#6e5343] text-sm sm:text-base leading-relaxed">
            Select your Janma Rashi (Moon sign) or your current life focus to receive an authentic, scripture-aligned Mukhi recommendation.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="mt-8 inline-flex p-1 rounded-xl bg-white border border-[#ebdccb] shadow-2xs">
            <button
              onClick={() => setActiveMode("rashi")}
              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeMode === "rashi" 
                  ? "bg-[#6f3518] text-white shadow-xs" 
                  : "text-[#5c493d] hover:text-[#2a160d]"
              }`}
            >
              Check by Rashi (Moon Sign)
            </button>
            <button
              onClick={() => setActiveMode("goal")}
              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeMode === "goal" 
                  ? "bg-[#6f3518] text-white shadow-xs" 
                  : "text-[#5c493d] hover:text-[#2a160d]"
              }`}
            >
              Check by Life Focus / Challenge
            </button>
          </div>
        </header>

        {/* Mode: Rashi Selector */}
        {activeMode === "rashi" && (
          <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs mb-10">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2a160d] mb-4 text-center">
              Select Your Janma Rashi (Moon Sign)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-8">
              {RASHI_RECOMMENDATIONS.map((r, i) => {
                const isSelected = selectedRashi.rashi === r.rashi;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedRashi(r)}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? "bg-[#6f3518] text-white border-[#6f3518] shadow-xs"
                        : "bg-[#fdfaf7] border-[#ebdccb] text-[#4a3427] hover:border-[#dfc4b0] hover:bg-[#faeee4]"
                    }`}
                  >
                    <div className="font-serif font-bold text-sm">{r.rashi.split(" ")[0]}</div>
                    <div className={`text-[11px] ${isSelected ? "text-[#f7e3ce]" : "text-[#7a5843]"}`}>
                      {r.rashi.includes("(") ? r.rashi.match(/\((.*?)\)/)?.[1] : ""} • {r.element}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Rashi Recommendation Result */}
            <div className="bg-[#faf7f2] border border-[#ebdccb] rounded-xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ebdccb]">
                <div>
                  <span className="text-xs uppercase font-semibold text-[#8c3e1e] tracking-wider">Astrological Recommendation</span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2a160d] mt-1">
                    {selectedRashi.rashi}
                  </h3>
                  <div className="text-xs sm:text-sm text-[#7a5843] mt-1">
                    Ruling Planet: <strong>{selectedRashi.ruler}</strong> • Element: <strong>{selectedRashi.element}</strong>
                  </div>
                </div>
                <div className="bg-white border border-[#ebdccb] px-4 py-2 rounded-xl text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-[#7a5843] block">Recommended Mukhi</span>
                  <span className="font-serif font-bold text-lg text-[#6f3518]">{selectedRashi.recommendedMukhi}</span>
                </div>
              </div>

              <div className="py-4">
                <h4 className="font-medium text-sm text-[#2a160d] mb-1">Vedic Astrological Significance:</h4>
                <p className="text-xs sm:text-sm text-[#5c493d] leading-relaxed">
                  {selectedRashi.primaryBenefit}
                </p>
              </div>

              <div className="pt-4 border-t border-[#ebdccb] flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#2f855a] font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  100% Genuine Lab Certified • Prana Pratishtha Consecrated
                </div>
                <Link
                  to={`/rudraksha/${selectedRashi.slug}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#6f3518] text-white font-medium rounded-xl text-xs sm:text-sm hover:bg-[#5a2a12] transition shadow-xs"
                >
                  View Consecrated {selectedRashi.slug.replace("-", " ").toUpperCase()} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Mode: Life Challenge / Goal */}
        {activeMode === "goal" && (
          <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 shadow-xs mb-10">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2a160d] mb-4 text-center">
              What is Your Primary Spiritual or Life Objective?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {GOAL_OPTIONS.map(g => {
                const isSelected = selectedGoal === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className={`p-4 rounded-xl border text-left transition flex items-start justify-between ${
                      isSelected
                        ? "bg-[#6f3518] text-white border-[#6f3518] shadow-xs"
                        : "bg-[#fdfaf7] border-[#ebdccb] text-[#4a3427] hover:border-[#dfc4b0] hover:bg-[#faeee4]"
                    }`}
                  >
                    <div>
                      <div className="font-serif font-bold text-sm">{g.name}</div>
                      <div className={`text-[11px] mt-1 ${isSelected ? "text-[#f7e3ce]" : "text-[#7a5843]"}`}>
                        Deity: {g.deity}
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-[#f7e3ce] shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {/* Selected Goal Result */}
            <div className="bg-[#faf7f2] border border-[#ebdccb] rounded-xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ebdccb]">
                <div>
                  <span className="text-xs uppercase font-semibold text-[#8c3e1e] tracking-wider">Aspiration Recommendation</span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2a160d] mt-1">
                    {currentGoalData.name}
                  </h3>
                  <div className="text-xs sm:text-sm text-[#7a5843] mt-1">
                    Divine Blessing: <strong>{currentGoalData.deity}</strong>
                  </div>
                </div>
                <div className="bg-white border border-[#ebdccb] px-4 py-2 rounded-xl text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-[#7a5843] block">Recommended Bead</span>
                  <span className="font-serif font-bold text-lg text-[#6f3518]">{currentGoalData.recommendedMukhi}</span>
                </div>
              </div>

              <div className="py-4">
                <h4 className="font-medium text-sm text-[#2a160d] mb-1">Spiritual Vibration & Action:</h4>
                <p className="text-xs sm:text-sm text-[#5c493d] leading-relaxed">
                  {currentGoalData.benefit}
                </p>
              </div>

              <div className="pt-4 border-t border-[#ebdccb] flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#2f855a] font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  Government-Approved Lab Certified Bead
                </div>
                <Link
                  to={`/rudraksha/${currentGoalData.slug}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#6f3518] text-white font-medium rounded-xl text-xs sm:text-sm hover:bg-[#5a2a12] transition shadow-xs"
                >
                  Explore {currentGoalData.recommendedMukhi.split("&")[0]} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Universal Auspiciousness Notice */}
        <section className="bg-white border border-[#ebdccb] rounded-2xl p-6 sm:p-8 text-center shadow-xs">
          <Sparkles className="w-8 h-8 text-[#d4af37] mx-auto mb-2" />
          <h3 className="font-serif text-xl font-bold text-[#2a160d]">
            The Universal Auspiciousness of 5 Mukhi (Panch Mukhi)
          </h3>
          <p className="text-xs sm:text-sm text-[#5c493d] max-w-xl mx-auto mt-2 leading-relaxed">
            In the Padma Purana, Lord Shiva states that the 5 Mukhi Rudraksha is governed by Kalagni Rudra and Jupiter, making it universally auspicious for all 12 zodiac signs without any astrological conflict. If you are uncertain of your birth chart, wearing a consecrated 5 Mukhi bead or 108+1 Japa Mala is always safe and spiritually uplifting.
          </p>
          <div className="mt-4">
            <Link
              to="/rudraksha/5-mukhi"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#8c3e1e] hover:underline"
            >
              Learn about 5 Mukhi Universal Blessings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
    </Shell>
  );
}
