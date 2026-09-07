/**
 * Image Utilities & Non-Blocking Media Cache Engine
 */

import { authClient } from "./authClient.js";

const imageCache = new Set();

/**
 * Preload a single high-priority image (e.g. primary LCP hero banner)
 */
export function preloadImage(url, priority = false) {
  if (typeof window === "undefined" || !url || typeof url !== "string") return;
  const cleanUrl = url.trim();
  if (!cleanUrl || imageCache.has(cleanUrl)) return;

  imageCache.add(cleanUrl);

  const load = () => {
    try {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = cleanUrl;
      if (priority) {
        link.fetchPriority = "high";
      }
      document.head.appendChild(link);
    } catch (_) {
      try {
        const img = new Image();
        img.src = cleanUrl;
      } catch (_) {}
    }
  };

  if (priority) {
    load();
  } else if ("requestIdleCallback" in window) {
    window.requestIdleCallback(load, { timeout: 3000 });
  } else {
    setTimeout(load, 1500);
  }
}

/**
 * Non-blocking image preloading — strictly limited to avoid network congestion
 */
export function preloadImages(urls = []) {
  // Intentionally do not eagerly preload bulk lists (e.g. 50+ product catalog items)
  // to preserve critical initial bandwidth on mobile and new devices.
  if (typeof window === "undefined" || !Array.isArray(urls) || urls.length === 0) return;
  
  // Only pre-warm the very first item (e.g. primary hero banner) if explicitly passed
  const first = urls[0];
  if (typeof first === "string") {
    preloadImage(first, false);
  } else if (first && typeof first === "object") {
    const u = first.img || first.image || (Array.isArray(first.images) ? first.images[0] : null);
    if (typeof u === "string") {
      preloadImage(u, false);
    }
  }
}

/**
 * Append CDN sizing parameters if using supported image delivery services (e.g. ImageKit)
 */
export function getOptimizedImageUrl(url, { width = 400, quality = 80 } = {}) {
  if (!url || typeof url !== "string") return "/images/product-5mukhi.jpg";
  const clean = url.trim();
  if (!clean.startsWith("http")) return clean;

  // If ImageKit URL, apply transformation parameters
  if (clean.includes("ik.imagekit.io")) {
    const separator = clean.includes("?") ? "&" : "?";
    return `${clean}${separator}tr=w-${width},q-${quality},f-auto`;
  }

  return clean;
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
  
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
      throw new Error("Only image and video files are permitted.");
  }

  const ext = file.name.split('.').pop().toLowerCase();
  const invalidExts = ['exe', 'sh', 'bat', 'cmd', 'msi', 'js', 'py', 'php'];
  if (invalidExts.includes(ext)) {
      throw new Error("Invalid file extension.");
  }


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
      if (onProgress) onProgress(40, "Fetching ImageKit credentials...");

      let authToken = "";
      try {
        authToken = await authClient.getToken();
      } catch (_) {}
      if (!authToken && typeof window !== "undefined") {
        authToken = localStorage.getItem("aura_admin_token") || localStorage.getItem("aura_token") || "";
      }

      const authRes = await fetch("/api/upload/imagekit/auth", {
        headers: {
          "Authorization": authToken ? `Bearer ${authToken}` : ""
        }
      });
      const authData = await authRes.json();

      if (!authData.success) {
        throw new Error(authData.message || "Failed to fetch ImageKit auth params");
      }

      if (onProgress) onProgress(60, "Uploading directly to ImageKit Storage...");

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("fileName", file.name || `aura_${Date.now()}.${compressed.type.split("/")[1] || "jpg"}`);
      formData.append("publicKey", authData.publicKey);
      formData.append("signature", authData.signature);
      formData.append("expire", authData.expire);
      formData.append("token", authData.token);
      formData.append("useUniqueFileName", "true");
      formData.append("folder", "/products"); // Can be customized later

      const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`ImageKit upload failed: ${errText}`);
      }

      const uploadData = await uploadRes.json();

      if (onProgress) onProgress(90, "Registering media in database...");

      // Register in MongoDB
      const registerRes = await fetch("/api/upload/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authToken ? `Bearer ${authToken}` : ""
        },
        body: JSON.stringify({
          url: uploadData.url,
          readURL: uploadData.url,
          fileId: uploadData.fileId,
          filename: uploadData.name,
          provider: "imagekit",
          sizeBytes: uploadData.size || compressed.size || file.size,
          type: compressed.type || file.type || "image/jpeg",
          thumbnailUrl: uploadData.thumbnailUrl || uploadData.url,
          mimeType: compressed.type || file.type || "image/jpeg",
          mediaType: (compressed.type || file.type || "image/jpeg").startsWith("video/") ? "video" : "image",
          width: uploadData.width,
          height: uploadData.height,
          folder: "/products"
        })
      });

      const registerData = await registerRes.json();

      if (onProgress) onProgress(100, "ImageKit upload complete");
      return uploadData.url;

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

/**
 * Standardize product primary image extraction.
 * Prefers product.images[0], gracefully falls back to product.img, product.image,
 * or a default placeholder.
 */
export const getProductPrimaryImage = (product) => {
  if (!product) return "/images/product-5mukhi.jpg";
  if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
    return product.images[0];
  }
  if (product.img && typeof product.img === "string") {
    return product.img;
  }
  if (product.image && typeof product.image === "string") {
    return product.image;
  }
  return "/images/product-5mukhi.jpg";
};

/**
 * Standardize product gallery images extraction.
 * Returns an array of images. Prefers product.images, falls back to product.img,
 * or returns an array with the default placeholder.
 */
export const getProductGalleryImages = (product) => {
  if (!product) return ["/images/product-5mukhi.jpg"];
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images;
  }
  if (product.img && typeof product.img === "string") {
    return [product.img];
  }
  if (product.image && typeof product.image === "string") {
    return [product.image];
  }
  return ["/images/product-5mukhi.jpg"];
};
