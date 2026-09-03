import { BaseStorageProvider } from "./BaseStorageProvider.js";

/**
 * Puter Storage Provider (Legacy / Fallback Provider)
 * Isolated standard wrapper for Puter Cloud storage interactions.
 */
export class PuterStorageProvider extends BaseStorageProvider {
  constructor() {
    super("puter");
  }

  isConfigured() {
    return true; // Puter handles client/direct uploads
  }

  async verifyContract() {
    return {
      verified: true,
      message: "Puter Cloud Storage provider ready as fallback.",
      details: { provider: "puter", mode: "direct/fallback" }
    };
  }

  async uploadMedia(fileBuffer, fileOptions = {}) {
    const filename = fileOptions.filename || `media_${Date.now()}.jpg`;
    return {
      success: true,
      fileId: `aura_uploads/${filename}`,
      url: fileOptions.url || `/images/${filename}`,
      path: `aura_uploads/${filename}`,
      provider: "puter",
      size: fileBuffer ? fileBuffer.length : 0,
      type: fileOptions.mimeType || "image/jpeg",
      metadata: { originalFilename: filename, provider: "puter" }
    };
  }

  async getMediaUrl(fileId) {
    return fileId.startsWith("http") ? fileId : `/images/${fileId}`;
  }

  async streamMedia(fileId, res) {
    return res.status(400).json({
      success: false,
      message: "Puter media streaming is handled directly on client or via Puter URLs."
    });
  }
}
