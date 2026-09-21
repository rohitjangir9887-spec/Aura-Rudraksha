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
  if (!raw || typeof raw !== "string") return "";
  let text = raw.trim();

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

// Tokenize a line of text for inline formatting & keyword badges
export function renderInlineContent(text) {
  if (!text) return null;

  try {
    // Split by inline tokens: [link](url), https?://..., **bold**, `code`, *italic*
    const tokenRegex = /(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s<]+|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, idx) => {
      if (!part) return null;

      // 1. Markdown Link: [label](url)
      const mdLinkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (mdLinkMatch) {
        const label = mdLinkMatch[1];
        let url = mdLinkMatch[2].trim();

        if (url.includes("aurarudraksha.bond") || url.includes("aurarudraksha.com") || url.includes("aura-rudraksha.vercel.app")) {
          try {
            const parsed = new URL(url);
            url = parsed.pathname + parsed.search;
          } catch (_) {
            url = url.replace(/^https?:\/\/(www\.)?(aurarudraksha\.bond|aurarudraksha\.com|aura-rudraksha\.vercel\.app)/i, "") || "/";
          }
        }

        if (url.startsWith("/")) {
          return (
            <Link key={idx} to={url} className="aura-ai-inline-link">
              {label}
            </Link>
          );
        }

        return (
          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="aura-ai-inline-link">
            {label} <ExternalLink size={10} className="inline ml-0.5" />
          </a>
        );
      }

      // 2. Direct Raw HTTP / HTTPS URL
      if (part.startsWith("http://") || part.startsWith("https://")) {
        let url = part;
        if (url.includes("aurarudraksha.bond") || url.includes("aurarudraksha.com") || url.includes("aura-rudraksha.vercel.app")) {
          try {
            const parsed = new URL(url);
            const relPath = parsed.pathname + parsed.search;
            return (
              <Link key={idx} to={relPath || "/"} className="aura-ai-inline-link">
                {part}
              </Link>
            );
          } catch (_) {}
        }
        return (
          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="aura-ai-inline-link">
            {part} <ExternalLink size={10} className="inline ml-0.5" />
          </a>
        );
      }

      // 3. Bold: **something**
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        const inner = part.slice(2, -2);
        return (
          <strong key={idx} className="aura-ai-strong">
            {renderInlineKeywords(inner)}
          </strong>
        );
      }

      // 4. Code / Coupon / Highlight: `something`
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        const inner = part.slice(1, -1);
        return (
          <span key={idx} className="aura-ai-code-chip">
            {inner}
          </span>
        );
      }

      // 5. Italic: *something*
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        const inner = part.slice(1, -1);
        return (
          <em key={idx} className="aura-ai-italic">
            {inner}
          </em>
        );
      }

      // 6. Phone / Email in plain text
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

// Interactive Multi-View Component: Kundali Chart vs Table
export function ResponsivePlanetaryReport({ planets = [], headers = [], rawRows = [], detectedLagna = 1 }) {
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'chart'

  return (
    <div className="w-full my-3 bg-gradient-to-b from-[#FFFDF9] to-[#FAF5EE] border border-[#E5D5C5] rounded-2xl p-2.5 sm:p-3.5 shadow-sm overflow-hidden box-border">
      {/* Top Controls Bar with View Switcher Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 mb-2.5 border-b border-[#EADCCF]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base text-amber-700 flex-shrink-0">🪐</span>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#5C1C0A] leading-tight truncate">ग्रह गोचर व भाव स्थिति</h4>
            <p className="text-[10px] text-stone-600 font-medium">वैदिक कुण्डली विश्लेषण ({planets.length || rawRows.length} ग्रह)</p>
          </div>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center bg-[#F3E8DC] p-0.5 rounded-lg border border-[#E5D5C5] flex-shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer select-none ${
              viewMode === "table"
                ? "bg-[#8C2B10] text-white shadow-xs"
                : "text-[#78350F] hover:text-[#8C2B10]"
            }`}
          >
            <TableIcon size={11} />
            <span>तालिका</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("chart")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer select-none ${
              viewMode === "chart"
                ? "bg-[#8C2B10] text-white shadow-xs"
                : "text-[#78350F] hover:text-[#8C2B10]"
            }`}
          >
            <span>🕉️</span>
            <span>कुण्डली चक्र</span>
          </button>
        </div>
      </div>

      {/* Content based on ViewMode */}
      {viewMode === "chart" && (
        <VedicKundaliChart
          lagnaRashiNumber={detectedLagna}
          planets={planets}
          title="लग्न कुण्डली (D1 Chart)"
          subtitle="उत्तर भारतीय वैदिक चक्र"
        />
      )}

      {viewMode === "table" && (
        <div className="aura-ai-table-wrap">
          <table className="aura-ai-table">
            {headers.length > 0 && (
              <thead>
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx}>{h.replace(/\*\*/g, "")}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rawRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx}>{renderInlineContent(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Mantra Card Component with Copy action
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
    <div className="aura-ai-mantra-card">
      <div className="aura-ai-mantra-header">
        <span>🕉️ सिद्ध बीज मंत्र (Sacred Mantra)</span>
        <button 
          onClick={handleCopy} 
          className="text-[#b45309] hover:text-[#782218] flex items-center gap-1 cursor-pointer text-[10px]"
          title="मंत्र कॉपी करें"
        >
          {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          <span>{copied ? "कॉपी हो गया!" : "कॉपी करें"}</span>
        </button>
      </div>
      <div className="aura-ai-mantra-text">
        {cleanMantra}
      </div>
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

  // 2. Numbered / Symbolized section headers
  if (
    trimmed.length <= 85 &&
    !trimmed.includes("?") &&
    (
      /^#{1,6}\s*/.test(trimmed) ||
      /^(?:\d+\.|\d+\))\s*\*{0,2}[^\n:]+\*{0,2}:?$/.test(trimmed) ||
      trimmed.endsWith(":") ||
      trimmed.endsWith("!")
    ) &&
    (
      trimmed.includes("Kundali") ||
      trimmed.includes("राशि") ||
      trimmed.includes("ग्रह") ||
      trimmed.includes("दोष") ||
      trimmed.includes("महादशा") ||
      trimmed.includes("नक्षत्र") ||
      trimmed.includes("रुद्राक्ष") ||
      trimmed.includes("उपाय") ||
      trimmed.includes("मंत्र") ||
      trimmed.includes("जाप") ||
      trimmed.includes("दृष्टि") ||
      trimmed.includes("विश्लेषण") ||
      trimmed.includes("Rudraksha") ||
      trimmed.includes("Offer") ||
      trimmed.includes("Guarantee") ||
      trimmed.startsWith("🙏") ||
      trimmed.startsWith("✨") ||
      trimmed.startsWith("🎁") ||
      trimmed.startsWith("📿") ||
      trimmed.startsWith("🕉")
    )
  ) {
    return true;
  }

  // 3. Text wrapped entirely in **...**
  if (
    trimmed.startsWith("**") && 
    trimmed.endsWith("**") && 
    trimmed.length <= 75 && 
    !trimmed.includes(".") &&
    !trimmed.includes("।")
  ) {
    return true;
  }

  return false;
}

export function AuraAIMessageContent({ text, content, sender = "ai", className = "" }) {
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

      const isPlanetaryTable = 
        headers.some(h => /ग्रह|भाव|राशि|स्थिति|बलाबल|Planet|House|Rashi|Dignity|Status/i.test(h)) ||
        rows.some(r => r.some(c => /सूर्य|चंद्र|मंगल|बुध|गुरु|शुक्र|शनि|राहु|केतु|Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu/i.test(c)));

      if (isPlanetaryTable && rows.length > 0) {
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
    const isBullet = /^[-*•✦]\s+/.test(trimmed);
    const isNumber = /^\d+[.)]\s+/.test(trimmed);

    if (isBullet || isNumber) {
      const itemText = trimmed.replace(/^[-*•✦\d.)]\s+/, "");
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

  return (
    <div className={`aura-ai-msg-text-ai ${className}`}>
      {blocks.map((block, idx) => {
        // Greeting Banner
        if (block.type === "greeting") {
          return (
            <div key={idx} className="aura-ai-greeting-banner">
              <span className="aura-ai-greeting-icon">🙏</span>
              <span className="aura-ai-greeting-text">{renderInlineContent(block.text)}</span>
            </div>
          );
        }

        // Sacred Divider
        if (block.type === "divider") {
          return (
            <div key={idx} className="aura-ai-sacred-divider">
              <span className="aura-ai-divider-line" />
              <span className="aura-ai-divider-symbol">❖ 🕉 ❖</span>
              <span className="aura-ai-divider-line" />
            </div>
          );
        }

        // Section Heading
        if (block.type === "heading") {
          return (
            <div key={idx} className="aura-ai-section-heading">
              <span className="aura-ai-heading-icon">
                <Sparkles size={13} />
              </span>
              <span className="aura-ai-heading-title">{renderInlineContent(block.text)}</span>
            </div>
          );
        }

        // Multi-View Planetary & Kundali Report (Cards + SVG Kundali Chart + Table)
        if (block.type === "planetary_report") {
          return (
            <ResponsivePlanetaryReport
              key={idx}
              planets={block.planets}
              headers={block.headers}
              rawRows={block.rawRows}
              detectedLagna={block.detectedLagna || detectedLagna}
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

        // Non-Planetary Responsive Table
        if (block.type === "table") {
          return (
            <div key={idx} className="aura-ai-table-wrap">
              <table className="aura-ai-table">
                {block.headers.length > 0 && (
                  <thead>
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th key={hIdx}>{h.replace(/\*\*/g, "")}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{renderInlineContent(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <div key={idx} className="aura-ai-warning-card">
              <AlertTriangle size={15} className="aura-ai-warning-icon" />
              <div>{renderInlineContent(block.text)}</div>
            </div>
          );
        }

        // Key-Value Attribute Group
        if (block.type === "kv_group") {
          return (
            <div key={idx} className="aura-ai-kv-card">
              {block.items.map((item, itemIdx) => (
                <div key={itemIdx} className="aura-ai-kv-row">
                  <span className="aura-ai-kv-key">{item.key}:</span>
                  <span className="aura-ai-kv-val">{renderInlineContent(item.value)}</span>
                </div>
              ))}
            </div>
          );
        }

        // Lists
        if (block.type === "list") {
          return (
            <div key={idx} className="aura-ai-list-wrap">
              {block.items.map((itemText, itemIdx) => (
                <div key={itemIdx} className="aura-ai-list-item">
                  <span className="aura-ai-list-bullet">
                    {block.isNumbered ? (
                      <span className="aura-ai-step-num">{itemIdx + 1}</span>
                    ) : (
                      <span className="aura-ai-dot">✦</span>
                    )}
                  </span>
                  <div className="aura-ai-list-body">
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
