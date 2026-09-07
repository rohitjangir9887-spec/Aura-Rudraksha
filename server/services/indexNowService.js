/**
 * IndexNow Service for Aura Rudraksha
 * Instantly alerts Bing, Yandex, and other search engines when products,
 * categories, or sacred guides are added, updated, or modified.
 */

import https from "https";
import { URL } from "url";

const DEFAULT_KEY = "aurarudraksha2025seoindexnowkey";
const submittedUrlsCache = new Map(); // url -> timestamp

export function getIndexNowKey() {
  return (process.env.INDEXNOW_KEY || DEFAULT_KEY).trim();
}

export function getSiteDomain(req) {
  if (process.env.SITE_URL) {
    try {
      const u = new URL(process.env.SITE_URL);
      return u.hostname;
    } catch (_) {}
  }
  if (req) {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return host.split(":")[0];
    }
  }
  return "aurarudraksha.com";
}

export function getSiteBaseUrl(req) {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/+$/, "");
  }
  if (req) {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  }
  return "https://aurarudraksha.com";
}

/**
 * Submit modified URLs to the IndexNow protocol
 * @param {string[]|string} urls 
 * @param {object} [req]
 */
export async function submitToIndexNow(urls, req = null) {
  try {
    const key = getIndexNowKey();
    if (!key) return { success: false, message: "IndexNow key not configured" };

    const baseUrl = getSiteBaseUrl(req);
    const host = getSiteDomain(req);
    const keyLocation = `${baseUrl}/${key}.txt`;

    const rawList = Array.isArray(urls) ? urls : [urls];
    const now = Date.now();
    const urlList = [];

    for (const u of rawList) {
      if (!u || typeof u !== "string") continue;
      const fullUrl = u.startsWith("http") ? u : `${baseUrl}${u.startsWith("/") ? "" : "/"}${u}`;
      
      // Prevent duplicate submissions within 5 minutes
      const lastSent = submittedUrlsCache.get(fullUrl);
      if (lastSent && now - lastSent < 300_000) {
        continue;
      }
      submittedUrlsCache.set(fullUrl, now);
      urlList.push(fullUrl);
    }

    if (urlList.length === 0) {
      return { success: true, count: 0, message: "No new URLs to submit" };
    }

    const payload = JSON.stringify({
      host,
      key,
      keyLocation,
      urlList
    });

    const options = {
      hostname: "api.indexnow.org",
      port: 443,
      path: "/indexnow",
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(payload),
        "User-Agent": "Aura-Rudraksha-IndexNow/1.0"
      },
      timeout: 5000
    };

    return new Promise((resolve) => {
      const request = https.request(options, (res) => {
        let responseBody = "";
        res.on("data", (chunk) => { responseBody += chunk; });
        res.on("end", () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          if (ok) {
            console.log(`[IndexNow] Successfully notified ${urlList.length} URL(s) to search engines.`);
          } else {
            console.warn(`[IndexNow] Notification response status ${res.statusCode}: ${responseBody}`);
          }
          resolve({
            success: ok,
            statusCode: res.statusCode,
            submittedCount: urlList.length
          });
        });
      });

      request.on("error", (err) => {
        console.warn("[IndexNow] Network notice during submission:", err?.message || err);
        resolve({ success: false, error: err?.message || "Network error" });
      });

      request.on("timeout", () => {
        request.destroy();
        console.warn("[IndexNow] Request timed out");
        resolve({ success: false, error: "Request timeout" });
      });

      request.write(payload);
      request.end();
    });
  } catch (err) {
    console.warn("[IndexNow] Unexpected notice in submitToIndexNow:", err?.message || err);
    return { success: false, error: err?.message };
  }
}
