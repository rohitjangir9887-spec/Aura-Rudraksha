import express from "express";
import multer from "multer";
import { Media, initMediaIndexes } from "../models/Media.js";
import { isDbConnected } from "../config/db.js";
import { mediaStorageManager } from "../services/mediaStorage/index.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

const multerStorage = multer.memoryStorage();
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (!file || !file.mimetype || !allowedMimeTypes.has(file.mimetype.toLowerCase())) {
      return cb(new Error("Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF, SVG, MP4, WebM, QuickTime."));
    }
    cb(null, true);
  }
});

// Trigger background index check once DB is connected
initMediaIndexes().catch(() => {});

/**
 * GET /api/upload/status
 * Returns overview of all server-side media storage providers (Admin-only)
 */
router.get("/status", requireAdmin, async (req, res) => {
  try {
    const status = await mediaStorageManager.getStatus();
    return res.json({
      success: true,
      ...status
    });
  } catch (err) {
    console.error("Failed to fetch media storage status:", err);
    return res.status(500).json({
      success: false,
      error: "Status Check Error",
      message: err.message || "Failed to check media storage status"
    });
  }
});

/**
 * GET /api/upload/telegram/file/:fileId
 * Secure server proxy endpoint for streaming Telegram files without exposing TELEGRAM_BOT_TOKEN
 */
router.get("/telegram/file/:fileId", async (req, res) => {
  try {
    return await mediaStorageManager.streamMedia(req.params.fileId, res, "telegram");
  } catch (err) {
    console.error("Error streaming Telegram media file:", err);
    return res.status(500).json({
      success: false,
      error: "Media Stream Failure",
      message: err.message || "Failed to stream media file from Telegram storage"
    });
  }
});

/**
 * POST /api/upload/server
 * Server-side media upload endpoint using TGStorage / Media Storage Providers (Admin-only).
 * Step 1: Uploads physical media to storage provider (Telegram / TGStorage or Puter).
 * Step 2: Registers metadata in MongoDB ONLY after successful physical upload.
 */
router.post("/server", requireAdmin, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          error: "Upload Limit Exceeded",
          message: err.message
        });
      }
      return res.status(400).json({
        success: false,
        error: "Invalid File Upload",
        message: err.message || "File upload validation failed"
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Missing File",
        message: "No media file provided in 'file' field"
      });
    }

    const { originalname, mimetype, buffer, size } = req.file;
    const requestedProvider = req.body.provider || undefined;

    // Step 1: Upload physical file buffer via Media Storage Adapter
    const uploadResult = await mediaStorageManager.uploadMedia(
      buffer,
      { filename: originalname, mimeType: mimetype, size },
      requestedProvider
    );

    if (!uploadResult || !uploadResult.success) {
      return res.status(500).json({
        success: false,
        error: "Storage Upload Failed",
        message: "Media storage provider failed to accept the upload payload"
      });
    }

    // Step 2: Write metadata to MongoDB ONLY after successful physical upload
    let mediaRecord = null;
    let registeredInDb = false;
    let dbError = null;

    if (isDbConnected()) {
      try {
        const finalReadUrl = uploadResult.url;
        const finalFileId = uploadResult.fileId || originalname;

        mediaRecord = new Media({
          readURL: finalReadUrl,
          url: finalReadUrl,
          fileId: finalFileId,
          puterFileId: finalFileId,
          path: uploadResult.path || finalFileId,
          filename: originalname,
          type: mimetype,
          sizeBytes: size,
          size: size,
          metadata: uploadResult.metadata || {},
          provider: uploadResult.provider || "telegram"
        });
        await mediaRecord.save();
        registeredInDb = true;
      } catch (dbErr) {
        console.warn("MongoDB registration warning after storage upload:", dbErr.message);
        dbError = dbErr.message;
      }
    }

    if (dbError) {
      return res.status(500).json({
        success: false,
        error: "Database Metadata Registration Failed",
        message: `Physical upload to ${uploadResult.provider} succeeded, but saving metadata to MongoDB failed: ${dbError}`,
        provider: uploadResult.provider,
        fileId: uploadResult.fileId,
        url: uploadResult.url,
        readURL: uploadResult.url,
        path: uploadResult.path,
        size: size,
        type: mimetype,
        registeredInDb: false,
        dbError
      });
    }

    return res.json({
      success: true,
      provider: uploadResult.provider,
      fileId: uploadResult.fileId,
      url: uploadResult.url,
      readURL: uploadResult.url,
      path: uploadResult.path,
      size: size,
      type: mimetype,
      media: mediaRecord,
      registeredInDb: true
    });
  } catch (err) {
    console.error("Server-side media upload route error:", err);
    return res.status(500).json({
      success: false,
      error: "Upload Error",
      message: err.message || "Server media upload failed"
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
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
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
 * Registers metadata for a file uploaded directly to Puter Cloud (Admin-only).
 * Fully idempotent with duplicate race condition handling.
 */
router.post("/register", requireAdmin, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        source: "mongodb",
        error: "Database unavailable",
        message: "MongoDB database is temporarily unavailable. Please try again shortly."
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
 * Registers metadata for multiple files uploaded directly to Puter Cloud in ONE request (Admin-only).
 * Fully idempotent with duplicate race condition handling in bulk.
 */
router.post("/register-batch", requireAdmin, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        source: "mongodb",
        error: "Database unavailable",
        message: "MongoDB database is temporarily unavailable. Please try again shortly."
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
