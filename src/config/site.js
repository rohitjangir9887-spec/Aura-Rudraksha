/**
 * Single Source of Truth for Aura Rudraksha Site Configuration
 * Canonical Domain: https://www.aurarudraksha.bond
 */

export const SITE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SITE_URL) ||
  "https://www.aurarudraksha.bond"
).replace(/\/+$/, "");

export const SITE_DOMAIN = "www.aurarudraksha.bond";
export const CANONICAL_APP_ORIGIN = "https://www.aurarudraksha.bond";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
export const DEFAULT_LOGO = `${SITE_URL}/logo.png`;

export const BRAND_NAME = "Aura Rudraksha";
export const SUPPORT_EMAIL = "aurarudrakshaofficial@gmail.com";
export const SUPPORT_PHONE = "+91 9672996531";

/**
 * Generates an absolute canonical HTTPS URL for any path
 */
export function getCanonicalUrl(path = "") {
  if (!path) return `${SITE_URL}/`;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}

/**
 * Returns dynamic or canonical app origin
 */
export function getAppOrigin() {
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (
      !origin.includes("localhost") &&
      !origin.includes("127.0.0.1") &&
      !origin.includes("0.0.0.0") &&
      origin.startsWith("http")
    ) {
      return origin;
    }
  }
  return CANONICAL_APP_ORIGIN;
}
