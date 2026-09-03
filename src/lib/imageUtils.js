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

/**
 * Resolves or creates a Puter hosted domain for permanent public media access
 */
export async function getPuterHostedDomain() {
  const puter = await waitForPuter(3000);
  if (!puter || !puter.hosting) return null;

  let cachedSubdomain = localStorage.getItem("aura_puter_subdomain");
  if (cachedSubdomain) {
    return `${cachedSubdomain}.puter.site`;
  }

  try {
    const sites = await puter.hosting.list();
    let site = Array.isArray(sites)
      ? sites.find(s => s.dir_path === "aura_uploads" || s.root_dir?.endsWith("aura_uploads") || (s.subdomain && s.subdomain.startsWith("aura-media-")))
      : null;

    if (!site) {
      const sub = `aura-media-${Math.random().toString(36).substring(2, 8)}`;
      if (typeof puter.fs?.mkdir === "function") {
        await puter.fs.mkdir("aura_uploads", { createMissingParents: true }).catch(() => {});
      }
      site = await puter.hosting.create(sub, "aura_uploads");
    }

    if (site && (site.subdomain || site.subdomain_name)) {
      const subName = site.subdomain || site.subdomain_name;
      localStorage.setItem("aura_puter_subdomain", subName);
      return `${subName}.puter.site`;
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[Puter Diagnostics] Hosting site resolution note:", err);
    }
  }
  return null;
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

      // Pre-create upload directory in background
      try {
        if (typeof puter.fs?.mkdir === "function") {
          puter.fs.mkdir("aura_uploads", { createMissingParents: true }).catch(() => {});
        }
      } catch (_) {}

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
 * Uploads media file (image or video) directly to Puter Cloud Storage
 * Verifies file presence & registers metadata in MongoDB
 */
export async function uploadMedia(file, onProgress = () => {}) {
  if (!file) return null;

  // If already a valid HTTP(S) or static URL string, return directly
  if (typeof file === "string") {
    if (file.startsWith("http://") || file.startsWith("https://") || file.startsWith("/images/")) {
      return file;
    }
  }

  // 1. Verify Puter connection & authentication
  const status = await getPuterMediaStatus();
  if (!status.connected) {
    throw new Error("Puter Cloud not connected. Please connect Puter in Admin Panel before uploading media.");
  }

  const isVideo = file.type?.startsWith("video/") || file.name?.endsWith(".mp4") || file.name?.endsWith(".webm");
  const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

  if (file.size && file.size > maxBytes) {
    throw new Error(`File size exceeds ${isVideo ? '50MB' : '10MB'} limit.`);
  }

  const allowedTypes = [
    "image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif", "image/svg+xml",
    "video/mp4", "video/webm", "video/ogg"
  ];
  if (file.type && !allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF, SVG, MP4, WebM.");
  }

  onProgress(15);
  const puter = window.puter;

  const cleanName = (file.name || "media.jpg").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const fileName = `aura_${Date.now()}_${cleanName}`;
  const dirPath = "aura_uploads";
  const filePath = `${dirPath}/${fileName}`;

  if (import.meta.env.DEV) {
    console.log("[Puter Diagnostics] Uploading file to Puter:", fileName, "Size:", file.size);
  }

  // 2. Upload file directly to Puter Cloud File System
  let uploadedItem = null;
  try {
    if (typeof puter.fs?.upload === "function") {
      uploadedItem = await puter.fs.upload([file], dirPath, {
        createMissingParents: true,
        dedupeName: false,
        progress: (opId, p) => {
          const pct = Math.min(70, Math.max(20, Math.round(20 + (p || 0) * 0.5)));
          onProgress(pct);
        }
      });
      if (Array.isArray(uploadedItem)) {
        uploadedItem = uploadedItem[0];
      }
    } else {
      await puter.fs.write(filePath, file, { createMissingParents: true });
    }
  } catch (uploadErr) {
    if (import.meta.env.DEV) {
      console.warn("[Puter Diagnostics] upload method retry with write:", uploadErr);
    }
    await puter.fs.write(filePath, file, { createMissingParents: true });
  }

  onProgress(75);

  // 3. Verify file exists on Puter Cloud
  const fileStat = await puter.fs.stat(uploadedItem?.path || filePath).catch(() => null);
  if (!fileStat) {
    throw new Error("File upload verification failed. File not found on Puter Cloud Storage.");
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
  const actualFileName = fileStat.name || fileName;

  if (hostedDomain) {
    publicUrl = `https://${hostedDomain}/${encodeURIComponent(actualFileName)}`;
  } else if (typeof puter.fs.getReadURL === "function") {
    publicUrl = await puter.fs.getReadURL(fileStat.path || filePath);
  }

  if (!publicUrl) {
    throw new Error("Could not resolve production public URL from Puter Cloud.");
  }

  if (import.meta.env.DEV) {
    console.log("[Puter Diagnostics] Resolved public URL:", publicUrl);
  }

  onProgress(90);

  // 5. Register media metadata in MongoDB
  const registerRes = await fetch(`${API_BASE}/upload/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      readURL: publicUrl,
      url: publicUrl,
      puterFileId: fileStat.path || filePath,
      fileId: fileStat.path || filePath,
      path: fileStat.path || filePath,
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
  if (!registerRes.ok || !registerData.success) {
    throw new Error(registerData.message || "Puter upload succeeded but registering media metadata in MongoDB failed.");
  }

  if (import.meta.env.DEV) {
    console.log("[Puter Diagnostics] MongoDB registration succeeded:", registerData);
  }

  onProgress(100);
  return publicUrl;
}

export function getMediaUrl(url) {
  if (!url) return "/images/product-5mukhi.jpg";
  return url;
}

export function deleteMedia(url) {
  return true;
}


