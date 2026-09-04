/**
 * pCloud REST API Integration Service
 * Keeps pCloud access tokens and secrets strictly server-side.
 */

function getPcloudApiHost() {
  const custom = (process.env.PCLOUD_API_HOST || "").trim();
  if (custom) {
    return custom.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  return "api.pcloud.com";
}

function getPcloudToken() {
  return (process.env.PCLOUD_ACCESS_TOKEN || "").trim();
}

/**
 * Fetch pCloud account userinfo and storage statistics
 */
export async function getPcloudStatus() {
  const token = getPcloudToken();
  if (!token) {
    return {
      success: false,
      connected: false,
      status: "Not Configured",
      provider: "pCloud Storage",
      message: "pCloud Access Token is not set on the server (PCLOUD_ACCESS_TOKEN environment variable missing).",
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
        message: `pCloud API HTTP ${res.status}: ${res.statusText}`
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
      message: data.error || `pCloud authentication error (code ${data.result}). Please verify PCLOUD_ACCESS_TOKEN.`
    };
  } catch (err) {
    return {
      success: false,
      connected: false,
      status: "Connection Failed",
      provider: "pCloud Storage",
      message: `Failed to connect to pCloud API: ${err.message || err}`
    };
  }
}

/**
 * Upload a file buffer directly to pCloud and return a direct public URL
 */
export async function uploadToPcloud({ buffer, filename, mimeType }) {
  const token = getPcloudToken();
  if (!token) {
    throw new Error("pCloud upload failed: PCLOUD_ACCESS_TOKEN is missing on server.");
  }

  const host = getPcloudApiHost();
  const cleanFilename = (filename || `upload-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");

  // Create multipart payload
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType || "application/octet-stream" });
  formData.append("file", blob, cleanFilename);

  const uploadUrl = `https://${host}/uploadfile?access_token=${encodeURIComponent(token)}&folderid=0&nopublink=0`;

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
  const token = getPcloudToken();
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
