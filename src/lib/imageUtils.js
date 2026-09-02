/**
 * AURA RUDRAKSHA — MEDIA & PUTER STORAGE ADAPTER
 * 
 * Provides production media handling for Images, Videos, Banners & Products.
 * 1. Checks Puter Web API (window.puter) for cloud storage.
 * 2. Falls back to Server Upload API (/api/upload) returning static URLs (/uploads/...).
 * 3. Never stores large Base64 strings in MongoDB or LocalStorage.
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
 * Real Puter Media Audit & Status Check
 */
export function getPuterMediaStatus() {
  if (typeof window === "undefined") {
    return {
      connected: false,
      status: "Not Configured",
      provider: "Server Storage",
      message: "Server-side environment"
    };
  }

  const puter = window.puter;
  if (!puter) {
    return {
      connected: false,
      status: "Not Configured",
      provider: "Server Storage",
      message: "Puter JS SDK not detected in environment. Using Server Storage pipeline (/api/upload). Local disk writes on Vercel are ephemeral; connect Puter Cloud Storage for fully persistent production hosting."
    };
  }

  try {
    const isSignedIn = typeof puter.auth?.isSignedIn === "function" ? puter.auth.isSignedIn() : false;
    if (isSignedIn) {
      return {
        connected: true,
        status: "Connected",
        provider: "Puter Cloud Storage",
        message: "Puter Cloud SDK active & authenticated. Media files stored in Puter Cloud."
      };
    } else {
      return {
        connected: false,
        status: "Not Configured",
        provider: "Server Storage (Puter Loaded)",
        message: "Puter SDK loaded, but Puter authentication is required. Using Server Storage (/api/upload) until authenticated."
      };
    }
  } catch (err) {
    return {
      connected: false,
      status: "Error",
      provider: "Server Storage",
      message: `Puter check error: ${err.message || err}`
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
 * Uploads media file (image or video) and returns permanent URL
 */
export async function uploadMedia(file, onProgress = () => {}) {
  if (!file) return null;

  // If already a URL string, return directly
  if (typeof file === "string") {
    if (file.startsWith("http://") || file.startsWith("https://") || file.startsWith("/images/") || file.startsWith("/uploads/")) {
      return file;
    }
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
    throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM.");
  }

  onProgress(10);

  // 1. Try Puter SDK if active & authenticated
  if (typeof window !== "undefined" && window.puter?.fs && window.puter?.auth?.isSignedIn?.()) {
    try {
      const fileName = `aura_${Date.now()}_${file.name || 'media.jpg'}`;
      const writeResult = await window.puter.fs.write(`aura_uploads/${fileName}`, file);
      onProgress(70);
      let url = "";
      if (typeof window.puter.fs.getReadURL === "function") {
        url = await window.puter.fs.getReadURL(`aura_uploads/${fileName}`);
      } else if (writeResult?.url) {
        url = writeResult.url;
      }
      if (url) {
        onProgress(85);
        // Register URL + metadata in MongoDB
        const registerRes = await fetch(`${API_BASE}/upload/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            fileId: `aura_uploads/${fileName}`,
            type: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
            size: file.size || 0,
            provider: "puter"
          })
        });

        if (!registerRes.ok) {
          console.warn("Puter upload succeeded but metadata registration in MongoDB failed.");
        }

        onProgress(100);
        return url;
      }
    } catch (err) {
      console.warn("Puter upload notice, falling back to server upload:", err.message || err);
    }
  }

  // 2. High-performance Server Upload Fallback (/api/upload)
  try {
    let payloadStr = "";
    if (file instanceof File || file instanceof Blob) {
      // Pre-compress large images if image type
      if (!isVideo && file.size > 500 * 1024) {
        payloadStr = await compressImage(file, 1200, 1200, 0.82);
      } else {
        payloadStr = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
    } else if (typeof file === "string") {
      payloadStr = file;
    }

    onProgress(50);

    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl: payloadStr,
        name: file.name || "media.jpg",
        type: file.type || "image/jpeg"
      })
    });

    onProgress(90);

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.url) {
      onProgress(100);
      return data.url;
    } else {
      throw new Error(data.message || "Failed to upload file to media server.");
    }
  } catch (err) {
    console.error("Media upload error:", err);
    throw new Error(err.message || "Failed to process media upload");
  }
}

export function getMediaUrl(url) {
  if (!url) return "/images/product-5mukhi.jpg";
  return url;
}

export function deleteMedia(url) {
  return true;
}
