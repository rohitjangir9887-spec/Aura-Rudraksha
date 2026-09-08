/**
 * Keyword & Tag Normalization Utility for Aura Rudraksha
 * Ensures safely rendering strings in React JSX and preserving rich AI metadata.
 */

/**
 * Extract string value from string, object, number, boolean, or null/undefined.
 * Supports objects with properties: keyword, term, text, value, name, tag.
 */
export function extractKeywordString(item) {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (typeof item === "object") {
    const val = item.keyword ?? item.term ?? item.text ?? item.value ?? item.name ?? item.tag ?? "";
    if (typeof val === "string") return val.trim();
    if (typeof val === "number") return String(val);
  }
  return "";
}

/**
 * Normalizes an array or single item into a deduplicated array of string keyword/tag values.
 * Handles: string[], keyword object[], mixed arrays, missing/null values.
 */
export function normalizeKeywordItems(items) {
  if (!items) return [];
  const list = Array.isArray(items) ? items : [items];
  const result = [];
  const seen = new Set();

  for (const item of list) {
    const str = extractKeywordString(item);
    if (str) {
      const lower = str.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(str);
      }
    }
  }

  return result;
}

/**
 * Preserves rich AI keyword objects while ensuring the .keyword field is a clean string.
 */
export function normalizeKeywordObjects(items) {
  if (!items) return [];
  const list = Array.isArray(items) ? items : [items];
  const result = [];
  const seen = new Set();

  for (const item of list) {
    const str = extractKeywordString(item);
    if (str) {
      const lower = str.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        if (typeof item === "object" && item !== null) {
          result.push({ ...item, keyword: str });
        } else {
          result.push({ keyword: str });
        }
      }
    }
  }

  return result;
}
