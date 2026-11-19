import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { cert } from 'firebase-admin/app';
import { Customer } from "../models/Customer.js";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Firebase Admin initialization
// Supports (in priority order):
//  1. FIREBASE_SERVICE_ACCOUNT_KEYFILE  - path to a service account JSON file
//  2. FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (+ optional FIREBASE_PROJECT_ID)
//  3. Application Default Credentials (fallback: projectId only)
// ---------------------------------------------------------------------------
let firebaseProjectId = process.env.FIREBASE_PROJECT_ID || "serene-catfish-flkqp";
try {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (!process.env.FIREBASE_PROJECT_ID && fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (raw.projectId) {
      firebaseProjectId = raw.projectId;
    }
  }
} catch (_) {}

function resolveServiceAccount() {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEYFILE) {
      const p = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_KEYFILE);
      if (fs.existsSync(p)) {
        const sa = JSON.parse(fs.readFileSync(p, "utf8"));
        if (sa.private_key && sa.client_email) {
          return { ...sa, projectId: sa.project_id || firebaseProjectId };
        }
      }
      console.warn("[Auth] FIREBASE_SERVICE_ACCOUNT_KEYFILE found but missing private_key/client_email — ignoring.");
    }
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      return {
        projectId: process.env.FIREBASE_PROJECT_ID || firebaseProjectId,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY
      };
    }
  } catch (err) {
    console.warn("[Auth] Could not resolve Firebase service account:", err?.message || err);
  }
  return null;
}

const serviceAccount = resolveServiceAccount();
if (!getApps().length) {
  initializeApp(
    serviceAccount
      ? { credential: cert(serviceAccount), projectId: serviceAccount.projectId }
      : { projectId: firebaseProjectId }
  );
}

// ---------------------------------------------------------------------------
// Dev-only demo auth fallback. This must NEVER be reachable in production.
// It requires BOTH NODE_ENV !== "production" AND an explicit opt-in env var,
// so a misconfigured/missing NODE_ENV can never silently enable it.
// In Production/Vercel environments, it is strictly forbidden and permanently disabled.
// ---------------------------------------------------------------------------
export function devFallbackAllowed() {
  return false;
}

// In-memory verified token cache to eliminate latency on repeated requests
const verifiedTokenCache = new Map();
const TOKEN_CACHE_TTL_MS = 60 * 1000; // 60 seconds

async function verifyTokenFast(token) {
  const now = Date.now();
  const cached = verifiedTokenCache.get(token);
  if (cached && cached.expiresAt > now) {
    return cached.decoded;
  }
  const decoded = await getAuth().verifyIdToken(token);
  const expiresAt = Math.min(now + TOKEN_CACHE_TTL_MS, decoded.exp * 1000);
  if (verifiedTokenCache.size >= 1000) {
    verifiedTokenCache.delete(verifiedTokenCache.keys().next().value);
  }
  verifiedTokenCache.set(token, { decoded, expiresAt });
  return decoded;
}

async function readVerifiedUser(req) {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return null;

  const decoded = await verifyTokenFast(token);
  return {
    authUserId: decoded.uid,
    email: decoded.email_verified === true ? decoded.email || "" : "",
    emailVerified: decoded.email_verified === true,
    phone: decoded.phone_number || "",
    name: decoded.name || "",
    picture: decoded.picture || ""
  };
}

export async function requireAuth(req, res, next) {
  try {
    req.user = await readVerifiedUser(req);
  } catch {
    req.user = null;
  }
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  return next();
}

export async function optionalAuth(req, res, next) {
  try {
    req.user = await readVerifiedUser(req);
  } catch {
    req.user = null;
  }
  return next();
}

// ---------------------------------------------------------------------------
// Shared admin role check.
// A user is an admin when:
//   - their verified Firebase email matches INITIAL_ADMIN_EMAIL, or
//   - their verified Firebase phone matches INITIAL_ADMIN_PHONE (digit-normalized), or
//   - their MongoDB Customer record has role = "admin"
// Never trust client-supplied role flags.
// ---------------------------------------------------------------------------
export function isAdminUser(user) {
  const allowedEmails = [
    "rohitjangir9887@gmail.com",
    "rohitjangir8740@gmail.com"
  ];
  if (process.env.INITIAL_ADMIN_EMAIL) {
    process.env.INITIAL_ADMIN_EMAIL.split(",").forEach((e) => {
      const trimmed = e.trim().toLowerCase();
      if (trimmed && !allowedEmails.includes(trimmed)) {
        allowedEmails.push(trimmed);
      }
    });
  }
  const initialAdminPhone = (process.env.INITIAL_ADMIN_PHONE || "9672996531").trim();

  const userEmail = (user && user.email ? user.email.trim().toLowerCase() : "");
  const matchesEmail = Boolean(user?.emailVerified === true && allowedEmails.includes(userEmail));
  const configuredDigits = initialAdminPhone.replace(/[^0-9]/g, "");
  const expectedPhone = configuredDigits.length === 10 ? `+91${configuredDigits}` : `+${configuredDigits}`;
  const matchesPhone = Boolean(configuredDigits && user?.phone === expectedPhone);

  return { matchesEmail, matchesPhone, isInitialAdmin: matchesEmail || matchesPhone };
}

export async function hasAdminRole(authUserId) {
  try {
    const customer = await Customer.findOne({ authUserId }).lean();
    return !!(customer && customer.role === "admin");
  } catch (_) {
    // MongoDB unavailable - role cannot be verified from DB
    return false;
  }
}

export async function requireAdmin(req, res, next) {
  return requireAuth(req, res, async () => {
    const { isInitialAdmin } = isAdminUser(req.user);
    if (isInitialAdmin || await hasAdminRole(req.user.authUserId)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Access Denied: Admin authorization required."
    });
  });
}
