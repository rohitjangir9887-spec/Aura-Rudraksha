import express from "express";
import { Media } from "../models/Media.js";
import { isDbConnected } from "../config/db.js";

const router = express.Router();

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

    const lastUpload = totalMedia.length > 0 ? totalMedia[0] : null;

    return res.json({
      success: true,
      serverStorage: "Puter Cloud Direct (Production Ready)",
      imagesCount: images.length,
      videosCount: videos.length,
      totalCount: totalMedia.length,
      lastUpload: lastUpload ? {
        url: lastUpload.url,
        provider: lastUpload.provider || "puter",
        createdAt: lastUpload.createdAt,
        type: lastUpload.type || "image/jpeg",
        size: lastUpload.size || 0
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
 * Registers metadata for a file uploaded directly to Puter Cloud
 */
router.post("/register", async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Database is temporarily unavailable. Please try again shortly."
      });
    }

    const { url, fileId, type, size, provider } = req.body || {};

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "No media URL provided for registration"
      });
    }

    const mediaRecord = new Media({
      url,
      fileId: fileId || "",
      type: type || "image/jpeg",
      size: Number(size) || 0,
      provider: provider || "puter"
    });

    await mediaRecord.save();

    return res.json({
      success: true,
      message: "Media metadata registered in MongoDB",
      media: mediaRecord
    });
  } catch (err) {
    console.error("Media registration error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to register media metadata in MongoDB"
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

