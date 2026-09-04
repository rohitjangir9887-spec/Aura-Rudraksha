import { AuditLog } from "../models/AuditLog.js";
import { isDbConnected } from "../config/db.js";

// In-memory audit buffer
const inMemoryAuditLogs = [];

/**
 * Logs a sensitive administrative or security action
 */
export async function logAuditEvent({
  actor = "system",
  actorRole = "admin",
  action,
  entityType,
  entityId,
  oldState = null,
  newState = null,
  reason = "",
  req = null
}) {
  const ip = req ? (req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress || "") : "";
  const userAgent = req ? (req.headers["user-agent"] || "") : "";

  // Redact secrets if any exist in states
  const sanitizeForAudit = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    const clone = Array.isArray(obj) ? [...obj] : { ...obj };
    const sensitiveKeys = ["imagekitPrivateKey", "pcloudAccessToken", "pcloudRefreshToken", "password", "hash", "salt"];
    for (const key of Object.keys(clone)) {
      if (sensitiveKeys.includes(key)) {
        clone[key] = "[REDACTED]";
      }
    }
    return clone;
  };

  const payload = {
    actor: String(actor || "system"),
    actorRole: String(actorRole || "admin"),
    action: String(action),
    entityType: String(entityType),
    entityId: String(entityId || "N/A"),
    oldState: sanitizeForAudit(oldState),
    newState: sanitizeForAudit(newState),
    reason: String(reason || ""),
    ip,
    userAgent,
    timestamp: new Date()
  };

  if (!isDbConnected()) {
    inMemoryAuditLogs.unshift(payload);
    if (inMemoryAuditLogs.length > 500) inMemoryAuditLogs.pop();
    return payload;
  }

  try {
    return await AuditLog.create(payload);
  } catch (err) {
    console.warn("Failed to create audit log:", err.message);
    return null;
  }
}
