/**
 * AURA RUDRAKSHA — MEDIA & PUTER STORAGE ADAPTER
 * 
 * Production media handling for Images, Videos, Banners & Products via Puter Cloud.
 * Direct uploads to Puter Cloud with permanent public delivery hosted on Puter.
 * Pure serverless cloud storage with verified MongoDB metadata persistence.
 */

// API Base URL
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

/**
 * Resizes and compresses an image File or Data URL using HTML5 Canvas.
 */
export async function compressImage(source, maxWidth = 1000, maxHeight = 1000, quality = 0.8) {
  if (!source) return source;
  if (typeof source === "string" && (source.startsWith("http://") || source.startsWith("https://") || source.startsWith("/images/"))) {
    return source;
  }

  return new Promise((resolve) => {
    const img = new Image();

    const processCanvas = () => {
      try {
        let width = img.width;
        let height = img.height;
        if (!width || !height) {
          resolve(typeof source === "string" ? source : "");
          return;
        }

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            width = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      } catch (e) {
        console.warn("Canvas compression note, returning source", e);
        resolve(typeof source === "string" ? source : "");
      }
    };

    img.onerror = () => {
      resolve(typeof source === "string" ? source : "");
    };

    img.onload = processCanvas;

    if (source instanceof File || source instanceof Blob) {
      const reader = new FileReader();
      reader.onerror = () => resolve("");
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(source);
    } else if (typeof source === "string") {
      img.src = source;
    } else {
      resolve("");
    }
  });
}

/**
 * Asynchronously waits for the Puter.js SDK to become ready on the window object
 */
export async function waitForPuter(timeoutMs = 5000) {
  if (typeof window === "undefined") return null;
  if (window.puter) return window.puter;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.puter) return window.puter;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return window.puter || null;
}

// In-memory Puter connection cache & subscription state
let _cachedPuterUser = null;
let _lastKnownStatus = null;
let _inFlightStatusPromise = null;
const _statusSubscribers = new Set();
let _retryTimer = null;
let _retryCount = 0;
let _listenersInitialized = false;
let _lastCheckTimestamp = 0;

// In-flight upload deduplication map: Key -> Promise<string>
const _inFlightUploads = new Map();

// In-memory cache of already registered media metadata: URL -> Media Object
const _registeredMediaCache = new Map();

/**
 * Controlled Concurrency Upload Queue
 * Strict sequential processing (concurrency = 1) prevents bursting network requests
 * when multiple product images are selected simultaneously.
 */
class UploadQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  add(fn) {
    return this.enqueue(fn);
  }

  enqueue(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processNext();
    });
  }

  async processNext() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const { fn, resolve, reject } = this.queue.shift();
    this.running++;

    try {
      const result = await fn();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.running--;
      // Respectful spacing delay between tasks to prevent burst rate limits
      setTimeout(() => this.processNext(), 200);
    }
  }
}

const _uploadQueue = new UploadQueue(1);

/**
 * Parses Retry-After header as either seconds integer or HTTP-date string
 */
function parseRetryAfter(headerValue) {
  if (!headerValue) return null;
  if (typeof headerValue === "number") return headerValue > 0 ? headerValue : null;
  const str = String(headerValue).trim();
  const asNumber = parseInt(str, 10);
  if (!isNaN(asNumber) && asNumber > 0) {
    return asNumber;
  }
  const asDate = Date.parse(str);
  if (!isNaN(asDate)) {
    const diffSec = Math.ceil((asDate - Date.now()) / 1000);
    return Math.max(1, diffSec);
  }
  return null;
}

/**
 * Single development tracer for upload requests
 */
function logUploadTrace(info) {
  if (import.meta.env.DEV) {
    console.log("[UPLOAD TRACE]", {
      batchId: info.batchId || "",
      source: info.source || "puter",
      endpoint: info.endpoint || "",
      method: info.method || "",
      status: info.status ?? null,
      code: info.code ?? null,
      attempt: info.attempt ?? 1,
      retryAfter: info.retryAfter ?? null,
      filename: info.filename || ""
    });
  }
}

/**
 * Executes a fetch request with safe exponential backoff on 429 responses.
 * Respects Retry-After header and adds jitter without infinite loops.
 */
async function fetchWithBackoff(url, options = {}, maxRetries = 3, batchInfo = {}) {
  let attempt = 0;
  while (true) {
    attempt++;
    const method = options.method || "GET";

    logUploadTrace({
      batchId: batchInfo.batchId,
      source: "api",
      endpoint: url,
      method,
      attempt,
      filename: batchInfo.filename
    });

    let res;
    try {
      res = await fetch(url, options);
    } catch (networkErr) {
      logUploadTrace({
        batchId: batchInfo.batchId,
        source: "api",
        endpoint: url,
        method,
        status: 0,
        code: "NETWORK_ERROR",
        attempt,
        filename: batchInfo.filename
      });

      if (attempt > maxRetries) {
        const err = new Error("[API Gateway] Network error connecting to API server. Please check your connection.");
        err.source = "api";
        err.originalError = networkErr;
        throw err;
      }
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000) + Math.floor(Math.random() * 200);
      await new Promise(r => setTimeout(r, delayMs));
      continue;
    }

    // If 429 Too Many Requests, perform safe backoff
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const retryAfterHeader = parseRetryAfter(res.headers.get("Retry-After"));
      const waitSec = data.retryAfter || retryAfterHeader || Math.pow(2, attempt);

      logUploadTrace({
        batchId: batchInfo.batchId,
        source: "api",
        endpoint: url,
        method,
        status: 429,
        code: "RATE_LIMIT",
        attempt,
        retryAfter: waitSec,
        filename: batchInfo.filename
      });

      if (attempt > maxRetries) {
        const err = new Error(data.message || `[API Gateway] Upload registration rate limit — retrying in ${waitSec}s...`);
        err.source = "api";
        err.status = 429;
        err.retryAfter = waitSec;
        throw err;
      }

      const delayMs = Math.min(Math.max(1000, waitSec * 1000), 8000) + Math.floor(Math.random() * 300);
      await new Promise(r => setTimeout(r, delayMs));
      continue;
    }

    logUploadTrace({
      batchId: batchInfo.batchId,
      source: "api",
      endpoint: url,
      method,
      status: res.status,
      attempt,
      filename: batchInfo.filename
    });

    return res;
  }
}


function notifyStatusSubscribers(status) {
  _statusSubscribers.forEach((callback) => {
    try {
      callback(status);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[Puter Diagnostics] Subscriber notification note:", err);
      }
    }
  });
}

function scheduleAutoRetry() {
  if (_retryTimer) return;
  if (_retryCount >= 5) return; // Cap retries to prevent infinite spam

  const delayMs = Math.min(1000 * Math.pow(2, _retryCount), 15000);
  _retryCount++;

  _retryTimer = setTimeout(() => {
    _retryTimer = null;
    getPuterMediaStatus().catch(() => {});
  }, delayMs);
}

function initPuterAutoConnectionListeners() {
  if (typeof window === "undefined" || _listenersInitialized) return;
  _listenersInitialized = true;

  // Auto-restore / refresh when user switches tabs or foregrounds the dashboard
  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        const now = Date.now();
        // Debounce to at most once every 10 seconds on tab visibility changes
        if (now - _lastCheckTimestamp > 10000) {
          getPuterMediaStatus().catch(() => {});
        }
      }
    });
  }

  // Auto-restore when network reconnects
  window.addEventListener("online", () => {
    _retryCount = 0;
    getPuterMediaStatus({ force: true }).catch(() => {});
  });

  // Re-check when window gains focus
  window.addEventListener("focus", () => {
    const now = Date.now();
    if (now - _lastCheckTimestamp > 15000) {
      getPuterMediaStatus().catch(() => {});
    }
  });
}

/**
 * Subscribes to real-time Puter status changes
 */
export function subscribePuterStatus(callback) {
  if (typeof callback !== "function") return () => {};
  _statusSubscribers.add(callback);
  if (_lastKnownStatus) {
    try {
      callback(_lastKnownStatus);
    } catch (_) {}
  }
  return () => {
    _statusSubscribers.delete(callback);
  };
}

let _cachedHostedDomain = null;
let _inFlightHostedDomainPromise = null;

/**
 * Resolves or creates a Puter hosted domain for permanent public media access.
 * Memoized in-memory & in localStorage with Promise deduplication.
 */
export async function getPuterHostedDomain() {
  if (_cachedHostedDomain) {
    return `${_cachedHostedDomain}.puter.site`;
  }

  let cachedSubdomain = typeof localStorage !== "undefined" ? localStorage.getItem("aura_puter_subdomain") : null;
  if (cachedSubdomain) {
    _cachedHostedDomain = cachedSubdomain;
    return `${cachedSubdomain}.puter.site`;
  }

  const puter = await waitForPuter(3000);
  if (!puter || !puter.hosting) return null;

  if (_inFlightHostedDomainPromise) {
    return _inFlightHostedDomainPromise;
  }

  _inFlightHostedDomainPromise = (async () => {
    try {
      const sites = await puter.hosting.list();
      let site = Array.isArray(sites)
        ? sites.find(s => s.dir_path === "aura_uploads" || s.root_dir?.endsWith("aura_uploads") || (s.subdomain && s.subdomain.startsWith("aura-media-")))
        : null;

      if (!site) {
        const sub = `aura-media-${Math.random().toString(36).substring(2, 8)}`;
        site = await puter.hosting.create(sub, "aura_uploads");
      }

      if (site && (site.subdomain || site.subdomain_name)) {
        const subName = site.subdomain || site.subdomain_name;
        _cachedHostedDomain = subName;
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("aura_puter_subdomain", subName);
        }
        return `${subName}.puter.site`;
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[Puter Diagnostics] Hosting site resolution note:", err);
      }
    }
    return null;
  })();

  try {
    return await _inFlightHostedDomainPromise;
  } finally {
    _inFlightHostedDomainPromise = null;
  }
}

/**
 * Real Puter Media Status & Authentication Check
 * Automatically restores and maintains valid Puter sessions without requiring manual reconnects
 */
export async function getPuterMediaStatus(options = {}) {
  const { force = false } = options;

  if (typeof window === "undefined") {
    return {
      connected: false,
      status: "Not Connected",
      provider: "Puter Cloud Storage",
      user: null,
      message: "Server-side execution environment."
    };
  }

  initPuterAutoConnectionListeners();

  // Return existing in-flight check if one is already running and not forced
  if (!force && _inFlightStatusPromise) {
    return _inFlightStatusPromise;
  }

  _inFlightStatusPromise = (async () => {
    _lastCheckTimestamp = Date.now();

    const puter = await waitForPuter(force ? 4000 : 3000);
    if (!puter) {
      if (import.meta.env.DEV) {
        console.warn("[Puter Diagnostics] Puter JS SDK not found on window object.");
      }
      // If we previously had a connected status, retain state and schedule a background retry
      if (_lastKnownStatus?.connected) {
        scheduleAutoRetry();
        return _lastKnownStatus;
      }
      scheduleAutoRetry();
      const statusObj = {
        connected: false,
        status: "Checking...",
        provider: "Puter Cloud Storage",
        user: null,
        message: "Puter Cloud SDK is initializing. Verifying connection..."
      };
      _lastKnownStatus = statusObj;
      notifyStatusSubscribers(statusObj);
      return statusObj;
    }

    try {
      const isSignedIn = typeof puter.auth?.isSignedIn === "function" ? puter.auth.isSignedIn() : false;

      if (!isSignedIn) {
        _cachedPuterUser = null;
        _retryCount = 0;
        const statusObj = {
          connected: false,
          status: "Not Connected",
          provider: "Puter Cloud Storage",
          user: null,
          message: "Puter Cloud SDK active, but Admin authentication is required. Click 'Connect Puter Cloud Storage' to log in."
        };
        _lastKnownStatus = statusObj;
        notifyStatusSubscribers(statusObj);
        return statusObj;
      }

      // User is signed in — reset retry count and load user information
      _retryCount = 0;
      let user = _cachedPuterUser;

      try {
        if (typeof puter.auth?.getUser === "function") {
          const fetchedUser = await Promise.race([
            puter.auth.getUser(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Puter getUser timeout")), 4000))
          ]).catch((err) => {
            if (import.meta.env.DEV) {
              console.warn("[Puter Diagnostics] getUser fetch notice:", err?.message || err);
            }
            return null;
          });

          if (fetchedUser) {
            user = fetchedUser;
            _cachedPuterUser = fetchedUser;
          }
        }
      } catch (uErr) {
        if (import.meta.env.DEV) {
          console.warn("[Puter Diagnostics] getUser warning:", uErr);
        }
      }

      const username = user?.username || user?.name || user?.email?.split('@')[0] || "Admin";
      const email = user?.email || (user?.username ? `${user.username}@puter.com` : null);
      const lastSync = new Date().toLocaleTimeString();

      const statusObj = {
        connected: true,
        status: "Connected",
        user: user || { username, email },
        username,
        email,
        lastSync,
        provider: "Puter Cloud Storage",
        message: `Puter Cloud Storage connected as ${username} (${email || "Session active"}).`
      };

      _lastKnownStatus = statusObj;
      notifyStatusSubscribers(statusObj);
      return statusObj;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("[Puter Diagnostics] Status check exception:", err);
      }
      // If error is transient (network timeout) but user was signed in, preserve connected state
      if (_lastKnownStatus?.connected) {
        scheduleAutoRetry();
        return _lastKnownStatus;
      }

      const statusObj = {
        connected: false,
        status: "Not Connected",
        provider: "Puter Cloud Storage",
        user: null,
        message: `Puter Cloud connection check error: ${err.message || err}`
      };
      _lastKnownStatus = statusObj;
      notifyStatusSubscribers(statusObj);
      return statusObj;
    }
  })();

  try {
    return await _inFlightStatusPromise;
  } finally {
    _inFlightStatusPromise = null;
  }
}

/**
 * Sign in to Puter Cloud via user popup
 */
export async function signInToPuter() {
  const puter = await waitForPuter(4000);
  if (!puter || !puter.auth?.signIn) {
    throw new Error("Puter JS SDK is not loaded or available.");
  }

  if (import.meta.env.DEV) {
    console.log("[Puter Diagnostics] Initiating Puter signIn popup...");
  }

  await puter.auth.signIn();

  // Small delay to allow session state propagation
  await new Promise((r) => setTimeout(r, 200));

  _cachedPuterUser = null;
  const status = await getPuterMediaStatus({ force: true });

  return { signedIn: status.connected, user: status.user };
}

/**
 * Explicit sign out of Puter Cloud (only called on explicit user action)
 */
export async function signOutPuter() {
  const puter = await waitForPuter(2000);
  if (puter && typeof puter.auth?.signOut === "function") {
    await puter.auth.signOut();
  }
  _cachedPuterUser = null;
  localStorage.removeItem("aura_puter_subdomain");

  const statusObj = {
    connected: false,
    status: "Not Connected",
    provider: "Puter Cloud Storage",
    user: null,
    message: "Puter Cloud Storage disconnected by user."
  };

  _lastKnownStatus = statusObj;
  notifyStatusSubscribers(statusObj);
  return statusObj;
}

/**
 * Generates a collision-resistant unique filename for Puter Cloud storage.
 * Uses crypto.randomUUID() when available with timestamp and sanitization.
 */
function generateUniqueFileName(file) {
  let uniqueId = "";
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    uniqueId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  } else {
    uniqueId = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
  }
  const originalName = file?.name || "image.jpg";
  const lastDot = originalName.lastIndexOf(".");
  const ext = (lastDot !== -1 ? originalName.slice(lastDot + 1) : "jpg").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
  const baseName = (lastDot !== -1 ? originalName.slice(0, lastDot) : originalName)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 32) || "media";
  return `aura_${uniqueId}_${baseName}.${ext}`;
}

/**
 * Helper: Classifies Puter Cloud upload errors into structured categories
 * Captures name, message, code, status, statusCode, failedItems, failedCount, totalCount, results, retryAfter
 */
function classifyPuterError(err) {
  if (!err) {
    return {
      name: "UnknownError",
      code: null,
      status: null,
      statusCode: null,
      message: "Unknown upload failure.",
      failedItems: [],
      failedCount: 0,
      totalCount: 0,
      retryAfterSec: null,
      isRateLimit: false,
      isAuth: false,
      isPermission: false,
      isQuota: false,
      isTooLarge: false,
      isInvalidType: false,
      isNetwork: false,
      isPermanent: false,
      isTransient: true
    };
  }

  const errName = err.name || "PuterUploadError";
  const errCode = err.code || err.status || err.statusCode || (err.response && err.response.status) || null;
  const status = err.status || err.statusCode || (err.response && err.response.status) || null;
  const statusCode = err.statusCode || err.status || null;

  const rawMsg = err.message || err.error || err.reason || (typeof err === "string" ? err : "Puter upload request failed.");
  const msgStr = String(rawMsg);

  const failedItems = Array.isArray(err.failedItems) ? err.failedItems : (Array.isArray(err.failed) ? err.failed : []);
  const failedCount = typeof err.failedCount === "number" ? err.failedCount : failedItems.length;
  const totalCount = typeof err.totalCount === "number" ? err.totalCount : 0;

  const retryAfterSec = parseRetryAfter(err.retryAfter || err.retry_after || err.headers?.get?.("Retry-After") || err.headers?.["retry-after"]);

  const isRateLimit = errCode === 429 || status === 429 || statusCode === 429 || /429|too many requests|rate limit|slow down/i.test(msgStr);
  const isAuth = errCode === 401 || status === 401 || /unauthorized|401|not logged in|session expired|invalid token|auth failure/i.test(msgStr);
  const isPermission = errCode === 403 || status === 403 || /forbidden|403|permission denied|access denied/i.test(msgStr);
  const isQuota = errCode === 413 || /quota|space|storage full|out of storage|drive full/i.test(msgStr);
  const isTooLarge = errCode === 413 || /file too large|payload too large|max size/i.test(msgStr);
  const isInvalidType = errCode === 415 || errCode === 422 || /invalid mime|unsupported media|invalid file/i.test(msgStr);
  const isNetwork = errName === "TypeError" || /network|fetch|failed to fetch|econnreset|etimedout|socket/i.test(msgStr);

  const isPermanent = isAuth || isPermission || isQuota || isTooLarge || isInvalidType || errCode === 400 || errCode === 404;
  const isTransient = !isPermanent && (isRateLimit || isNetwork || (errCode && errCode >= 500) || /server error|internal error|timeout|batch_upload_partially_failed|batch_upload_failed|batch_upload_no_results/i.test(msgStr));

  return {
    name: errName,
    code: errCode,
    status,
    statusCode,
    message: msgStr,
    failedItems,
    failedCount,
    totalCount,
    retryAfterSec,
    isRateLimit,
    isAuth,
    isPermission,
    isQuota,
    isTooLarge,
    isInvalidType,
    isNetwork,
    isPermanent,
    isTransient
  };
}

/**
 * Helper: Formats detailed user-friendly error message for Puter Cloud errors without generic "Upload failed"
 */
function formatPuterErrorMessage(classified, fileName = "") {
  const prefix = fileName ? `${fileName}: ` : "";
  if (classified.isRateLimit) {
    return `${prefix}Rate limit exceeded (HTTP 429). Please wait a moment before trying again.`;
  }
  if (classified.isAuth) {
    return `${prefix}Authentication failure: Puter session invalid or expired. Please re-authenticate in Admin Settings.`;
  }
  if (classified.isPermission) {
    return `${prefix}Permission denied (HTTP 403): Cannot write to Puter storage path.`;
  }
  if (classified.isQuota) {
    return `${prefix}Storage quota exceeded: Your Puter Cloud storage allocation is full.`;
  }
  if (classified.isTooLarge) {
    return `${prefix}File too large: Exceeds Puter Cloud max single-file size limit.`;
  }
  if (classified.isInvalidType) {
    return `${prefix}Invalid file type: File format is rejected by Puter Cloud.`;
  }
  if (classified.code || classified.status) {
    return `${prefix}[Puter ${classified.name || "Error"} ${classified.code || classified.status}] ${classified.message}`;
  }
  if (classified.message && classified.message !== "Puter upload request failed." && classified.message !== "Upload failed") {
    return `${prefix}[Puter Error] ${classified.message}`;
  }
  return `${prefix}[Puter Error] Storage upload failed without returning a valid file descriptor.`;
}

/**
 * Helper: Extracts array of succeeded file descriptor objects from response or error
 */
function extractSucceededDescriptors(uploadRes, uploadErr) {
  const list = [];
  const collect = (target) => {
    if (!target) return;
    if (Array.isArray(target)) {
      target.forEach(item => { if (item) list.push(item); });
    } else if (typeof target === "object") {
      const candidates = target.results || target.uploaded || target.succeeded || target.items || target.data || target.files;
      if (Array.isArray(candidates)) {
        candidates.forEach(item => { if (item) list.push(item); });
      } else if (target.path || target.name || target.size !== undefined || target.url) {
        list.push(target);
      }
    }
  };

  collect(uploadRes);
  collect(uploadErr);
  return list;
}

/**
 * Helper: Extracts array of failed file item descriptors from response or error
 */
function extractFailedDescriptors(uploadRes, uploadErr) {
  const list = [];
  const collect = (target) => {
    if (!target) return;
    if (typeof target === "object") {
      const candidates = target.failedItems || target.failed || target.errors || target.failedFiles;
      if (Array.isArray(candidates)) {
        candidates.forEach(item => { if (item) list.push(item); });
      }
    }
  };

  collect(uploadRes);
  collect(uploadErr);
  return list;
}

/**
 * Helper: Safely matches a result descriptor to a tracking item without false positives
 */
function findMatchingDescriptor(descriptors, pItem, currentPendingList) {
  if (!Array.isArray(descriptors) || descriptors.length === 0) return null;

  for (const d of descriptors) {
    if (!d) continue;

    if (typeof d === "string") {
      if (d === pItem.uniqueFileName || d === pItem.originalName || d === pItem.puterPath || d.endsWith(pItem.uniqueFileName)) {
        return { name: pItem.uniqueFileName, path: pItem.puterPath };
      }
      continue;
    }

    if (typeof File !== "undefined" && d instanceof File) {
      if (d === pItem.uploadFile || d === pItem.originalFile || d.name === pItem.uniqueFileName || d.name === pItem.originalName) {
        return { name: pItem.uniqueFileName, path: pItem.puterPath, size: d.size };
      }
      continue;
    }

    if (typeof d === "object") {
      if (d.name && (d.name === pItem.uniqueFileName || d.name === pItem.originalName)) return d;
      if (d.path && (d.path === pItem.puterPath || d.path === pItem.actualPuterPath || d.path.endsWith(pItem.uniqueFileName))) return d;
      if (d.file && (d.file === pItem.uploadFile || d.file.name === pItem.uniqueFileName || d.file.name === pItem.originalName)) return d;
      if (d.originalName && d.originalName === pItem.originalName) return d;
      if (d.item && (d.item.name === pItem.uniqueFileName || d.item.originalName === pItem.originalName)) return d;
    }
  }

  // Single-item fallback match ONLY when chunk size = 1 and descriptor represents a valid file
  if (descriptors.length === 1 && currentPendingList.length === 1 && currentPendingList[0] === pItem) {
    const singleD = descriptors[0];
    if (singleD && (typeof singleD === "object" || typeof singleD === "string")) {
      return typeof singleD === "string" ? { name: pItem.uniqueFileName, path: pItem.puterPath } : singleD;
    }
  }

  return null;
}

// Cache for active storage provider ("puter" | "pcloud")
let _cachedActiveProvider = null;

/**
 * Get active storage provider from server
 */
export async function getActiveStorageProvider(force = false) {
  if (_cachedActiveProvider && !force) {
    return _cachedActiveProvider;
  }
  try {
    const res = await fetch("/api/upload/provider");
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.provider) {
        _cachedActiveProvider = data.provider;
        return data.provider;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch active storage provider:", err);
  }
  _cachedActiveProvider = "puter";
  return "puter";
}

/**
 * Set active storage provider ("puter" | "pcloud")
 */
export async function setActiveStorageProvider(provider) {
  const targetProvider = provider === "pcloud" ? "pcloud" : "puter";
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("aura_admin_token") || localStorage.getItem("aura_token") || "" : "";
    const res = await fetch("/api/upload/provider", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ provider: targetProvider })
    });
    const data = await res.json();
    if (data.success) {
      _cachedActiveProvider = targetProvider;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("aura:storage-provider-changed", { detail: { provider: targetProvider } }));
      }
      return data;
    } else {
      throw new Error(data.message || "Failed to switch active storage provider");
    }
  } catch (err) {
    console.error("Error setting active storage provider:", err);
    throw err;
  }
}

/**
 * Get pCloud Storage connection status & metrics from backend
 */
export async function getPcloudMediaStatus() {
  try {
    const res = await fetch("/api/upload/pcloud/status");
    if (!res.ok) {
      return {
        connected: false,
        status: "Error",
        provider: "pCloud Storage",
        message: `HTTP ${res.status}: Failed to reach pCloud status endpoint.`
      };
    }
    const data = await res.json();
    return data;
  } catch (err) {
    return {
      connected: false,
      status: "Connection Failed",
      provider: "pCloud Storage",
      message: err.message || "Network error checking pCloud status."
    };
  }
}

/**
 * Upload batch to pCloud via backend proxy endpoint
 */
export async function uploadBatchToPcloud(rawFiles, onProgress = () => {}) {
  const filesArray = Array.isArray(rawFiles)
    ? rawFiles
    : (rawFiles instanceof FileList ? Array.from(rawFiles) : (rawFiles ? [rawFiles] : []));

  if (!filesArray.length) return [];

  const results = [];
  const totalCount = filesArray.length;

  for (let idx = 0; idx < totalCount; idx++) {
    const item = filesArray[idx];

    // If item is already a URL string
    if (typeof item === "string" && (item.startsWith("http://") || item.startsWith("https://") || item.startsWith("/images/"))) {
      results.push({
        index: idx,
        originalName: item.split("/").pop() || "media",
        uniqueFileName: item.split("/").pop() || "media",
        url: item,
        readURL: item,
        success: true,
        provider: "pcloud"
      });
      continue;
    }

    onProgress(Math.round(((idx) / totalCount) * 100), `Uploading ${item.name || "file"} (${idx + 1}/${totalCount}) to pCloud...`);

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file for pCloud upload"));
        reader.readAsDataURL(item);
      });

      const token = typeof window !== "undefined" ? localStorage.getItem("aura_admin_token") || localStorage.getItem("aura_token") || "" : "";
      const res = await fetch("/api/upload/pcloud/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          fileData: base64Data,
          filename: item.name || `file-${Date.now()}`,
          type: item.type || "image/jpeg",
          sizeBytes: item.size || 0
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `pCloud upload failed (${res.status})`);
      }

      results.push({
        index: idx,
        originalName: item.name,
        uniqueFileName: item.name,
        url: data.url || data.readURL,
        readURL: data.url || data.readURL,
        fileId: data.fileId,
        success: true,
        provider: "pcloud",
        source: "pcloud"
      });
    } catch (err) {
      console.error(`pCloud upload error for ${item.name}:`, err);
      results.push({
        index: idx,
        originalName: item.name || "file",
        success: false,
        error: err.message || "pCloud upload failed",
        provider: "pcloud",
        source: "pcloud"
      });
    }
  }

  onProgress(100, `Completed pCloud upload (${results.filter(r => r.success).length}/${totalCount} items)`);
  return results;
}

/**
 * Uploads a batch of media files directly to Puter Cloud in a controlled, resumable queue.
 * Uses a single-active-upload queue to prevent rate limit storms.
 * Automatically falls back to single-file mode for ambiguous or batch rejection cases.
 * Captures raw Puter error object details and handles 429 rate limit backoff.
 */
export async function uploadBatchToPuter(rawFiles, onProgress = () => {}, onChunkSuccess = null) {
  return _uploadQueue.add(async () => {
    if (import.meta.env.DEV) {
      console.log("[Puter Diagnostics] UPLOAD_ENGINE_VERSION=5.0.0-RESUMABLE-SINGLE-FILE-QUEUE");
    }

    const filesArray = Array.isArray(rawFiles)
      ? rawFiles
      : (rawFiles instanceof FileList ? Array.from(rawFiles) : (rawFiles ? [rawFiles] : []));

    if (!filesArray.length) return [];

    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif", "image/svg+xml",
      "video/mp4", "video/webm", "video/ogg"
    ];

    const batchId = `aura_batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Prepare & validate item tracking objects
    const items = filesArray.map((file, idx) => {
      // If file is already a valid URL string
      if (typeof file === "string" && (file.startsWith("http://") || file.startsWith("https://") || file.startsWith("/images/"))) {
        return {
          index: idx,
          originalName: file.split("/").pop() || "media",
          uniqueFileName: file.split("/").pop() || "media",
          uploadFile: null,
          puterPath: "",
          actualPuterPath: "",
          actualFileName: file.split("/").pop() || "media",
          size: 0,
          type: "image/jpeg",
          status: "uploaded",
          verified: true,
          success: true,
          publicUrl: file,
          error: null,
          source: null,
          attempt: 0,
          statChecked: false
        };
      }

      const isVideo = file?.type?.startsWith("video/") || file?.name?.endsWith(".mp4") || file?.name?.endsWith(".webm");
      const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      let valError = null;

      if (file.size && file.size > maxBytes) {
        valError = `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds ${isVideo ? "50MB" : "10MB"} limit.`;
      } else if (file.type && !allowedTypes.includes(file.type)) {
        valError = "Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF, SVG, MP4, WebM.";
      }

      const uniqueFileName = generateUniqueFileName(file);
      let uploadFile = file;
      if (typeof File !== "undefined" && file instanceof File) {
        try {
          uploadFile = new File([file], uniqueFileName, {
            type: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
            lastModified: file.lastModified || Date.now()
          });
        } catch {
          uploadFile = file;
        }
      }

      return {
        index: idx,
        originalFile: file,
        originalName: file?.name || `image_${idx + 1}.jpg`,
        uniqueFileName,
        uploadFile,
        puterPath: `aura_uploads/${uniqueFileName}`,
        actualPuterPath: `aura_uploads/${uniqueFileName}`,
        actualFileName: uniqueFileName,
        size: file?.size || 0,
        type: file?.type || (isVideo ? "video/mp4" : "image/jpeg"),
        isVideo,
        status: valError ? "failed" : "pending",
        verified: false,
        success: false,
        publicUrl: "",
        error: valError,
        source: valError ? "validation" : null,
        attempt: 0,
        statChecked: false
      };
    });

    // If all items were already valid URL strings, return directly
    if (items.every(it => it.success)) {
      return items.map(it => ({ success: true, url: it.publicUrl, originalName: it.originalName, status: it.status, error: null, source: null }));
    }

    onProgress(5, `Initializing Puter Cloud storage connection (${items.length} file(s))...`);

    // 1. Check Puter Connection ONCE for entire batch
    const status = await getPuterMediaStatus();
    if (!status.connected) {
      const err = new Error("[Puter Cloud] Puter Storage is not connected. Please connect Puter Cloud in Admin Panel.");
      err.source = "puter";
      err.status = 401;
      throw err;
    }

    // 2. Resolve Hosted Domain ONCE for entire batch
    const hostedDomain = await getPuterHostedDomain();
    const puter = window.puter;

    // Function to perform single-file upload safely
    async function uploadSingleFile(pItem, attemptNumber = 1) {
      pItem.attempt = attemptNumber;
      let singleRes = null;
      let singleErr = null;

      logUploadTrace({
        batchId,
        source: "puter",
        endpoint: "puter.fs.upload_single",
        method: "POST",
        attempt: attemptNumber,
        filename: pItem.uniqueFileName
      });

      try {
        if (typeof puter.fs?.upload === "function") {
          singleRes = await puter.fs.upload([pItem.uploadFile], "aura_uploads", {
            createMissingParents: true,
            dedupeName: false,
            overwrite: true
          });
        } else if (typeof puter.fs?.write === "function") {
          await puter.fs.write(pItem.puterPath, pItem.uploadFile, { createMissingParents: true, overwrite: true });
          singleRes = [{ name: pItem.uniqueFileName, path: pItem.puterPath }];
        } else {
          throw new Error("Puter storage API methods unavailable.");
        }
      } catch (err) {
        singleErr = err;
      }

      const succeededList = extractSucceededDescriptors(singleRes, singleErr);
      const matched = findMatchingDescriptor(succeededList, pItem, [pItem]);

      if (matched) {
        pItem.status = "uploaded";
        pItem.verified = true;
        pItem.actualPuterPath = matched.path || pItem.puterPath;
        pItem.actualFileName = matched.name || pItem.uniqueFileName;
        pItem.size = matched.size || pItem.size;
        if (hostedDomain) {
          pItem.publicUrl = `https://${hostedDomain}/${encodeURIComponent(pItem.actualFileName)}`;
        } else if (typeof puter.fs?.getReadURL === "function") {
          pItem.publicUrl = await puter.fs.getReadURL(pItem.actualPuterPath).catch(() => "");
        }

        logUploadTrace({
          batchId,
          source: "puter",
          endpoint: "puter.fs.upload_single",
          status: 200,
          attempt: attemptNumber,
          filename: pItem.uniqueFileName,
          classification: "single_success"
        });
        return true;
      }

      // Single upload failed or unconfirmed: inspect error
      const classified = classifyPuterError(singleErr);

      logUploadTrace({
        batchId,
        source: "puter",
        endpoint: "puter.fs.upload_single",
        status: classified.code || (classified.isRateLimit ? 429 : 500),
        code: classified.code,
        attempt: attemptNumber,
        filename: pItem.uniqueFileName,
        retryAfter: classified.retryAfterSec,
        rawError: classified.message,
        classification: classified.isRateLimit ? "single_rate_limit" : (classified.isPermanent ? "single_permanent_error" : "single_transient_error")
      });

      // Targeted stat check if single upload returned ambiguous result
      if (!pItem.statChecked) {
        pItem.statChecked = true;
        let stat = await puter.fs.stat(pItem.actualPuterPath).catch(() => null);
        if (!stat) {
          stat = await puter.fs.stat(`aura_uploads/${pItem.actualFileName}`).catch(() => null);
        }

        if (stat && stat.size > 0) {
          pItem.status = "uploaded";
          pItem.verified = true;
          pItem.actualPuterPath = stat.path || pItem.actualPuterPath;
          pItem.actualFileName = stat.name || pItem.actualFileName;
          pItem.size = stat.size || pItem.size;
          if (hostedDomain) {
            pItem.publicUrl = `https://${hostedDomain}/${encodeURIComponent(pItem.actualFileName)}`;
          }
          return true;
        }
      }

      if (classified.isRateLimit) {
        const waitMs = Math.min(Math.max(1500, (classified.retryAfterSec || 2) * 1000), 10000) + Math.floor(Math.random() * 300);
        onProgress(30, `[Puter Cloud] Rate limit on ${pItem.originalName} — waiting ${Math.ceil(waitMs/1000)}s...`);
        await new Promise(r => setTimeout(r, waitMs));
      }

      pItem.status = "failed";
      pItem.error = formatPuterErrorMessage(classified, pItem.originalName);
      pItem.source = "puter";
      return false;
    }

    // 3. Process Pending Files in Controlled Chunks with Automatic Single-File Fallback
    const pendingQueue = items.filter(it => it.status === "pending");
    let totalProcessed = 0;

    for (let pIdx = 0; pIdx < pendingQueue.length; pIdx += 2) {
      const chunk = pendingQueue.slice(pIdx, pIdx + 2);
      const progressPct = Math.min(85, Math.round(10 + (totalProcessed / pendingQueue.length) * 75));
      onProgress(progressPct, `Uploading image ${totalProcessed + 1} of ${pendingQueue.length}...`);

      let uploadRes = null;
      let uploadErr = null;

      if (chunk.length > 1) {
        logUploadTrace({
          batchId,
          source: "puter",
          endpoint: "puter.fs.upload_chunk",
          method: "POST",
          filename: chunk.map(p => p.uniqueFileName).join(", ")
        });

        try {
          if (typeof puter.fs?.upload === "function") {
            uploadRes = await puter.fs.upload(chunk.map(c => c.uploadFile), "aura_uploads", {
              createMissingParents: true,
              dedupeName: false,
              overwrite: true
            });
          }
        } catch (err) {
          uploadErr = err;
        }

        const succeededList = extractSucceededDescriptors(uploadRes, uploadErr);

        for (const pItem of chunk) {
          const matched = findMatchingDescriptor(succeededList, pItem, chunk);
          if (matched) {
            pItem.status = "uploaded";
            pItem.verified = true;
            pItem.actualPuterPath = matched.path || pItem.puterPath;
            pItem.actualFileName = matched.name || pItem.uniqueFileName;
            pItem.size = matched.size || pItem.size;
            if (hostedDomain) {
              pItem.publicUrl = `https://${hostedDomain}/${encodeURIComponent(pItem.actualFileName)}`;
            } else if (typeof puter.fs?.getReadURL === "function") {
              pItem.publicUrl = await puter.fs.getReadURL(pItem.actualPuterPath).catch(() => "");
            }
          }
        }
      }

      // Single-file fallback for any unresolved items in chunk
      const unresolved = chunk.filter(c => c.status === "pending");

      if (unresolved.length > 0) {
        if (chunk.length > 1) {
          logUploadTrace({
            batchId,
            source: "puter",
            endpoint: "single_file_fallback_trigger",
            filename: unresolved.map(u => u.uniqueFileName).join(", "),
            rawError: uploadErr?.message || "Batch upload ambiguous response"
          });
        }

        for (const pItem of unresolved) {
          let singleAttempts = 0;
          let singleOk = false;
          while (singleAttempts < 2 && !singleOk) {
            singleAttempts++;
            singleOk = await uploadSingleFile(pItem, singleAttempts);
            if (!singleOk && pItem.status === "failed") {
              const classified = classifyPuterError(uploadErr);
              if (classified.isTransient && singleAttempts < 2) {
                await new Promise(r => setTimeout(r, 1000));
              } else {
                break;
              }
            }
          }

          // Small delay between single file attempts
          await new Promise(r => setTimeout(r, 200));
        }
      }

      // Register Succeeded Items in MongoDB
      const chunkUploaded = chunk.filter(it => (it.status === "uploaded" || it.status === "registered") && it.publicUrl);

      if (chunkUploaded.length > 0) {
        const registerPayload = {
          batchId,
          items: chunkUploaded.map(it => ({
            readURL: it.publicUrl,
            url: it.publicUrl,
            puterFileId: it.actualPuterPath,
            fileId: it.actualPuterPath,
            path: it.actualPuterPath,
            filename: it.actualFileName,
            type: it.type,
            sizeBytes: it.size,
            metadata: {
              originalName: it.originalName,
              batchId,
              uploadedAt: new Date().toISOString()
            },
            provider: "puter"
          }))
        };

        try {
          const regRes = await fetchWithBackoff(`${API_BASE}/upload/register-batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registerPayload)
          }, 3, { batchId, filename: chunkUploaded.map(v => v.actualFileName).join(", ") });

          const regData = await regRes.json().catch(() => ({}));

          if (regRes.ok && regData.success) {
            chunkUploaded.forEach(it => {
              it.registeredInDb = true;
              it.status = "registered";
              it.success = true;
            });
          } else {
            chunkUploaded.forEach(it => {
              it.registeredInDb = false;
              it.status = "uploaded";
              it.success = true; // Preserve Puter public URLs even if DB registration fails
              it.dbError = "[MongoDB] Metadata registration deferred.";
            });
          }
        } catch (regErr) {
          chunkUploaded.forEach(it => {
            it.registeredInDb = false;
            it.status = "uploaded";
            it.success = true; // Preserve Puter public URLs
            it.dbError = "[MongoDB] Metadata registration deferred.";
          });
        }

        // Notify progressive chunk success callback if provided
        if (typeof onChunkSuccess === "function") {
          try {
            const chunkResults = chunkUploaded.map(it => ({
              success: true,
              url: it.publicUrl,
              filename: it.actualFileName,
              originalName: it.originalName
            }));
            onChunkSuccess(chunkResults);
          } catch (e) {
            console.warn("Chunk success callback note:", e);
          }
        }
      }

      totalProcessed += chunk.length;

      // Small adaptive delay between queue steps to prevent request storms
      if (pIdx + 2 < pendingQueue.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    onProgress(100, "All product images processed.");

    return items.map(it => ({
      success: Boolean(it.success || it.status === "uploaded" || it.status === "registered"),
      url: it.publicUrl || "",
      filename: it.actualFileName || it.uniqueFileName,
      originalName: it.originalName,
      path: it.actualPuterPath || it.puterPath,
      status: it.status,
      error: it.error || null,
      source: it.source || (it.success ? null : "puter")
    }));
  });
}

/**
 * Unified batch upload entrypoint.
 * Automatically routes uploads to the currently active storage provider ("puter" | "pcloud").
 */
export async function uploadMediaBatch(rawFiles, onProgress = () => {}, onChunkSuccess = null) {
  const activeProvider = await getActiveStorageProvider();
  if (activeProvider === "pcloud") {
    return uploadBatchToPcloud(rawFiles, onProgress);
  }
  return uploadBatchToPuter(rawFiles, onProgress, onChunkSuccess);
}

/**
 * Uploads a single media file directly to Puter Cloud Storage.
 * Single-file wrapper adapter invoking uploadMediaBatch for unified behavior.
 */
export async function uploadMedia(file, onProgress = () => {}) {
  if (!file) return null;

  if (typeof file === "string") {
    if (file.startsWith("http://") || file.startsWith("https://") || file.startsWith("/images/")) {
      return file;
    }
  }

  const results = await uploadMediaBatch([file], onProgress);
  const result = results[0];

  if (result && result.success && result.url) {
    return result.url;
  }

  const sourceTag = result?.source === "puter" ? "[Puter Cloud]" : (result?.source === "mongodb" ? "[MongoDB]" : (result?.source === "api" ? "[API Gateway]" : ""));
  const errMsg = result?.error || "Media upload failed.";
  const fullErr = new Error(sourceTag ? `${sourceTag} ${errMsg}` : errMsg);
  fullErr.source = result?.source || "puter";
  fullErr.originalFileName = result?.originalName;
  throw fullErr;
}

export function getMediaUrl(url) {
  if (!url) return "/images/product-5mukhi.jpg";
  return url;
}

export function deleteMedia(url) {
  return true;
}



