/**
 * Helper to download all images for a product and copy the product title to clipboard
 */
import { getProductGalleryImages } from "./imageUtils";
import { emitToast } from "../context/ToastContext";

/**
 * Sanitize filename
 */
function sanitizeFileName(name) {
  return String(name || "product")
    .trim()
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
}

/**
 * Extract clean file extension from URL or mime type
 */
function getExtensionFromUrl(url) {
  if (!url || typeof url !== "string") return "jpg";
  try {
    const cleanUrl = url.split("?")[0].split("#")[0];
    const match = cleanUrl.match(/\.([a-zA-Z0-9]{3,4})$/);
    if (match && match[1]) {
      const ext = match[1].toLowerCase();
      if (["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"].includes(ext)) {
        return ext === "jpeg" ? "jpg" : ext;
      }
    }
  } catch (_) {}
  return "jpg";
}

/**
 * Downloads a single image via blob or fallback direct anchor
 */
async function downloadSingleImage(url, filename) {
  try {
    // Attempt fetch to create blob (bypasses browser display redirect for cross-origin if allowed)
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      return true;
    }
  } catch (_) {
    // Fallback: If CORS blocks fetch or canvas, attempt canvas redraw if possible, or trigger download anchor
  }

  // Fallback: try loading through Image object and Canvas to get blob
  try {
    const blobFromCanvas = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Canvas blob failed"));
          }, "image/jpeg", 0.95);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = url;
    });

    if (blobFromCanvas) {
      const blobUrl = URL.createObjectURL(blobFromCanvas);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      return true;
    }
  } catch (_) {}

  // Last-resort fallback: direct anchor link with download attribute or open in new tab
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch (err) {
    console.warn("Direct download fallback failed:", err);
    return false;
  }
}

/**
 * Copies product title to clipboard automatically
 */
export async function copyProductTitleToClipboard(title) {
  if (!title) return false;
  const cleanTitle = String(title).trim();
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(cleanTitle);
      return true;
    }
  } catch (_) {}

  // Fallback using textarea
  try {
    const textarea = document.createElement("textarea");
    textarea.value = cleanTitle;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand("copy");
    textarea.remove();
    return successful;
  } catch (_) {
    return false;
  }
}

/**
 * Main action: Download all images for a product and copy title to clipboard
 * @param {Object} product
 * @param {Function} onProgress Optional progress callback (current, total)
 */
export async function downloadAllProductImages(product, onProgress) {
  if (!product) {
    emitToast("No product selected", "error");
    return;
  }

  const title = product.name || "Product";
  
  // 1. Copy title to clipboard immediately
  const titleCopied = await copyProductTitleToClipboard(title);
  
  // 2. Collect all images (gallery + primary + indonesian variants if any)
  const images = [];
  const gallery = getProductGalleryImages(product) || [];
  gallery.forEach(img => {
    if (img && typeof img === "string" && img !== "/images/placeholder.svg" && !images.includes(img)) {
      images.push(img);
    }
  });

  // Check additional Indonesian variant images
  if (Array.isArray(product.indonesianImages)) {
    product.indonesianImages.forEach(img => {
      if (img && typeof img === "string" && img !== "/images/placeholder.svg" && !images.includes(img)) {
        images.push(img);
      }
    });
  }

  if (images.length === 0) {
    if (titleCopied) {
      emitToast(`📋 Title copied: "${title}" (No images found)`, "info");
    } else {
      emitToast("No downloadable images found for this product", "error");
    }
    return;
  }

  const baseName = sanitizeFileName(title);

  // 3. Download each image sequentially with a small delay so browser doesn't block multiple downloads
  let downloadedCount = 0;
  for (let i = 0; i < images.length; i++) {
    const imgUrl = images[i];
    const ext = getExtensionFromUrl(imgUrl);
    const fileName = images.length === 1 
      ? `${baseName}.${ext}` 
      : `${baseName}_img_${i + 1}.${ext}`;

    if (onProgress) {
      onProgress(i + 1, images.length);
    }

    const success = await downloadSingleImage(imgUrl, fileName);
    if (success) {
      downloadedCount++;
    }

    // Small delay between downloads to prevent popup blocker / tab spam
    if (i < images.length - 1) {
      await new Promise(r => setTimeout(r, 350));
    }
  }

  // 4. Toast notification confirming both image download & title copied
  if (titleCopied) {
    emitToast(`✅ ${downloadedCount} image${downloadedCount !== 1 ? 's' : ''} downloaded & Title copied to clipboard!`, "success");
  } else {
    emitToast(`✅ ${downloadedCount} image${downloadedCount !== 1 ? 's' : ''} downloaded!`, "success");
  }
}
