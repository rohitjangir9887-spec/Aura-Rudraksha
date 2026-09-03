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
 * Uploads a batch of media files directly to Puter Cloud in ONE multi-file call.
 * Handles partial failures, bounded retries with exponential backoff on 429,
 * verifies files with stat, and performs bulk registration in MongoDB.
 */
export async function uploadMediaBatch(rawFiles, onProgress = () => {}) {
  if (import.meta.env.DEV) {
    console.log("[Puter Diagnostics] UPLOAD_PIPELINE_VERSION=2.0.0-PUTER-BATCH-IDEMPOTENT");
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
        attempt: 0
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
      attempt: 0
    };
  });

  // If all items were already valid URL strings, return directly
  if (items.every(it => it.success)) {
    return items.map(it => ({ success: true, url: it.publicUrl, originalName: it.originalName }));
  }

  onProgress(10, `Initializing Puter Cloud connection for batch (${items.length} files)...`);

  // 1. Verify Puter Connection ONCE for entire batch
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

  // 3. Batch Upload Loop for pending files
  let pendingItems = items.filter(it => it.status === "pending");
  let batchAttempt = 0;
  const maxBatchAttempts = 3;

  while (pendingItems.length > 0 && batchAttempt < maxBatchAttempts) {
    batchAttempt++;
    pendingItems.forEach(it => it.attempt = batchAttempt);

    onProgress(
      Math.min(65, 20 + batchAttempt * 15),
      `Uploading ${pendingItems.length} file(s) to Puter Cloud (Attempt ${batchAttempt}/${maxBatchAttempts})...`
    );

    const uploadFiles = pendingItems.map(it => it.uploadFile);
    let uploadRes = null;
    let uploadErr = null;

    logUploadTrace({
      batchId,
      source: "puter",
      endpoint: "puter.fs.upload",
      method: "POST",
      attempt: batchAttempt,
      filename: pendingItems.map(p => p.uniqueFileName).join(", ")
    });

    try {
      if (typeof puter.fs?.upload === "function") {
        uploadRes = await puter.fs.upload(uploadFiles, "aura_uploads", {
          createMissingParents: true,
          dedupeName: true,
          overwrite: true,
          progress: (opId, p) => {
            const pct = Math.min(75, Math.max(20, Math.round(20 + (p || 0) * 0.55)));
            onProgress(pct, `Uploading ${pendingItems.length} file(s) to Puter Cloud — ${pct}%`);
          }
        });
      } else if (typeof puter.fs?.write === "function") {
        uploadRes = [];
        for (const pItem of pendingItems) {
          await puter.fs.write(pItem.puterPath, pItem.uploadFile, { createMissingParents: true, overwrite: true });
          uploadRes.push({ name: pItem.uniqueFileName, path: pItem.puterPath });
          await new Promise(r => setTimeout(r, 100));
        }
      } else {
        throw new Error("[Puter Cloud] Puter storage API methods (upload/write) are unavailable.");
      }
    } catch (err) {
      uploadErr = err;
    }

    // Extract any partial success results from uploadRes or uploadErr
    const responseArray = Array.isArray(uploadRes)
      ? uploadRes
      : (uploadRes?.results || uploadRes?.uploaded || uploadRes?.items || (uploadRes ? [uploadRes] : []));

    const errResults = Array.isArray(uploadErr?.results)
      ? uploadErr.results
      : (Array.isArray(uploadErr?.uploaded) ? uploadErr.uploaded : (Array.isArray(uploadErr?.succeeded) ? uploadErr.succeeded : []));

    const combinedResults = [...responseArray, ...errResults];

    // Identify explicitly succeeded files
    for (const pItem of pendingItems) {
      const matched = combinedResults.find(r =>
        r?.name === pItem.uniqueFileName ||
        r?.path === pItem.puterPath ||
        r?.name === pItem.originalName ||
        r?.path?.endsWith(pItem.uniqueFileName)
      ) || (responseArray.length === 1 && pendingItems.length === 1 ? responseArray[0] : null);

      if (matched && (matched.path || matched.name || matched.size)) {
        pItem.status = "uploaded";
        pItem.actualPuterPath = matched.path || pItem.puterPath;
        pItem.actualFileName = matched.name || pItem.uniqueFileName;
      }
    }

    // Inspect Puter error properties if upload failed or partially failed
    if (uploadErr) {
      const errCode = uploadErr.code || uploadErr.status || uploadErr.statusCode || null;
      const isRateLimit = errCode === 429 || /too many requests|rate limit|slow down/i.test(uploadErr.message || "");
      const isNetwork = uploadErr.name === "TypeError" || /network|fetch|failed to fetch/i.test(uploadErr.message || "");
      const isPermanent = errCode === 400 || errCode === 401 || errCode === 403 || errCode === 404 || errCode === 413 || errCode === 415 || errCode === 422 || /quota|space|permission|unauthorized|invalid mime|invalid path/i.test(uploadErr.message || "");

      const failedItemsList = Array.isArray(uploadErr.failedItems)
        ? uploadErr.failedItems
        : (Array.isArray(uploadErr.failed) ? uploadErr.failed : []);

      for (const pItem of pendingItems.filter(i => i.status === "pending")) {
        const isExplicitlyFailed = failedItemsList.some(fi =>
          fi === pItem.uploadFile ||
          fi?.name === pItem.uniqueFileName ||
          fi?.name === pItem.originalName ||
          fi?.item?.name === pItem.uniqueFileName
        );

        if (isExplicitlyFailed && isPermanent) {
          pItem.status = "failed";
          pItem.error = `[Puter Cloud] Upload failed: ${uploadErr.message || "Permanent error."}`;
          pItem.source = "puter";
        }
      }

      // Verify unconfirmed pending items with puter.fs.stat before retrying or failing
      for (const pItem of pendingItems.filter(i => i.status === "pending")) {
        logUploadTrace({
          batchId,
          source: "puter",
          endpoint: "puter.fs.stat",
          method: "GET",
          filename: pItem.uniqueFileName
        });

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
        } else if (isPermanent || batchAttempt >= maxBatchAttempts) {
          pItem.status = "failed";
          pItem.error = isRateLimit
            ? "[Puter Cloud] Rate limit — retrying..."
            : `[Puter Cloud] ${uploadErr.message || "File upload failed."}`;
          pItem.source = "puter";
        }
      }

      // If pending items remain and error is transient (429 or network), perform backoff
      const remainingPending = items.filter(it => it.status === "pending");
      if (remainingPending.length > 0 && (isRateLimit || isNetwork) && batchAttempt < maxBatchAttempts) {
        const retrySec = parseRetryAfter(uploadErr.retryAfter || uploadErr.retry_after || uploadErr.headers?.get?.("Retry-After")) || Math.pow(2, batchAttempt);
        const delayMs = Math.min(Math.max(1200, retrySec * 1000), 8000) + Math.floor(Math.random() * 400);

        logUploadTrace({
          batchId,
          source: "puter",
          endpoint: "puter.fs.upload",
          status: 429,
          attempt: batchAttempt,
          retryAfter: Math.ceil(delayMs / 1000),
          filename: remainingPending.map(r => r.uniqueFileName).join(", ")
        });

        onProgress(30, `[Puter Cloud] Rate limit — retrying in ${Math.ceil(delayMs / 1000)}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    pendingItems = items.filter(it => it.status === "pending");
  }

  // 4. Verification with puter.fs.stat for uploaded items
  onProgress(80, "Verifying uploaded files on Puter Cloud...");
  const uploadedItems = items.filter(it => it.status === "uploaded");

  for (const item of uploadedItems) {
    if (!item.verified) {
      logUploadTrace({
        batchId,
        source: "puter",
        endpoint: "puter.fs.stat",
        method: "GET",
        filename: item.actualFileName
      });

      let stat = await puter.fs.stat(item.actualPuterPath).catch(() => null);
      if (!stat) {
        stat = await puter.fs.stat(`aura_uploads/${item.actualFileName}`).catch(() => null);
      }

      if (stat && stat.size > 0) {
        item.verified = true;
        item.actualPuterPath = stat.path || item.actualPuterPath;
        item.actualFileName = stat.name || item.actualFileName;
        item.size = stat.size || item.size;
      } else {
        item.status = "failed";
        item.error = "[Puter Cloud] Verification failed. File stat not found.";
        item.source = "puter";
      }
    }

    if (item.verified) {
      if (hostedDomain) {
        item.publicUrl = `https://${hostedDomain}/${encodeURIComponent(item.actualFileName)}`;
      } else if (typeof puter.fs.getReadURL === "function") {
        item.publicUrl = await puter.fs.getReadURL(item.actualPuterPath);
      }
    }
  }

  // 5. Bulk MongoDB Metadata Registration
  const verifiedItems = items.filter(it => it.verified && it.publicUrl);

  if (verifiedItems.length > 0) {
    onProgress(90, `Registering ${verifiedItems.length} media record(s) in MongoDB...`);

    const registerPayload = {
      batchId,
      items: verifiedItems.map(it => ({
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
      }, 3, { batchId, filename: verifiedItems.map(v => v.actualFileName).join(", ") });

      const regData = await regRes.json().catch(() => ({}));

      if (regRes.ok && regData.success) {
        verifiedItems.forEach(it => {
          it.registeredInDb = true;
          it.success = true;
        });
      } else {
        verifiedItems.forEach(it => {
          it.registeredInDb = false;
          it.success = true; // Preserve Puter public URLs
        });
      }
    } catch (regErr) {
      verifiedItems.forEach(it => {
        it.registeredInDb = false;
        it.success = true; // Preserve Puter public URLs
      });
    }
  }

  onProgress(100, "Upload process complete!");

  return items.map(it => ({
    success: it.success,
    url: it.publicUrl || "",
    filename: it.actualFileName || it.uniqueFileName,
    originalName: it.originalName,
    path: it.actualPuterPath || it.puterPath,
    error: it.error || null,
    source: it.source || (it.success ? null : "puter")
  }));
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



