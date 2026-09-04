import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { cert } from 'firebase-admin/app';
import mongoose from "mongoose";
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
  if (fs.existsSync(configPath)) {
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
  const nodeEnv = (process.env.NODE_ENV || "").trim().toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV || "").trim().toLowerCase();
  const isVercel = Boolean(process.env.VERCEL && process.env.VERCEL !== "0");

  // Production or cloud deployment environments must NEVER allow fallback under any circumstances
  if (
    nodeEnv === "production" ||
    vercelEnv === "production" ||
    vercelEnv === "preview" ||
    (isVercel && nodeEnv !== "development")
  ) {
    return false;
  }

  // Development auth fallback can ONLY activate when:
  // NODE_ENV !== "production" AND ALLOW_DEV_AUTH_FALLBACK === "true"
  return nodeEnv !== "production" && process.env.ALLOW_DEV_AUTH_FALLBACK === "true";
}

function applyDevFallbackUser(req) {
  req.user = {
    authUserId: "admin-dev-user",
    email: "rohitjangir8740@gmail.com",
    phone: "+919672996531",
    name: "Aura Admin",
    picture: ""
  };
}

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token && token !== "null" && token !== "undefined") {
        // Fast path for development/preview admin tokens (ONLY allowed if dev fallback is explicitly permitted)
        if (devFallbackAllowed() && (token === "preview-admin" || token === "demo-token" || token === "demo-token-123" || token.startsWith("admin_"))) {
          applyDevFallbackUser(req);
          return next();
        }

        try {
          // Verify Firebase ID Token
          const decodedToken = await getAuth().verifyIdToken(token);
          req.user = {
            authUserId: decodedToken.uid,
            email: decodedToken.email || "",
            phone: decodedToken.phone_number || "",
            name: decodedToken.name || (decodedToken.firebase && decodedToken.firebase.identities && decodedToken.firebase.identities["google.com"] ? decodedToken.name : "") || "",
            picture: decodedToken.picture || ""
          };
          return next();
        } catch (err) {
          console.warn("[Auth] Firebase token verification failed:", err?.message || err);
          // When token verification fails, do not trust unverified JWT payloads
        }
      }
    }

    // Explicit development fallback ONLY when explicitly configured
    if (devFallbackAllowed()) {
      applyDevFallbackUser(req);
      return next();
    }

    return res.status(401).json({ success: false, message: "Authentication required" });
  } catch (error) {
    console.error("Auth Error:", error?.message || error);
    res.status(401).json({ success: false, message: "Invalid or expired session token" });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token && token !== "null" && token !== "undefined" && token !== "demo-token" && token !== "demo-token-123" && token !== "preview-admin") {
        try {
          const decodedToken = await getAuth().verifyIdToken(token);
          req.user = {
            authUserId: decodedToken.uid,
            email: decodedToken.email || "",
            phone: decodedToken.phone_number || "",
            name: decodedToken.name || (decodedToken.firebase && decodedToken.firebase.identities && decodedToken.firebase.identities["google.com"] ? decodedToken.name : "") || "",
            picture: decodedToken.picture || ""
          };
        } catch (tokenErr) {
          // If verifyIdToken failed, strictly nullify user identity (no unverified payload decoding)
          req.user = null;
        }
      }
    }
  } catch (_) {
    req.user = null;
  }
  next();
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
  const allowedEmails = ["rohitjangir8740@gmail.com", "rohitjangir9887@gmail.com", "rohitjangir80055@gmail.com", "rohitjangir80055@gmail.com"];
  if (process.env.INITIAL_ADMIN_EMAIL) {
    allowedEmails.push(process.env.INITIAL_ADMIN_EMAIL.trim().toLowerCase());
  }
  const initialAdminPhone = (process.env.INITIAL_ADMIN_PHONE || "+919672996531").trim();

  const userEmail = (user && user.email ? user.email.trim().toLowerCase() : "");
  const matchesEmail = Boolean(userEmail && allowedEmails.includes(userEmail));
  const cleanUserPhone = ((user && user.phone) || "").replace(/[^0-9]/g, "");
  const cleanAdminPhone = initialAdminPhone.replace(/[^0-9]/g, "");
  const matchesPhone = Boolean(cleanUserPhone && (cleanUserPhone === cleanAdminPhone || cleanUserPhone.endsWith("9672996531")));

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
  if (!req.user) {
    return requireAuth(req, res, async () => {
      checkAdmin(req, res, next);
    });
  }
  checkAdmin(req, res, next);
}

async function checkAdmin(req, res, next) {
  try {
    if (!req.user) {
      if (devFallbackAllowed()) {
        applyDevFallbackUser(req);
        return next();
      }
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const authUserId = req.user.authUserId;
    const { isInitialAdmin } = isAdminUser(req.user);

    // STRICT ENFORCEMENT: Admin dashboard & APIs are ONLY accessible if email is rohitjangir8740@gmail.com or phone is +919672996531.
    if (!isInitialAdmin) {
      // Ensure any rogue customer record with admin role is demoted
      if (mongoose.connection.readyState === 1) {
        await Customer.updateOne({ authUserId, role: "admin" }, { $set: { role: "customer" } }).catch(() => {});
      }
      return res.status(403).json({ 
        success: false, 
        message: "Access Denied: Admin dashboard is exclusively reserved for rohitjangir8740@gmail.com or +91 9672996531." 
      });
    }

    if (mongoose.connection.readyState === 1) {
      try {
        let customer = await Customer.findOne({ authUserId }).catch(() => null);
        if (customer) {
          if (customer.role !== "admin") {
            customer.role = "admin";
            await customer.save().catch(() => {});
          }
        } else {
          await Customer.create({
            authUserId,
            email: req.user.email || "rohitjangir8740@gmail.com",
            phone: req.user.phone || "+919672996531",
            name: req.user.name || "Rohit Jangir",
            role: "admin"
          }).catch(() => {});
        }
      } catch (_) {}
    }

    return next();
  } catch (error) {
    console.error("Admin Check Error:", error?.message || error);
    if (devFallbackAllowed() && req.user && isAdminUser(req.user).isInitialAdmin) {
      return next();
    }
    return res.status(500).json({ success: false, message: "Authorization service error" });
  }
}
