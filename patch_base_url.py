with open("server/services/indexNowService.js", "r") as f:
    code = f.read()

target = """export function getSiteBaseUrl(req) {
  if (process.env.SITE_URL) {
    const raw = process.env.SITE_URL.replace(/\\/+$/, "");
    if (!raw.includes("localhost") && !raw.includes("127.0.0.1")) {
      return raw;
    }
  }
  return DETERMINISTIC_CANONICAL_ORIGIN;
}"""

replacement = """export function getSiteBaseUrl(req) {
  if (process.env.SITE_URL) {
    const raw = process.env.SITE_URL.replace(/\\/+$/, "");
    if (!raw.includes("localhost") && !raw.includes("127.0.0.1")) {
      return raw;
    }
  }
  if (req) {
    const host = req.get("x-forwarded-host") || req.get("host");
    const proto = req.get("x-forwarded-proto") || req.protocol || "https";
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${proto}://${host}`;
    }
  }
  return DETERMINISTIC_CANONICAL_ORIGIN;
}"""

code = code.replace(target, replacement)

with open("server/services/indexNowService.js", "w") as f:
    f.write(code)
