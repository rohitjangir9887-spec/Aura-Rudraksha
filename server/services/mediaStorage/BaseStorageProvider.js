/**
 * Base Abstract Media Storage Provider
 * Defines standard contract for all media storage adapters (Telegram, Puter, etc.)
 */
export class BaseStorageProvider {
  constructor(name) {
    if (this.constructor === BaseStorageProvider) {
      throw new TypeError("Cannot instantiate abstract class BaseStorageProvider directly.");
    }
    this.name = name;
  }

  /**
   * Check if required environment variables / configs are present on server
   * @returns {boolean}
   */
  isConfigured() {
    throw new Error("Method 'isConfigured()' must be implemented.");
  }

  /**
   * Safe string mask for sensitive tokens in server logs
   * @param {string} token 
   * @returns {string}
   */
  maskSecret(token) {
    if (!token || typeof token !== "string") return "[NOT SET]";
    const clean = token.trim();
    if (clean.length <= 8) return "****";
    return `${clean.substring(0, 4)}...${clean.substring(clean.length - 4)}`;
  }

  /**
   * Verifies provider API contract/credentials with server without uploading fake files
   * @returns {Promise<{ verified: boolean, message: string, details?: object }>}
   */
  async verifyContract() {
    throw new Error("Method 'verifyContract()' must be implemented.");
  }

  /**
   * Uploads a media file buffer to storage
   * @param {Buffer} fileBuffer - Binary buffer of the media file
   * @param {Object} fileOptions - { filename, mimeType, size }
   * @returns {Promise<{ success: boolean, fileId: string, url: string, path: string, provider: string, metadata?: object }>}
   */
  async uploadMedia(fileBuffer, fileOptions = {}) {
    throw new Error("Method 'uploadMedia()' must be implemented.");
  }

  /**
   * Returns a retrievable media URL for a stored file identifier
   * @param {string} fileId 
   * @returns {Promise<string>}
   */
  async getMediaUrl(fileId) {
    throw new Error("Method 'getMediaUrl()' must be implemented.");
  }

  /**
   * Streams a media file to Express response without exposing secrets
   * @param {string} fileId 
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async streamMedia(fileId, res) {
    throw new Error("Method 'streamMedia()' must be implemented.");
  }
}
