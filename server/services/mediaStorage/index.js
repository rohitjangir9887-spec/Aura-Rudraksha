import { TelegramStorageProvider } from "./TelegramStorageProvider.js";
import { PuterStorageProvider } from "./PuterStorageProvider.js";

class MediaStorageManager {
  constructor() {
    this.providers = new Map();
    this.registerProvider(new TelegramStorageProvider());
    this.registerProvider(new PuterStorageProvider());
  }

  /**
   * Register a storage provider instance
   */
  registerProvider(provider) {
    this.providers.set(provider.name, provider);
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name) {
    return this.providers.get(name) || null;
  }

  /**
   * Resolves active provider based on environment configuration and request preference.
   * Default primary provider is strictly Puter Cloud for production safety.
   * Telegram is ONLY selected if explicitly requested (requestedName === "telegram")
   * or MEDIA_STORAGE_PROVIDER=telegram is set in process.env.
   */
  async getActiveProvider(requestedName) {
    if (requestedName && this.providers.has(requestedName)) {
      const p = this.providers.get(requestedName);
      if (p.isConfigured()) return p;
    }

    const envDefault = (process.env.MEDIA_STORAGE_PROVIDER || "").trim().toLowerCase();
    if (envDefault && this.providers.has(envDefault)) {
      const p = this.providers.get(envDefault);
      if (p.isConfigured()) return p;
    }

    // Default primary provider is strictly Puter Cloud for production safety
    const puter = this.getProvider("puter");
    if (puter) return puter;

    throw new Error("No media storage provider available.");
  }

  /**
   * Overview status of all registered providers
   */
  async getStatus() {
    const statusResults = {};
    for (const [name, provider] of this.providers.entries()) {
      const isConf = provider.isConfigured();
      let contract = { verified: false, message: "Not configured" };

      if (isConf) {
        try {
          contract = await provider.verifyContract();
        } catch (e) {
          contract = { verified: false, message: e.message };
        }
      }

      statusResults[name] = {
        name,
        configured: isConf,
        verified: contract.verified,
        statusMessage: contract.message,
        details: contract.details || {}
      };
    }

    const activeProvider = (await this.getActiveProvider()).name;

    return {
      activeProvider,
      providers: statusResults,
      telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID)
    };
  }

  /**
   * Core abstraction method to upload media
   */
  async uploadMedia(fileBuffer, fileOptions = {}, providerName) {
    const provider = await this.getActiveProvider(providerName);
    if (!provider) {
      throw new Error("No media storage provider available.");
    }
    return await provider.uploadMedia(fileBuffer, fileOptions);
  }

  /**
   * Core abstraction method to stream media (e.g. Telegram proxy)
   */
  async streamMedia(fileId, res, providerName = "telegram") {
    const provider = this.getProvider(providerName) || await this.getActiveProvider();
    if (!provider || typeof provider.streamMedia !== "function") {
      return res.status(404).json({ success: false, error: "Provider streaming unavailable" });
    }
    return await provider.streamMedia(fileId, res);
  }
}

export const mediaStorageManager = new MediaStorageManager();
