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
 * Upload single media file (Puter or DataURL fallback)
 */
export async function uploadMedia(file, onProgress) {
  if (!file) return null;

  if (onProgress) onProgress(10, "Compressing image...");
  const compressed = await compressImage(file);

  if (onProgress) onProgress(40, "Uploading media...");

  // Try Puter JS cloud storage if available
  if (typeof window !== "undefined" && window.puter && window.puter.fs) {
    try {
      const ext = file.name ? file.name.split(".").pop() : "jpg";
      const fileName = `aura_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const pubFile = await window.puter.fs.write(`public/${fileName}`, compressed);
      if (pubFile && pubFile.url) {
        if (onProgress) onProgress(100, "Upload complete");
        return pubFile.url;
      }
    } catch (e) {
      console.warn("Puter upload fallback to DataURL:", e);
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
export async function uploadMediaBatch(files, onProgress) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(Math.round(((i + 0.1) / total) * 100), `Uploading file ${i + 1} of ${total}...`);
    }
    const url = await uploadMedia(file);
    if (url) results.push(url);
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

let activeProvider = "puter";

export function getActiveStorageProvider() {
  return activeProvider;
}

export function setActiveStorageProvider(provider) {
  activeProvider = provider;
  return activeProvider;
}

export function getPcloudMediaStatus() {
  return { connected: false };
}

export function getImagekitMediaStatus() {
  return { connected: false };
}
