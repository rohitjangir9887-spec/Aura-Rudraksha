import crypto from "crypto";
import { Setting } from "../models/Setting.js";
import { isDbConnected } from "../config/db.js";
import { inMemoryStore } from "../data/inMemoryStore.js";

/**
 * Get ImageKit credentials prioritizing env vars, with fallback to MongoDB STORE_SETTINGS
 */
export async function getImagekitCredentials() {
  let publicKey = (process.env.IMAGEKIT_PUBLIC_KEY || "").trim();
  let privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
  let urlEndpoint = (process.env.IMAGEKIT_URL_ENDPOINT || "").trim();

  if ((!publicKey || !privateKey || !urlEndpoint) && isDbConnected()) {
    try {
      const settings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
      if (settings) {
        if (!publicKey && settings.imagekitPublicKey) publicKey = settings.imagekitPublicKey.trim();
        if (!privateKey && settings.imagekitPrivateKey) privateKey = settings.imagekitPrivateKey.trim();
        if (!urlEndpoint && settings.imagekitUrlEndpoint) urlEndpoint = settings.imagekitUrlEndpoint.trim();
      }
    } catch (_) {}
  }

  if ((!publicKey || !privateKey || !urlEndpoint) && inMemoryStore.settings) {
    if (!publicKey && inMemoryStore.settings.imagekitPublicKey) publicKey = inMemoryStore.settings.imagekitPublicKey.trim();
    if (!privateKey && inMemoryStore.settings.imagekitPrivateKey) privateKey = inMemoryStore.settings.imagekitPrivateKey.trim();
    if (!urlEndpoint && inMemoryStore.settings.imagekitUrlEndpoint) urlEndpoint = inMemoryStore.settings.imagekitUrlEndpoint.trim();
  }

  // Ensure urlEndpoint format is clean (no trailing slash)
  if (urlEndpoint && urlEndpoint.endsWith("/")) {
    urlEndpoint = urlEndpoint.slice(0, -1);
  }

  return { publicKey, privateKey, urlEndpoint };
}

/**
 * Save ImageKit credentials to MongoDB STORE_SETTINGS safely
 */
export async function saveImagekitCredentials({ publicKey, privateKey, urlEndpoint }) {
  const updateFields = {};
  if (publicKey !== undefined) updateFields.imagekitPublicKey = (publicKey || "").trim();
  if (privateKey !== undefined) updateFields.imagekitPrivateKey = (privateKey || "").trim();
  if (urlEndpoint !== undefined) updateFields.imagekitUrlEndpoint = (urlEndpoint || "").trim().replace(/\/$/, "");

  if (isDbConnected()) {
    await Setting.findOneAndUpdate(
      { id: "STORE_SETTINGS" },
      { $set: updateFields },
      { upsert: true }
    ).catch(() => {});
  }

  if (inMemoryStore.settings) {
    if (updateFields.imagekitPublicKey !== undefined) inMemoryStore.settings.imagekitPublicKey = updateFields.imagekitPublicKey;
    if (updateFields.imagekitPrivateKey !== undefined) inMemoryStore.settings.imagekitPrivateKey = updateFields.imagekitPrivateKey;
    if (updateFields.imagekitUrlEndpoint !== undefined) inMemoryStore.settings.imagekitUrlEndpoint = updateFields.imagekitUrlEndpoint;
  }

  return true;
}

/**
 * Get ImageKit status and connection verification
 */
export async function getImagekitStatus() {
  const { publicKey, privateKey, urlEndpoint } = await getImagekitCredentials();

  if (!publicKey || !privateKey || !urlEndpoint) {
    return {
      success: false,
      connected: false,
      status: "Not Configured",
      provider: "ImageKit",
      message: "ImageKit configuration is missing. Provide IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT environment variables or save credentials in Admin Settings.",
      hasConfig: false,
      publicKey: publicKey ? `${publicKey.slice(0, 8)}...` : "Not Set",
      urlEndpoint: urlEndpoint || "Not Set",
      quota: 0,
      usedQuota: 0
    };
  }

  try {
    const authHeader = `Basic ${Buffer.from(privateKey + ":").toString("base64")}`;
    const res = await fetch("https://api.imagekit.io/v1/files?limit=1", {
      headers: {
        Authorization: authHeader
      }
    });

    if (res.ok) {
      return {
        success: true,
        connected: true,
        status: "Connected",
        provider: "ImageKit",
        publicKey: `${publicKey.slice(0, 10)}...`,
        urlEndpoint,
        hasConfig: true,
        message: `ImageKit successfully connected (${urlEndpoint}).`
      };
    }

    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      connected: false,
      status: "Auth Error",
      provider: "ImageKit",
      message: errData.message || `ImageKit API Authentication Error (HTTP ${res.status}). Check keys.`,
      hasConfig: true,
      publicKey: `${publicKey.slice(0, 8)}...`,
      urlEndpoint
    };
  } catch (err) {
    return {
      success: false,
      connected: false,
      status: "Connection Failed",
      provider: "ImageKit",
      message: `Failed to connect to ImageKit API: ${err.message || err}`,
      hasConfig: true,
      publicKey: `${publicKey.slice(0, 8)}...`,
      urlEndpoint
    };
  }
}

/**
 * Generate secure authentication parameters for client-side ImageKit upload
 * PRIVATE KEY MUST NEVER BE RETURNED.
 */
export async function getImagekitAuthParams() {
  const { publicKey, privateKey, urlEndpoint } = await getImagekitCredentials();

  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error("ImageKit server configuration is missing. Add IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT.");
  }

  const token = crypto.randomUUID ? crypto.randomUUID() : `ik_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const expire = Math.floor(Date.now() / 1000) + 1800; // 30 minutes expiry
  const signature = crypto.createHmac("sha1", privateKey).update(token + String(expire)).digest("hex");

  return {
    token,
    expire,
    signature,
    publicKey,
    urlEndpoint
  };
}

/**
 * Server-side upload directly to ImageKit
 */
export async function uploadToImagekit({ buffer, filename, mimeType, folder = "/products" }) {
  const { publicKey, privateKey, urlEndpoint } = await getImagekitCredentials();

  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error("ImageKit upload failed: Missing ImageKit credentials on server.");
  }

  const cleanFilename = (filename || `upload-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const authHeader = `Basic ${Buffer.from(privateKey + ":").toString("base64")}`;

  const base64File = `data:${mimeType || "image/jpeg"};base64,${buffer.toString("base64")}`;

  const formData = new FormData();
  formData.append("file", base64File);
  formData.append("fileName", cleanFilename);
  formData.append("folder", folder);
  formData.append("useUniqueFileName", "true");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: {
      Authorization: authHeader
    },
    body: formData
  });

  if (!res.ok) {
    const errTxt = await res.text().catch(() => "");
    throw new Error(`ImageKit upload HTTP ${res.status}: ${errTxt.slice(0, 150)}`);
  }

  const data = await res.json();
  if (!data.fileId || !data.url) {
    throw new Error("ImageKit upload succeeded but returned missing file ID or URL.");
  }

  return {
    success: true,
    fileId: data.fileId,
    url: data.url,
    thumbnailUrl: data.thumbnailUrl || data.url,
    filename: data.name || cleanFilename,
    sizeBytes: data.size || buffer.length,
    mimeType: mimeType || (data.fileType === "non-image" ? "video/mp4" : "image/jpeg"),
    mediaType: data.fileType === "non-image" ? "video" : "image",
    height: data.height || 0,
    width: data.width || 0
  };
}

/**
 * Delete a file from ImageKit by file ID
 */
export async function deleteFromImagekit(fileId) {
  const { privateKey } = await getImagekitCredentials();
  if (!privateKey || !fileId) {
    return { success: false, message: "Missing ImageKit privateKey or fileId" };
  }

  try {
    const authHeader = `Basic ${Buffer.from(privateKey + ":").toString("base64")}`;
    const res = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader
      }
    });

    if (res.status === 204 || res.ok) {
      return { success: true, message: "File deleted from ImageKit" };
    }

    const errData = await res.json().catch(() => ({}));
    return { success: false, message: errData.message || `ImageKit delete failed (HTTP ${res.status})` };
  } catch (err) {
    return { success: false, message: err.message || "Failed to contact ImageKit API" };
  }
}
