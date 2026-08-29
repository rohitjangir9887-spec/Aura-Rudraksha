/**
 * Shared safe-image-value validator.
 *
 * Used to allowlist admin-authored image references (product/banner/
 * promotion fields) so that only a plain http(s) URL, a same-origin
 * relative path, or a base64 data URL using a real raster-image MIME type
 * is ever accepted. In particular this rejects `data:image/svg+xml` and any
 * other non-raster MIME type, since inline SVG can carry an embedded
 * <script>/event-handler payload (a stored-XSS vector) even on fields that
 * are already admin-gated - defense in depth, matching the same allowlist
 * already enforced for review photos in reviewController.js.
 */
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB decoded - matches the review-image cap

export function isSafeImageValue(raw) {
  if (typeof raw !== "string") return false;
  const value = raw.trim();
  if (!value) return false;

  if (/^https?:\/\//i.test(value) && value.length <= 2000) return true;

  // Same-origin relative path (e.g. "/images/product-5mukhi.jpg") - but not
  // a protocol-relative "//evil.com/..." URL, which browsers treat as
  // cross-origin.
  if (value.startsWith("/") && !value.startsWith("//") && value.length <= 500) return true;

  const match = value.match(/^data:(image\/[a-zA-Z+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return false;
  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(mime)) return false;

  // Rough decoded-size check without a full base64 decode: 4 chars ~ 3 bytes.
  const approxBytes = Math.floor((match[2].length * 3) / 4);
  return approxBytes <= MAX_IMAGE_BYTES;
}
