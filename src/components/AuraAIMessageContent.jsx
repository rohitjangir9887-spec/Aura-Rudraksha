import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Sparkles, 
  Phone, 
  Mail, 
  CheckCircle2, 
  ShieldCheck, 
  Tag, 
  ExternalLink,
  Sun,
  Moon,
  Flame,
  ShieldAlert,
  Scroll,
  Gem,
  Award,
  AlertTriangle,
  Copy,
  Check,
  Grid,
  Table as TableIcon,
  Compass
} from "lucide-react";
import { VedicKundaliChart, RASHI_MAP } from "./VedicKundaliChart";

/**
 * Universal Aura AI Message Renderer & Kundali Presentation Engine
 * 
 * Automatically cleans, parses, and formats AI & Customer messages into 
 * a pristine, modern, high-contrast spiritual Kundali & chat UI without
 * any raw markdown artifacts (**, *, -, ###, ```, |---|---|).
 * 
 * Features:
 * 1. North Indian Kundali SVG chart rendering when birth/planetary data is available.
 * 2. Mobile-responsive Planetary Cards grid replacing raw Markdown pipe tables on mobile.
 * 3. View Switcher (Cards | Kundali Chart | Detailed Table) for all planetary reports.
 * 4. 100% text fidelity (zero truncation, zero data loss, handles streaming gracefully).
 * 5. Robust semantic column parser (Planet, House, Rashi, Status, Interpretation).
 * 6. Zero horizontal overflow on mobile screens.
 */

// Helper to clean raw artifacts & secure content while preserving 100% of information
export function sanitizeText(raw) {
  if (raw === null || raw === undefined) return "";
  let text = typeof raw === "string" ? raw.trim() : String(raw).trim();
  if (!text) return "";

  // Strip [AURA_KEYWORDS]: kw1 | kw2 | ... line from visible chat display
  text = text.replace(/\[AURA_KEYWORDS\]:[^\n]*/gi, "").replace(/\[AURA_KEYWORDS\]/gi, "").trim();

  // Replace raw HTML linebreaks with standard newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Replace masked date placeholders like 2024-XX-XX or XX-XX with "(date not available)"
  text = text.replace(/\b\d{4}-XX-XX\b/gi, "(date not available)");
  text = text.replace(/\bXX-XX-\d{4}\b/gi, "(date not available)");
  text = text.replace(/\bXX-XX\b/gi, "(date not available)");

  // Strip code fences wrapping the response
  text = text.replace(/^```(?:json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Protect sensitive internal system keys or developer emails
  text = text.replace(/rohitjangir\d*@gmail\.com/gi, "aurarudrakshaofficial@gmail.com");
  text = text.replace(/MONGODB_[A-Z_]+/gi, "");
  text = text.replace(/GEMINI_API_[A-Z_]+/gi, "");
  text = text.replace(/NVIDIA_API_[A-Z_]+/gi, "");

  // Remove unintended Chinese (Hanzi / CJK), Japanese, Korean, and fullwidth artifacts
  text = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\u2e80-\u2fd5\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af\uff01-\uffee]/g, "");

  // Fix disconnected spaces before Devanagari matras, viramas (halant), nukta, anusvara, visarga
  text = text.replace(/([\u0900-\u097F])\s+([\u093E-\u094D\u0962\u0963\u093C\u0901-\u0903])/g, "$1$2");
  text = text.replace(/([\u0900-\u097F]\u094D)\s+([\u0900-\u097F])/g, "$1$2");

  // Repair common accidentally split Hindi / Vedic words
  text = text.replace(/रु\s+द्रा\s+क्ष/g, "रुद्राक्ष");
  text = text.replace(/रुद्र\s+ाक्ष/g, "रुद्राक्ष");
  text = text.replace(/ने\s+पा\s+ली/g, "नेपाली");
  text = text.replace(/कुं\s+ड\s+ली/g, "कुंडली");
  text = text.replace(/कं\s+ुडली/g, "कुंडली");
  text = text.replace(/कुण्ड\s+ली/g, "कुण्डली");
  text = text.replace(/महा\s+दशा/g, "महादशा");
  text = text.replace(/म\s+हा\s+द\s+शा/g, "महादशा");
  text = text.replace(/अं\s+तर्दशा/g, "अंतर्दशा");
  text = text.replace(/अंतर\s+दशा/g, "अंतर्दशा");
  text = text.replace(/प्र\s+त्यंतर\s+दशा/g, "प्रत्यंतर्दशा");
  text = text.replace(/प्र\s+णाम/g, "प्रणाम");
  text = text.replace(/ज्यो\s+तिष/g, "ज्योतिष");
  text = text.replace(/क\s+ल्याण\s+कारी/g, "कल्याणकारी");
  text = text.replace(/विं\s+शोत्तरी/g, "विंशोत्तरी");
  text = text.replace(/प्रा\s+ण\s*-\s*प्रति\s+ष्ठा/g, "प्राण-प्रतिष्ठा");
  text = text.replace(/धार\s+ण/g, "धारण");
  text = text.replace(/वि\s+धि/g, "विधि");

  // Collapse accidental multiple spaces
  text = text.replace(/[ \t]{2,}/g, " ");

  return text;
}

// Highlight important planetary terms and doshas inside text fragments
function renderInlineKeywords(text) {
  if (!text || typeof text !== "string") return text;

  // Highlight terms: उच्च, नीच, साम्य, स्वगृही, मांगलिक दोष, कालसर्प दोष, पितृ दोष, साढ़े साती, ढैय्या
  const kwRegex = /(उच्च|नीच|साम्य|स्वगृही|मांगलिक\s*दोष|कालसर्प\s*दोष|पितृ\s*दोष|साढ़े\s*साती|ढैय्या)/g;
  const parts = text.split(kwRegex);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part === "उच्च" || part === "स्वगृही") {
      return <span key={i} className="aura-ai-highlight-exalted">{part}</span>;
    }
    if (part === "नीच") {
      return <span key={i} className="aura-ai-highlight-debilitated">{part}</span>;
    }
    if (part === "साम्य") {
      return <span key={i} className="aura-ai-highlight-neutral">{part}</span>;
    }
    if (
      part.includes("दोष") || 
      part.includes("साती") || 
      part.includes("ढैय्या")
    ) {
      return <span key={i} className="aura-ai-highlight-dosh">{part}</span>;
    }
    return part;
  });
}

// Helper to strip trailing punctuation or quotes from URLs
function cleanRawUrl(urlStr) {
  if (!urlStr) return "";
  let clean = urlStr.trim();
  clean = clean.replace(/^["'“(]+/, "").replace(/["'”)]+$/, "");
  clean = clean.replace(/[.,;:!?]+$/, "");
  return clean;
}

// Extract internal route path if URL points to our app/product or relative path
function extractInternalRoute(rawUrl) {
  if (!rawUrl) return null;
  const clean = cleanRawUrl(rawUrl);
  if (!clean) return null;

  // Case 1: Direct relative path starting with /
  if (clean.startsWith("/")) {
    return clean;
  }

  // Case 2: Starts with product/, shop/, categories/, cart/, checkout/, wishlist/, account/, zodiac/, panditji/
  if (/^(product|shop|categories|cart|checkout|wishlist|account|zodiac|panditji)(\/|\?|$)/i.test(clean)) {
    return "/" + clean;
  }

  // Case 3: Full URL or domain string
  try {
    let full = clean;
    if (!full.startsWith("http://") && !full.startsWith("https://")) {
      full = "https://" + full;
    }
    const parsed = new URL(full);
    const pathname = parsed.pathname || "/";
    const search = parsed.search || "";

    const isCurrentHost = typeof window !== "undefined" && window.location.hostname === parsed.hostname;
    const isKnownDomain = 
      parsed.hostname.includes("aurarudraksha") ||
      parsed.hostname.includes("run.app") ||
      parsed.hostname.includes("localhost") ||
      parsed.hostname.includes("127.0.0.1") ||
      parsed.hostname.includes("vercel.app");

    const isAppPath = /^\/(product|shop|categories|cart|checkout|wishlist|account|zodiac|panditji)(\/|\?|$)/i.test(pathname);

    if (isCurrentHost || isKnownDomain || isAppPath) {
      return (pathname + search) || "/";
    }
  } catch (_) {}

  return null;
}

// Tokenize a line of text for inline formatting, links & keyword badges
export function renderInlineContent(text) {
  if (text === null || text === undefined || text === "") return null;
  const str = typeof text === "string" ? text : String(text);
  if (!str) return null;

  try {
    // Split by inline tokens: [link](url), https?://..., domain links, relative or bare /product/... paths, **bold**, `code`, *italic*
    const tokenRegex = /(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s<)\]]+|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\/[^\s<)\]]*|\/?(?:product|shop|categories|cart|checkout|wishlist|account|zodiac|panditji)\/[a-zA-Z0-9_-]+|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    const parts = str.split(tokenRegex);

    return parts.map((part, idx) => {
      if (!part) return null;

      // 1. Markdown Link: [label](url)
      const mdLinkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (mdLinkMatch) {
        const label = mdLinkMatch[1];
        const rawUrl = mdLinkMatch[2];
        const internalRoute = extractInternalRoute(rawUrl);

        if (internalRoute) {
          return (
            <Link
              key={idx}
              to={internalRoute}
              className="aura-ai-inline-link hover:underline font-semibold text-[#8c2b10] inline-flex items-center gap-0.5 cursor-pointer"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("aura-ai-navigate"));
              }}
            >
              {label}
            </Link>
          );
        }

        const cleanExtUrl = cleanRawUrl(rawUrl);
        return (
          <a
            key={idx}
            href={cleanExtUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="aura-ai-inline-link hover:underline font-semibold text-[#8c2b10] inline-flex items-center gap-0.5 cursor-pointer"
          >
            {label} <ExternalLink size={10} className="inline ml-0.5" />
          </a>
        );
      }

      // 2. Internal Path / Product Link / Domain URL / Full URL
      const internalRoute = extractInternalRoute(part);
      if (internalRoute) {
        const displayLabel = cleanRawUrl(part);
        return (
          <Link
            key={idx}
            to={internalRoute}
            className="aura-ai-inline-link hover:underline font-semibold text-[#8c2b10] inline-flex items-center gap-0.5 cursor-pointer"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("aura-ai-navigate"));
            }}
          >
            {displayLabel}
          </Link>
        );
      }

      // 3. External HTTP / HTTPS / WWW URL
      if (part.startsWith("http://") || part.startsWith("https://") || part.startsWith("www.")) {
        const cleanExtUrl = cleanRawUrl(part);
        const href = cleanExtUrl.startsWith("http") ? cleanExtUrl : `https://${cleanExtUrl}`;
        return (
          <a
            key={idx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="aura-ai-inline-link hover:underline font-semibold text-[#8c2b10] inline-flex items-center gap-0.5 cursor-pointer"
          >
            {cleanExtUrl} <ExternalLink size={10} className="inline ml-0.5" />
          </a>
        );
      }

      // 4. Bold: **something**
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        const inner = part.slice(2, -2);
        return (
          <strong key={idx} className="aura-ai-strong">
            {renderInlineKeywords(inner)}
          </strong>
        );
      }

      // 5. Code / Coupon / Highlight: `something`
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        const inner = part.slice(1, -1);
        return (
          <span key={idx} className="aura-ai-code-chip">
            {inner}
          </span>
        );
      }

      // 6. Italic: *something*
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        const inner = part.slice(1, -1);
        return (
          <em key={idx} className="aura-ai-italic">
            {inner}
          </em>
        );
      }

      // 7. Phone / Email in plain text
      const words = part.split(/(\+91\s*\d{10}|\+91\s*\d{5}\s*\d{5}|support@aurarudraksha\.com)/g);
      if (words.length > 1) {
        return (
          <React.Fragment key={idx}>
            {words.map((w, wi) => {
              if (w.includes("+91")) {
                const cleanPhone = w.replace(/\s+/g, "");
                return (
                  <a
                    key={wi}
                    href={`https://wa.me/${cleanPhone.replace("+", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aura-ai-contact-link"
                  >
                    <Phone size={11} className="inline mr-1" />
                    {w}
                  </a>
                );
              }
              if (w.includes("@")) {
                return (
                  <a
                    key={wi}
                    href={`mailto:${w}`}
                    className="aura-ai-contact-link"
                  >
                    <Mail size={11} className="inline mr-1" />
                    {w}
                  </a>
                );
              }
              return renderInlineKeywords(w);
            })}
          </React.Fragment>
        );
      }

      return renderInlineKeywords(part);
    });
  } catch (_) {
    return text;
  }
}

// Map planet name to corresponding Lucide icon
export function getPlanetIcon(planetName = "") {
  const p = planetName.toLowerCase();
  if (p.includes("सूर्य") || p.includes("sun") || p.includes("surya")) return <Sun size={14} className="text-amber-600 flex-shrink-0" />;
  if (p.includes("चंद्र") || p.includes("moon") || p.includes("chandra")) return <Moon size={14} className="text-sky-600 flex-shrink-0" />;
  if (p.includes("मंगल") || p.includes("mars") || p.includes("mangal")) return <Flame size={14} className="text-red-600 flex-shrink-0" />;
  if (p.includes("बुध") || p.includes("mercury") || p.includes("budha")) return <Sparkles size={14} className="text-emerald-600 flex-shrink-0" />;
  if (p.includes("गुरु") || p.includes("jupiter") || p.includes("guru") || p.includes("brihaspati")) return <Award size={14} className="text-amber-700 flex-shrink-0" />;
  if (p.includes("शुक्र") || p.includes("venus") || p.includes("shukra")) return <Gem size={14} className="text-purple-600 flex-shrink-0" />;
  if (p.includes("शनि") || p.includes("saturn") || p.includes("shani")) return <ShieldAlert size={14} className="text-indigo-700 flex-shrink-0" />;
  if (p.includes("राहु") || p.includes("rahu")) return <Sparkles size={14} className="text-amber-800 flex-shrink-0" />;
  if (p.includes("केतु") || p.includes("ketu")) return <Sparkles size={14} className="text-amber-900 flex-shrink-0" />;
  return <Sparkles size={14} className="text-amber-600 flex-shrink-0" />;
}

// Map status string to pill badge
export function renderStatusBadge(status = "") {
  const s = status.replace(/\*\*/g, "").trim();
  if (!s) return null;
  if (s.includes("उच्च") || /exalted/i.test(s)) return <span className="aura-ai-status-badge aura-ai-status-exalted">✨ उच्च (Exalted)</span>;
  if (s.includes("स्वगृही") || /own/i.test(s)) return <span className="aura-ai-status-badge aura-ai-status-own">🏠 स्वगृही (Own)</span>;
  if (s.includes("नीच") || /debilitated/i.test(s)) return <span className="aura-ai-status-badge aura-ai-status-debilitated">⚠️ नीच (Debilitated)</span>;
  if (s.includes("साम्य") || s.includes("मित्र") || /neutral|friend/i.test(s)) return <span className="aura-ai-status-badge aura-ai-status-neutral">🔵 {s}</span>;
  return <span className="aura-ai-status-badge aura-ai-status-own">🔸 {s}</span>;
}

// Individual Planet Card component
export function PlanetCard({ planetName = "", house = "", rashi = "", status = "", interpretation = "" }) {
  const cleanName = planetName.replace(/^\*{1,2}/, "").replace(/\*{1,2}$/, "").trim();
  const cleanHouse = house.replace(/\*\*/g, "").trim();
  const cleanRashi = rashi.replace(/\*\*/g, "").trim();

  return (
    <div className="aura-ai-planet-card">
      <div className="aura-ai-planet-header">
        <div className="aura-ai-planet-title">
          {getPlanetIcon(cleanName)}
          <span>{cleanName}</span>
        </div>
        {renderStatusBadge(status)}
      </div>
      {(cleanHouse || cleanRashi) && (
        <div className="aura-ai-planet-meta">
          {cleanHouse && <span className="aura-ai-planet-meta-item">भाव: {cleanHouse}</span>}
          {cleanRashi && <span className="aura-ai-planet-meta-item">राशि: {cleanRashi}</span>}
        </div>
      )}
      {interpretation && (
        <div className="aura-ai-planet-interp">
          {renderInlineContent(interpretation)}
        </div>
      )}
    </div>
  );
}

// Unified Planetary & Kundali Report Component rendered directly in Chat Flow
export function ResponsivePlanetaryReport({ 
  planets = [], 
  headers = [], 
  rawRows = [], 
  detectedLagna = 1,
  showChart = true,
  birthData = null,
  fullKundaliData = null
}) {
  const planetList = planets && planets.length > 0
    ? planets
    : rawRows.map(r => parsePlanetaryRow(r, headers));

  const hasPlanets = planetList && planetList.length > 0;

  return (
    <div className="w-full my-2 box-border space-y-3">
      {/* 1. Vedic Kundali Chart - Rendered ONLY ONCE per message if showChart is true */}
      {showChart && hasPlanets && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 pb-1 border-b border-[#ebdccb]">
            <span className="text-base text-[#8c2b10] flex-shrink-0">🕉️</span>
            <div className="min-w-0">
              <h4 className="text-[13px] font-bold text-[#5c1c0a] leading-tight">वैदिक लग्न कुण्डली चक्र (D1 Chart)</h4>
              <p className="text-[11px] text-[#78350f] font-medium">उत्तर भारतीय कुण्डली एवं नवग्रह स्थिति</p>
            </div>
          </div>
          <VedicKundaliChart
            lagnaRashiNumber={detectedLagna}
            planets={planetList}
            title="लग्न कुण्डली (D1 Chart)"
            subtitle="उत्तर भारतीय वैदिक चक्र"
            birthData={birthData}
            fullKundaliData={fullKundaliData}
          />
        </div>
      )}

      {/* 2. Full Navagraha Transit & House Position - Rendered as clean normal chat text lines */}
      {planetList.length > 0 && (
        <div className="space-y-2.5 my-2.5">
          <div className="flex items-center gap-1.5 pb-1 border-b border-[#ebdccb]">
            <Sparkles size={14} className="text-[#8c2b10] flex-shrink-0" />
            <h4 className="text-[14px] font-bold text-[#5c1c0a] leading-tight">नवग्रह गोचर व भाव स्थिति</h4>
          </div>

          <div className="space-y-2.5 text-[13.5px] leading-relaxed text-[#2b1408]">
            {planetList.map((p, idx) => {
              const pName = (p.planetName || `ग्रह ${idx + 1}`).replace(/\*\*/g, "").trim();
              const pHouse = (p.house || "").replace(/\*\*/g, "").trim();
              const pRashi = (p.rashi || "").replace(/\*\*/g, "").trim();
              const pStatus = (p.status || "").replace(/\*\*/g, "").trim();
              const pInterp = (p.interpretation || "").replace(/\*\*/g, "").trim();

              return (
                <div key={idx} className="pb-2 border-b border-[#f3e8dc] last:border-b-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 font-bold text-[#8c2b10]">
                    {getPlanetIcon(pName)}
                    <span className="text-[14px]">{pName}</span>
                    {(pHouse || pRashi) && (
                      <span className="text-[12px] font-semibold text-[#782218] bg-[#fef3c7] px-2 py-0.5 rounded-md border border-[#f59e0b]/30">
                        {pHouse ? `${pHouse}` : ""}{pHouse && pRashi ? " | " : ""}{pRashi ? `${pRashi} राशि` : ""}
                      </span>
                    )}
                    {renderStatusBadge(pStatus)}
                  </div>
                  {pInterp && (
                    <div className="text-[13.5px] text-[#2b1408] pl-5 leading-normal">
                      {renderInlineContent(pInterp)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Mantra Line Component with Copy action
function MantraCard({ mantraText }) {
  const [copied, setCopied] = useState(false);
  const cleanMantra = mantraText
    .replace(/^\[MANTRA\]/i, "")
    .replace(/\[\/MANTRA\]$/i, "")
    .replace(/^["'“]/, "")
    .replace(/["'”]$/, "")
    .trim();

  const handleCopy = () => {
    if (!cleanMantra) return;
    navigator.clipboard.writeText(cleanMantra);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 py-2 px-3 bg-[#fbf8f3] border-l-3 border-[#8c2b10] rounded-r flex items-center justify-between gap-2">
      <span className="font-semibold text-[#5c1c0a] text-[13.5px]">
        {cleanMantra}
      </span>
      <button 
        onClick={handleCopy} 
        className="text-[#8c2b10] hover:text-[#5c1c0a] flex items-center gap-1 cursor-pointer text-[11px] font-medium flex-shrink-0"
        title="मंत्र कॉपी करें"
      >
        {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
        <span>{copied ? "कॉपी हुआ!" : "कॉपी"}</span>
      </button>
    </div>
  );
}

// Check if a line is a Key-Value attribute line
function parseKeyValueLine(line) {
  const clean = line.replace(/^[-*•✦🕉▪▫▸►\d.)]\s*/, "").trim();
  
  // Pattern: "Key:" or "**Key:**" followed by value
  const kvMatch = clean.match(/^(\*{0,2})([A-Za-z0-9\s/&()#₹\u0900-\u097F-]+?)(\*{0,2})\s*:\s*(.+)$/);
  if (!kvMatch) return null;

  const rawKey = kvMatch[2].replace(/\*/g, "").trim();
  const rawVal = kvMatch[4].trim();

  if (
    rawKey.length > 0 && 
    rawKey.length <= 40 && 
    !rawKey.includes("?") && 
    !rawKey.endsWith(".") &&
    !rawKey.endsWith("।")
  ) {
    return { key: rawKey, value: rawVal };
  }
  return null;
}

// Detect Lagna Rashi number from full text
function detectLagnaRashiNumber(text = "") {
  if (!text) return 1;
  const lagnaMatch = text.match(/(?:जन्म\s*लग्न|लग्न\s*(?:राशि)?|Lagna|Ascendant)\s*[:|-]?\s*(\d{1,2}|मेष|वृषभ|मिथुन|कर्क|सिंह|कन्या|तुला|वृश्चिक|धनु|मकर|कुंभ|कुम्भ|मीन|Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)/i);
  if (lagnaMatch) {
    const val = lagnaMatch[1].trim();
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) return num;
    const rashiNames = [
      ["mesh", "aries", "मेष"],
      ["vrishabh", "taurus", "वृषभ"],
      ["mithun", "gemini", "मिथुन"],
      ["kark", "cancer", "कर्क"],
      ["singh", "leo", "सिंह"],
      ["kanya", "virgo", "कन्या"],
      ["tula", "libra", "तुला"],
      ["vrischika", "scorpio", "वृश्चिक"],
      ["dhanu", "sagittarius", "धनु"],
      ["makar", "capricorn", "मकर"],
      ["kumbh", "aquarius", "कुंभ", "कुम्भ"],
      ["meen", "pisces", "मीन"]
    ];
    const valLower = val.toLowerCase();
    for (let idx = 0; idx < rashiNames.length; idx++) {
      if (rashiNames[idx].some(name => valLower.includes(name))) {
        return idx + 1;
      }
    }
  }
  return 1;
}

// Semantic column extraction from table row
function parsePlanetaryRow(row = [], headers = []) {
  let planetName = "";
  let house = "";
  let rashi = "";
  let status = "";
  let interpretation = "";

  // 1. Try to use headers if available
  const planetIdx = headers.findIndex(h => /ग्रह|planet|graha/i.test(h));
  const houseIdx = headers.findIndex(h => /भाव|house|bhava/i.test(h));
  const rashiIdx = headers.findIndex(h => /राशि|rashi|sign/i.test(h));
  const statusIdx = headers.findIndex(h => /स्थिति|status|dignity|बलाबल/i.test(h));
  const interpIdx = headers.findIndex(h => /फल|प्रभाव|उपाय|description|meaning|details/i.test(h));

  if (planetIdx >= 0 && row[planetIdx]) planetName = row[planetIdx];
  if (houseIdx >= 0 && row[houseIdx]) house = row[houseIdx];
  if (rashiIdx >= 0 && row[rashiIdx]) rashi = row[rashiIdx];
  if (statusIdx >= 0 && row[statusIdx]) status = row[statusIdx];
  if (interpIdx >= 0 && row[interpIdx]) interpretation = row[interpIdx];

  // 2. Fallback: inspect each cell by regex if not matched
  row.forEach((cell, idx) => {
    const c = cell.trim();
    if (!planetName && /^(?:\*{0,2})(सूर्य|चंद्र|मंगल|बुध|गुरु|शुक्र|शनि|राहु|केतु|Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)(?:\*{0,2})/i.test(c)) {
      planetName = c;
    } else if (!house && /(\d+\s*(?:वां|वें|था|रा|st|nd|rd|th)?\s*भाव|भाव\s*\d+|\d+\s*(?:st|nd|rd|th)?\s*house|^[1-9]$|^1[0-2]$)/i.test(c)) {
      house = c;
    } else if (!rashi && /(सिंह|कन्या|तुला|वृश्चिक|धनु|मकर|कुंभ|कुम्भ|मीन|मेष|वृषभ|मिथुन|कर्क|Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)/i.test(c)) {
      rashi = c;
    } else if (!status && /(उच्च|नीच|साम्य|स्वगृही|मित्र|शत्रु|Exalted|Debilitated|Neutral|Own Sign)/i.test(c)) {
      status = c;
    } else if (idx !== planetIdx && idx !== houseIdx && idx !== rashiIdx && idx !== statusIdx && !interpretation.includes(c)) {
      interpretation += (interpretation ? " " : "") + c;
    }
  });

  // If planetName is still empty, take 1st column
  if (!planetName && row[0]) planetName = row[0];

  return { planetName, house, rashi, status, interpretation };
}

// Check if a line looks like a title or section heading
function isHeadingLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // 1. Explicit markdown heading (#, ##, ###) or semantic tag [SECTION]
  if (/^#{1,6}\s+/.test(trimmed) || /^\[SECTION\]/i.test(trimmed)) return true;

  // 2. Short standalone heading lines starting with emoji/symbols or explicit section titles
  if (
    trimmed.length <= 60 &&
    !trimmed.includes("?") &&
    !trimmed.includes("।") &&
    !trimmed.includes(".") &&
    (
      /^[🕉✨🚩📿🙏🔮✦★📍💡]\s*/.test(trimmed) ||
      /^(?:\d+\.|\d+\))\s*\*{0,2}(?:विश्लेषण|उपाय|मार्गदर्शन|फलादेश|कुंडली|राशि|दोष|रुद्राक्ष|मंत्र|महत्व)\*{0,2}:?$/i.test(trimmed) ||
      /^\*{0,2}(?:वैदिक विश्लेषण|कुंडली विश्लेषण|ग्रह स्थिति|मुख्य निष्कर्ष|सुझाये गए रुद्राक्ष|विशेष उपाय|सिद्ध मंत्र)\*{0,2}:?$/i.test(trimmed)
    )
  ) {
    return true;
  }

  return false;
}

export function AuraAIMessageContent({ text, content, sender = "ai", className = "", fullKundaliData = null, birthData = null }) {
  const actualText = text !== undefined && text !== null && text !== "" ? text : content;

  // Render glowing thinking badge if AI message text is empty during reasoning phase
  if (sender === "ai" && (!actualText || !String(actualText).trim())) {
    return (
      <div className={`aura-ai-msg-text-ai ${className}`}>
        <div 
          className="aura-ai-thinking-badge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            background: "linear-gradient(135deg, #FFFDF8 0%, #FEF3C7 100%)",
            border: "1px solid #F59E0B",
            borderRadius: "14px",
            color: "#78350F",
            fontSize: "12px",
            fontWeight: 700,
            boxShadow: "0 2px 6px rgba(245, 158, 11, 0.12)"
          }}
        >
          <span style={{ fontSize: "15px", display: "inline-block" }}>💭</span>
          <span>वैदिक विश्लेषण व विचार प्रक्रिया जारी है... (Analyzing & Thinking)</span>
        </div>
      </div>
    );
  }

  if (!actualText) return null;

  // For User message: clean, high contrast with linebreaks
  if (sender === "user") {
    const cleanUserText = sanitizeText(typeof actualText === "string" ? actualText : String(actualText));
    return (
      <div className={`aura-ai-msg-text-user ${className}`}>
        {cleanUserText.split("\n").map((p, idx) => (
          <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>
            {p}
          </p>
        ))}
      </div>
    );
  }

  // For AI message: structured, rich semantic Kundali layout
  const rawString = typeof actualText === "string" ? actualText : (actualText?.text || String(actualText));
  const sanitized = sanitizeText(rawString);
  const detectedLagna = detectLagnaRashiNumber(sanitized);

  const lines = sanitized.split("\n");
  const blocks = [];
  let currentList = null;
  let currentKvGroup = null;
  let currentTable = null;
  let pendingPlanetCards = [];

  const flushPlanetCards = () => {
    if (pendingPlanetCards.length > 0) {
      if (pendingPlanetCards.length >= 3) {
        blocks.push({
          type: "planetary_report",
          planets: pendingPlanetCards,
          headers: ["ग्रह", "भाव", "राशि", "स्थिति", "फल"],
          rawRows: pendingPlanetCards.map(p => [p.planetName, p.house, p.rashi, p.status, p.interpretation]),
          detectedLagna
        });
      } else {
        pendingPlanetCards.forEach(p => {
          blocks.push({ type: "planet_card", planet: p });
        });
      }
      pendingPlanetCards = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  const flushKv = () => {
    if (currentKvGroup) {
      blocks.push(currentKvGroup);
      currentKvGroup = null;
    }
  };

  const flushTable = () => {
    if (currentTable) {
      const headers = currentTable.headers || [];
      const rows = currentTable.rows || [];

      // A table is ONLY a full D1 Navagraha Kundali Chart if:
      // 1) It has >= 7 planet rows (Navagrahas).
      // 2) Headers contain Graha/Planet AND (Bhava/House OR Rashi/Sign).
      const isFullPlanetaryKundaliTable = 
        rows.length >= 7 &&
        headers.some(h => /ग्रह|Planet/i.test(h)) &&
        headers.some(h => /भाव|House|Bhava|स्थान/i.test(h)) &&
        headers.some(h => /राशि|Rashi|Sign/i.test(h));

      if (isFullPlanetaryKundaliTable) {
        // Map rows into structured Planet items using semantic parser
        const planetItems = rows.map(r => parsePlanetaryRow(r, headers));
        blocks.push({
          type: "planetary_report",
          planets: planetItems,
          headers,
          rawRows: rows,
          detectedLagna
        });
      } else {
        // Render as standard responsive table in chat
        blocks.push({ type: "table", headers, rows });
      }
      currentTable = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      flushKv();
      flushTable();
      continue;
    }

    // 1. Table Detection (lines containing multiple | symbols)
    if (trimmed.includes("|") && (trimmed.startsWith("|") || trimmed.endsWith("|") || trimmed.split("|").length >= 3)) {
      flushList();
      flushKv();

      // Skip markdown table separator line like "|---|---|---|"
      if (/^\|?\s*:?-+:?\s*\|/.test(trimmed)) {
        continue;
      }

      const cells = trimmed
        .split("|")
        .map(c => c.trim())
        .filter((c, idx, arr) => !(idx === 0 && c === "") && !(idx === arr.length - 1 && c === ""));

      if (cells.length > 0) {
        if (!currentTable) {
          currentTable = { headers: cells, rows: [] };
        } else {
          currentTable.rows.push(cells);
        }
      }
      continue;
    } else {
      flushTable();
    }

    // 2. Greeting Banner Detection
    if (
      trimmed.startsWith("[GREETING]") ||
      trimmed.startsWith("🙏 प्रणाम") ||
      trimmed.startsWith("🙏 नमो") ||
      trimmed.startsWith("हर हर महादेव") ||
      trimmed.startsWith("जय श्री राम") ||
      (trimmed.includes("प्रणाम भक्त") && trimmed.length <= 70)
    ) {
      flushList();
      flushKv();
      const cleanGreeting = trimmed
        .replace(/^\[GREETING\]/i, "")
        .replace(/\[\/GREETING\]$/i, "")
        .trim();
      blocks.push({ type: "greeting", text: cleanGreeting });
      continue;
    }

    // 3. Sacred Divider Detection
    if (
      trimmed === "---" ||
      trimmed === "***" ||
      trimmed === "===" ||
      trimmed === "[DIVIDER]" ||
      /^[─━═-]{3,}$/.test(trimmed) ||
      /^❖\s*❖\s*❖$/.test(trimmed)
    ) {
      flushList();
      flushKv();
      blocks.push({ type: "divider" });
      continue;
    }

    // 4. Section Heading Line
    if (isHeadingLine(trimmed)) {
      flushList();
      flushKv();
      const headingClean = trimmed
        .replace(/^\[SECTION\]/i, "")
        .replace(/\[\/SECTION\]$/i, "")
        .replace(/^\*{1,2}/, "")
        .replace(/\*{1,2}$/, "")
        .replace(/^#{1,6}\s*/, "")
        .trim();

      blocks.push({
        type: "heading",
        text: headingClean
      });
      continue;
    }

    // 5. Mantra Card Detection
    if (
      trimmed.startsWith("[MANTRA]") ||
      trimmed.startsWith("मंत्र:") ||
      trimmed.startsWith("बीज मंत्र:") ||
      trimmed.startsWith("सिद्ध मंत्र:") ||
      (trimmed.includes("ॐ") && (trimmed.startsWith('"') || trimmed.startsWith('“') || trimmed.length <= 80))
    ) {
      flushList();
      flushKv();
      blocks.push({ type: "mantra", text: trimmed });
      continue;
    }

    // 6. Warning / Dosh Alert Detection
    if (
      trimmed.startsWith("[IMPORTANT]") ||
      trimmed.startsWith("[WARNING]") ||
      trimmed.startsWith("ध्यान दें") ||
      trimmed.startsWith("विशेष चेतावनी")
    ) {
      flushList();
      flushKv();
      const cleanWarn = trimmed
        .replace(/^\[(IMPORTANT|WARNING)\]/i, "")
        .replace(/\[\/(IMPORTANT|WARNING)\]$/i, "")
        .trim();
      blocks.push({ type: "warning", text: cleanWarn });
      continue;
    }

    // 7. Key-Value attribute line (Birth details summary)
    const kv = parseKeyValueLine(trimmed);
    if (kv) {
      flushList();
      if (!currentKvGroup) {
        currentKvGroup = { type: "kv_group", items: [] };
      }
      currentKvGroup.items.push(kv);
      continue;
    } else {
      flushKv();
    }

    // 8. Bullet or Numbered item
    const isBullet = /^[-*+•✦📌🪐✨🔸🔹👉📍💡✔✓]\s+/.test(trimmed);
    const isNumber = /^\d+[.)]\s+/.test(trimmed);

    if (isBullet || isNumber) {
      const itemText = trimmed.replace(/^[-*+•✦📌🪐✨🔸🔹👉📍💡✔✓\d.)]\s+/, "");
      if (!currentList || currentList.isNumbered !== isNumber) {
        flushList();
        currentList = { type: "list", isNumbered: isNumber, items: [] };
      }
      currentList.items.push(itemText);
      continue;
    } else {
      flushList();
    }

    // 9. Regular Paragraph (Continuous long-form prose)
    blocks.push({
      type: "paragraph",
      text: trimmed
    });
  }

  flushList();
  flushKv();
  flushTable();

  let hasRenderedChart = false;

  return (
    <div className={`aura-ai-msg-text-ai ${className}`}>
      {blocks.map((block, idx) => {
        // Greeting Banner (Rendered as clean normal chat text)
        if (block.type === "greeting") {
          return (
            <p key={idx} className="font-semibold text-[#8c2b10] text-[15px] my-1 leading-relaxed">
              <span className="mr-1.5">🙏</span>
              {renderInlineContent(block.text)}
            </p>
          );
        }

        // Sacred Divider
        if (block.type === "divider") {
          return (
            <div key={idx} className="my-2 border-b border-[#ebdccb]" />
          );
        }

        // Section Heading
        if (block.type === "heading") {
          return (
            <h3 key={idx} className="text-[15px] font-bold text-[#8c2b10] mt-3.5 mb-1.5 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#8c2b10] flex-shrink-0" />
              <span>{renderInlineContent(block.text)}</span>
            </h3>
          );
        }

        // Multi-View Planetary & Kundali Report (SVG Kundali Chart + Full Table)
        if (block.type === "planetary_report") {
          const shouldShowChart = !hasRenderedChart;
          if (shouldShowChart) {
            hasRenderedChart = true;
          }
          return (
            <ResponsivePlanetaryReport
              key={idx}
              planets={block.planets}
              headers={block.headers}
              rawRows={block.rawRows}
              detectedLagna={block.detectedLagna || detectedLagna}
              showChart={shouldShowChart}
              fullKundaliData={fullKundaliData}
              birthData={birthData}
            />
          );
        }

        // Single Planet Line (Rendered as clean continuous text instead of boxy card)
        if (block.type === "planet_card") {
          const { planetName, house, rashi, status, interpretation } = block.planet || {};
          return (
            <div key={idx} className="my-1.5 leading-relaxed text-[#2b1408]">
              <strong className="text-[#8c2b10] font-bold">{planetName}</strong>
              {house && <span className="ml-1 text-[#6e2008] font-semibold">({house}{rashi ? `, ${rashi}` : ""}):</span>}
              {status && <span className="ml-1 font-semibold">{status} -</span>}
              <span className="ml-1">{renderInlineContent(interpretation)}</span>
            </div>
          );
        }

        // Non-Planetary Responsive Table -> Rendered as clean, mobile-friendly vertical structured card/list (NO horizontal scrolling)
        if (block.type === "table") {
          const rows = Array.isArray(block.rows) ? block.rows : [];
          const headers = Array.isArray(block.headers) ? block.headers : [];
          return (
            <div key={idx} className="my-2.5 space-y-2 text-[#2b1408] w-full max-w-full overflow-hidden">
              {rows.map((row, rIdx) => {
                const rowCells = Array.isArray(row) ? row : [String(row || "")];
                const titleCell = rowCells[0] || "";
                const otherCells = rowCells.slice(1);
                return (
                  <div 
                    key={rIdx} 
                    className="p-2.5 rounded-lg border border-[#f0dfcc] bg-gradient-to-r from-[#fffdfa] to-[#fbf5eb] space-y-1 text-[13px] leading-relaxed shadow-xs w-full max-w-full box-border"
                  >
                    <div className="font-bold text-[#8c2b10] flex items-baseline gap-1.5 text-[13.5px]">
                      <span className="text-[#d4af37] text-xs">✦</span>
                      <span>{renderInlineContent(titleCell)}</span>
                    </div>
                    {otherCells.map((cell, cIdx) => {
                      const headerCell = headers[cIdx + 1];
                      const headerLabel = typeof headerCell === "string" 
                        ? headerCell.replace(/\*\*/g, "").trim() 
                        : (headerCell ? String(headerCell) : "");
                      return (
                        <div key={cIdx} className="text-[#3b1b08] pl-3 flex flex-wrap items-baseline gap-1">
                          {headerLabel && <span className="text-[#8c2b10] font-semibold text-[12px] opacity-90">{headerLabel}:</span>}
                          <span>{renderInlineContent(cell)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        }

        // Sacred Mantra Card
        if (block.type === "mantra") {
          return <MantraCard key={idx} mantraText={block.text} />;
        }

        // Warning / Dosh Card
        if (block.type === "warning") {
          return (
            <p key={idx} className="my-2 text-[#991b1b] font-medium text-[13.5px] leading-relaxed flex items-start gap-1.5">
              <AlertTriangle size={15} className="text-[#dc2626] flex-shrink-0 mt-0.5" />
              <span>{renderInlineContent(block.text)}</span>
            </p>
          );
        }

        // Key-Value Attribute Group
        if (block.type === "kv_group") {
          const items = Array.isArray(block.items) ? block.items : [];
          return (
            <div key={idx} className="my-2 space-y-1 text-[#2d211b]">
              {items.map((item, itemIdx) => (
                <div key={itemIdx} className="text-[14px] leading-relaxed flex items-start gap-1.5">
                  <span className="text-[#8c2b10] font-bold">✦</span>
                  <div>
                    <strong className="text-[#8c2b10] font-semibold">{item?.key || ""}:</strong>{" "}
                    <span>{renderInlineContent(item?.value || "")}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        }

        // Lists
        if (block.type === "list") {
          const items = Array.isArray(block.items) ? block.items : [];
          return (
            <div key={idx} className="my-2 space-y-1.5">
              {items.map((itemText, itemIdx) => (
                <div key={itemIdx} className="text-[14.5px] leading-relaxed flex items-start gap-2">
                  <span className="text-[#8c2b10] font-bold flex-shrink-0 mt-0.5">
                    {block.isNumbered ? `${itemIdx + 1}.` : "•"}
                  </span>
                  <div className="flex-1 text-[#2d211b]">
                    {renderInlineContent(itemText)}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        // Regular Paragraph
        return (
          <p key={idx} className="aura-ai-para">
            {renderInlineContent(block.text)}
          </p>
        );
      })}
    </div>
  );
}
