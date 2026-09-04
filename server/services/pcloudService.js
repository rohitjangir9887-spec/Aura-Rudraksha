import { Setting } from "../models/Setting.js";
import { isDbConnected } from "../config/db.js";

export function getPcloudApiHost() {
  const custom = (process.env.PCLOUD_API_HOST || "").trim();
  if (custom) {
    return custom.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  return "api.pcloud.com";
}

export async function getPcloudToken() {
  const envToken = (process.env.PCLOUD_ACCESS_TOKEN || "").trim();
  if (envToken) return envToken;

  if (isDbConnected()) {
    try {
      const settings = await Setting.findOne({ id: "STORE_SETTINGS" }).lean();
      if (settings && settings.pcloudAccessToken) {
        return settings.pcloudAccessToken.trim();
      }
    } catch (_) {}
  }
  return "";
}

export async function savePcloudToken(token) {
  if (!token) return false;
  if (isDbConnected()) {
    await Setting.findOneAndUpdate(
      { id: "STORE_SETTINGS" },
      { $set: { pcloudAccessToken: token.trim() } },
      { upsert: true }
    );
  }
  return true;
}

export async function clearPcloudToken() {
  if (isDbConnected()) {
    await Setting.findOneAndUpdate(
      { id: "STORE_SETTINGS" },
      { $set: { pcloudAccessToken: "" } },
      { upsert: true }
    );
  }
  return true;
}

export async function exchangePcloudCode(code, redirectUri) {
  const clientId = (process.env.PCLOUD_CLIENT_ID || "").trim();
  const clientSecret = (process.env.PCLOUD_CLIENT_SECRET || "").trim();
  const host = getPcloudApiHost();

  if (!clientId || !clientSecret) {
    throw new Error("PCLOUD_CLIENT_ID or PCLOUD_CLIENT_SECRET is missing on server.");
  }

  const url = `https://${host}/oauth2/oauth2_token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`pCloud OAuth token exchange failed HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.access_token) {
    await savePcloudToken(data.access_token);
    return data;
  }
  throw new Error(data.error || "pCloud OAuth exchange returned no access token.");
}

/**
 * Fetch pCloud account userinfo and storage statistics
 */
export async function getPcloudStatus() {
  const token = await getPcloudToken();
  const clientId = (process.env.PCLOUD_CLIENT_ID || "").trim();

  if (!token) {
    const missingVars = [];
    if (!clientId) missingVars.push("PCLOUD_CLIENT_ID");
    if (!process.env.PCLOUD_CLIENT_SECRET) missingVars.push("PCLOUD_CLIENT_SECRET");
    if (!token) missingVars.push("PCLOUD_ACCESS_TOKEN");

    return {
      success: false,
      connected: false,
      status: "Not Configured",
      provider: "pCloud Storage",
      message: clientId
        ? "pCloud client ID set. Click 'Connect pCloud' to complete OAuth authorization."
        : `pCloud is not configured on the server. Missing variables: ${missingVars.join(", ")}`,
      missingVars,
      hasClientId: Boolean(clientId),
      email: "Not Configured",
      username: "Not Configured",
      quota: 0,
      usedQuota: 0,
      freeQuota: 0
    };
  }

  const host = getPcloudApiHost();
  try {
    const res = await fetch(`https://${host}/userinfo?access_token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      return {
        success: false,
        connected: false,
        status: "API Error",
        provider: "pCloud Storage",
        message: `pCloud API HTTP ${res.status}: ${res.statusText}`,
        email: "Error",
        username: "Error",
        quota: 0,
        usedQuota: 0,
        freeQuota: 0
      };
    }

    const data = await res.json();
    if (data.result === 0) {
      const email = data.email || "pCloud User";
      const username = email.includes("@") ? email.split("@")[0] : email;
      const quota = Number(data.quota) || 0;
      const usedQuota = Number(data.usedquota) || 0;
      const freeQuota = Math.max(0, quota - usedQuota);

      return {
        success: true,
        connected: true,
        status: "Connected",
        provider: "pCloud Storage",
        email,
        username,
        quota,
        usedQuota,
        freeQuota,
        message: `pCloud Storage connected as ${email}.`
      };
    }

    return {
      success: false,
      connected: false,
      status: "Auth Error",
      provider: "pCloud Storage",
      message: data.error || `pCloud authentication error (code ${data.result}). Please verify Access Token.`,
      email: "Invalid Token",
      username: "Unauthorized",
      quota: 0,
      usedQuota: 0,
      freeQuota: 0
    };
  } catch (err) {
    return {
      success: false,
      connected: false,
      status: "Connection Failed",
      provider: "pCloud Storage",
      message: `Failed to connect to pCloud API: ${err.message || err}`,
      email: "Offline",
      username: "Offline",
      quota: 0,
      usedQuota: 0,
      freeQuota: 0
    };
  }
}

/**
 * Upload a file buffer directly to pCloud and return a direct public URL
 */
export async function uploadToPcloud({ buffer, filename, mimeType }) {
  const token = await getPcloudToken();
  if (!token) {
    throw new Error("pCloud upload failed: PCLOUD_ACCESS_TOKEN is missing on server.");
  }

  const host = getPcloudApiHost();
  const cleanFilename = (filename || `upload-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");

  // Create multipart payload
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType || "application/octet-stream" });
  formData.append("file", blob, cleanFilename);

  const folderId = (process.env.PCLOUD_FOLDER_ID || "0").trim();
  const uploadUrl = `https://${host}/uploadfile?access_token=${encodeURIComponent(token)}&folderid=${encodeURIComponent(folderId)}&nopublink=0`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    const errTxt = await res.text().catch(() => "");
    throw new Error(`pCloud upload HTTP ${res.status}: ${errTxt.slice(0, 150)}`);
  }

  const data = await res.json();
  if (data.result !== 0) {
    throw new Error(`pCloud upload error (code ${data.result}): ${data.error || "Upload rejected by pCloud"}`);
  }

  const meta = Array.isArray(data.metadata) ? data.metadata[0] : (data.metadata || {});
  const fileid = meta.fileid || (Array.isArray(data.fileids) ? data.fileids[0] : null);

  if (!fileid) {
    throw new Error("pCloud upload succeeded but returned no valid file ID.");
  }

  // Get direct public link
  let publicUrl = "";
  try {
    const pubRes = await fetch(`https://${host}/getpublink?fileid=${fileid}&access_token=${encodeURIComponent(token)}`);
    if (pubRes.ok) {
      const pubData = await pubRes.json();
      if (pubData.result === 0 && pubData.code) {
        publicUrl = `https://${host}/getpublinkfile?code=${pubData.code}`;
      }
    }
  } catch (_) {}

  // Fallback to getfilelink if publink call did not yield URL
  if (!publicUrl) {
    try {
      const linkRes = await fetch(`https://${host}/getfilelink?fileid=${fileid}&access_token=${encodeURIComponent(token)}`);
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        if (linkData.result === 0 && linkData.hosts && linkData.hosts.length > 0 && linkData.path) {
          publicUrl = `https://${linkData.hosts[0]}${linkData.path}`;
        }
      }
    } catch (_) {}
  }

  // Ultimate fallback to pCloud file viewer link
  if (!publicUrl) {
    publicUrl = `https://${host}/publink/show?code=${fileid}`;
  }

  return {
    success: true,
    fileId: String(fileid),
    url: publicUrl,
    filename: meta.name || cleanFilename,
    sizeBytes: meta.size || buffer.length,
    mimeType: meta.contenttype || mimeType || "image/jpeg"
  };
}

/**
 * Delete a file from pCloud by file ID
 */
export async function deleteFromPcloud(fileId) {
  const token = await getPcloudToken();
  if (!token || !fileId) return { success: false, message: "No token or fileId" };

  const host = getPcloudApiHost();
  try {
    const res = await fetch(`https://${host}/deletefile?fileid=${encodeURIComponent(fileId)}&access_token=${encodeURIComponent(token)}`);
    if (!res.ok) return { success: false, message: `pCloud delete HTTP ${res.status}` };
    const data = await res.json();
    return { success: data.result === 0, message: data.error || "File deleted" };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

