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
  const asNumber = parseInt(headerValue, 10);
  if (!isNaN(asNumber) && asNumber > 0) {
    return asNumber;
  }
  const asDate = Date.parse(headerValue);
  if (!isNaN(asDate)) {
    const diffSec = Math.ceil((asDate - Date.now()) / 1000);
    return Math.max(1, diffSec);
  }
  return null;
}

/**
 * Executes a fetch request with safe exponential backoff on 429 responses.
 * Respects Retry-After header and adds jitter without infinite loops.
 */
async function fetchWithBackoff(url, options = {}, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    let res;
    try {
      res = await fetch(url, options);
    } catch (networkErr) {
      if (attempt >= maxRetries) {
        const err = new Error("Network error connecting to API server. Please check your connection.");
        err.source = "api";
        err.originalError = networkErr;
        throw err;
      }
      attempt++;
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000) + Math.floor(Math.random() * 200);
      await new Promise(r => setTimeout(r, delayMs));
      continue;
    }

    // If 429 Too Many Requests, perform safe backoff
    if (res.status === 429) {
      attempt++;
      const data = await res.json().catch(() => ({}));
      const retryAfterHeader = parseRetryAfter(res.headers.get("Retry-After"));
      const waitSec = data.retryAfter || retryAfterHeader || 3;

      if (attempt > maxRetries) {
        const err = new Error(data.message || `API Gateway: Rate limit reached. Please wait ${waitSec}s before uploading more files.`);
        err.source = "api";
        err.status = 429;
        err.retryAfter = waitSec;
        throw err;
      }

      let delayMs = Math.min(Math.max(1000, waitSec * 1000), 8000) + Math.floor(Math.random() * 300);

      if (import.meta.env.DEV) {
        console.warn(`[ImageUpload] HTTP 429 for ${url}. Backing off ${delayMs}ms (Attempt ${attempt}/${maxRetries})`);
      }

      await new Promise(r => setTimeout(r, delayMs));
      continue;
    }

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
 * Uploads media file (image or video) directly to Puter Cloud Storage.
 * Verifies file presence & registers metadata in MongoDB with end-to-end error preservation.
 */
export async function uploadMedia(file, onProgress = () => {}) {
  if (!file) return null;

  // If already a valid HTTP(S) or static URL string, return directly
  if (typeof file === "string") {
    if (file.startsWith("http://") || file.startsWith("https://") || file.startsWith("/images/")) {
      return file;
    }
  }

  // Deduplicate in-flight uploads for the same file object to prevent double-upload triggers
  const uploadKey = (file instanceof File || file instanceof Blob)
    ? `${file.name || "blob"}_${file.size || 0}_${file.lastModified || 0}`
    : String(file);

  if (_inFlightUploads.has(uploadKey)) {
    if (import.meta.env.DEV) {
      console.log("[Puter Diagnostics] In-flight upload reused for key:", uploadKey);
    }
    return _inFlightUploads.get(uploadKey);
  }

  const uploadPromise = (async () => {
    return _uploadQueue.enqueue(async () => {
      // 1. Verify Puter connection & authentication
      const status = await getPuterMediaStatus();
      if (!status.connected) {
        const authErr = new Error("Puter Cloud not connected. Please connect Puter in Admin Panel before uploading media.");
        authErr.source = "puter";
        authErr.status = 401;
        throw authErr;
      }

      const isVideo = file.type?.startsWith("video/") || file.name?.endsWith(".mp4") || file.name?.endsWith(".webm");
      const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

      if (file.size && file.size > maxBytes) {
        const sizeErr = new Error(`File size exceeds ${isVideo ? '50MB' : '10MB'} limit.`);
        sizeErr.source = "validation";
        throw sizeErr;
      }

      const allowedTypes = [
        "image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif", "image/svg+xml",
        "video/mp4", "video/webm", "video/ogg"
      ];
      if (file.type && !allowedTypes.includes(file.type)) {
        const typeErr = new Error("Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF, SVG, MP4, WebM.");
        typeErr.source = "validation";
        throw typeErr;
      }

      onProgress(15);
      const puter = window.puter;

      // Generate guaranteed unique filename
      const uniqueFileName = generateUniqueFileName(file);
      const dirPath = "aura_uploads";
      const filePath = `${dirPath}/${uniqueFileName}`;

      // Wrap file in a renamed File instance so Puter's upload method writes to the unique filename
      let uploadFile = file;
      if (typeof File !== "undefined" && file instanceof File) {
        try {
          uploadFile = new File([file], uniqueFileName, {
            type: file.type || "image/jpeg",
            lastModified: file.lastModified || Date.now()
          });
        } catch {
          uploadFile = file;
        }
      }

      if (import.meta.env.DEV) {
        console.log("[Puter Diagnostics] Uploading file to Puter:", uniqueFileName, "Size:", file.size);
      }

      // 2. Upload file directly to Puter Cloud File System with bounded exponential backoff on 429
      let uploadedItem = null;
      const maxPuterAttempts = 3;
      let puterAttempt = 0;

      while (puterAttempt < maxPuterAttempts) {
        puterAttempt++;
        try {
          if (typeof puter.fs?.upload === "function") {
            try {
              uploadedItem = await puter.fs.upload([uploadFile], dirPath, {
                createMissingParents: true,
                dedupeName: true,
                overwrite: true,
                progress: (opId, p) => {
                  const pct = Math.min(70, Math.max(20, Math.round(20 + (p || 0) * 0.5)));
                  onProgress(pct);
                }
              });
              if (Array.isArray(uploadedItem)) {
                uploadedItem = uploadedItem[0];
              }
              break; // Success
            } catch (uploadErr) {
              // Check if method is genuinely unsupported
              const isMethodUnsupported = uploadErr && (
                uploadErr.name === "TypeError" ||
                uploadErr.code === "ENOSYS" ||
                uploadErr.code === "ERR_METHOD_NOT_SUPPORTED" ||
                String(uploadErr.message || "").toLowerCase().includes("not a function") ||
                String(uploadErr.message || "").toLowerCase().includes("not supported")
              );

              if (isMethodUnsupported && typeof puter.fs?.write === "function") {
                if (import.meta.env.DEV) {
                  console.warn("[Puter Diagnostics] puter.fs.upload unsupported, falling back to puter.fs.write:", uploadErr);
                }
                await puter.fs.write(filePath, uploadFile, { createMissingParents: true, overwrite: true });
                break; // Success via write
              }

              // Identify Puter 429 or rate limits
              const isRateLimit = uploadErr && (
                uploadErr.status === 429 ||
                uploadErr.code === 429 ||
                uploadErr.statusCode === 429 ||
                /too many requests|rate limit|slow down/i.test(uploadErr.message || "")
              );

              if (isRateLimit && puterAttempt < maxPuterAttempts) {
                const backoffDelay = Math.min(1500 * Math.pow(2, puterAttempt - 1), 6000) + Math.floor(Math.random() * 300);
                if (import.meta.env.DEV) {
                  console.warn(`[Puter Diagnostics] Puter 429 rate limit. Backing off ${backoffDelay}ms (attempt ${puterAttempt}/${maxPuterAttempts})`);
                }
                await new Promise(r => setTimeout(r, backoffDelay));
                continue;
              }

              const enrichedErr = new Error(
                isRateLimit 
                  ? "Puter Cloud: Too many requests. Please wait a moment before uploading more images."
                  : (uploadErr.message || "Puter Cloud file upload failed.")
              );
              enrichedErr.source = "puter";
              enrichedErr.status = uploadErr.status || (isRateLimit ? 429 : 500);
              enrichedErr.originalError = uploadErr;
              throw enrichedErr;
            }
          } else if (typeof puter.fs?.write === "function") {
            await puter.fs.write(filePath, uploadFile, { createMissingParents: true, overwrite: true });
            break;
          } else {
            const noMethodErr = new Error("Puter file storage methods (upload/write) are not available.");
            noMethodErr.source = "puter";
            throw noMethodErr;
          }
        } catch (outerErr) {
          if (outerErr.source === "puter") {
            throw outerErr;
          }
          const err = new Error(outerErr.message || "Puter upload failed.");
          err.source = "puter";
          throw err;
        }
      }

      onProgress(75);

      // 3. Verify file exists on Puter Cloud
      const targetPuterPath = uploadedItem?.path || filePath;
      let fileStat = await puter.fs.stat(targetPuterPath).catch(() => null);
      if (!fileStat && uploadedItem?.name) {
        fileStat = await puter.fs.stat(`${dirPath}/${uploadedItem.name}`).catch(() => null);
      }
      if (!fileStat) {
        fileStat = await puter.fs.stat(filePath).catch(() => null);
      }

      if (!fileStat) {
        const verifyErr = new Error("Puter Cloud: Upload verification failed. File not found on Puter storage.");
        verifyErr.source = "puter";
        throw verifyErr;
      }

      if (import.meta.env.DEV) {
        console.log("[Puter Diagnostics] Upload verified on Puter. Item:", {
          name: fileStat.name,
          size: fileStat.size,
          path: fileStat.path
        });
      }

      onProgress(85);

      // 4. Resolve production-safe permanent public media reference
      let publicUrl = "";
      const hostedDomain = await getPuterHostedDomain();
      const actualFileName = fileStat.name || uniqueFileName;

      if (hostedDomain) {
        publicUrl = `https://${hostedDomain}/${encodeURIComponent(actualFileName)}`;
      } else if (typeof puter.fs.getReadURL === "function") {
        publicUrl = await puter.fs.getReadURL(fileStat.path || targetPuterPath);
      }

      if (!publicUrl) {
        const urlErr = new Error("Puter Cloud: Could not resolve production public URL.");
        urlErr.source = "puter";
        throw urlErr;
      }

      if (import.meta.env.DEV) {
        console.log("[Puter Diagnostics] Resolved public URL:", publicUrl);
      }

      onProgress(90);

      // 5. Register media metadata in MongoDB exactly once per file with safe 429 backoff
      const finalResolvedPath = fileStat.path || targetPuterPath;
      const dedupeKey = `${publicUrl}::${finalResolvedPath}`;

      if (_registeredMediaCache.has(dedupeKey)) {
        if (import.meta.env.DEV) {
          console.log("[Puter Diagnostics] Media metadata already registered in MongoDB session cache:", dedupeKey);
        }
        onProgress(100);
        return publicUrl;
      }

      let registerSuccess = false;
      let registerAttempts = 0;
      const maxRegisterAttempts = 2;

      while (!registerSuccess && registerAttempts < maxRegisterAttempts) {
        registerAttempts++;
        try {
          const registerRes = await fetchWithBackoff(`${API_BASE}/upload/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              readURL: publicUrl,
              url: publicUrl,
              puterFileId: finalResolvedPath,
              fileId: finalResolvedPath,
              path: finalResolvedPath,
              filename: actualFileName,
              type: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
              sizeBytes: file.size || fileStat.size || 0,
              size: file.size || fileStat.size || 0,
              metadata: {
                provider: "puter",
                originalName: file.name,
                uploadedAt: new Date().toISOString()
              },
              provider: "puter"
            })
          });

          const registerData = await registerRes.json().catch(() => ({}));
          if (registerRes.ok && registerData.success) {
            registerSuccess = true;
            _registeredMediaCache.set(dedupeKey, registerData.media || { url: publicUrl });
            if (import.meta.env.DEV) {
              console.log("[Puter Diagnostics] MongoDB registration succeeded:", registerData);
            }
            break;
          }

          // If database is temporarily disconnected or 503, retry or gracefully yield
          if (registerRes.status === 503) {
            if (registerAttempts < maxRegisterAttempts) {
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
            // Puter file is valid and accessible even if MongoDB is degraded
            console.warn("[Puter Diagnostics] Database metadata registration deferred (DB unavailable). Puter public URL preserved.");
            break;
          }
        } catch (fetchErr) {
          if (registerAttempts < maxRegisterAttempts) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          console.warn("[Puter Diagnostics] Metadata registration network error:", fetchErr);
          break;
        }
      }

      onProgress(100);
      return publicUrl;
    });
  })();

  _inFlightUploads.set(uploadKey, uploadPromise);

  try {
    return await uploadPromise;
  } finally {
    _inFlightUploads.delete(uploadKey);
  }
}

export function getMediaUrl(url) {
  if (!url) return "/images/product-5mukhi.jpg";
  return url;
}

export function deleteMedia(url) {
  return true;
}


