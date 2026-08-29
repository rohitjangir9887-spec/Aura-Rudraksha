/**
 * Input sanitization helpers.
 *
 * Mongoose casting stops most NoSQL-injection, but write endpoints that
 * forward a whole req.body into $set can still be polluted with operator
 * keys ($set/$ne/...). pickFields() keeps ONLY the allowed keys with
 * plausibly-shaped values, so the database only ever sees clean input.
 */

import { isSafeImageValue } from "./imageValidation.js";

export function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Pick only whitelisted keys from `input`, coerced by `types`:
 *   types = { name: "string", price: "number", tags: "array", flags: "bool", meta: "object", ids: "string[]" }
 * Unknown keys (including $-operator keys) are dropped.
 */
export function pickFields(input, types) {
  const out = {};
  if (!isPlainObject(input)) return out;
  for (const [key, type] of Object.entries(types)) {
    if (!(key in input)) continue;
    const v = input[key];
    switch (type) {
      case "string":
        if (typeof v === "string" && v.length <= 5000) out[key] = v.trim();
        break;
      case "url":
        // Same allowlist as review photos: http(s) links, same-origin
        // relative paths, or data:image/* URLs restricted to a real
        // raster-image MIME allowlist (rejects e.g. image/svg+xml, which
        // can carry embedded script). See utils/imageValidation.js.
        if (isSafeImageValue(v)) out[key] = v.trim();
        break;
      case "url[]":
        // Array of image references (e.g. a product gallery), each held to
        // the same allowlist as a single "url" field, plus a sane count cap.
        if (Array.isArray(v) && v.length <= 20 && v.every((x) => isSafeImageValue(x))) {
          out[key] = v.map((x) => x.trim());
        }
        break;
      case "number":
        if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
        else if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) out[key] = Number(v);
        break;
      case "bool":
        if (typeof v === "boolean") out[key] = v;
        else if (v === "true" || v === 1 || v === "1") out[key] = true;
        else if (v === "false" || v === 0 || v === "0") out[key] = false;
        break;
      case "array":
        if (Array.isArray(v) && v.length <= 200) out[key] = v;
        break;
      case "string[]":
        if (Array.isArray(v) && v.length <= 100 && v.every((x) => typeof x === "string" && x.length <= 500)) {
          out[key] = v.map((x) => x.trim());
        }
        break;
      case "object":
        if (isPlainObject(v) && JSON.stringify(v).length <= 10000) out[key] = v;
        break;
      case "nullableString":
        if (v === null || v === "") out[key] = null;
        else if (typeof v === "string" && v.length <= 5000) out[key] = v.trim();
        break;
      default:
        if (v !== undefined) out[key] = v;
    }
  }
  return out;
}
