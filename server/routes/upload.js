import express from "express";
import fs from "fs";
import path from "path";
import { Media } from "../models/Media.js";

const router = express.Router();

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.warn("Could not create uploads directory:", err.message);
  }
}

/**
 * GET /api/upload/stats
 * Returns real counts of media stored in MongoDB
 */
router.get("/stats", async (req, res) => {
  try {
    const totalMedia = await Media.find({}).sort({ createdAt: -1 });

    const images = totalMedia.filter(m => m.type && m.type.startsWith("image/"));
    const videos = totalMedia.filter(m => m.type && m.type.startsWith("video/"));

    const lastUpload = totalMedia.length > 0 ? totalMedia[0] : null;

    // Check server storage write capability
    let serverStatus = "Available";
    try {
      const testFile = path.join(UPLOAD_DIR, ".write_test");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
    } catch (e) {
      serverStatus = "Error";
    }

    return res.json({
      success: true,
      serverStorage: serverStatus,
      imagesCount: images.length,
      videosCount: videos.length,
      lastUpload: lastUpload ? {
        url: lastUpload.url,
        provider: lastUpload.provider,
        createdAt: lastUpload.createdAt,
        type: lastUpload.type
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
 * Registers metadata for a file uploaded via Puter Cloud client-side
 */
router.post("/register", async (req, res) => {
  try {
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
      message: err.message || "Failed to register media"
    });
  }
});

/**
 * Handle Base64 or raw file upload fallback
 * Returns clean static media URL: `/uploads/filename.ext` and registers it in MongoDB
 */
router.post("/", async (req, res) => {
  try {
    const { file, name, type, dataUrl } = req.body || {};
    const rawData = dataUrl || file;

    if (!rawData || typeof rawData !== "string") {
      return res.status(400).json({
        success: false,
        message: "No media file payload provided"
      });
    }

    // Extract mime type and base64 string
    const matches = rawData.match(/^data:(image\/[a-zA-Z0-9-+.]+|video\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
    if (!matches) {
      // If it's already a URL, return it directly
      if (rawData.startsWith("http://") || rawData.startsWith("https://") || rawData.startsWith("/images/")) {
        return res.json({ success: true, url: rawData, provider: "url" });
      }
      return res.status(400).json({
        success: false,
        message: "Invalid file format. Expected a valid image or video file."
      });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Check size limit (10MB for images, 50MB for videos)
    const isVideo = mimeType.startsWith("video/");
    const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds the limit of ${isVideo ? '50MB' : '10MB'}.`
      });
    }

    // Derive file extension
    let ext = "jpg";
    if (mimeType.includes("png")) ext = "png";
    else if (mimeType.includes("webp")) ext = "webp";
    else if (mimeType.includes("gif")) ext = "gif";
    else if (mimeType.includes("mp4")) ext = "mp4";
    else if (mimeType.includes("webm")) ext = "webm";

    const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;

    // Store in MongoDB
    const mediaRecord = new Media({
      url: publicUrl,
      fileId: fileName,
      type: mimeType,
      size: buffer.length,
      provider: "server"
    });
    await mediaRecord.save();

    return res.json({
      success: true,
      url: publicUrl,
      fileName,
      mimeType,
      size: buffer.length,
      provider: "server",
      media: mediaRecord
    });
  } catch (err) {
    console.error("Upload handler error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to process media upload"
    });
  }
});

export default router;
