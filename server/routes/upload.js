import express from "express";
import fs from "fs";
import path from "path";

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
 * Handle Base64 or raw file upload
 * Returns clean static media URL: `/uploads/filename.ext`
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
    else if (mimeType.includes("mp4")) ext = "mp4";
    else if (mimeType.includes("webm")) ext = "webm";

    const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;
    return res.json({
      success: true,
      url: publicUrl,
      fileName,
      mimeType,
      size: buffer.length,
      provider: "server"
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
