import React, { useState } from "react";
import { Sparkles, Info, ChevronDown, ChevronUp, Layers, User, Calendar, MapPin, Clock, Compass, Table, Award, ShieldAlert, CheckCircle2, BookOpen, BarChart3, ShieldCheck, Zap } from "lucide-react";

/**
 * Authentic Vedic North Indian Kundali Chart & Complete Details Presentation
 * 
 * Geometrical North Indian Diamond Chart:
 * - 12 Houses (Bhavas) with fixed house geometry.
 * - House 1 (Lagna / Tanu Bhava) is the top central diamond.
 * - Houses progress counter-clockwise (1: Top center, 2: Top-left, 3: Left-top, 4: Left center, etc.)
 * - Rashi numbers (1..12) dynamically populated based on Lagna / Navamsha Rashi.
 * - Occupying planets placed inside their corresponding Bhava compartments with dignity badges.
 * - D1 (Lagna) and D9 (Navamsha) Chart View toggles.
 * - Full astronomical details accordion/cards view for Name, DOB, Time, Place, Lat/Lon, Timezone, 9 Planets Table, and 12 Bhavas & Lords.
 */

// Rashi names mapping
export const RASHI_MAP = [
  { num: 1, hindi: "मेष", eng: "Aries", symbol: "♈", lord: "मंगल", element: "अग्नि" },
  { num: 2, hindi: "वृषभ", eng: "Taurus", symbol: "♉", lord: "शुक्र", element: "पृथ्वी" },
  { num: 3, hindi: "मिथुन", eng: "Gemini", symbol: "♊", lord: "बुध", element: "वायु" },
  { num: 4, hindi: "कर्क", eng: "Cancer", symbol: "♋", lord: "चंद्र", element: "जल" },
  { num: 5, hindi: "सिंह", eng: "Leo", symbol: "♌", lord: "सूर्य", element: "अग्नि" },
  { num: 6, hindi: "कन्या", eng: "Virgo", symbol: "♍", lord: "बुध", element: "पृथ्वी" },
  { num: 7, hindi: "तुला", eng: "Libra", symbol: "♎", lord: "शुक्र", element: "वायु" },
  { num: 8, hindi: "वृश्चिक", eng: "Scorpio", symbol: "♏", lord: "मंगल", element: "जल" },
  { num: 9, hindi: "धनु", eng: "Sagittarius", symbol: "♐", lord: "गुरु", element: "अग्नि" },
  { num: 10, hindi: "मकर", eng: "Capricorn", symbol: "♑", lord: "शनि", element: "पृथ्वी" },
  { num: 11, hindi: "कुंभ", eng: "Aquarius", symbol: "♒", lord: "शनि", element: "वायु" },
  { num: 12, hindi: "मीन", eng: "Pisces", symbol: "♓", lord: "गुरु", element: "जल" }
];

// Planet abbreviations, icons, & colors
const PLANET_SHORT_MAP = {
  "सूर्य": { short: "सूर्य", eng: "Sun", icon: "☀️", color: "#B45309", bg: "#FEF3C7" },
  "sun": { short: "सूर्य", eng: "Sun", icon: "☀️", color: "#B45309", bg: "#FEF3C7" },
  "surya": { short: "सूर्य", eng: "Sun", icon: "☀️", color: "#B45309", bg: "#FEF3C7" },
  "चंद्र": { short: "चंद्र", eng: "Moon", icon: "🌙", color: "#0284C7", bg: "#E0F2FE" },
  "moon": { short: "चंद्र", eng: "Moon", icon: "🌙", color: "#0284C7", bg: "#E0F2FE" },
  "chandra": { short: "चंद्र", eng: "Moon", icon: "🌙", color: "#0284C7", bg: "#E0F2FE" },
  "मंगल": { short: "मंगल", eng: "Mars", icon: "🔴", color: "#DC2626", bg: "#FEE2E2" },
  "mars": { short: "मंगल", eng: "Mars", icon: "🔴", color: "#DC2626", bg: "#FEE2E2" },
  "mangal": { short: "मंगल", eng: "Mars", icon: "🔴", color: "#DC2626", bg: "#FEE2E2" },
  "बुध": { short: "बुध", eng: "Mercury", icon: "🟢", color: "#059669", bg: "#D1FAE5" },
  "mercury": { short: "बुध", eng: "Mercury", icon: "🟢", color: "#059669", bg: "#D1FAE5" },
  "budha": { short: "बुध", eng: "Mercury", icon: "🟢", color: "#059669", bg: "#D1FAE5" },
  "गुरु": { short: "गुरु", eng: "Jupiter", icon: "🟡", color: "#92400E", bg: "#FEF3C7" },
  "jupiter": { short: "गुरु", eng: "Jupiter", icon: "🟡", color: "#92400E", bg: "#FEF3C7" },
  "guru": { short: "गुरु", eng: "Jupiter", icon: "🟡", color: "#92400E", bg: "#FEF3C7" },
  "शुक्र": { short: "शुक्र", eng: "Venus", icon: "♀", color: "#7E22CE", bg: "#F3E8FF" },
  "venus": { short: "शुक्र", eng: "Venus", icon: "♀", color: "#7E22CE", bg: "#F3E8FF" },
  "shukra": { short: "शुक्र", eng: "Venus", icon: "♀", color: "#7E22CE", bg: "#F3E8FF" },
  "शनि": { short: "शनि", eng: "Saturn", icon: "🔵", color: "#1E3A8A", bg: "#DBEAFE" },
  "saturn": { short: "शनि", eng: "Saturn", icon: "🔵", color: "#1E3A8A", bg: "#DBEAFE" },
  "shani": { short: "शनि", eng: "Saturn", icon: "🔵", color: "#1E3A8A", bg: "#DBEAFE" },
  "राहु": { short: "राहु", eng: "Rahu", icon: "🟤", color: "#78350F", bg: "#FDE68A" },
  "rahu": { short: "राहु", eng: "Rahu", icon: "🟤", color: "#78350F", bg: "#FDE68A" },
  "केतु": { short: "केतु", eng: "Ketu", icon: "🟤", color: "#713F12", bg: "#FEF08A" },
  "ketu": { short: "केतु", eng: "Ketu", icon: "🟤", color: "#713F12", bg: "#FEF08A" }
};

export function getPlanetMeta(planetStr = "") {
  const pLower = String(planetStr).toLowerCase();
  for (const [k, meta] of Object.entries(PLANET_SHORT_MAP)) {
    if (pLower.includes(k)) return meta;
  }
  return { short: String(planetStr).slice(0, 4), eng: String(planetStr).slice(0, 2), icon: "✨", color: "#8C2B10", bg: "#FAF0E6" };
}

// 12 House Centers & Rashi number positions in North Indian SVG (400x400 viewBox)
const HOUSE_COORDS = {
  1:  { center: { x: 200, y: 110 }, rashiPos: { x: 200, y: 155 }, name: "लग्न / तनु (1st)", angle: "top-diamond" },
  2:  { center: { x: 105, y: 55 },  rashiPos: { x: 135, y: 80 },  name: "धन / कुटुंब (2nd)", angle: "top-left-triangle" },
  3:  { center: { x: 55,  y: 105 }, rashiPos: { x: 80,  y: 135 }, name: "सहज / पराक्रम (3rd)", angle: "left-top-triangle" },
  4:  { center: { x: 110, y: 200 }, rashiPos: { x: 155, y: 200 }, name: "सुख / मातृ (4th)", angle: "left-diamond" },
  5:  { center: { x: 55,  y: 295 }, rashiPos: { x: 80,  y: 265 }, name: "पुत्र / बुद्धि (5th)", angle: "left-bottom-triangle" },
  6:  { center: { x: 105, y: 345 }, rashiPos: { x: 135, y: 320 }, name: "रिपु / रोग (6th)", angle: "bottom-left-triangle" },
  7:  { center: { x: 200, y: 290 }, rashiPos: { x: 200, y: 245 }, name: "जाया / कलत्र (7th)", angle: "bottom-diamond" },
  8:  { center: { x: 295, y: 345 }, rashiPos: { x: 265, y: 320 }, name: "आयु / मृत्यु (8th)", angle: "bottom-right-triangle" },
  9:  { center: { x: 345, y: 295 }, rashiPos: { x: 320, y: 265 }, name: "भाग्य / धर्म (9th)", angle: "right-bottom-triangle" },
  10: { center: { x: 290, y: 200 }, rashiPos: { x: 245, y: 200 }, name: "कर्म / राज्य (10th)", angle: "right-diamond" },
  11: { center: { x: 345, y: 105 }, rashiPos: { x: 320, y: 135 }, name: "लाभ / आय (11th)", angle: "right-top-triangle" },
  12: { center: { x: 295, y: 55 },  rashiPos: { x: 265, y: 80 },  name: "व्यय / मोक्ष (12th)", angle: "top-right-triangle" }
};

export function VedicKundaliChart({
  lagnaRashiNumber = 1,
  navamshaLagnaRashiNumber = null,
  planets = [],
  title = "वैदिक कुण्डली चक्र",
  subtitle = "उत्तर भारतीय पारंपरिक शैली",
  birthData = null,
  fullKundaliData = null,
  className = ""
}) {
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [chartMode, setChartMode] = useState("D1"); // "D1" or "D9"
  const [showFullDetails, setShowFullDetails] = useState(false);

  // Normalize D1 lagna
  let safeD1Lagna = parseInt(lagnaRashiNumber, 10);
  if (isNaN(safeD1Lagna) || safeD1Lagna < 1 || safeD1Lagna > 12) safeD1Lagna = 1;

  // Normalize D9 lagna if available
  let safeD9Lagna = parseInt(navamshaLagnaRashiNumber, 10);
  if (isNaN(safeD9Lagna) || safeD9Lagna < 1 || safeD9Lagna > 12) {
    // Fallback: try to deduce from lagna navamsha or default to safeD1Lagna
    safeD9Lagna = safeD1Lagna;
  }

  const activeLagna = chartMode === "D9" ? safeD9Lagna : safeD1Lagna;

  // Calculate Rashi Number for each Bhava based on active chart mode
  const houseRashiMap = {};
  for (let h = 1; h <= 12; h++) {
    const rNum = ((activeLagna + h - 2) % 12) + 1;
    houseRashiMap[h] = rNum;
  }

  // Group planets by house number depending on chart mode
  const housePlanets = {};
  for (let h = 1; h <= 12; h++) housePlanets[h] = [];

  planets.forEach(p => {
    let targetHouse = null;

    if (chartMode === "D9" && p.navamshaRashiHindi) {
      // Calculate D9 house position based on Navamsha Rashi vs D9 Lagna
      const d9RashiObj = RASHI_MAP.find(r => r.hindi === p.navamshaRashiHindi || r.eng === p.navamshaRashiEnglish);
      if (d9RashiObj) {
        targetHouse = ((d9RashiObj.num - safeD9Lagna + 12) % 12) + 1;
      }
    }

    if (!targetHouse) {
      let hNum = parseInt(p.houseNumber || p.house, 10);
      if (isNaN(hNum) || hNum < 1 || hNum > 12) {
        const match = String(p.houseNumber || p.house || "").match(/(\d+)/);
        if (match) hNum = parseInt(match[1], 10);
      }
      targetHouse = (hNum >= 1 && hNum <= 12) ? hNum : 1;
    }

    if (targetHouse >= 1 && targetHouse <= 12) {
      housePlanets[targetHouse].push(p);
    }
  });

  const activeHouseDetails = selectedHouse ? {
    houseNum: selectedHouse,
    name: HOUSE_COORDS[selectedHouse]?.name,
    rashiNum: houseRashiMap[selectedHouse],
    rashi: RASHI_MAP.find(r => r.num === houseRashiMap[selectedHouse]),
    planets: housePlanets[selectedHouse]
  } : null;

  return (
    <div className={`w-full max-w-[460px] mx-auto my-3.5 p-3.5 bg-gradient-to-b from-[#FFFDF8] via-[#FAF4E8] to-[#F5EAD8] border-2 border-[#C89B3C] rounded-2xl shadow-xl overflow-hidden ${className}`}>
      
      {/* Header with D1 / D9 Switcher */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E0D0C0]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg leading-none text-[#8C2B10]">🕉️</span>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-[#4A0E17] leading-tight truncate">
              {chartMode === "D1" ? "जन्म लग्न कुण्डली (D1)" : "नवांश कुण्डली (D9)"}
            </h4>
            <p className="text-[10.5px] text-[#7A685B] font-medium truncate">
              लग्न: {RASHI_MAP.find(r => r.num === activeLagna)?.hindi || "मेष"} ({RASHI_MAP.find(r => r.num === activeLagna)?.eng})
            </p>
          </div>
        </div>

        {/* D1 / D9 Mode Tabs */}
        <div className="flex items-center bg-[#EDE0D0] p-0.5 rounded-lg border border-[#D4C3B0]">
          <button
            type="button"
            onClick={() => { setChartMode("D1"); setSelectedHouse(null); }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
              chartMode === "D1"
                ? "bg-[#8C2B10] text-white shadow-sm"
                : "text-[#6A5343] hover:text-[#4A0E17]"
            }`}
          >
            D1 लग्न
          </button>
          <button
            type="button"
            onClick={() => { setChartMode("D9"); setSelectedHouse(null); }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
              chartMode === "D9"
                ? "bg-[#8C2B10] text-white shadow-sm"
                : "text-[#6A5343] hover:text-[#4A0E17]"
            }`}
          >
            D9 नवांश
          </button>
        </div>
      </div>

      {/* SVG North Indian Diamond Chart Container */}
      <div className="relative w-full aspect-square max-w-[390px] mx-auto select-none">
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full cursor-pointer rounded-xl overflow-hidden"
          style={{ filter: "drop-shadow(0 3px 10px rgba(74, 14, 23, 0.12))" }}
        >
          <defs>
            <linearGradient id="chartBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFDF9" />
              <stop offset="50%" stopColor="#FAF3E6" />
              <stop offset="100%" stopColor="#F5E8D4" />
            </linearGradient>

            <linearGradient id="kendraHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.4" />
            </linearGradient>

            <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#4A0E17" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Outer Border Box */}
          <rect
            x="10"
            y="10"
            width="380"
            height="380"
            fill="url(#chartBgGrad)"
            stroke="#8C2B10"
            strokeWidth="3"
            rx="6"
          />

          {/* Kendra Diamonds Shading (Houses 1, 4, 7, 10) */}
          <polygon points="200,10 295,105 200,200 105,105" fill="url(#kendraHighlight)" />
          <polygon points="10,200 105,105 200,200 105,295" fill="url(#kendraHighlight)" />
          <polygon points="200,200 105,295 200,390 295,295" fill="url(#kendraHighlight)" />
          <polygon points="200,200 295,105 390,200 295,295" fill="url(#kendraHighlight)" />

          {/* Diagonals */}
          <line x1="10" y1="10" x2="390" y2="390" stroke="#8C2B10" strokeWidth="2" />
          <line x1="10" y1="390" x2="390" y2="10" stroke="#8C2B10" strokeWidth="2" />

          {/* Inner Diamond */}
          <polygon
            points="200,10 390,200 200,390 10,200"
            fill="none"
            stroke="#8C2B10"
            strokeWidth="2.5"
          />

          {/* Inner Gold Border Trim */}
          <rect
            x="14"
            y="14"
            width="372"
            height="372"
            fill="none"
            stroke="#C89B3C"
            strokeWidth="1"
            strokeDasharray="4 2"
            rx="4"
          />

          {/* 12 House Compartments & Planet Rendering */}
          {Array.from({ length: 12 }, (_, idx) => {
            const h = idx + 1;
            const coord = HOUSE_COORDS[h];
            const rNum = houseRashiMap[h];
            const pList = housePlanets[h] || [];
            const isSelected = selectedHouse === h;
            const isKendra = [1, 4, 7, 10].includes(h);

            return (
              <g
                key={h}
                onClick={() => setSelectedHouse(isSelected ? null : h)}
                className="transition-all duration-150 cursor-pointer"
              >
                {/* Selected House Highlight */}
                {isSelected && (
                  <circle
                    cx={coord.center.x}
                    cy={coord.center.y}
                    r="32"
                    fill="#C89B3C"
                    fillOpacity="0.2"
                    stroke="#8C2B10"
                    strokeWidth="1.5"
                  />
                )}

                {/* Rashi Number */}
                <text
                  x={coord.rashiPos.x}
                  y={coord.rashiPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="12"
                  fontWeight="800"
                  fill={isKendra ? "#8C2B10" : "#B45309"}
                  opacity="0.85"
                >
                  {rNum}
                </text>

                {/* Planets inside House */}
                {pList.length === 0 ? (
                  <text
                    x={coord.center.x}
                    y={coord.center.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="9"
                    fill="#B8A394"
                    opacity="0.4"
                  >
                    —
                  </text>
                ) : (
                  pList.map((p, pIdx) => {
                    const pNameClean = (p.planetName || p.name || "").replace(/\(.*\)/, "").trim();
                    const meta = getPlanetMeta(pNameClean);
                    const totalP = pList.length;
                    
                    // Space multi-planet items gracefully
                    const rowHeight = totalP > 2 ? 12 : 14;
                    const startY = coord.center.y - ((totalP - 1) * rowHeight) / 2;
                    const y = startY + pIdx * rowHeight;
                    
                    const isExalted = String(p.status || p.dignity || "").includes("उच्च") || String(p.status || "").includes("Exalted");
                    const isDebilitated = String(p.status || p.dignity || "").includes("नीच") || String(p.status || "").includes("Debilitated");
                    const isVakri = String(p.status || p.dignity || "").includes("वक्री") || String(p.status || "").includes("Retrograde");

                    return (
                      <g key={pIdx}>
                        {/* Background pill behind text for crisp legibility */}
                        <rect
                          x={coord.center.x - 22}
                          y={y - 6}
                          width="44"
                          height="12"
                          rx="3"
                          fill="#FFFDF8"
                          fillOpacity="0.85"
                          stroke={isDebilitated ? "#EF4444" : (isExalted ? "#10B981" : meta.color)}
                          strokeWidth="0.8"
                        />
                        <text
                          x={coord.center.x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="9.5"
                          fontWeight="800"
                          fill={isDebilitated ? "#DC2626" : (isExalted ? "#059669" : meta.color)}
                        >
                          {meta.short}
                          {p.degreeInSign && <tspan fontSize="7" opacity="0.8"> {String(p.degreeInSign).split("°")[0]}°</tspan>}
                          {isExalted && <tspan fontSize="8" fill="#D97706">★</tspan>}
                          {isDebilitated && <tspan fontSize="7" fill="#DC2626">▼</tspan>}
                          {isVakri && <tspan fontSize="7" fill="#9333EA">☊</tspan>}
                        </text>
                      </g>
                    );
                  })
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* House Inspector Drawer / Detail Pill */}
      {activeHouseDetails && (
        <div className="mt-3 p-2.5 bg-[#FFFDF9] border border-[#C89B3C]/80 rounded-xl text-xs text-[#4A0E17] shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between font-bold pb-1.5 border-b border-[#E0D0C0] text-[11.5px]">
            <span className="flex items-center gap-1">
              <Compass size={13} className="text-[#8C2B10]" />
              {activeHouseDetails.name}
            </span>
            <span className="text-[#8C2B10]">
              राशि: {activeHouseDetails.rashi?.hindi} ({activeHouseDetails.rashi?.symbol}) • स्वामी: {activeHouseDetails.rashi?.lord}
            </span>
          </div>
          <div className="mt-1.5">
            {activeHouseDetails.planets.length === 0 ? (
              <span className="text-[11px] text-stone-500 italic">इस भाव में कोई प्रत्यक्ष ग्रह स्थित नहीं है।</span>
            ) : (
              <div className="space-y-1 mt-1">
                {activeHouseDetails.planets.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 px-2 py-1 bg-[#FEF3C7]/60 border border-[#FCD34D]/50 rounded-md text-[11px] font-medium text-[#78350F]"
                  >
                    <span className="font-bold flex items-center gap-1">
                      <span>{getPlanetMeta(p.planetName || p.name).icon}</span>
                      <span>{p.planetName || p.name}</span>
                      {p.degreeInSign && <span className="text-[10px] text-amber-800 font-normal">({p.degreeInSign})</span>}
                    </span>
                    <span className="text-[10px] font-bold text-[#8C2B10]">
                      {p.status || p.dignity || "शुभ स्थिति"}
                      {p.nakshatra && ` • ${p.nakshatra}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart Legend & Actions */}
      <div className="mt-2.5 pt-2 border-t border-[#E0D0C0] flex items-center justify-between text-[10.5px] text-[#6A5343]">
        <span className="flex items-center gap-1">
          <Info size={11} className="text-[#8C2B10]" />
          <span>भाव पर टैप करके स्वामी व ग्रह देखें</span>
        </span>
        <span className="font-semibold text-[#8C2B10] flex items-center gap-1.5">
          <span>★ उच्च</span>
          <span>•</span>
          <span>▼ नीच</span>
          <span>•</span>
          <span>☊ वक्री</span>
        </span>
      </div>

      {/* Toggle Full Astronomical Details Accordion */}
      {(birthData || fullKundaliData) && (
        <div className="mt-3 pt-2.5 border-t border-[#D4C3B0]">
          <button
            type="button"
            onClick={() => setShowFullDetails(!showFullDetails)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#8C2B10] hover:bg-[#681523] text-white font-bold text-xs rounded-xl transition shadow-sm"
          >
            <span className="flex items-center gap-1.5">
              <Table size={14} />
              <span>संपूर्ण कुंडली विवरण एवं ग्रह स्थिति देखें</span>
            </span>
            {showFullDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showFullDetails && (
            <div className="mt-3 space-y-3.5 animate-fadeIn">
              <VedicKundaliDetails birthData={birthData} fullKundaliData={fullKundaliData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Complete Astronomical & Astrological Details Section
 */
export function VedicKundaliDetails({ birthData, fullKundaliData }) {
  const astro = fullKundaliData?.astronomicalKundali || fullKundaliData || {};
  const birth = birthData || fullKundaliData?.verifiedBirthData || {};
  const planets = astro.planets || [];

  return (
    <div className="space-y-3 text-xs text-[#2B1408]">
      
      {/* 1. Birth Details Box */}
      <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
        <div className="flex items-center gap-1.5 pb-1 border-b border-[#E0D0C0] font-bold text-[#8C2B10] text-[12.5px]">
          <User size={14} />
          <span>जन्म विवरण (Verified Birth Profile)</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div><span className="text-[#7A685B]">नाम:</span> <b>{birth.name || "भक्त"}</b></div>
          <div><span className="text-[#7A685B]">जन्म तिथि:</span> <b>{birth.dob || "—"}</b></div>
          <div><span className="text-[#7A685B]">जन्म समय:</span> <b>{birth.birthTime || "—"}</b></div>
          <div><span className="text-[#7A685B]">जन्म स्थान:</span> <b>{birth.birthPlace || "—"}</b></div>
          {birth.coordinates && (
            <div className="col-span-2 text-[10.5px] text-[#7A685B]">
              अक्षांश/रेखांश: <b>{birth.coordinates.lat}° N, {birth.coordinates.lon}° E</b> • Timezone: <b>+{birth.coordinates.tz || 5.5} IST</b>
            </div>
          )}
          {birth.ayanamsha && (
            <div className="col-span-2 text-[10.5px] text-[#7A685B]">
              अयानांश: <b>{birth.ayanamsha}</b>
            </div>
          )}
        </div>
      </div>

      {/* 2. Key Vedic Metrics Summary */}
      {astro.lagna && (
        <div className="p-3 bg-[#FEF3C7]/50 border border-[#FCD34D]/60 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5 pb-1 border-b border-[#FCD34D]/60 font-bold text-[#78350F] text-[12.5px]">
            <Award size={14} />
            <span>मुख्य ज्योतिषीय गणना (Core Astro Summary)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#78350F]">
            <div><span className="opacity-80">लग्न:</span> <b>{astro.lagna.rashiHindi} ({astro.lagna.degree})</b></div>
            <div><span className="opacity-80">लग्न स्वामी:</span> <b>{astro.lagna.lord}</b></div>
            <div><span className="opacity-80">चंद्र राशि:</span> <b>{astro.chandraRashi?.rashiHindi} ({astro.chandraRashi?.degree})</b></div>
            <div><span className="opacity-80">चंद्र नक्षत्र:</span> <b>{astro.chandraRashi?.nakshatra} (चरण {astro.chandraRashi?.pada})</b></div>
            <div><span className="opacity-80">सूर्य राशि:</span> <b>{astro.suryaRashi?.rashiHindi} ({astro.suryaRashi?.degree})</b></div>
            <div><span className="opacity-80">मूलांक:</span> <b>अंक {astro.mulank || "—"}</b></div>
          </div>
        </div>
      )}

      {/* 3. Complete 9 Planets Position Table */}
      {planets.length > 0 && (
        <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-[#E0D0C0] font-bold text-[#8C2B10] text-[12.5px]">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>नवग्रह विस्तृत स्थिति तालिका (9 Planets Table)</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#FAF3E6] border-b border-[#E0D0C0] text-[#5C1C0A] font-bold">
                  <th className="p-1.5">ग्रह</th>
                  <th className="p-1.5">राशि व अंश</th>
                  <th className="p-1.5">भाव</th>
                  <th className="p-1.5">नक्षत्र & चरण</th>
                  <th className="p-1.5">स्थिति</th>
                  <th className="p-1.5">D9 नवांश</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3E8DC]">
                {planets.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[#FEF9F0] transition">
                    <td className="p-1.5 font-bold text-[#8C2B10] whitespace-nowrap">
                      {getPlanetMeta(p.name).icon} {p.name || p.englishName}
                    </td>
                    <td className="p-1.5 whitespace-nowrap">
                      {p.rashiHindi} ({p.degreeInSign})
                    </td>
                    <td className="p-1.5 font-bold text-[#78350F]">
                      {p.houseNumber}वाँ भाव
                    </td>
                    <td className="p-1.5 whitespace-nowrap">
                      {p.nakshatra} (चरण {p.pada})
                    </td>
                    <td className="p-1.5 font-bold text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded ${
                        String(p.dignity || p.status || "").includes("उच्च")
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : String(p.dignity || p.status || "").includes("नीच")
                          ? "bg-red-100 text-red-800 border border-red-300"
                          : "bg-amber-100 text-amber-900 border border-amber-200"
                      }`}>
                        {p.dignity || p.status || "शुभ"}
                      </span>
                    </td>
                    <td className="p-1.5 text-[#5C1C0A] font-semibold">
                      {p.navamshaRashiHindi || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. 12 Bhavas & House Lords */}
      {astro.lagna && (
        <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5 pb-1 border-b border-[#E0D0C0] font-bold text-[#8C2B10] text-[12.5px]">
            <Compass size={14} />
            <span>12 भाव एवं भाव स्वामी (12 Bhavas & Lords)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10.5px]">
            {Array.from({ length: 12 }, (_, i) => {
              const hNum = i + 1;
              const rNum = ((astro.lagna.rashiIndex + i) % 12) + 1;
              const rashiObj = RASHI_MAP.find(r => r.num === rNum) || RASHI_MAP[0];
              const bhavaCoord = HOUSE_COORDS[hNum];

              return (
                <div key={hNum} className="p-1.5 bg-[#FAF3E6]/70 border border-[#E0D0C0] rounded-lg">
                  <div className="font-bold text-[#8C2B10]">{bhavaCoord.name.split(" ")[0]} ({hNum}st)</div>
                  <div className="text-[#7A685B]">राशि: <b>{rashiObj.hindi}</b> ({rashiObj.symbol})</div>
                  <div className="text-[#5C1C0A]">स्वामी: <b>{rashiObj.lord}</b></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Complete 4-Level Vimshottari Dasha System (Mahadasha -> Antardasha -> Pratyantardasha -> Sookshma Dasha) */}
      {(astro.vimshottariDasha || fullKundaliData?.vimshottariDasha) && (() => {
        const dasha = astro.vimshottariDasha || fullKundaliData?.vimshottariDasha || {};
        return (
          <div className="p-3.5 bg-[#FFFDF9] border border-[#B8860B]/40 rounded-xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E0D0C0]">
              <div className="flex items-center gap-1.5 font-bold text-[#8C2B10] text-[13px]">
                <Clock size={15} className="text-[#B8860B]" />
                <span>विंशोत्तरी संपूर्ण दशा प्रणाली (4-Level Dasha Chain)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold border border-[#F59E0B]/30">
                120 वर्ष समय चक्र
              </span>
            </div>

            {/* Current Active 4-Level Chain Header */}
            <div className="p-2.5 bg-gradient-to-r from-[#782218] to-[#9a3412] text-white rounded-lg shadow-xs space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-[#fde68a] font-semibold">वर्तमान में सक्रिय दशा श्रृंखला (Current Active Chain)</div>
              <div className="text-[13px] font-extrabold flex flex-wrap items-center gap-1 text-white">
                <span className="bg-[#5c1c0a] px-2 py-0.5 rounded border border-[#fef08a]/40">{dasha.currentMahadashaHindi || "महादशा"}</span>
                <span className="text-[#fde68a]">→</span>
                <span className="bg-[#5c1c0a] px-2 py-0.5 rounded border border-[#fef08a]/40">{dasha.currentAntardashaHindi || "अंतर्दशा"}</span>
                <span className="text-[#fde68a]">→</span>
                <span className="bg-[#b45309] px-2 py-0.5 rounded border border-[#fef08a]/40">{dasha.currentPratyantardashaHindi || "प्रत्यंतर"}</span>
                <span className="text-[#fde68a]">→</span>
                <span className="bg-[#15803d] px-2 py-0.5 rounded border border-[#fef08a]/40">{dasha.currentSookshmaDashaHindi || "सूक्ष्म"}</span>
              </div>
            </div>

            {/* 4 Cards Grid for MD, AD, PD, SD */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {/* Level 1: Mahadasha */}
              <div className="p-2 bg-[#FEF3C7]/60 border border-[#FCD34D] rounded-lg space-y-0.5">
                <div className="text-[10px] font-bold text-[#92400E]">1. महादशा (Mahadasha)</div>
                <div className="text-[12.5px] font-extrabold text-[#78350F]">{dasha.currentMahadashaHindi}</div>
                <div className="text-[10px] text-[#B45309]">
                  {dasha.mahadashaStartDate ? `${dasha.mahadashaStartDate} से ${dasha.mahadashaEndDate}` : "सक्रिय"}
                </div>
              </div>

              {/* Level 2: Antardasha */}
              <div className="p-2 bg-[#FEF3C7]/60 border border-[#FCD34D] rounded-lg space-y-0.5">
                <div className="text-[10px] font-bold text-[#92400E]">2. अंतर्दशा (Antardasha)</div>
                <div className="text-[12.5px] font-extrabold text-[#78350F]">{dasha.currentAntardashaHindi}</div>
                <div className="text-[10px] text-[#B45309]">
                  {dasha.antardashaStartDate ? `${dasha.antardashaStartDate} से ${dasha.antardashaEndDate}` : "सक्रिय"}
                </div>
              </div>

              {/* Level 3: Pratyantardasha */}
              <div className="p-2 bg-[#E0F2FE]/70 border border-[#38BDF8] rounded-lg space-y-0.5">
                <div className="text-[10px] font-bold text-[#0369A1]">3. प्रत्यंतर दशा (Pratyantardasha)</div>
                <div className="text-[12.5px] font-extrabold text-[#075985]">{dasha.currentPratyantardashaHindi || "सक्रिय"}</div>
                <div className="text-[10px] text-[#0284C7]">
                  {dasha.pratyantardashaStartDate ? `${dasha.pratyantardashaStartDate} से ${dasha.pratyantardashaEndDate}` : "सक्रिय"}
                </div>
              </div>

              {/* Level 4: Sookshma Dasha */}
              <div className="p-2 bg-[#DCFCE7]/70 border border-[#4ADE80] rounded-lg space-y-0.5">
                <div className="text-[10px] font-bold text-[#15803D]">4. सूक्ष्म दशा (Sookshma Dasha)</div>
                <div className="text-[12.5px] font-extrabold text-[#166534]">{dasha.currentSookshmaDashaHindi || "सक्रिय"}</div>
                <div className="text-[10px] text-[#16a34a]">
                  {dasha.sookshmaDashaStartDate ? `${dasha.sookshmaDashaStartDate} से ${dasha.sookshmaDashaEndDate}` : "सक्रिय"}
                </div>
              </div>
            </div>

            {/* Pratyantardasha Timeline Breakdown */}
            {Array.isArray(dasha.pratyantardashasTimeline) && dasha.pratyantardashasTimeline.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-[#E0D0C0]">
                <div className="text-[11px] font-bold text-[#8C2B10] flex items-center justify-between">
                  <span>वर्तमान अंतर्दशा में 9 प्रत्यंतर दशाएं (Pratyantardashas Timeline):</span>
                  <span className="text-[10px] text-[#78350F] font-normal">({dasha.currentAntardashaHindi} के अंतर्गत)</span>
                </div>
                <div className="flex flex-wrap gap-1 text-[10.5px]">
                  {dasha.pratyantardashasTimeline.map((item, pIdx) => (
                    <div 
                      key={pIdx}
                      className={`px-2 py-1 rounded border transition ${
                        item.isCurrent
                          ? "bg-[#0284C7] text-white border-[#0284C7] font-bold shadow-xs"
                          : "bg-[#FAF3E6] text-[#4A3B2C] border-[#E0D0C0]"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span>{item.planetHindi}</span>
                        {item.isCurrent && <span className="text-[9px] bg-white text-[#0284C7] px-1 rounded">सक्रिय</span>}
                      </div>
                      <div className={`text-[9px] ${item.isCurrent ? "text-sky-100" : "text-[#7A685B]"}`}>
                        {item.startDate} ~ {item.endDate}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sookshma Dasha Timeline Breakdown */}
            {Array.isArray(dasha.sookshmaDashasTimeline) && dasha.sookshmaDashasTimeline.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-[#E0D0C0]">
                <div className="text-[11px] font-bold text-[#15803D] flex items-center justify-between">
                  <span>वर्तमान प्रत्यंतर दशा में 9 सूक्ष्म दशाएं (Sookshma Dashas Timeline):</span>
                  <span className="text-[10px] text-[#166534] font-normal">({dasha.currentPratyantardashaHindi} के अंतर्गत)</span>
                </div>
                <div className="flex flex-wrap gap-1 text-[10.5px]">
                  {dasha.sookshmaDashasTimeline.map((item, sIdx) => (
                    <div 
                      key={sIdx}
                      className={`px-2 py-1 rounded border transition ${
                        item.isCurrent
                          ? "bg-[#15803D] text-white border-[#15803D] font-bold shadow-xs"
                          : "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span>{item.planetHindi}</span>
                        {item.isCurrent && <span className="text-[9px] bg-white text-[#15803D] px-1 rounded">सक्रिय</span>}
                      </div>
                      <div className={`text-[9px] ${item.isCurrent ? "text-green-100" : "text-[#15803D]"}`}>
                        {item.startDate} ~ {item.endDate}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 6. Avakahada Chakra (अवकहड़ा चक्र एवं शुभ/अशुभ बिंदु) */}
      {astro.avakahadaChakra && (() => {
        const ava = astro.avakahadaChakra;
        return (
          <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
            <div className="flex items-center gap-1.5 pb-1 border-b border-[#E0D0C0] font-bold text-[#8C2B10] text-[12.5px]">
              <BookOpen size={14} className="text-[#8C2B10]" />
              <span>अवकहड़ा चक्र एवं शुभ/घातक तत्व (Avakahada Chakra)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">पाया:</span> <b className="text-[#8C2B10]">{ava.paya}</b></div>
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">वर्ण:</span> <b>{ava.varna}</b></div>
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">योनि:</span> <b>{ava.yoni}</b></div>
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">गण:</span> <b>{ava.gana}</b></div>
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">वश्य:</span> <b>{ava.vashya}</b></div>
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">नाड़ी:</span> <b className="text-[#B45309]">{ava.nadi}</b></div>
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">मूलांक:</span> <b>{ava.mulank}</b></div>
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">भाग्यांक:</span> <b>{ava.bhagyank}</b></div>
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">शुभ अंक:</span> <b className="text-emerald-700">{ava.shubhAnk}</b></div>
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">शुभ दिन:</span> <b>{ava.shubhDin}</b></div>
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">शुभ धातु:</span> <b>{ava.shubhDhatu}</b></div>
              <div className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0]"><span className="text-[#7A685B]">शुभ रत्न:</span> <b>{ava.shubhRatna}</b></div>
            </div>
            {ava.ghatakVaar && (
              <div className="p-2 bg-red-50/70 border border-red-200 rounded text-[10.5px] text-red-900 space-y-0.5">
                <div className="font-bold text-red-800">घातक चक्र (सावधानी तत्व):</div>
                <div>घातक वार: <b>{ava.ghatakVaar}</b> • घातक मास: <b>{ava.ghatakMas}</b> • घातक तिथि: <b>{ava.ghatakTithi}</b> • घातक नक्षत्र: <b>{ava.ghatakNak}</b></div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 7. Shodashvarga (16 Divisional Charts Explorer) */}
      {Array.isArray(astro.shodashvarga) && astro.shodashvarga.length > 0 && (
        <ShodashvargaExplorer shodashvarga={astro.shodashvarga} />
      )}

      {/* 8. Shadbala & Bhavabala (षड्बल व भावबल) */}
      {astro.shadbala && (
        <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-[#E0D0C0]">
            <div className="flex items-center gap-1.5 font-bold text-[#8C2B10] text-[12.5px]">
              <BarChart3 size={14} className="text-[#8C2B10]" />
              <span>सप्तग्रह षड्बल व भावबल (Shadbala & Strength)</span>
            </div>
            <span className="text-[10px] text-[#7A685B]">रूपा में मापदंड</span>
          </div>

          <div className="space-y-1.5">
            {astro.shadbala.planetShadbala?.map((pl, pIdx) => (
              <div key={pIdx} className="p-1.5 bg-[#FAF3E6]/80 border border-[#E0D0C0] rounded-lg text-[11px]">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#5C1C0A] flex items-center gap-1">
                    <span>{getPlanetMeta(pl.planet).icon}</span>
                    <span>{pl.planet}</span>
                    <span className="text-[10px] font-normal text-amber-900">Rank #{pl.rank}</span>
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    pl.isSufficient ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}>
                    {pl.totalRupas} Rupa ({pl.status})
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-3 sm:grid-cols-6 gap-1 text-[9.5px] text-[#7A685B]">
                  <div>स्थान: <b>{pl.sthanaBala}</b></div>
                  <div>दिग्: <b>{pl.digBala}</b></div>
                  <div>काल: <b>{pl.kaalaBala}</b></div>
                  <div>चेष्टा: <b>{pl.cheshtaBala}</b></div>
                  <div>नैसर्गिक: <b>{pl.naisargikaBala}</b></div>
                  <div>दृग्: <b>{pl.drikBala}</b></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. Ashtakvarga & Sarvashtakvarga (SAV) */}
      {astro.ashtakvarga && (
        <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-[#E0D0C0]">
            <div className="flex items-center gap-1.5 font-bold text-[#8C2B10] text-[12.5px]">
              <Table size={14} className="text-[#8C2B10]" />
              <span>सर्वाष्टकवर्ग (Sarvashtakvarga - SAV Points)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">कुल 337 बिंदु</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-[11px]">
            {astro.ashtakvarga.sarvashtakvarga?.map((sav, sIdx) => (
              <div key={sIdx} className={`p-1.5 rounded border text-center ${
                sav.points >= 30 ? "bg-emerald-50 border-emerald-300 text-emerald-900" :
                sav.points >= 28 ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-red-50 border-red-200 text-red-900"
              }`}>
                <div className="font-bold text-[11.5px]">{sav.rashiName}</div>
                <div className="text-[13px] font-black">{sav.points} pts</div>
                <div className="text-[9px] opacity-80">{sav.grade.split(" ")[0]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. KP System (Krishnamurti Paddhati) */}
      {astro.kpSystem && (
        <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5 pb-1 border-b border-[#E0D0C0] font-bold text-[#8C2B10] text-[12.5px]">
            <Zap size={14} className="text-[#B8860B]" />
            <span>के.पी. प्रणाली भाव संधि व उप-स्वामी (KP Cusps & Sub-Lords)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10.5px]">
              <thead className="bg-[#FAF3E6] text-[#8C2B10] font-bold border-b border-[#E0D0C0]">
                <tr>
                  <th className="p-1">भाव</th>
                  <th className="p-1">राशि</th>
                  <th className="p-1">अंश</th>
                  <th className="p-1">राशि स्वामी</th>
                  <th className="p-1">नक्षत्र स्वामी</th>
                  <th className="p-1">उप-स्वामी (Sub)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0D0C0]">
                {astro.kpSystem.cusps?.map((c, cIdx) => (
                  <tr key={cIdx} className="hover:bg-[#FAF3E6]/50">
                    <td className="p-1 font-bold text-[#8C2B10]">{c.cuspNumber} भाव</td>
                    <td className="p-1">{c.rashiName}</td>
                    <td className="p-1">{c.degree}</td>
                    <td className="p-1">{c.signLord}</td>
                    <td className="p-1">{c.starLord}</td>
                    <td className="p-1 font-bold text-[#B45309]">{c.subLord}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 11. Jaimini Karakas & Chara Dasha */}
      {astro.jaimini && (
        <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-[#E0D0C0]">
            <div className="flex items-center gap-1.5 font-bold text-[#8C2B10] text-[12.5px]">
              <ShieldCheck size={14} className="text-[#8C2B10]" />
              <span>जैमिनी चर कारक व चर दशा (Jaimini Chara Karakas)</span>
            </div>
            <span className="text-[10px] text-[#7A685B]">कारकांश: {astro.jaimini.karakamshaLagna}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            {astro.jaimini.charaKarakas?.map((jk, jIdx) => (
              <div key={jIdx} className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#8C2B10]">{jk.karakaName}</div>
                  <div className="text-[9.5px] text-[#7A685B]">{jk.significance}</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-[#5C1C0A]">{jk.planetName}</div>
                  <div className="text-[9.5px] text-amber-900">{jk.signName} ({jk.degreeInSign})</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12. Lal Kitab System (लाल किताब खाना स्थिति एवं अचूक उपाय) */}
      {astro.lalKitab && (
        <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-[#E0D0C0]">
            <div className="flex items-center gap-1.5 font-bold text-[#8C2B10] text-[12.5px]">
              <BookOpen size={14} className="text-[#8C2B10]" />
              <span>लाल किताब विश्लेषण व उपाय (Lal Kitab Kundali)</span>
            </div>
            <span className="text-[10px] text-amber-900 font-semibold">किस्मत जगाने वाला ग्रह: {astro.lalKitab.kismatJaganewalaPlanet}</span>
          </div>

          <div className="space-y-1.5">
            {astro.lalKitab.planets?.slice(0, 5).map((lp, lIdx) => (
              <div key={lIdx} className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0] text-[10.5px]">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#8C2B10]">{lp.planet} (खाना नं. {lp.houseNumber})</span>
                  <span className={`text-[9.5px] px-1.5 py-0.5 rounded ${
                    lp.status.includes("नेक") ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}>
                    {lp.status}
                  </span>
                </div>
                <div className="mt-0.5 text-[#5C1C0A]">
                  <span className="font-semibold">लाल किताब उपाय:</span> {lp.lalKitabUpay}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 13. Yogini Dasha (36 Year Cycle) */}
      {astro.yoginiDasha && (
        <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-[#E0D0C0]">
            <div className="flex items-center gap-1.5 font-bold text-[#8C2B10] text-[12.5px]">
              <Clock size={14} className="text-[#8C2B10]" />
              <span>योगिनी दशा (Yogini Dasha - 36 Year Cycle)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              सक्रिय: {astro.yoginiDasha.activeYogini}
            </span>
          </div>
          <div className="text-[11px] text-[#5C1C0A]">
            वर्तमान में <b>{astro.yoginiDasha.activeYogini}</b> (स्वामी: {astro.yoginiDasha.activeLord}) सक्रिय है। फल: <b>{astro.yoginiDasha.activeNature}</b> ({astro.yoginiDasha.startDate} से {astro.yoginiDasha.endDate})।
          </div>
        </div>
      )}

      {/* 14. Tajik Varshphal & Muntha */}
      {astro.tajikVarshphal && (
        <div className="p-3 bg-[#FEF3C7]/40 border border-[#FCD34D] rounded-xl space-y-1.5 shadow-xs text-[11px]">
          <div className="flex items-center justify-between pb-1 border-b border-[#FCD34D] font-bold text-[#78350F] text-[12.5px]">
            <span>ताजिक वर्षफल व मुंथा विचार ({astro.tajikVarshphal.currentYear})</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF3C7] border border-[#FCD34D]">वर्षायु: {astro.tajikVarshphal.completedAge} वर्ष</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[#78350F]">
            <div>मुंथा राशि: <b>{astro.tajikVarshphal.munthaRashi}</b></div>
            <div>मुंथा भाव: <b>{astro.tajikVarshphal.munthaHouse}वां भाव</b></div>
            <div>मुंथा स्वामी: <b>{astro.tajikVarshphal.munthaLord}</b></div>
            <div>वर्ष लग्न: <b>{astro.tajikVarshphal.varshaLagna}</b></div>
          </div>
          <div className="text-[10.5px] text-[#92400E] bg-white/70 p-1.5 rounded border border-[#FCD34D]/50">
            <b>मुंथा प्रभाव:</b> {astro.tajikVarshphal.munthaSignificance}
          </div>
        </div>
      )}

      {/* 15. Daily Gochar Transit Analysis */}
      {Array.isArray(astro.gochar) && astro.gochar.length > 0 && (
        <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5 pb-1 border-b border-[#E0D0C0] font-bold text-[#8C2B10] text-[12.5px]">
            <Compass size={14} className="text-[#8C2B10]" />
            <span>दैनिक गोचर प्रभाव (Planetary Transits from Moon Sign)</span>
          </div>
          <div className="space-y-1 text-[10.5px]">
            {astro.gochar.map((g, gIdx) => (
              <div key={gIdx} className="p-1.5 bg-[#FAF3E6] rounded border border-[#E0D0C0] flex items-center justify-between">
                <span className="font-bold text-[#8C2B10]">{g.planet} ({g.transitRashi} में)</span>
                <span className="text-[#5C1C0A]">{g.effectNote}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Shodashvarga Interactive Explorer Component
 */
function ShodashvargaExplorer({ shodashvarga = [] }) {
  const [activeCode, setActiveCode] = useState("D9");
  const currentVarga = shodashvarga.find(v => v.vargaCode === activeCode) || shodashvarga[0] || {};

  return (
    <div className="p-3 bg-[#FFFDF9] border border-[#E0D0C0] rounded-xl space-y-2 shadow-xs">
      <div className="flex items-center justify-between pb-1 border-b border-[#E0D0C0]">
        <div className="flex items-center gap-1.5 font-bold text-[#8C2B10] text-[12.5px]">
          <Layers size={14} className="text-[#8C2B10]" />
          <span>षोडशवर्ग (16 Divisional Charts Explorer)</span>
        </div>
        <select
          value={activeCode}
          onChange={(e) => setActiveCode(e.target.value)}
          className="text-[11px] font-bold bg-[#FAF3E6] border border-[#C89B3C] text-[#8C2B10] rounded px-2 py-0.5"
        >
          {shodashvarga.map((v) => (
            <option key={v.vargaCode} value={v.vargaCode}>
              {v.vargaCode}: {v.vargaName}
            </option>
          ))}
        </select>
      </div>

      <div className="text-[10.5px] text-[#7A685B] italic">
        <b>महत्व:</b> {currentVarga.significance} • <b>लग्न:</b> {currentVarga.lagnaRashiHindi}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[10.5px]">
          <thead className="bg-[#FAF3E6] text-[#8C2B10] font-bold border-b border-[#E0D0C0]">
            <tr>
              <th className="p-1">ग्रह</th>
              <th className="p-1">{currentVarga.vargaCode} राशि</th>
              <th className="p-1">भाव स्थिति</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0D0C0]">
            {currentVarga.placements?.map((p, pIdx) => (
              <tr key={pIdx} className="hover:bg-[#FAF3E6]/50">
                <td className="p-1 font-bold text-[#5C1C0A] flex items-center gap-1">
                  <span>{getPlanetMeta(p.planet).icon}</span>
                  <span>{p.planet}</span>
                </td>
                <td className="p-1">{p.rashiHindi} ({p.rashiEnglish})</td>
                <td className="p-1 font-semibold text-[#8C2B10]">{p.houseNumber} भाव</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

