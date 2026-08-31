/**
 * Normalize Aura AI API payloads so customers never see internal JSON or raw debug data.
 */

const INTERNAL_KEYS = [
  "recommendedProductIds",
  "couponCodes",
  "requiresHuman",
  "quickReplies",
  "products",
  "coupons"
];

function looksLikeInternalJson(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  return (
    "text" in obj ||
    "recommendedProductIds" in obj ||
    "couponCodes" in obj ||
    "requiresHuman" in obj ||
    "quickReplies" in obj
  );
}

function sanitizeCustomerText(raw) {
  if (typeof raw !== "string") return "";
  let text = raw.trim();
  if (!text) return "";

  // 1. Remove Code fences & JSON blobs
  text = text.replace(/^```(?:json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // 2. Filter any accidental admin email or internal route leakages
  text = text.replace(/rohitjangir\d*@gmail\.com/gi, "support@aurarudraksha.com");
  text = text.replace(/MONGODB_[A-Z0-9_]+/gi, "");
  text = text.replace(/GEMINI_API_[A-Z0-9_]+/gi, "");
  text = text.replace(/NVIDIA_API_[A-Z0-9_]+/gi, "");
  text = text.replace(/admin\s*portal\s*url/gi, "Aura Rudraksha Support");

  // 3. Remove raw JSON object embeddings from conversation
  const firstBrace = text.indexOf("{");
  if (firstBrace !== -1) {
    if (firstBrace === 0 || /^[\s\n]*\{/.test(text)) {
      const parsed = tryParseJsonObject(text);
      if (parsed && looksLikeInternalJson(parsed)) {
        return sanitizeCustomerText(String(parsed.text || parsed.message || ""));
      }
    }
    const lastBrace = text.lastIndexOf("}");
    if (lastBrace > firstBrace) {
      const maybeJson = text.slice(firstBrace, lastBrace + 1);
      const parsed = tryParseJsonObject(maybeJson);
      if (parsed && looksLikeInternalJson(parsed)) {
        const before = text.slice(0, firstBrace).trim();
        const inner = String(parsed.text || parsed.message || "").trim();
        if (before && inner && !before.includes(inner.slice(0, 24))) {
          text = `${before}\n\n${inner}`.trim();
        } else {
          text = inner || before;
        }
      }
    }
    if (INTERNAL_KEYS.some((k) => text.includes(`"${k}"`))) {
      const parsed = tryParseJsonObject(text.slice(firstBrace));
      if (parsed && parsed.text) return sanitizeCustomerText(String(parsed.text));
      text = text.slice(0, firstBrace).trim();
    }
  }

  return text;
}

function tryParseJsonObject(s) {
  if (!s || typeof s !== "string") return null;
  const cleaned = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const v = JSON.parse(cleaned);
    return v && typeof v === "object" ? v : null;
  } catch (_) {}
  // Greedy first {...}
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth += 1;
    else if (cleaned[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch (_) {
          return null;
        }
      }
    }
  }
  return null;
}

export function parseAuraAiPayload(raw) {
  const empty = {
    text: "",
    products: [],
    coupons: [],
    recommendedProductIds: [],
    couponCodes: [],
    requiresHuman: false,
    quickReplies: [],
    orderInfo: null
  };

  if (raw == null) return empty;

  if (typeof raw === "string") {
    const trimmed = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (trimmed.startsWith("{")) {
      const parsed = tryParseJsonObject(trimmed);
      if (parsed) return parseAuraAiPayload(parsed);
    }
    return { ...empty, text: sanitizeCustomerText(raw) };
  }

  if (typeof raw !== "object") {
    return { ...empty, text: sanitizeCustomerText(String(raw)) };
  }

  // Nested data envelope
  if (raw.data && typeof raw.data === "object" && (raw.text == null || raw.success)) {
    const inner = parseAuraAiPayload(raw.data);
    if (inner.text || inner.products?.length) return inner;
  }

  const textSource =
    typeof raw.text === "string"
      ? raw.text
      : typeof raw.message === "string"
        ? raw.message
        : typeof raw.content === "string"
          ? raw.content
          : "";

  const text = sanitizeCustomerText(textSource);

  const products = Array.isArray(raw.products) ? raw.products.filter((p) => p && typeof p === "object" && (p.id || p.name)) : [];
  const coupons = Array.isArray(raw.coupons)
    ? raw.coupons.filter((c) => c && typeof c === "object" && c.code)
    : [];

  let quickReplies = [];
  if (Array.isArray(raw.quickReplies)) {
    quickReplies = raw.quickReplies
      .map((q) => (typeof q === "string" ? q : q?.label || q?.text || ""))
      .filter((q) => q && typeof q === "string")
      .slice(0, 4);
  }

  return {
    text,
    products,
    coupons,
    recommendedProductIds: Array.isArray(raw.recommendedProductIds) ? raw.recommendedProductIds : [],
    couponCodes: Array.isArray(raw.couponCodes) ? raw.couponCodes : [],
    requiresHuman: Boolean(raw.requiresHuman),
    quickReplies,
    orderInfo: raw.orderInfo || null,
    conversationId: raw.conversationId
  };
}

export function customerSafeAiText(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    return parseAuraAiPayload(value).text;
  }
  return sanitizeCustomerText(String(value));
}

