import React, { useState } from "react";
import { Sparkles, Eye, Grid, Table as TableIcon, Info, Compass } from "lucide-react";

/**
 * Authentic Vedic North Indian Kundali Chart (लग्न कुण्डली - D1 Chart)
 * 
 * Geometrical North Indian Diamond Chart:
 * - 12 Houses (Bhavas) with fixed house geometry.
 * - House 1 (Lagna / Tanu Bhava) is the top central diamond.
 * - Houses progress counter-clockwise (1: Top center, 2: Top-left, 3: Left-top, 4: Left center, etc.)
 * - Rashi numbers (1..12) dynamically populated based on Lagna Rashi.
 * - Occupying planets placed inside their corresponding Bhava compartments with dignity badges.
 */

// Rashi names mapping
export const RASHI_MAP = [
  { num: 1, hindi: "मेष", eng: "Aries", symbol: "♈", lord: "मंगल" },
  { num: 2, hindi: "वृषभ", eng: "Taurus", symbol: "♉", lord: "शुक्र" },
  { num: 3, hindi: "मिथुन", eng: "Gemini", symbol: "♊", lord: "बुध" },
  { num: 4, hindi: "कर्क", eng: "Cancer", symbol: "♋", lord: "चंद्र" },
  { num: 5, hindi: "सिंह", eng: "Leo", symbol: "♌", lord: "सूर्य" },
  { num: 6, hindi: "कन्या", eng: "Virgo", symbol: "♍", lord: "बुध" },
  { num: 7, hindi: "तुला", eng: "Libra", symbol: "♎", lord: "शुक्र" },
  { num: 8, hindi: "वृश्चिक", eng: "Scorpio", symbol: "♏", lord: "मंगल" },
  { num: 9, hindi: "धनु", eng: "Sagittarius", symbol: "♐", lord: "गुरु" },
  { num: 10, hindi: "मकर", eng: "Capricorn", symbol: "♑", lord: "शनि" },
  { num: 11, hindi: "कुंभ", eng: "Aquarius", symbol: "♒", lord: "शनि" },
  { num: 12, hindi: "मीन", eng: "Pisces", symbol: "♓", lord: "गुरु" }
];

// Planet abbreviations & colors
const PLANET_SHORT_MAP = {
  "सूर्य": { short: "सूर्य", eng: "Su", color: "#D97706", bg: "#FEF3C7" },
  "sun": { short: "सूर्य", eng: "Su", color: "#D97706", bg: "#FEF3C7" },
  "surya": { short: "सूर्य", eng: "Su", color: "#D97706", bg: "#FEF3C7" },
  "चंद्र": { short: "चंद्र", eng: "Mo", color: "#0284C7", bg: "#E0F2FE" },
  "moon": { short: "चंद्र", eng: "Mo", color: "#0284C7", bg: "#E0F2FE" },
  "chandra": { short: "चंद्र", eng: "Mo", color: "#0284C7", bg: "#E0F2FE" },
  "मंगल": { short: "मंगल", eng: "Ma", color: "#DC2626", bg: "#FEE2E2" },
  "mars": { short: "मंगल", eng: "Ma", color: "#DC2626", bg: "#FEE2E2" },
  "mangal": { short: "मंगल", eng: "Ma", color: "#DC2626", bg: "#FEE2E2" },
  "बुध": { short: "बुध", eng: "Me", color: "#059669", bg: "#D1FAE5" },
  "mercury": { short: "बुध", eng: "Me", color: "#059669", bg: "#D1FAE5" },
  "budha": { short: "बुध", eng: "Me", color: "#059669", bg: "#D1FAE5" },
  "गुरु": { short: "गुरु", eng: "Ju", color: "#B45309", bg: "#FEF3C7" },
  "jupiter": { short: "गुरु", eng: "Ju", color: "#B45309", bg: "#FEF3C7" },
  "guru": { short: "गुरु", eng: "Ju", color: "#B45309", bg: "#FEF3C7" },
  "शुक्र": { short: "शुक्र", eng: "Ve", color: "#9333EA", bg: "#F3E8FF" },
  "venus": { short: "शुक्र", eng: "Ve", color: "#9333EA", bg: "#F3E8FF" },
  "shukra": { short: "शुक्र", eng: "Ve", color: "#9333EA", bg: "#F3E8FF" },
  "शनि": { short: "शनि", eng: "Sa", color: "#4338CA", bg: "#E0E7FF" },
  "saturn": { short: "शनि", eng: "Sa", color: "#4338CA", bg: "#E0E7FF" },
  "shani": { short: "शनि", eng: "Sa", color: "#4338CA", bg: "#E0E7FF" },
  "राहु": { short: "राहु", eng: "Ra", color: "#78350F", bg: "#FDE68A" },
  "rahu": { short: "राहु", eng: "Ra", color: "#78350F", bg: "#FDE68A" },
  "केतु": { short: "केतु", eng: "Ke", color: "#713F12", bg: "#FEF08A" },
  "ketu": { short: "केतु", eng: "Ke", color: "#713F12", bg: "#FEF08A" }
};

export function getPlanetMeta(planetStr = "") {
  const pLower = planetStr.toLowerCase();
  for (const [k, meta] of Object.entries(PLANET_SHORT_MAP)) {
    if (pLower.includes(k)) return meta;
  }
  return { short: planetStr.slice(0, 4), eng: planetStr.slice(0, 2), color: "#8C2B10", bg: "#FAF0E6" };
}

// 12 House Centers & Rashi number positions in North Indian SVG (400x400 viewBox)
const HOUSE_COORDS = {
  1:  { center: { x: 200, y: 110 }, rashiPos: { x: 200, y: 155 }, name: "लग्न (1st)", angle: "top-diamond" },
  2:  { center: { x: 105, y: 55 },  rashiPos: { x: 135, y: 80 },  name: "धन (2nd)", angle: "top-left-triangle" },
  3:  { center: { x: 55,  y: 105 }, rashiPos: { x: 80,  y: 135 }, name: "सहज (3rd)", angle: "left-top-triangle" },
  4:  { center: { x: 110, y: 200 }, rashiPos: { x: 155, y: 200 }, name: "सुख (4th)", angle: "left-diamond" },
  5:  { center: { x: 55,  y: 295 }, rashiPos: { x: 80,  y: 265 }, name: "पुत्र (5th)", angle: "left-bottom-triangle" },
  6:  { center: { x: 105, y: 345 }, rashiPos: { x: 135, y: 320 }, name: "रिपु (6th)", angle: "bottom-left-triangle" },
  7:  { center: { x: 200, y: 290 }, rashiPos: { x: 200, y: 245 }, name: "जाया (7th)", angle: "bottom-diamond" },
  8:  { center: { x: 295, y: 345 }, rashiPos: { x: 265, y: 320 }, name: "आयु (8th)", angle: "bottom-right-triangle" },
  9:  { center: { x: 345, y: 295 }, rashiPos: { x: 320, y: 265 }, name: "भाग्य (9th)", angle: "right-bottom-triangle" },
  10: { center: { x: 290, y: 200 }, rashiPos: { x: 245, y: 200 }, name: "कर्म (10th)", angle: "right-diamond" },
  11: { center: { x: 345, y: 105 }, rashiPos: { x: 320, y: 135 }, name: "लाभ (11th)", angle: "right-top-triangle" },
  12: { center: { x: 295, y: 55 },  rashiPos: { x: 265, y: 80 },  name: "व्यय (12th)", angle: "top-right-triangle" }
};

export function VedicKundaliChart({
  lagnaRashiNumber = 1, // 1 for Aries, 2 for Taurus, ..., 12 for Pisces
  planets = [], // array of { planetName, houseNumber, rashi, status, degree }
  title = "वैदिक लग्न कुण्डली (D1 Chart)",
  subtitle = "उत्तर भारतीय शैली (North Indian Kundali)",
  className = ""
}) {
  const [selectedHouse, setSelectedHouse] = useState(null);

  // Normalize lagna number (1-12)
  let safeLagna = parseInt(lagnaRashiNumber, 10);
  if (isNaN(safeLagna) || safeLagna < 1 || safeLagna > 12) {
    safeLagna = 1;
  }

  // Calculate Rashi Number for each of the 12 Bhavas (House 1 = safeLagna, House 2 = (safeLagna % 12) + 1, etc.)
  const houseRashiMap = {};
  for (let h = 1; h <= 12; h++) {
    const rNum = ((safeLagna + h - 2) % 12) + 1;
    houseRashiMap[h] = rNum;
  }

  // Group planets by house number (1..12)
  const housePlanets = {};
  for (let h = 1; h <= 12; h++) {
    housePlanets[h] = [];
  }

  planets.forEach(p => {
    let hNum = parseInt(p.houseNumber || p.house, 10);
    if (isNaN(hNum) || hNum < 1 || hNum > 12) {
      // Try to parse from string like "1st house" or "प्रथम भाव"
      const match = String(p.houseNumber || p.house || "").match(/(\d+)/);
      if (match) {
        hNum = parseInt(match[1], 10);
      }
    }
    if (hNum >= 1 && hNum <= 12) {
      housePlanets[hNum].push(p);
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
    <div className={`w-full max-w-[420px] mx-auto my-3 p-3 bg-gradient-to-b from-[#FFFDF9] to-[#FAF3E8] border-2 border-[#D4AF37]/60 rounded-2xl shadow-md overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5D5C5]">
        <div className="flex items-center gap-1.5">
          <span className="text-base text-amber-700">🕉️</span>
          <div>
            <h4 className="text-xs font-bold text-[#5C1C0A] leading-tight">{title}</h4>
            <p className="text-[10px] text-stone-600 font-medium">{subtitle} • लग्न: {RASHI_MAP.find(r => r.num === safeLagna)?.hindi || "मेष"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#FCD34D]">
          <Sparkles size={11} />
          <span>लग्न {safeLagna}</span>
        </div>
      </div>

      {/* SVG Kundali Chart */}
      <div className="relative w-full aspect-square max-w-[360px] mx-auto">
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full select-none cursor-pointer"
          style={{ filter: "drop-shadow(0 2px 8px rgba(92, 28, 10, 0.08))" }}
        >
          <defs>
            {/* Background Gradient */}
            <linearGradient id="chartBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFDF8" />
              <stop offset="100%" stopColor="#FAF2E4" />
            </linearGradient>
            {/* Kendra Highlight Gradient */}
            <linearGradient id="kendraBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="100%" stopColor="#FEF3C7" />
            </linearGradient>
          </defs>

          {/* Outer Square Border */}
          <rect
            x="10"
            y="10"
            width="380"
            height="380"
            fill="url(#chartBg)"
            stroke="#8C2B10"
            strokeWidth="2.5"
            rx="4"
          />

          {/* Inner Kendra Diamonds shading (Houses 1, 4, 7, 10) */}
          <polygon points="200,10 295,105 200,200 105,105" fill="url(#kendraBg)" fillOpacity="0.4" />
          <polygon points="10,200 105,105 200,200 105,295" fill="url(#kendraBg)" fillOpacity="0.4" />
          <polygon points="200,200 105,295 200,390 295,295" fill="url(#kendraBg)" fillOpacity="0.4" />
          <polygon points="200,200 295,105 390,200 295,295" fill="url(#kendraBg)" fillOpacity="0.4" />

          {/* Primary Diagonals */}
          <line x1="10" y1="10" x2="390" y2="390" stroke="#8C2B10" strokeWidth="1.8" />
          <line x1="10" y1="390" x2="390" y2="10" stroke="#8C2B10" strokeWidth="1.8" />

          {/* Center Diamond Lines */}
          <polygon
            points="200,10 390,200 200,390 10,200"
            fill="none"
            stroke="#8C2B10"
            strokeWidth="2.2"
          />

          {/* 12 House Labels & Planets */}
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
                className="transition-all duration-150"
              >
                {/* Rashi Number */}
                <text
                  x={coord.rashiPos.x}
                  y={coord.rashiPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="11"
                  fontWeight="800"
                  fill={isKendra ? "#B45309" : "#8C2B10"}
                  opacity="0.8"
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
                    fill="#C5A089"
                    opacity="0.5"
                  >
                    —
                  </text>
                ) : (
                  pList.map((p, pIdx) => {
                    const meta = getPlanetMeta(p.planetName || p.name);
                    const totalP = pList.length;
                    const rowHeight = 13;
                    const startY = coord.center.y - ((totalP - 1) * rowHeight) / 2;
                    const y = startY + pIdx * rowHeight;
                    const isExalted = String(p.status || "").includes("उच्च");
                    const isDebilitated = String(p.status || "").includes("नीच");

                    return (
                      <g key={pIdx}>
                        <text
                          x={coord.center.x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="10"
                          fontWeight="800"
                          fill={isDebilitated ? "#DC2626" : (isExalted ? "#059669" : meta.color)}
                        >
                          {meta.short}
                          {isExalted && <tspan fontSize="8" fill="#D97706">★</tspan>}
                          {isDebilitated && <tspan fontSize="7" fill="#DC2626">▼</tspan>}
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
        <div className="mt-2.5 p-2 bg-[#FFFDF8] border border-[#E5D5C5] rounded-xl text-xs text-[#4A0E17]">
          <div className="flex items-center justify-between font-bold pb-1 border-b border-[#F3E8DC] text-[11px]">
            <span>भाव {activeHouseDetails.houseNum}: {activeHouseDetails.name}</span>
            <span className="text-amber-800">राशि: {activeHouseDetails.rashi?.hindi} ({activeHouseDetails.rashi?.eng}) • स्वामी: {activeHouseDetails.rashi?.lord}</span>
          </div>
          <div className="mt-1">
            {activeHouseDetails.planets.length === 0 ? (
              <span className="text-[10.5px] text-stone-500">इस भाव में कोई प्रत्यक्ष ग्रह नहीं है (खाली भाव)।</span>
            ) : (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {activeHouseDetails.planets.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FEF3C7] border border-[#FCD34D] rounded text-[10.5px] font-bold text-[#78350F]"
                  >
                    <span>{p.planetName || p.name}</span>
                    {p.status && <span className="text-[9px] opacity-80">({p.status})</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart Footer Tip */}
      <div className="mt-2 pt-1.5 border-t border-[#E5D5C5]/60 flex items-center justify-between text-[10px] text-stone-600">
        <span className="flex items-center gap-1">
          <Info size={11} className="text-amber-700" />
          <span>भाव पर टैप करके विवरण देखें</span>
        </span>
        <span className="text-amber-800 font-semibold">★ उच्च | ▼ नीच</span>
      </div>
    </div>
  );
}
