import express from "express";
import { Media, initMediaIndexes } from "../models/Media.js";
import { Setting } from "../models/Setting.js";
import { isDbConnected } from "../config/db.js";
import { inMemoryStore } from "../data/inMemoryStore.js";
import { requireAdmin } from "../middleware/auth.js";
import { getPcloudStatus, uploadToPcloud, deleteFromPcloud, exchangePcloudCode, savePcloudToken, clearPcloudToken, getPcloudApiHost } from "../services/pcloudService.js";

const router = express.Router();

// Trigger background index check once DB is connected
initMediaIndexes().catch(() => {});

/**
 * GET /api/upload/provider
 * Returns currently active storage provider ("puter" | "pcloud") from MongoDB / Memory
 */
router.get("/provider", async (req, res) => {
  try {
    let activeProvider = "puter";
    if (isDbConnected()) {
      const settings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
      if (settings && settings.storageProvider) {
        activeProvider = settings.storageProvider;
      }
    } else if (inMemoryStore.settings && inMemoryStore.settings.storageProvider) {
      activeProvider = inMemoryStore.settings.storageProvider;
    }

    return res.json({
      success: true,
      provider: activeProvider === "pcloud" ? "pcloud" : "puter"
    });
  } catch (err) {
    return res.json({ success: true, provider: "puter" });
  }
});

/**
 * POST /api/upload/provider
 * Admin route to switch active storage provider ("puter" | "pcloud")
 * Persists value in MongoDB STORE_SETTINGS
 */
router.post("/provider", requireAdmin, async (req, res) => {
  try {
    const { provider } = req.body || {};
    const targetProvider = provider === "pcloud" ? "pcloud" : "puter";

    if (isDbConnected()) {
      await Setting.findOneAndUpdate(
        { id: "STORE_SETTINGS" },
        { $set: { storageProvider: targetProvider } },
        { upsert: true, returnDocument: "after" }
      );
    }
    if (inMemoryStore.settings) {
      inMemoryStore.settings.storageProvider = targetProvider;
    }

    console.log(`[Storage Provider] Active storage provider switched to: ${targetProvider}`);

    return res.json({
      success: true,
      provider: targetProvider,
      message: `Active storage provider switched to ${targetProvider === "pcloud" ? "pCloud Storage" : "Puter Cloud Storage"}. New uploads will use ${targetProvider === "pcloud" ? "pCloud" : "Puter"}. Existing media is preserved.`
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update storage provider"
    });
  }
});

/**
 * GET /api/upload/pcloud/connect
 * Starts pCloud OAuth authorization flow
 */
router.get("/pcloud/connect", async (req, res) => {
  try {
    const clientId = (process.env.PCLOUD_CLIENT_ID || "").trim();
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "pCloud Client ID (PCLOUD_CLIENT_ID) is missing on the server. Configure PCLOUD_CLIENT_ID or use manual Access Token input."
      });
    }

    const host = getPcloudApiHost();
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const reqHost = req.get("host");
    const redirectUri = `${protocol}://${reqHost}/api/upload/pcloud/callback`;
    const authUrl = `https://my.pcloud.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;

    if (req.query.redirect === "true") {
      return res.redirect(authUrl);
    }

    return res.json({
      success: true,
      authUrl,
      redirectUri
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/upload/pcloud/callback
 * Handles OAuth code exchange callback from pCloud
 */
router.get("/pcloud/callback", async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) {
      return res.send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #fffdfa;">
            <h2 style="color: #dc2626;">pCloud Connection Refused</h2>
            <p>${error}</p>
            <script>if (window.opener) { window.opener.postMessage({ type: 'pcloud:error', error: '${error}' }, '*'); setTimeout(() => window.close(), 2500); }</script>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send("Missing OAuth code parameter from pCloud redirect.");
    }

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const reqHost = req.get("host");
    const redirectUri = `${protocol}://${reqHost}/api/upload/pcloud/callback`;

    await exchangePcloudCode(code, redirectUri);

    return res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #f0fdf4;">
          <h2 style="color: #16a34a;">✅ pCloud Storage Connected!</h2>
          <p>You may close this window. Returning to Aura Admin...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'pcloud:connected' }, '*');
              setTimeout(() => window.close(), 1500);
            } else {
              setTimeout(() => { window.location.href = '/admin'; }, 1500);
            }
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send(`pCloud OAuth token exchange error: ${err.message}`);
  }
});

/**
 * POST /api/upload/pcloud/connect-token
 * Manually connect pCloud via an Access Token
 */
router.post("/pcloud/connect-token", requireAdmin, async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ success: false, message: "Valid pCloud Access Token is required." });
    }

    await savePcloudToken(token.trim());
    const status = await getPcloudStatus();

    if (status.connected) {
      return res.json({
        success: true,
        message: `pCloud Storage connected successfully as ${status.email}.`,
        status
      });
    }

    await clearPcloudToken();
    return res.status(400).json({
      success: false,
      message: status.message || "Failed to verify pCloud Access Token. Please check token permissions."
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/upload/pcloud/disconnect
 * Disconnect pCloud Storage
 */
router.post("/pcloud/disconnect", requireAdmin, async (req, res) => {
  try {
    await clearPcloudToken();
    return res.json({
      success: true,
      message: "pCloud Storage disconnected successfully. Existing media files remain untouched."
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/upload/pcloud/status
 * Returns pCloud account connection status, quota, and storage statistics
 */
router.get("/pcloud/status", async (req, res) => {
  try {
    const status = await getPcloudStatus();
    let mediaCount = 0;
    let totalSizeBytes = 0;

    if (isDbConnected()) {
      const pcloudMedia = await Media.find({ provider: "pcloud" }).lean();
      mediaCount = pcloudMedia.length;
      totalSizeBytes = pcloudMedia.reduce((sum, m) => sum + (Number(m.sizeBytes || m.size) || 0), 0);
    }

    return res.json({
      ...status,
      mediaCount,
      totalSizeBytes
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      connected: false,
      status: "Server Error",
      message: err.message || "Failed to check pCloud status"
    });
  }
});

/**
 * POST /api/upload/pcloud/upload
 * Server-side handler to upload media directly to pCloud without exposing secrets
 */
router.post("/pcloud/upload", async (req, res) => {
  try {
    const { fileData, filename, type, sizeBytes, metadata } = req.body || {};
    if (!fileData) {
      return res.status(400).json({
        success: false,
        message: "No file content provided for pCloud upload"
      });
    }

    let buffer;
    let mimeType = type || "image/jpeg";

    if (fileData.startsWith("data:")) {
      const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        buffer = Buffer.from(matches[2], "base64");
      } else {
        return res.status(400).json({ success: false, message: "Invalid base64 data URL format" });
      }
    } else {
      buffer = Buffer.from(fileData, "base64");
    }

    const cleanFilename = filename || `upload-${Date.now()}.${mimeType.split("/")[1] || "jpg"}`;

    const uploaded = await uploadToPcloud({
      buffer,
      filename: cleanFilename,
      mimeType
    });

    const finalReadURL = uploaded.url;
    const finalFileId = uploaded.fileId;
    const finalSize = Number(uploaded.sizeBytes || sizeBytes || buffer.length);

    let mediaRecord = null;
    if (isDbConnected()) {
      mediaRecord = new Media({
        readURL: finalReadURL,
        url: finalReadURL,
        fileId: finalFileId,
        puterFileId: finalFileId,
        path: `/pcloud/${finalFileId}`,
        filename: cleanFilename,
        type: mimeType,
        sizeBytes: finalSize,
        size: finalSize,
        metadata: metadata || {},
        provider: "pcloud"
      });
      await mediaRecord.save().catch((err) => {
        console.warn("[pCloud Upload] Media record save notice:", err?.message || err);
      });
    } else {
      mediaRecord = {
        readURL: finalReadURL,
        url: finalReadURL,
        fileId: finalFileId,
        filename: cleanFilename,
        type: mimeType,
        provider: "pcloud"
      };
    }

    return res.json({
      success: true,
      url: finalReadURL,
      readURL: finalReadURL,
      fileId: finalFileId,
      provider: "pcloud",
      media: mediaRecord,
      message: "File successfully uploaded to pCloud Storage and registered in MongoDB."
    });
  } catch (err) {
    console.error("pCloud Upload Endpoint Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "pCloud upload failed. Please check server authentication."
    });
  }
});

/**
 * DELETE /api/upload/media/:id
 * Delete media record from MongoDB and corresponding storage provider
 */
router.delete("/media/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isDbConnected()) {
      return res.json({ success: true, message: "Media deleted in fallback mode" });
    }

    const media = await Media.findOne({
      $or: [
        { _id: id },
        { fileId: id },
        { puterFileId: id },
        { readURL: id },
        { url: id }
      ]
    });

    if (!media) {
      return res.status(404).json({ success: false, message: "Media item not found" });
    }

    if (media.provider === "pcloud" && media.fileId) {
      await deleteFromPcloud(media.fileId).catch(() => {});
    }

    await Media.deleteOne({ _id: media._id });

    return res.json({
      success: true,
      message: `Media item deleted from MongoDB and ${media.provider === "pcloud" ? "pCloud" : "Puter"} storage.`
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete media item"
    });
  }
});

/**
 * GET /api/upload/stats
 * Returns real counts of media stored in MongoDB
 */
router.get("/stats", async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.json({
        success: true,
        serverStorage: "In-Memory / Fallback Mode",
        imagesCount: 0,
        videosCount: 0,
        totalCount: 0,
        totalSizeBytes: 0,
        lastUpload: null
      });
    }

    const totalMedia = await Media.find({}).sort({ createdAt: -1 }).lean();

    const images = totalMedia.filter(m => m.type && m.type.startsWith("image/"));
    const videos = totalMedia.filter(m => m.type && m.type.startsWith("video/"));
    const totalSizeBytes = totalMedia.reduce((sum, m) => sum + (Number(m.sizeBytes || m.size) || 0), 0);

    const lastUpload = totalMedia.length > 0 ? totalMedia[0] : null;

    return res.json({
      success: true,
      serverStorage: "Puter Cloud Direct (Production Ready)",
      imagesCount: images.length,
      videosCount: videos.length,
      totalCount: totalMedia.length,
      totalSizeBytes,
      lastUpload: lastUpload ? {
        url: lastUpload.readURL || lastUpload.url,
        readURL: lastUpload.readURL || lastUpload.url,
        provider: lastUpload.provider || "puter",
        createdAt: lastUpload.createdAt,
        type: lastUpload.type || "image/jpeg",
        sizeBytes: lastUpload.sizeBytes || lastUpload.size || 0
      } : null
    });
  } catch (err) {
    console.error("Failed to fetch media stats:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch media statistics"
    });
  }
});

/**
 * POST /api/upload/register
 * Registers metadata for a file uploaded directly to Puter Cloud.
 * Fully idempotent with duplicate race condition handling.
 */
router.post("/register", async (req, res) => {
  try {
    if (!isDbConnected()) {
      const finalReadURL = (req.body?.readURL || req.body?.url || "").trim();
      return res.json({
        success: true,
        source: "in_memory",
        message: "Media metadata registered in fallback mode",
        media: { readURL: finalReadURL, url: finalReadURL, filename: req.body?.filename || "media" },
        deduplicated: false
      });
    }

    const { url, readURL, puterFileId, fileId, path, filename, type, sizeBytes, size, metadata, provider } = req.body || {};

    const finalReadURL = (readURL || url || "").trim();
    if (!finalReadURL) {
      return res.status(400).json({
        success: false,
        source: "api",
        error: "Missing URL",
        message: "No media URL provided for registration"
      });
    }

    const finalFileId = (puterFileId || fileId || path || "").trim();
    const finalSizeBytes = Number(sizeBytes ?? size ?? 0);
    const finalFilename = filename || (finalReadURL.split('/').pop() || "media");
    const finalType = type || "image/jpeg";
    const finalProvider = provider || "puter";

    // Deduplicate registration by puterFileId, path, or URL in MongoDB
    let existing = null;
    if (finalFileId) {
      existing = await Media.findOne({
        $or: [
          { puterFileId: finalFileId },
          { fileId: finalFileId },
          { path: finalFileId },
          { readURL: finalReadURL },
          { url: finalReadURL }
        ]
      });
    } else {
      existing = await Media.findOne({
        $or: [
          { readURL: finalReadURL },
          { url: finalReadURL }
        ]
      });
    }

    if (existing) {
      // Update existing record with any newly supplied metadata without creating duplicate
      existing.readURL = finalReadURL;
      existing.url = finalReadURL;
      if (finalFileId) {
        existing.puterFileId = finalFileId;
        existing.fileId = finalFileId;
        existing.path = path || finalFileId;
      }
      if (finalSizeBytes) {
        existing.sizeBytes = finalSizeBytes;
        existing.size = finalSizeBytes;
      }
      if (finalFilename) existing.filename = finalFilename;
      if (metadata && typeof metadata === "object") {
        existing.metadata = { ...(existing.metadata || {}), ...metadata };
      }
      await existing.save();

      return res.json({
        success: true,
        source: "mongodb",
        message: "Media metadata verified and deduplicated in MongoDB",
        media: existing,
        deduplicated: true
      });
    }

    const mediaRecord = new Media({
      readURL: finalReadURL,
      url: finalReadURL,
      puterFileId: finalFileId,
      fileId: finalFileId,
      path: path || finalFileId,
      filename: finalFilename,
      type: finalType,
      sizeBytes: finalSizeBytes,
      size: finalSizeBytes,
      metadata: metadata || {},
      provider: finalProvider
    });

    try {
      await mediaRecord.save();
    } catch (saveErr) {
      // Handle race condition: another concurrent request already saved this record
      if (saveErr.code === 11000) {
        const found = await Media.findOne({
          $or: [
            { puterFileId: finalFileId },
            { path: finalFileId },
            { readURL: finalReadURL }
          ]
        });
        if (found) {
          return res.json({
            success: true,
            source: "mongodb",
            message: "Media metadata verified and deduplicated in MongoDB",
            media: found,
            deduplicated: true
          });
        }
      }
      throw saveErr;
    }

    return res.json({
      success: true,
      source: "mongodb",
      message: "Media metadata registered in MongoDB",
      media: mediaRecord,
      deduplicated: false
    });
  } catch (err) {
    console.error("Media registration error:", err);
    return res.status(500).json({
      success: false,
      source: "mongodb",
      error: "Registration Error",
      message: err.message || "Failed to register media metadata in MongoDB"
    });
  }
});

/**
 * POST /api/upload/register-batch
 * Registers metadata for multiple files uploaded directly to Puter Cloud in ONE request.
 * Fully idempotent with duplicate race condition handling in bulk.
 */
router.post("/register-batch", async (req, res) => {
  try {
    if (!isDbConnected()) {
      const items = req.body?.items || [];
      const results = items.map(item => ({
        readURL: item.readURL || item.url || "",
        success: true,
        deduplicated: false,
        media: { readURL: item.readURL || item.url || "", url: item.readURL || item.url || "" }
      }));
      return res.json({
        success: true,
        source: "in_memory",
        message: `Registered ${results.length} media items in fallback mode`,
        batchId: req.body?.batchId,
        results
      });
    }

    const { items, batchId } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        source: "api",
        error: "Invalid Request",
        message: "No media items provided for batch registration"
      });
    }

    const results = [];
    for (const item of items) {
      const { url, readURL, puterFileId, fileId, path, filename, type, sizeBytes, size, metadata, provider } = item || {};
      const finalReadURL = (readURL || url || "").trim();
      if (!finalReadURL) continue;

      const finalFileId = (puterFileId || fileId || path || "").trim();
      const finalSizeBytes = Number(sizeBytes ?? size ?? 0);
      const finalFilename = filename || (finalReadURL.split('/').pop() || "media");
      const finalType = type || "image/jpeg";
      const finalProvider = provider || "puter";

      let existing = null;
      if (finalFileId) {
        existing = await Media.findOne({
          $or: [
            { puterFileId: finalFileId },
            { fileId: finalFileId },
            { path: finalFileId },
            { readURL: finalReadURL },
            { url: finalReadURL }
          ]
        });
      } else {
        existing = await Media.findOne({
          $or: [
            { readURL: finalReadURL },
            { url: finalReadURL }
          ]
        });
      }

      if (existing) {
        existing.readURL = finalReadURL;
        existing.url = finalReadURL;
        if (finalFileId) {
          existing.puterFileId = finalFileId;
          existing.fileId = finalFileId;
          existing.path = path || finalFileId;
        }
        if (finalSizeBytes) {
          existing.sizeBytes = finalSizeBytes;
          existing.size = finalSizeBytes;
        }
        if (finalFilename) existing.filename = finalFilename;
        if (metadata && typeof metadata === "object") {
          existing.metadata = { ...(existing.metadata || {}), ...metadata, batchId };
        }
        await existing.save();
        results.push({ readURL: finalReadURL, success: true, deduplicated: true, media: existing });
      } else {
        const mediaRecord = new Media({
          readURL: finalReadURL,
          url: finalReadURL,
          puterFileId: finalFileId,
          fileId: finalFileId,
          path: path || finalFileId,
          filename: finalFilename,
          type: finalType,
          sizeBytes: finalSizeBytes,
          size: finalSizeBytes,
          metadata: { ...(metadata || {}), batchId },
          provider: finalProvider
        });

        try {
          await mediaRecord.save();
          results.push({ readURL: finalReadURL, success: true, deduplicated: false, media: mediaRecord });
        } catch (saveErr) {
          if (saveErr.code === 11000) {
            const found = await Media.findOne({
              $or: [
                { puterFileId: finalFileId },
                { path: finalFileId },
                { readURL: finalReadURL }
              ]
            });
            if (found) {
              results.push({ readURL: finalReadURL, success: true, deduplicated: true, media: found });
              continue;
            }
          }
          console.error("Batch media item save error:", saveErr);
          results.push({ readURL: finalReadURL, success: false, error: saveErr.message });
        }
      }
    }

    return res.json({
      success: true,
      source: "mongodb",
      message: `Registered ${results.filter(r => r.success).length} of ${items.length} media items in MongoDB`,
      batchId,
      results
    });
  } catch (err) {
    console.error("Batch media registration error:", err);
    return res.status(500).json({
      success: false,
      source: "mongodb",
      error: "Registration Error",
      message: err.message || "Failed to register batch media metadata in MongoDB"
    });
  }
});

/**
 * Disable local filesystem upload fallback in production
 */
router.post("/", async (req, res) => {
  return res.status(400).json({
    success: false,
    message: "Local server file storage is disabled in production on Vercel. Product media must be uploaded directly to Puter Cloud Storage via Admin Panel."
  });
});

export default router;
