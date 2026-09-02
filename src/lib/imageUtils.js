/**
 * AURA RUDRAKSHA — MEDIA & PUTER STORAGE ADAPTER
 * 
 * Production media handling for Images, Videos, Banners & Products via Puter Cloud.
 * Direct uploads to Puter Cloud with permanent public delivery hosted on Puter.
 * No fallback to local disk/Vercel ephemeral filesystem (/public/uploads).
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
        console.warn("Canvas compression failed, returning original image source", e);
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
 * Resolves or creates a Puter hosted domain for public media access
 */
export async function getPuterHostedDomain() {
  if (typeof window === "undefined" || !window.puter?.hosting) return null;

  let cachedSubdomain = localStorage.getItem("aura_puter_subdomain");
  if (cachedSubdomain) {
    return `${cachedSubdomain}.puter.site`;
  }

  try {
    const sites = await window.puter.hosting.list();
    let site = Array.isArray(sites) ? sites.find(s => s.dir_path === "aura_uploads" || s.root_dir?.endsWith("aura_uploads")) : null;
    if (!site) {
      const sub = `aura-media-${Math.random().toString(36).substring(2, 8)}`;
      site = await window.puter.hosting.create(sub, "aura_uploads");
    }
    if (site && (site.subdomain || site.subdomain_name)) {
      const subName = site.subdomain || site.subdomain_name;
      localStorage.setItem("aura_puter_subdomain", subName);
      return `${subName}.puter.site`;
    }
  } catch (err) {
    console.warn("Puter hosting initialization note:", err);
  }
  return null;
}

/**
 * Real Puter Media Status & Functional Storage Check
 * Verifies SDK loaded + authenticated + test write operation
 */
export async function getPuterMediaStatus() {
  if (typeof window === "undefined") {
    return {
      connected: false,
      status: "Not Connected",
      provider: "Puter Cloud Storage",
      message: "Server-side execution environment."
    };
  }

  const puter = window.puter;
  if (!puter) {
    return {
      connected: false,
      status: "Not Connected",
      provider: "Puter Cloud Storage",
      message: "Puter JS SDK not detected in browser. Please reload page or check network connection."
    };
  }

  try {
    const isSignedIn = typeof puter.auth?.isSignedIn === "function" ? puter.auth.isSignedIn() : false;
    if (!isSignedIn) {
      return {
        connected: false,
        status: "Not Connected",
        provider: "Puter Cloud Storage",
        message: "Puter Cloud SDK active, but Admin authentication is required. Click 'Connect Puter Cloud Storage' to log in."
      };
    }

    // Verify storage write and read capability with a test operation
    const testFileName = `.health_test_${Date.now()}`;
    const testPath = `aura_uploads/${testFileName}`;
    await puter.fs.write(testPath, "health_ok");
    const testStat = await puter.fs.stat(testPath);
    if (!testStat) {
      throw new Error("Storage write verification failed (file stat not found).");
    }
    // Cleanup test file
    if (typeof puter.fs.delete === "function") {
      await puter.fs.delete(testPath).catch(() => {});
    }

    return {
      connected: true,
      status: "Connected",
      provider: "Puter Cloud Storage",
      message: "Puter Cloud Storage connected, authenticated & verified. Product media stored safely in Puter Cloud."
    };
  } catch (err) {
    return {
      connected: false,
      status: "Not Connected",
      provider: "Puter Cloud Storage",
      message: `Puter Cloud connection error: ${err.message || err}`
    };
  }
}

/**
 * Sign in to Puter Cloud
 */
export async function signInToPuter() {
  if (typeof window !== "undefined" && window.puter?.auth?.signIn) {
    return await window.puter.auth.signIn();
  }
  throw new Error("Puter JS SDK is not loaded or available.");
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
    "image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif",
    "video/mp4", "video/webm", "video/ogg"
  ];
  if (file.type && !allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF, MP4, WebM.");
  }

  onProgress(15);

  const cleanName = (file.name || "media.jpg").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const fileName = `aura_${Date.now()}_${cleanName}`;
  const fileId = `aura_uploads/${fileName}`;

  // 2. Upload file directly to Puter Cloud File System
  await window.puter.fs.write(fileId, file);
  onProgress(50);

  // 3. Verify file exists on Puter Cloud
  const fileStat = await window.puter.fs.stat(fileId);
  if (!fileStat) {
    throw new Error("File upload verification failed. File not found on Puter Cloud Storage.");
  }
  onProgress(70);

  // 4. Resolve production-safe public media reference
  let publicUrl = "";
  const hostedDomain = await getPuterHostedDomain();
  if (hostedDomain) {
    publicUrl = `https://${hostedDomain}/${fileName}`;
  } else if (typeof window.puter.fs.getReadURL === "function") {
    publicUrl = await window.puter.fs.getReadURL(fileId);
  }

  if (!publicUrl) {
    throw new Error("Could not resolve production public URL from Puter Cloud.");
  }
  onProgress(85);

  // 5. Register media metadata in MongoDB
  const registerRes = await fetch(`${API_BASE}/upload/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: publicUrl,
      fileId,
      type: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
      size: file.size || fileStat.size || 0,
      provider: "puter"
    })
  });

  const registerData = await registerRes.json().catch(() => ({}));
  if (!registerRes.ok || !registerData.success) {
    throw new Error(registerData.message || "Puter upload succeeded but registering media metadata in MongoDB failed.");
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

