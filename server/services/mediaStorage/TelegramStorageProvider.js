import { BaseStorageProvider } from "./BaseStorageProvider.js";

/**
 * Telegram / TGStorage Media Storage Provider
 * Uses server-side TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID.
 * Never exposes bot tokens to client browsers; streams files via server proxy route.
 */
export class TelegramStorageProvider extends BaseStorageProvider {
  constructor() {
    super("telegram");
  }

  /**
   * Reads tokens exclusively on server side from process.env
   */
  get botToken() {
    return (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  }

  get channelId() {
    return (process.env.TELEGRAM_CHANNEL_ID || "").trim();
  }

  isConfigured() {
    return Boolean(this.botToken && this.channelId);
  }

  /**
   * Safe logger that never exposes raw bot tokens or secrets
   */
  log(level, message, meta = {}) {
    const maskedToken = this.maskSecret(this.botToken);
    const maskedChannel = this.channelId ? String(this.channelId) : "[NOT SET]";
    const logPrefix = `[TGStorage Provider | Bot: ${maskedToken} | Channel: ${maskedChannel}]`;

    if (level === "error") {
      console.error(`${logPrefix} ${message}`, meta);
    } else if (level === "warn") {
      console.warn(`${logPrefix} ${message}`, meta);
    } else {
      console.log(`${logPrefix} ${message}`);
    }
  }

  /**
   * Verifies the Telegram Bot API contract by calling getMe & getChat.
   * Ensures bot token is valid and channel is accessible without uploading any data.
   */
  async verifyContract() {
    if (!this.isConfigured()) {
      return {
        verified: false,
        message: "Telegram storage is not configured. Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID in server environment variables.",
        details: {
          hasToken: Boolean(this.botToken),
          hasChannelId: Boolean(this.channelId)
        }
      };
    }

    try {
      this.log("info", "Verifying Telegram Bot API contract via getMe...");

      // 1. Check Bot Auth
      const meUrl = `https://api.telegram.org/bot${this.botToken}/getMe`;
      const meRes = await fetch(meUrl);
      const meData = await meRes.json().catch(() => ({}));

      if (!meRes.ok || !meData.ok) {
        this.log("warn", "getMe failed verification", { status: meRes.status, description: meData.description });
        return {
          verified: false,
          message: `Telegram Bot verification failed: ${meData.description || "Invalid bot token or unauthorized"}`,
          details: { status: meRes.status }
        };
      }

      const botUsername = meData.result?.username || meData.result?.first_name || "Bot";
      this.log("info", `Bot verified: @${botUsername}. Verifying target channel ${this.channelId}...`);

      // 2. Check Channel Access
      const chatUrl = `https://api.telegram.org/bot${this.botToken}/getChat?chat_id=${encodeURIComponent(this.channelId)}`;
      const chatRes = await fetch(chatUrl);
      const chatData = await chatRes.json().catch(() => ({}));

      if (!chatRes.ok || !chatData.ok) {
        this.log("warn", "getChat failed verification for channel", { status: chatRes.status, description: chatData.description });
        return {
          verified: false,
          message: `Telegram Channel verification failed: ${chatData.description || "Bot cannot access target channel. Ensure bot is an Admin in the channel."}`,
          details: { botUsername, channelId: this.channelId, error: chatData.description }
        };
      }

      const channelTitle = chatData.result?.title || this.channelId;
      this.log("info", `API contract fully verified! Connected to channel "${channelTitle}"`);

      return {
        verified: true,
        message: `Telegram TGstorage contract verified. Connected as @${botUsername} to channel "${channelTitle}".`,
        details: {
          botUsername,
          botId: meData.result?.id,
          channelTitle,
          channelType: chatData.result?.type
        }
      };
    } catch (err) {
      this.log("error", "Exception during Telegram API contract verification", { error: err.message });
      return {
        verified: false,
        message: `Telegram connection error: ${err.message}`,
        details: { error: err.message }
      };
    }
  }

  /**
   * Uploads media buffer to Telegram channel via sendDocument, sendPhoto or sendVideo
   * @param {Buffer} fileBuffer 
   * @param {Object} fileOptions - { filename, mimeType, size }
   */
  async uploadMedia(fileBuffer, fileOptions = {}) {
    if (!fileBuffer || !(fileBuffer instanceof Buffer || fileBuffer.length)) {
      throw new Error("[TGStorage] Invalid file buffer provided for upload.");
    }

    // 1. Verify Contract First before attempting any upload (Requirement 4)
    const verification = await this.verifyContract();
    if (!verification.verified) {
      throw new Error(`[TGStorage Contract Error] Cannot upload: ${verification.message}`);
    }

    const filename = fileOptions.filename || `media_${Date.now()}.jpg`;
    const mimeType = fileOptions.mimeType || "image/jpeg";
    const isVideo = mimeType.startsWith("video/");
    const isImage = mimeType.startsWith("image/");

    this.log("info", `Uploading media "${filename}" (${mimeType}, ${fileBuffer.length} bytes) to Telegram channel...`);

    const formData = new FormData();
    formData.append("chat_id", this.channelId);

    const blob = new Blob([fileBuffer], { type: mimeType });
    const endpointMethod = isVideo ? "sendVideo" : (isImage ? "sendPhoto" : "sendDocument");
    const fileParamName = isVideo ? "video" : (isImage ? "photo" : "document");

    formData.append(fileParamName, blob, filename);
    formData.append("caption", `Aura Rudraksha Media: ${filename}`);

    const uploadUrl = `https://api.telegram.org/bot${this.botToken}/${endpointMethod}`;

    try {
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        this.log("error", "Telegram upload failed", { status: res.status, description: data.description });
        throw new Error(`[TGStorage] Upload failed: ${data.description || "Telegram API rejected media payload"}`);
      }

      const msg = data.result || {};
      let telegramFileId = "";

      if (isImage && Array.isArray(msg.photo) && msg.photo.length > 0) {
        telegramFileId = msg.photo[msg.photo.length - 1].file_id;
      } else if (msg.video?.file_id) {
        telegramFileId = msg.video.file_id;
      } else if (msg.document?.file_id) {
        telegramFileId = msg.document.file_id;
      } else {
        throw new Error("[TGStorage] Telegram response did not contain a valid file_id.");
      }

      const messageId = msg.message_id;
      const pathRef = `tg://channel/${this.channelId}/${messageId}/${telegramFileId}`;

      // Stable retrievable server-proxied media URL (Never exposes Bot Token to browser)
      const publicUrl = `/api/upload/telegram/file/${telegramFileId}`;

      this.log("info", `Upload success! Assigned file_id: ${telegramFileId.substring(0, 12)}...`);

      return {
        success: true,
        fileId: telegramFileId,
        url: publicUrl,
        path: pathRef,
        provider: "telegram",
        size: fileBuffer.length,
        type: mimeType,
        metadata: {
          telegramMessageId: messageId,
          channelId: this.channelId,
          originalFilename: filename,
          uploadedAt: new Date().toISOString()
        }
      };
    } catch (err) {
      this.log("error", "Exception during Telegram media upload", { error: err.message });
      throw err;
    }
  }

  /**
   * Resolves direct Telegram file path from Telegram Bot API getFile
   * @param {string} fileId 
   */
  async getTelegramFilePath(fileId) {
    if (!this.botToken) throw new Error("Bot token missing");

    const getFileUrl = `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const res = await fetch(getFileUrl);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok || !data.result?.file_path) {
      throw new Error(`[TGStorage] Failed to resolve file_id "${fileId}": ${data.description || "File not found"}`);
    }

    return data.result.file_path;
  }

  /**
   * Returns a retrievable media reference URL
   * @param {string} fileId 
   */
  async getMediaUrl(fileId) {
    return `/api/upload/telegram/file/${fileId}`;
  }

  /**
   * Streams file content from Telegram to client without leaking Bot Token
   */
  async streamMedia(fileId, res) {
    if (!fileId) {
      return res.status(400).json({ success: false, error: "Missing fileId parameter" });
    }

    try {
      const filePath = await this.getTelegramFilePath(fileId);
      const downloadUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;

      const mediaRes = await fetch(downloadUrl);
      if (!mediaRes.ok) {
        return res.status(mediaRes.status).json({
          success: false,
          error: "Media Fetch Error",
          message: `Telegram storage server returned status ${mediaRes.status}`
        });
      }

      const contentType = mediaRes.headers.get("content-type") || "application/octet-stream";
      const contentLength = mediaRes.headers.get("content-length");

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      const arrayBuffer = await mediaRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      this.log("error", `Failed to stream media for fileId "${fileId}"`, { error: err.message });
      return res.status(404).json({
        success: false,
        error: "Media Not Found",
        message: err.message || "Requested media could not be retrieved from Telegram storage"
      });
    }
  }
}
