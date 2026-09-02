import React from "react";
import { Sparkles, Phone, Mail, CheckCircle2, ShieldCheck, Tag } from "lucide-react";

/**
 * Universal Aura AI Message Renderer
 * 
 * Automatically cleans, parses, and formats AI & Customer messages into 
 * a pristine, modern, high-contrast spiritual chat UI without any raw
 * markdown artifacts (** , * , - , ### , ``` , ..).
 */

// Helper to clean raw artifacts & secure content
function sanitizeText(raw) {
  if (!raw || typeof raw !== "string") return "";
  let text = raw.trim();

  // Strip code blocks and raw JSON
  text = text.replace(/^```(?:json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Protect against sensitive emails or internal system keys
  text = text.replace(/rohitjangir\d*@gmail\.com/gi, "aurarudrakshaofficial@gmail.com");
  text = text.replace(/MONGODB_[A-Z_]+/gi, "");
  text = text.replace(/GEMINI_API_[A-Z_]+/gi, "");
  text = text.replace(/NVIDIA_API_[A-Z_]+/gi, "");

  // Clean raw markdown heading markers (###, ##, #)
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Clean weird double-dot or triple-dot bullet artifacts like "- **..." or "• **..."
  text = text.replace(/^[-*•]\s*\*\*\s*/gm, "");

  return text;
}

// Tokenize a line of text for inline formatting (bold, italic, code, links, currency)
function renderInlineContent(text) {
  if (!text) return null;

  // Split by inline markdown tokens: **bold**, `code`, *italic*
  // Regex matches: **bold**, `code`, *italic*
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Bold: **something**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={idx} className="aura-ai-strong">
          {inner}
        </strong>
      );
    }

    // Code / Coupon / Highlight: `something`
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      const inner = part.slice(1, -1);
      return (
        <span key={idx} className="aura-ai-code-chip">
          {inner}
        </span>
      );
    }

    // Italic: *something*
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      const inner = part.slice(1, -1);
      return (
        <em key={idx} className="aura-ai-italic">
          {inner}
        </em>
      );
    }

    // Check for phone numbers or emails in plain text
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
            return w;
          })}
        </React.Fragment>
      );
    }

    return part;
  });
}

// Check if a line is a Key-Value attribute line (e.g. "Status: In Transit", "Ruling Deity: Lord Shiva")
function parseKeyValueLine(line) {
  const clean = line.replace(/^[-*•]\s*/, "").trim();
  
  // Pattern: "Key:" or "**Key:**" followed by value
  const kvMatch = clean.match(/^(\*{0,2})([A-Za-z0-9\s/&()#₹]+?)(\*{0,2})\s*:\s*(.+)$/);
  if (!kvMatch) return null;

  const rawKey = kvMatch[2].trim();
  const rawVal = kvMatch[4].trim();

  // Validate if key looks like an attribute (not a full long paragraph sentence ending in a colon)
  if (rawKey.length > 0 && rawKey.length <= 32 && !rawKey.includes("?") && !rawKey.includes(".")) {
    return { key: rawKey, value: rawVal };
  }
  return null;
}

// Check if a line looks like a title or section heading
function isHeadingLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Explicit markdown heading stripped or marked with symbols
  if (/^#{1,6}\s+/.test(line)) return true;

  // Title ending with a colon or exclamation (e.g. "1 Mukhi Rudraksha (The Supreme Divine Bead):", "🎁 Aaj ke Special Offers:")
  if (
    trimmed.length <= 70 &&
    (trimmed.endsWith(":") || trimmed.endsWith("!")) &&
    !trimmed.includes(".") &&
    (trimmed.includes("Rudraksha") || trimmed.includes("Offer") || trimmed.includes("Guarantee") || trimmed.includes("Mala") || trimmed.includes("Order") || trimmed.includes("Special") || trimmed.startsWith("🙏") || trimmed.startsWith("✨") || trimmed.startsWith("🎁") || trimmed.startsWith("📿") || trimmed.startsWith("🕉"))
  ) {
    return true;
  }

  // Text wrapped entirely in **...** without long sentence
  if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length <= 60) {
    return true;
  }

  return false;
}

export function AuraAIMessageContent({ text, sender = "ai", className = "" }) {
  if (!text) return null;

  // For User message: clean, high contrast with linebreaks
  if (sender === "user") {
    const cleanUserText = sanitizeText(typeof text === "string" ? text : String(text));
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

  // For AI message: structured, rich semantic layout
  const rawString = typeof text === "string" ? text : (text?.text || String(text));
  const sanitized = sanitizeText(rawString);

  // Group lines into semantic blocks (headings, key-value groups, lists, paragraphs)
  const lines = sanitized.split("\n");
  const blocks = [];
  let currentList = null;
  let currentKvGroup = null;

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

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      flushKv();
      continue;
    }

    // 1. Check if Key-Value line
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

    // 2. Check if Bullet or Numbered item
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const isNumber = /^\d+[.)]\s+/.test(trimmed);

    if (isBullet || isNumber) {
      const itemText = trimmed.replace(/^[-*•\d.)]\s+/, "");
      if (!currentList || currentList.isNumbered !== isNumber) {
        flushList();
        currentList = { type: "list", isNumbered: isNumber, items: [] };
      }
      currentList.items.push(itemText);
      continue;
    } else {
      flushList();
    }

    // 3. Check if Heading
    if (isHeadingLine(trimmed)) {
      const headingClean = trimmed
        .replace(/^\*{2}/, "")
        .replace(/\*{2}$/, "")
        .replace(/^#{1,6}\s*/, "")
        .trim();

      blocks.push({
        type: "heading",
        text: headingClean
      });
      continue;
    }

    // 4. Regular Paragraph
    blocks.push({
      type: "paragraph",
      text: trimmed
    });
  }

  flushList();
  flushKv();

  return (
    <div className={`aura-ai-msg-text-ai ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          return (
            <div key={idx} className="aura-ai-section-heading">
              <span className="aura-ai-heading-icon">
                <Sparkles size={11} />
              </span>
              <span className="aura-ai-heading-title">{block.text}</span>
            </div>
          );
        }

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

        // Paragraph
        return (
          <p key={idx} className="aura-ai-para">
            {renderInlineContent(block.text)}
          </p>
        );
      })}
    </div>
  );
}
