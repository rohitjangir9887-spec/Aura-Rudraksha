/**
 * WHATWG URL Parser & Deprecation Patch for Aura Rudraksha
 * Replaces Node's legacy url.parse() [DEP0169] with standard WHATWG URL API.
 */

import url from "url";
import querystring from "querystring";

/**
 * Parses a URL string using Node's standard WHATWG URL API without triggering [DEP0169].
 *
 * @param {string|object} urlStr
 * @param {boolean} [parseQueryString=false]
 * @param {boolean} [slashesDenoteHost=false]
 * @returns {object} Standard Url object
 */
export function whatwgParseUrl(urlStr, parseQueryString = false, slashesDenoteHost = false) {
  if (urlStr === null || urlStr === undefined) return urlStr;
  if (typeof urlStr === "object") {
    if (urlStr.href && urlStr.pathname) return urlStr;
    // Handle objects passed with hostname/host properties
    if (urlStr.hostname || urlStr.host || urlStr.path) {
      return urlStr;
    }
  }

  const rawStr = String(urlStr);

  try {
    let isRelative = false;
    let target = rawStr;

    // Handle protocol-relative vs relative vs absolute URLs
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) {
      if (target.startsWith("//")) {
        target = "http:" + target;
      } else {
        target = "http://localhost" + (target.startsWith("/") ? "" : "/") + target;
        isRelative = true;
      }
    }

    const u = new URL(target);
    const auth = u.username ? (u.password ? `${u.username}:${u.password}` : u.username) : null;
    const path = u.pathname + u.search;

    let query = u.search ? u.search.slice(1) : (parseQueryString ? {} : null);
    if (parseQueryString && typeof query === "string") {
      query = querystring.parse(query);
    }

    return {
      protocol: isRelative ? null : u.protocol,
      slashes: isRelative ? null : true,
      auth: auth,
      host: isRelative ? null : u.host,
      port: isRelative ? null : (u.port || null),
      hostname: isRelative ? null : u.hostname,
      hash: u.hash || null,
      search: u.search || null,
      query: query,
      pathname: u.pathname,
      path: path,
      href: isRelative ? path : u.href
    };
  } catch (_) {
    // Fail-safe fallback: construct basic object if URL parsing fails
    let query = parseQueryString ? {} : null;
    let search = null;
    let pathname = rawStr;
    const qIdx = rawStr.indexOf("?");
    const hIdx = rawStr.indexOf("#");

    if (qIdx !== -1) {
      pathname = rawStr.slice(0, qIdx);
      const searchEnd = hIdx !== -1 ? hIdx : rawStr.length;
      search = rawStr.slice(qIdx, searchEnd);
      const queryStr = rawStr.slice(qIdx + 1, searchEnd);
      query = parseQueryString ? querystring.parse(queryStr) : queryStr;
    }

    const hash = hIdx !== -1 ? rawStr.slice(hIdx) : null;
    const path = pathname + (search || "");

    return {
      protocol: null,
      slashes: null,
      auth: null,
      host: null,
      port: null,
      hostname: null,
      hash,
      search,
      query,
      pathname,
      path,
      href: rawStr
    };
  }
}

let isPatched = false;

/**
 * Patches node's legacy url.parse() with the WHATWG-based parser.
 * Prevents [DEP0169] deprecation warnings in dependencies and app code.
 */
export function installUrlParsePatch() {
  if (isPatched) return;
  try {
    url.parse = whatwgParseUrl;
    isPatched = true;
  } catch (err) {
    console.warn("⚠️ [UrlParser] Failed to patch url.parse:", err?.message || err);
  }
}

// Auto-patch on import to protect entry points
installUrlParsePatch();

export default {
  whatwgParseUrl,
  installUrlParsePatch
};
