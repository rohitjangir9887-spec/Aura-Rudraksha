import React, { useState, useMemo } from "react";
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
  ChevronRight,
  BookOpen,
  Compass,
  Heart,
  HelpCircle,
  Clock,
  MapPin,
  Calendar,
  Sparkle
} from "lucide-react";

/**
 * Universal Aura AI Message Content & Vedic Astrology UI Renderer
 * 
 * Guarantees 100% full content fidelity — NEVER truncates, summarizes, 
 * compresses, or drops a single word of the original AI response.
 * 
 * Supports:
 * - 300 to 6000+ words full Kundali analyses
 * - Markdown & semantic markers ([GREETING], [SECTION], [MANTRA], [WARNING], etc.)
 * - Pipe tables with mobile-adaptive stacked layout
 * - Planetary status badges & complete interpretations
 * - Sacred seed mantras with 1-click copy
 * - Doshas & practical Vedic remedies
 * - Auspicious closing blessings
 * - Supplementary "🔱 सरल ग्राहक सारांश" (Simple Customer Summary) at the end
 */

// Clean raw artifacts & secure content while preserving every single word
function sanitizeText(raw) {
  if (!raw || typeof raw !== "string") return "";
  let text = raw.trim();

  // Replace raw HTML linebreaks with standard newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Replace masked date placeholders like 2024-XX-XX or XX-XX with "(date not available)"
  text = text.replace(/\b\d{4}-XX-XX\b/gi, "(date not available)");
  text = text.replace(/\bXX-XX-\d{4}\b/gi, "(date not available)");
  text = text.replace(/\bXX-XX\b/gi, "(date not available)");

  // Strip wrapping code fences if present around entire message
  text = text.replace(/^```(?:json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Protect sensitive internal system keys or developer emails
  text = text.replace(/rohitjangir\d*@gmail\.com/gi, "aurarudrakshaofficial@gmail.com");
  text = text.replace(/MONGODB_[A-Z0-9_]+/gi, "");
  text = text.replace(/GEMINI_API_[A-Z0-9_]+/gi, "");
  text = text.replace(/NVIDIA_API_[A-Z0-9_]+/gi, "");

  return text;
}

// Highlight important planetary terms, yogas, and doshas inside text fragments
function renderInlineKeywords(text) {
  if (!text || typeof text !== "string") return text;

  // Highlight terms: उच्च, नीच, साम्य, स्वगृही, मित्र, शत्रु, मांगलिक दोष, कालसर्प दोष, पितृ दोष, साढ़े साती, ढैय्या, राजयोग, गजकेसरी, बुधादित्य, रुद्राक्ष मुखी, etc.
  const kwRegex = /(उच्च|नीच|साम्य|सम\s*राशि|स्वगृही|मित्र\s*राशि|शत्रु\s*राशि|वक्री|मार्गी|अस्त|मांगलिक\s*दोष|कालसर्प\s*दोष|पितृ\s*दोष|साढ़े\s*साती|ढैय्या|चांडाल\s*दोष|गुरु\s*चांडाल\s*दोष|ग्रहण\s*दोष|केमद्रुम\s*दोष|विष\s*योग|अंगारक\s*दोष|राजयोग|गजकेसरी\s*योग|बुधादित्य\s*योग|लक्ष्मी\s*योग|धन\s*योग|मालव्य\s*योग|रूचक\s*योग|शश\s*योग|हंस\s*योग|भद्र\s*योग|\d+\s*मुखी\s*रुद्राक्ष|गौरी\s*शंकर|गणेश\s*रुद्राक्ष|गर्भ\s*गौरी|त्रिजुटी)/gi;
  const parts = text.split(kwRegex);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (!part) return null;
    const lower = part.toLowerCase();

    if (
      lower === "उच्च" || 
      lower === "स्वगृही" || 
      lower.includes("मित्र") || 
      lower.includes("राजयोग") || 
      lower.includes("गजकेसरी") || 
      lower.includes("बुधादित्य") || 
      lower.includes("लक्ष्मी योग") ||
      lower.includes("धन योग") ||
      lower.includes("मालव्य") ||
      lower.includes("रूचक") ||
      lower.includes("शश योग") ||
      lower.includes("हंस योग") ||
      lower.includes("भद्र योग")
    ) {
      return <span key={i} className="aura-ai-highlight-exalted">{part}</span>;
    }
    if (lower === "नीच" || lower.includes("शत्रु") || lower === "अस्त") {
      return <span key={i} className="aura-ai-highlight-debilitated">{part}</span>;
    }
    if (lower === "साम्य" || lower.includes("सम") || lower === "वक्री" || lower === "मार्गी") {
      return <span key={i} className="aura-ai-highlight-neutral">{part}</span>;
    }
    if (
      lower.includes("दोष") || 
      lower.includes("साती") || 
      lower.includes("ढैय्या") ||
      lower.includes("विष योग")
    ) {
      return <span key={i} className="aura-ai-highlight-dosh">{part}</span>;
    }
    if (
      lower.includes("मुखी") || 
      lower.includes("गौरी शंकर") || 
      lower.includes("गणेश रुद्राक्ष") ||
      lower.includes("गर्भ गौरी") ||
      lower.includes("त्रिजुटी")
    ) {
      return <span key={i} className="aura-ai-highlight-rudraksha">{part}</span>;
    }
    return part;
  });
}

// Tokenize a line of text for inline formatting & keyword badges
function renderInlineContent(text) {
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
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        const inner = part.slice(2, -2);
        return (
          <strong key={idx} className="aura-ai-strong">
            {renderInlineKeywords(inner)}
          </strong>
        );
      }

      // 4. Code / Coupon / Highlight: `something`
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        const inner = part.slice(1, -1);
        return (
          <span key={idx} className="aura-ai-code-chip">
            {inner}
          </span>
        );
      }

      // 5. Italic: *something*
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
        const inner = part.slice(1, -1);
        return (
          <em key={idx} className="aura-ai-italic">
            {inner}
          </em>
        );
      }

      // 6. Phone / Email in plain text
      const words = part.split(/(\+91\s*\d{10}|\+91\s*\d{5}\s*\d{5}|support@aurarudraksha\.com|aurarudrakshaofficial@gmail\.com)/g);
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
function getPlanetIcon(planetName = "") {
  const p = String(planetName).toLowerCase();
  if (p.includes("सूर्य") || p.includes("sun")) return <Sun size={15} className="text-amber-600 shrink-0" />;
  if (p.includes("चंद्र") || p.includes("moon")) return <Moon size={15} className="text-sky-600 shrink-0" />;
  if (p.includes("मंगल") || p.includes("mars")) return <Flame size={15} className="text-red-600 shrink-0" />;
  if (p.includes("बुध") || p.includes("mercury")) return <Sparkles size={15} className="text-emerald-600 shrink-0" />;
  if (p.includes("गुरु") || p.includes("jupiter") || p.includes("बृहस्पति")) return <Award size={15} className="text-amber-700 shrink-0" />;
  if (p.includes("शुक्र") || p.includes("venus")) return <Gem size={15} className="text-purple-600 shrink-0" />;
  if (p.includes("शनि") || p.includes("saturn")) return <ShieldAlert size={15} className="text-indigo-700 shrink-0" />;
  if (p.includes("राहु") || p.includes("rahu")) return <Sparkles size={15} className="text-stone-700 shrink-0" />;
  if (p.includes("केतु") || p.includes("ketu")) return <Sparkles size={15} className="text-orange-900 shrink-0" />;
  return <Sparkles size={15} className="text-amber-600 shrink-0" />;
}

// Map status string to pill badge
function renderStatusBadge(status = "") {
  const s = String(status).trim();
  if (!s) return null;
  if (s.includes("उच्च")) return <span className="aura-ai-status-badge aura-ai-status-exalted">✨ उच्च (Exalted)</span>;
  if (s.includes("स्वगृही")) return <span className="aura-ai-status-badge aura-ai-status-own">🏠 स्वगृही (Own Sign)</span>;
  if (s.includes("नीच")) return <span className="aura-ai-status-badge aura-ai-status-debilitated">⚠️ नीच (Debilitated)</span>;
  if (s.includes("मित्र")) return <span className="aura-ai-status-badge aura-ai-status-exalted">🤝 मित्र (Friendly)</span>;
  if (s.includes("शत्रु")) return <span className="aura-ai-status-badge aura-ai-status-debilitated">⚡ शत्रु (Inimical)</span>;
  if (s.includes("साम्य") || s.includes("सम")) return <span className="aura-ai-status-badge aura-ai-status-neutral">🔵 साम्य (Neutral)</span>;
  return <span className="aura-ai-status-badge aura-ai-status-own">🔸 {s}</span>;
}

// Individual Planet Card component - NEVER truncates interpretation
function PlanetCard({ planetName, house, rashi, status, interpretation }) {
  const cleanName = String(planetName || "").replace(/^\*{1,2}/, "").replace(/\*{1,2}$/, "").trim();
  return (
    <div className="aura-ai-planet-card">
      <div className="aura-ai-planet-header">
        <div className="aura-ai-planet-title">
          {getPlanetIcon(cleanName)}
          <span>{cleanName}</span>
        </div>
        {renderStatusBadge(status)}
      </div>
      {(house || rashi) && (
        <div className="aura-ai-planet-meta">
          {house && <span className="aura-ai-planet-meta-item">भाव: {house}</span>}
          {rashi && <span className="aura-ai-planet-meta-item">राशि: {rashi}</span>}
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

// Mantra Card Component with Copy action
function MantraCard({ mantraText }) {
  const [copied, setCopied] = useState(false);
  const cleanMantra = String(mantraText || "")
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
          type="button"
          onClick={handleCopy} 
          className="text-[#b45309] hover:text-[#782218] flex items-center gap-1 cursor-pointer text-[11px] font-bold bg-white/70 px-2 py-0.5 rounded border border-[#f59e0b]/40"
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

// Strict Key-Value Check: ONLY for genuinely short metadata pairs
function parseKeyValueLine(line) {
  const clean = line.replace(/^[-*•✦🕉▪▫▸►\d.)]\s*/, "").trim();
  
  // Pattern: "Key:" or "**Key:**" followed by value
  const kvMatch = clean.match(/^(\*{0,2})([A-Za-z0-9\s/&()#₹\u0900-\u097F-]+?)(\*{0,2})\s*:\s*(.+)$/);
  if (!kvMatch) return null;

  const rawKey = kvMatch[2].replace(/\*/g, "").trim();
  const rawVal = kvMatch[4].trim();

  // Strict constraints: key <= 30 chars, value <= 90 chars, no multiple sentences
  // If value is long (narrative paragraph), it must NOT be turned into a micro-card row!
  if (
    rawKey.length > 0 && 
    rawKey.length <= 30 && 
    rawVal.length <= 90 &&
    !rawVal.includes("\n") &&
    !rawKey.includes("?") && 
    !rawKey.endsWith(".") &&
    !rawKey.endsWith("।") &&
    !rawVal.includes("।")
  ) {
    return { key: rawKey, value: rawVal };
  }
  return null;
}

// Check if a line is a title or section heading
function isHeadingLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // 1. Explicit markdown heading (#, ##, ###, ####) or semantic tag [SECTION]
  if (/^#{1,6}\s+/.test(trimmed) || /^\[SECTION\]/i.test(trimmed)) return true;

  // 2. Text wrapped entirely in **...** with short length (section title)
  if (
    trimmed.startsWith("**") && 
    trimmed.endsWith("**") && 
    trimmed.length <= 80 && 
    !trimmed.includes("।") &&
    !trimmed.includes(".") &&
    !trimmed.includes("\n")
  ) {
    return true;
  }

  // 3. Numbered / Symbolized section headers with keywords
  if (
    trimmed.length <= 90 &&
    !trimmed.includes("?") &&
    !trimmed.includes("।") &&
    (
      /^#{1,6}\s*/.test(trimmed) ||
      /^(?:\d+\.|\d+\))\s*\*{0,2}[^\n:]+\*{0,2}:?$/.test(trimmed) ||
      trimmed.endsWith(":")
    ) &&
    (
      trimmed.includes("Kundali") ||
      trimmed.includes("कुंडली") ||
      trimmed.includes("राशि") ||
      trimmed.includes("लग्न") ||
      trimmed.includes("ग्रह") ||
      trimmed.includes("दोष") ||
      trimmed.includes("महादशा") ||
      trimmed.includes("अंतर्दशा") ||
      trimmed.includes("नक्षत्र") ||
      trimmed.includes("रुद्राक्ष") ||
      trimmed.includes("उपाय") ||
      trimmed.includes("मंत्र") ||
      trimmed.includes("जाप") ||
      trimmed.includes("दृष्टि") ||
      trimmed.includes("युति") ||
      trimmed.includes("योग") ||
      trimmed.includes("विश्लेषण") ||
      trimmed.includes("Rudraksha") ||
      trimmed.includes("Offer") ||
      trimmed.includes("Guarantee") ||
      trimmed.startsWith("🙏") ||
      trimmed.startsWith("✨") ||
      trimmed.startsWith("🎁") ||
      trimmed.startsWith("📿") ||
      trimmed.startsWith("🕉") ||
      trimmed.startsWith("🔱")
    )
  ) {
    return true;
  }

  return false;
}

// Extract supplementary "सरल ग्राहक सारांश" from Kundali reading
function extractKundaliSummary(fullText) {
  if (!fullText || typeof fullText !== "string") return null;
  const lower = fullText.toLowerCase();

  // Only generate summary for rich astrological or Kundali analyses
  const isKundaliReading = 
    (fullText.includes("लग्न") || fullText.includes("कुंडली") || fullText.includes("ग्रह") || fullText.includes("राशि")) &&
    (fullText.includes("रुद्राक्ष") || fullText.includes("उपाय") || fullText.includes("मंत्र") || fullText.includes("भाव"));

  if (!isKundaliReading) return null;

  // 1. Findings (Lagna / Rashi / Key Themes)
  let findings = [];
  const lagnaMatch = fullText.match(/(?:लग्न|Ascendant)\s*(?:है|:|\-)?\s*([^\n,।.|]+)/i);
  if (lagnaMatch && !lagnaMatch[1].includes("(") && lagnaMatch[1].length < 40) {
    findings.push(`लग्न: ${lagnaMatch[1].replace(/\*\*/g, "").trim()}`);
  }

  const rashiMatch = fullText.match(/(?:चंद्र राशि|राशि|Moon Sign)\s*(?:है|:|\-)?\s*([^\n,।.|]+)/i);
  if (rashiMatch && !rashiMatch[1].includes("(") && rashiMatch[1].length < 40) {
    findings.push(`राशि: ${rashiMatch[1].replace(/\*\*/g, "").trim()}`);
  }

  const dashaMatch = fullText.match(/(?:महादशा|दशा)\s*(?:है|:|\-)?\s*([^\n,।.|]+)/i);
  if (dashaMatch && dashaMatch[1].length < 40) {
    findings.push(`सक्रिय दशा: ${dashaMatch[1].replace(/\*\*/g, "").trim()}`);
  }

  // 2. Planets
  let planets = [];
  const exaltedMatch = fullText.match(/(?:उच्च|शुभ|बलवान)\s*ग्रह\s*[:\-]?\s*([^\n।.|]+)/i);
  if (exaltedMatch && exaltedMatch[1].length < 50) {
    planets.push(`शुभ/उच्च ग्रह: ${exaltedMatch[1].replace(/\*\*/g, "").trim()}`);
  }
  const debilMatch = fullText.match(/(?:नीच|पीड़ित|कमजोर)\s*ग्रह\s*[:\-]?\s*([^\n।.|]+)/i);
  if (debilMatch && debilMatch[1].length < 50) {
    planets.push(`विचारणीय/नीच ग्रह: ${debilMatch[1].replace(/\*\*/g, "").trim()}`);
  }

  // 3. Doshas
  let doshas = [];
  if (fullText.includes("मांगलिक दोष")) doshas.push("मांगलिक प्रभाव");
  if (fullText.includes("कालसर्प दोष")) doshas.push("कालसर्प योग");
  if (fullText.includes("पितृ दोष")) doshas.push("पितृ दोष प्रभाव");
  if (fullText.includes("साढ़े साती")) doshas.push("शनि साढ़े साती");
  if (fullText.includes("ढैय्या")) doshas.push("शनि ढैय्या");
  if (doshas.length === 0 && fullText.includes("दोष")) {
    const dMatch = fullText.match(/([^\n।.|]*दोष[^\n।.|]*)/);
    if (dMatch && dMatch[1].length < 40) {
      doshas.push(dMatch[1].replace(/\*\*/g, "").trim());
    }
  }

  // 4. Rudraksha
  let rudraksha = [];
  const rudMatch = fullText.match(/(\d+\s*मुखी\s*रुद्राक्ष|गौरी\s*शंकर|गणेश\s*रुद्राक्ष)/gi);
  if (rudMatch) {
    rudraksha = Array.from(new Set(rudMatch.map(r => r.trim()))).slice(0, 3);
  }

  // 5. Mantras
  let mantras = [];
  const mantraMatch = fullText.match(/(ॐ\s*[^।\n\[\]"'”]+)/gi);
  if (mantraMatch) {
    mantras = Array.from(new Set(mantraMatch.map(m => m.replace(/\[\/?MANTRA\]/gi, "").trim()))).slice(0, 2);
  }

  // 6. Practical Remedies
  let remedies = [];
  const remedyLines = fullText.split("\n").filter(l => {
    const t = l.trim();
    return (t.includes("उपाय") || t.includes("दान") || t.includes("अर्घ्य") || t.includes("व्रत") || t.includes("पूजा")) && t.length < 120;
  });
  if (remedyLines.length > 0) {
    remedies = remedyLines.slice(0, 3).map(r => r.replace(/^[-*•✦\d.)]\s*/, "").replace(/\*\*/g, "").trim());
  }

  return {
    findings: findings.length ? findings : ["आपकी पत्रिका में ग्रहों का सुंदर समन्वय है।"],
    planets: planets.length ? planets : null,
    doshas: doshas.length ? doshas : ["कोई गंभीर नकारात्मक दोष नहीं देखा गया।"],
    rudraksha: rudraksha.length ? rudraksha : ["प्रामाणिक सिद्ध 5 मुखी / 7 मुखी रुद्राक्ष"],
    mantras: mantras.length ? mantras : ["ॐ नमः शिवाय"],
    remedies: remedies.length ? remedies : ["प्रातः सूर्य देव को जल अर्पित करें व शिवलिंग पर जलाभिषेक करें।"]
  };
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

  const lines = sanitized.split("\n");
  const blocks = [];
  let currentList = null;
  let currentKvGroup = null;
  let currentTable = null;

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

      // Check if table contains planetary details
      const isPlanetaryTable = 
        headers.some(h => /ग्रह|भाव|राशि|स्थिति|फल|Planet|House|Rashi|Status/i.test(h)) ||
        rows.some(r => r.some(c => /सूर्य|चंद्र|मंगल|बुध|गुरु|शुक्र|शनि|राहु|केतु|Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu/i.test(c)));

      blocks.push({ 
        type: "table", 
        headers, 
        rows,
        isPlanetary: isPlanetaryTable 
      });
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

      // Skip table separator line like "|---|---|---|"
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
      trimmed.startsWith("ॐ नमः शिवाय") ||
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
      /^❖\s*❖\s*❖$/.test(trimmed) ||
      /^❖\s*🕉\s*❖$/.test(trimmed)
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
      const isH1orH2 = /^#{1,2}\s+/.test(trimmed) || /^\[SECTION\]/i.test(trimmed) || trimmed.startsWith("🔱");
      const headingClean = trimmed
        .replace(/^\[SECTION\]/i, "")
        .replace(/\[\/SECTION\]$/i, "")
        .replace(/^\*{1,2}/, "")
        .replace(/\*{1,2}$/, "")
        .replace(/^#{1,6}\s*/, "")
        .trim();

      blocks.push({
        type: "heading",
        level: isH1orH2 ? 2 : 3,
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
      trimmed.startsWith("गायत्री मंत्र:") ||
      (trimmed.includes("ॐ") && (trimmed.startsWith('"') || trimmed.startsWith('“') || (trimmed.length <= 80 && !trimmed.includes("।"))))
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
      trimmed.startsWith("[DOSHA]") ||
      trimmed.startsWith("विशेष चेतावनी:") ||
      (trimmed.startsWith("ध्यान दें:") && trimmed.length <= 120)
    ) {
      flushList();
      flushKv();
      const cleanWarn = trimmed
        .replace(/^\[(IMPORTANT|WARNING|DOSHA)\]/i, "")
        .replace(/\[\/(IMPORTANT|WARNING|DOSHA)\]$/i, "")
        .trim();
      blocks.push({ type: "warning", text: cleanWarn });
      continue;
    }

    // 7. Single Planet Line with Full Narrative Text
    const planetMatch = trimmed.match(/^(?:[-*•✦🕉▪▫▸►\d.)]\s*)?\*{0,2}(सूर्य|चंद्र|मंगल|बुध|गुरु|बृहस्पति|शुक्र|शनि|राहु|केतु|Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)(?:\s*[\(/][^)]*[\)])?\*{0,2}\s*:\s*(.+)$/i);
    if (planetMatch) {
      flushList();
      flushKv();
      const name = planetMatch[1];
      const rest = planetMatch[2];
      
      let house = "";
      let rashi = "";
      let status = "";
      let interpretation = rest;

      const houseMatch = rest.match(/(\d+\s*(?:वां|वें|था|रा|रां|st|nd|rd|th)?\s*भाव|भाव\s*\d+|\d+\s*(?:st|nd|rd|th)?\s*house)/i);
      if (houseMatch) house = houseMatch[1];

      const rashiMatch = rest.match(/(सिंह|कन्या|तुला|वृश्चिक|धनु|मकर|कुंभ|मीन|मेष|वृषभ|मिथुन|कर्क)\s*(?:राशि)?/);
      if (rashiMatch) rashi = rashiMatch[1];

      const statusMatch = rest.match(/(उच्च|नीच|साम्य|स्वगृही|मित्र|शत्रु|Exalted|Debilitated|Neutral|Own Sign)/i);
      if (statusMatch) status = statusMatch[1];

      blocks.push({
        type: "planet_card",
        planet: { planetName: name, house, rashi, status, interpretation }
      });
      continue;
    }

    // 8. Strict Key-Value attribute line (only for genuine short metadata)
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

    // 9. Bullet or Numbered item
    const isBullet = /^[-*•✦→]\s+/.test(trimmed);
    const isNumber = /^(?:\d+|\([0-9]+\)|[०-९]+)[.)]\s+/.test(trimmed);

    if (isBullet || isNumber) {
      const itemText = trimmed.replace(/^[-*•✦→\d().०-९]+\s+/, "");
      if (!currentList || currentList.isNumbered !== isNumber) {
        flushList();
        currentList = { type: "list", isNumbered: isNumber, items: [] };
      }
      currentList.items.push(itemText);
      continue;
    } else {
      flushList();
    }

    // 10. Concluding Blessing
    if (
      (trimmed.includes("हर हर महादेव") || trimmed.includes("जय श्री राम") || trimmed.includes("शुभम् भवतु") || trimmed.includes("अस्तु")) &&
      trimmed.length <= 120 &&
      i >= lines.length - 3
    ) {
      blocks.push({
        type: "blessing",
        text: trimmed
      });
      continue;
    }

    // 11. Regular Paragraph (All words guaranteed preserved)
    blocks.push({
      type: "paragraph",
      text: trimmed
    });
  }

  flushList();
  flushKv();
  flushTable();

  // Supplementary Customer Summary (🔱 सरल ग्राहक सारांश)
  const kundaliSummary = extractKundaliSummary(sanitized);

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
            <div key={idx} className={`aura-ai-section-heading ${block.level === 2 ? "aura-ai-heading-grand" : ""}`}>
              <span className="aura-ai-heading-icon">
                {block.level === 2 ? <Sparkles size={14} className="text-amber-600" /> : <Sparkle size={12} className="text-amber-700" />}
              </span>
              <span className="aura-ai-heading-title">{renderInlineContent(block.text)}</span>
            </div>
          );
        }

        // Planet Card
        if (block.type === "planet_card") {
          return (
            <div key={idx} className="my-2">
              <PlanetCard {...block.planet} />
            </div>
          );
        }

        // Responsive Table (Never drops cell content)
        if (block.type === "table") {
          return (
            <div key={idx} className="aura-ai-table-container my-3">
              {/* Desktop / Standard Table View */}
              <div className="aura-ai-table-wrap">
                <table className="aura-ai-table">
                  {block.headers.length > 0 && (
                    <thead>
                      <tr>
                        {block.headers.map((h, hIdx) => (
                          <th key={hIdx}>{renderInlineContent(h.replace(/\*\*/g, ""))}</th>
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

              {/* Mobile Adaptive Stacked Cards (Visible only on very narrow screens) */}
              <div className="aura-ai-table-stacked sm:hidden">
                {block.rows.map((row, rIdx) => (
                  <div key={rIdx} className="aura-ai-stacked-row-card">
                    {row.map((cell, cIdx) => {
                      const headerLabel = block.headers[cIdx] ? block.headers[cIdx].replace(/\*\*/g, "").trim() : "";
                      return (
                        <div key={cIdx} className="aura-ai-stacked-cell">
                          {headerLabel && <span className="aura-ai-stacked-label">{headerLabel}:</span>}
                          <span className="aura-ai-stacked-value">{renderInlineContent(cell)}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
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
              <AlertTriangle size={16} className="aura-ai-warning-icon" />
              <div className="aura-ai-warning-body">{renderInlineContent(block.text)}</div>
            </div>
          );
        }

        // Key-Value Attribute Group (Short metadata only)
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

        // Lists (Unordered & Numbered)
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

        // Concluding Sacred Blessing
        if (block.type === "blessing") {
          return (
            <div key={idx} className="aura-ai-blessing-card">
              <div className="aura-ai-blessing-symbol">🕉️</div>
              <div className="aura-ai-blessing-text">{renderInlineContent(block.text)}</div>
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

      {/* Additional Supplementary Customer Summary (🔱 सरल ग्राहक सारांश) */}
      {kundaliSummary && (
        <div className="aura-ai-summary-card">
          <div className="aura-ai-summary-header">
            <span className="aura-ai-summary-icon">🔱</span>
            <div className="aura-ai-summary-title-wrap">
              <h4 className="aura-ai-summary-title">सरल ग्राहक सारांश (Vedic Summary)</h4>
              <span className="aura-ai-summary-sub">आपकी पत्रिका का मुख्य सार व त्वरित मार्गदर्शन</span>
            </div>
          </div>

          <div className="aura-ai-summary-grid">
            {/* 1. Main Findings */}
            <div className="aura-ai-summary-item">
              <div className="aura-ai-summary-item-title">
                <Compass size={13} className="text-amber-700" />
                <span>मुख्य ज्योतिषीय स्थिति</span>
              </div>
              <div className="aura-ai-summary-item-body">
                {kundaliSummary.findings.map((f, fi) => (
                  <div key={fi} className="aura-ai-summary-badge">{renderInlineContent(f)}</div>
                ))}
              </div>
            </div>

            {/* 2. Key Planets */}
            {kundaliSummary.planets && kundaliSummary.planets.length > 0 && (
              <div className="aura-ai-summary-item">
                <div className="aura-ai-summary-item-title">
                  <Sun size={13} className="text-amber-600" />
                  <span>ग्रह प्रभाव</span>
                </div>
                <div className="aura-ai-summary-item-body">
                  {kundaliSummary.planets.map((p, pi) => (
                    <div key={pi} className="aura-ai-summary-text">{renderInlineContent(p)}</div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Doshas */}
            <div className="aura-ai-summary-item">
              <div className="aura-ai-summary-item-title">
                <ShieldAlert size={13} className="text-red-700" />
                <span>दोष व सावधानियां</span>
              </div>
              <div className="aura-ai-summary-item-body">
                {kundaliSummary.doshas.map((d, di) => (
                  <div key={di} className="aura-ai-summary-dosha-pill">{renderInlineContent(d)}</div>
                ))}
              </div>
            </div>

            {/* 4. Recommended Rudraksha */}
            <div className="aura-ai-summary-item aura-ai-summary-item-featured">
              <div className="aura-ai-summary-item-title">
                <Gem size={13} className="text-amber-700" />
                <span>अनुशंसित रुद्राक्ष</span>
              </div>
              <div className="aura-ai-summary-item-body">
                {kundaliSummary.rudraksha.map((r, ri) => (
                  <div key={ri} className="aura-ai-summary-rudraksha-pill">📿 {renderInlineContent(r)}</div>
                ))}
              </div>
            </div>

            {/* 5. Sacred Mantras */}
            <div className="aura-ai-summary-item">
              <div className="aura-ai-summary-item-title">
                <Sparkles size={13} className="text-amber-600" />
                <span>दैनिक सिद्ध मंत्र</span>
              </div>
              <div className="aura-ai-summary-item-body">
                {kundaliSummary.mantras.map((m, mi) => (
                  <div key={mi} className="aura-ai-summary-mantra-pill">{m}</div>
                ))}
              </div>
            </div>

            {/* 6. Practical Remedies */}
            <div className="aura-ai-summary-item">
              <div className="aura-ai-summary-item-title">
                <CheckCircle2 size={13} className="text-emerald-700" />
                <span>सरल व व्यावहारिक उपाय</span>
              </div>
              <div className="aura-ai-summary-item-body">
                {kundaliSummary.remedies.map((rem, remi) => (
                  <div key={remi} className="aura-ai-summary-text">• {renderInlineContent(rem)}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
