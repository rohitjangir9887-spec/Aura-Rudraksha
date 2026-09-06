/**
 * Image Pre-loader & Memory Cache Engine + Media Upload Utilities
 */

const imageCache = new Set();

export function preloadImage(url) {
  if (typeof window === "undefined" || !url || typeof url !== "string") return;
  const cleanUrl = url.trim();
  if (!cleanUrl || imageCache.has(cleanUrl)) return;

  imageCache.add(cleanUrl);
  try {
    const img = new Image();
    img.src = cleanUrl;
    if ("decode" in img) {
      img.decode().catch(() => {});
    }
  } catch (_) {}
}

export function preloadImages(urls = []) {
  if (typeof window === "undefined" || !Array.isArray(urls)) return;
  urls.forEach((u) => {
    if (typeof u === "string") {
      preloadImage(u);
    } else if (u && typeof u === "object") {
      if (u.img) preloadImage(u.img);
      if (u.image) preloadImage(u.image);
      if (Array.isArray(u.images)) u.images.forEach(preloadImage);
    }
  });
}

/**
 * Image compression helper
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    return file;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type || "image/jpeg",
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type || "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload single media file based on active storage provider (ImageKit / pCloud / Puter / Fallback)
 */
export async function uploadMedia(file, onProgress) {
  if (!file) return null;
  
  if (onProgress) onProgress(10, "Compressing image...");
  const compressed = await compressImage(file);

  if (onProgress) onProgress(30, "Determining active storage provider...");

  let provider = "puter";
  try {
    const pRes = await fetch("/api/upload/provider").then(r => r.json()).catch(() => ({}));
    if (pRes && pRes.provider) provider = pRes.provider;
  } catch (_) {}

  // ImageKit Upload
  if (provider === "imagekit") {
    try {
      if (onProgress) onProgress(50, "Uploading to ImageKit Storage...");
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });

      let token = "";
      try {
        const { authClient } = await import("./authClient.js");
        token = await authClient.getToken();
      } catch (_) {}
      if (!token && typeof window !== "undefined") {
        token = localStorage.getItem("aura_admin_token") || localStorage.getItem("aura_token") || "";
      }

      const res = await fetch("/api/upload/imagekit/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          fileData: base64Data,
          filename: file.name || `aura_${Date.now()}.jpg`,
          type: file.type || "image/jpeg",
          sizeBytes: compressed.size || file.size
        })
      });

      const data = await res.json();
      if (data.success && (data.url || data.readURL)) {
        if (onProgress) onProgress(100, "ImageKit upload complete");
        return data.url || data.readURL;
      }
    } catch (ikErr) {
      console.warn("ImageKit upload error, falling back:", ikErr);
    }
  }

  // pCloud Upload
  if (provider === "pcloud") {
    try {
      if (onProgress) onProgress(50, "Uploading to pCloud Storage...");
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });

      let token = "";
      try {
        const { authClient } = await import("./authClient.js");
        token = await authClient.getToken();
      } catch (_) {}
      if (!token && typeof window !== "undefined") {
        token = localStorage.getItem("aura_admin_token") || localStorage.getItem("aura_token") || "";
      }

      const res = await fetch("/api/upload/pcloud/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          fileData: base64Data,
          filename: file.name || `aura_${Date.now()}.jpg`,
          type: file.type || "image/jpeg",
          sizeBytes: compressed.size || file.size
        })
      });

      const data = await res.json();
      if (data.success && (data.url || data.readURL)) {
        if (onProgress) onProgress(100, "pCloud upload complete");
        return data.url || data.readURL;
      }
    } catch (pcErr) {
      console.warn("pCloud upload error, falling back:", pcErr);
    }
  }

  // Try Puter JS cloud storage
  if (typeof window !== "undefined" && !window.puter) {
    if (!window.__puterLoaderPromise) {
      window.__puterLoaderPromise = new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://js.puter.com/v2/";
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
      });
    }
    await window.__puterLoaderPromise;
  }

  if (typeof window !== "undefined" && window.puter && window.puter.fs) {
    try {
      if (onProgress) onProgress(70, "Uploading to Puter Cloud...");
      const ext = file.name ? file.name.split(".").pop() : "jpg";
      const fileName = `aura_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const pubFile = await window.puter.fs.write(`public/${fileName}`, compressed);
      if (pubFile && pubFile.url) {
        // Register in MongoDB
        try {
          fetch("/api/upload/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: pubFile.url,
              readURL: pubFile.url,
              filename: fileName,
              provider: "puter",
              sizeBytes: compressed.size || file.size
            })
          }).catch(() => {});
        } catch (_) {}

        if (onProgress) onProgress(100, "Upload complete");
        return pubFile.url;
      }
    } catch (e) {
      console.warn("Puter upload fallback:", e);
    }
  }

  // Fallback to Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (onProgress) onProgress(100, "Complete");
      resolve(reader.result);
    };
    reader.readAsDataURL(compressed);
  });
}

/**
 * Upload batch media files
 */
export async function uploadMediaBatch(files, onProgress, onChunkSuccess) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(Math.round(((i + 0.1) / total) * 100), `Uploading file ${i + 1} of ${total}...`);
    }
    try {
      const url = await uploadMedia(file);
      if (url) {
        const itemResult = { success: true, url, filename: file.name, originalName: file.name };
        results.push(itemResult);
        if (typeof onChunkSuccess === "function") {
          onChunkSuccess([url]);
        }
      } else {
        results.push({ success: false, error: "Upload returned empty URL", originalName: file.name });
      }
    } catch (err) {
      results.push({ success: false, error: err.message || "Failed to upload", originalName: file.name });
    }
  }

  if (onProgress) onProgress(100, "All uploads complete");
  return results;
}

export function getPuterMediaStatus() {
  return { connected: true, user: "Aura Cloud Storage" };
}

export async function signInToPuter() {
  return true;
}

export async function signOutPuter() {
  return true;
}

export function subscribePuterStatus(cb) {
  if (typeof cb === "function") cb({ connected: true });
  return () => {};
}

let activeProviderCache = "puter";

export async function getActiveStorageProvider() {
  try {
    const res = await fetch("/api/upload/provider").then(r => r.json()).catch(() => ({}));
    if (res && res.provider) {
      activeProviderCache = res.provider;
    }
  } catch (_) {}
  return activeProviderCache;
}

export function setActiveStorageProvider(provider) {
  activeProviderCache = provider;
  return activeProviderCache;
}

export async function getPcloudMediaStatus() {
  try {
    const res = await fetch("/api/upload/pcloud/status").then(r => r.json()).catch(() => ({}));
    if (res && typeof res.connected === "boolean") {
      return res;
    }
  } catch (_) {}
  return { connected: false, status: "Not Connected", message: "pCloud not configured." };
}

export async function getImagekitMediaStatus() {
  try {
    const res = await fetch("/api/upload/imagekit/status").then(r => r.json()).catch(() => ({}));
    if (res && typeof res.connected === "boolean") {
      return res;
    }
  } catch (_) {}
  return { connected: false, status: "Not Configured", message: "ImageKit credentials not configured." };
}
