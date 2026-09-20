import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence,
  browserLocalPersistence,
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
  updateProfile,
  reload
} from "firebase/auth";
import firebaseAppletConfig from "../../firebase-applet-config.json";

export const firebaseConfig = {
  projectId: firebaseAppletConfig.projectId || "aura-rudraksha-afde8",
  appId: firebaseAppletConfig.appId || "1:880463555671:web:420dc50315ebd1b6334712",
  apiKey: firebaseAppletConfig.apiKey || "AIzaSyB16eNoKyJWnq081O227FyuWC58wTo7Jqo",
  authDomain: firebaseAppletConfig.authDomain || "aura-rudraksha-afde8.firebaseapp.com",
  storageBucket: firebaseAppletConfig.storageBucket || "aura-rudraksha-afde8.firebasestorage.app",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "880463555671"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Enforce browserLocalPersistence for permanent auth persistence across page refreshes
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("[Auth] Local persistence setting warning:", err?.message || err);
  });
} catch (e) {
  console.warn("[Auth] Local persistence call error:", e?.message || e);
}

// Canonical production origin for Aura Rudraksha
export const CANONICAL_APP_ORIGIN = "https://aurarudraksha.bond";

/**
 * Returns the active or canonical application origin.
 * Ensures localhost / loopback IPs are never emitted in production action links.
 */
export function getAppOrigin() {
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    let origin = window.location.origin;
    if (
      !origin.includes("localhost") && 
      !origin.includes("127.0.0.1") && 
      !origin.includes("0.0.0.0") &&
      origin.startsWith("http")
    ) {
      if (origin.includes("www.aurarudraksha.bond")) {
        return "https://aurarudraksha.bond";
      }
      return origin;
    }
  }
  return CANONICAL_APP_ORIGIN;
}

/**
 * Normalizes email by stripping zero-width / control characters, trimming whitespace,
 * and converting to lowercase without corrupting valid Gmail addresses or domains.
 */
export function normalizeAuthEmail(email) {
  if (!email || typeof email !== "string") return "";
  // Strip zero-width, non-breaking, and Unicode control characters
  return email
    .replace(/[\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Standard RFC-compliant email syntax validation.
 */
export function isValidAuthEmail(email) {
  const normalized = normalizeAuthEmail(email);
  if (!normalized || normalized.length < 5 || normalized.length > 254) return false;
  
  const emailRegex = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
  if (!emailRegex.test(normalized)) return false;

  const parts = normalized.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain || !domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;

  return true;
}

/**
 * Production ActionCodeSettings for password reset.
 */
export function getPasswordResetActionSettings() {
  const origin = getAppOrigin();
  return {
    url: `${origin}/login?mode=resetPassword`,
    handleCodeInApp: false
  };
}

/**
 * Production ActionCodeSettings for email verification.
 */
export function getEmailVerificationActionSettings() {
  const origin = getAppOrigin();
  return {
    url: `${origin}/login?mode=verifyEmail`,
    handleCodeInApp: false
  };
}

// Local storage key for persistent user session snapshot across cold reloads
const USER_CACHE_KEY = "aura_cached_user";
const ADMIN_VERIFY_CACHE_KEY = "aura_cached_admin_verify";
const ADMIN_VERIFY_TTL = 24 * 60 * 60 * 1000; // 24 hours cache for instant opening

let inMemoryAdminVerification = null;
try {
  if (typeof window !== "undefined") {
    const rawAdmin = localStorage.getItem(ADMIN_VERIFY_CACHE_KEY);
    if (rawAdmin) {
      const parsed = JSON.parse(rawAdmin);
      if (parsed && parsed.verifiedAt && (Date.now() - parsed.verifiedAt < ADMIN_VERIFY_TTL)) {
        inMemoryAdminVerification = parsed;
      }
    }
    if (import.meta.env.DEV && !inMemoryAdminVerification && localStorage.getItem("isAdmin") === "true") {
      inMemoryAdminVerification = {
        authorized: true,
        user: { email: localStorage.getItem("user_email") || "Admin" },
        verifiedAt: Date.now()
      };
    }
  }
} catch (_) {}

function serializeUser(u) {
  if (!u) return null;
  return {
    uid: u.uid || u.authUserId || "",
    authUserId: u.uid || u.authUserId || "",
    email: u.email || "",
    displayName: u.displayName || "",
    photoURL: u.photoURL || "",
    phoneNumber: u.phoneNumber || "",
    isAnonymous: Boolean(u.isAnonymous),
    emailVerified: Boolean(u.emailVerified),
    providerData: Array.isArray(u.providerData) ? u.providerData.map(p => ({
      providerId: p.providerId,
      email: p.email,
      displayName: p.displayName,
      photoURL: p.photoURL,
      phoneNumber: p.phoneNumber
    })) : [],
    savedAt: Date.now()
  };
}

let inMemoryCachedUser = null;
try {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (raw) {
      inMemoryCachedUser = JSON.parse(raw);
    }
  }
} catch (_) {}

function saveCachedUser(u) {
  if (typeof window === "undefined") return;
  try {
    if (u) {
      const data = serializeUser(u);
      inMemoryCachedUser = data;
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data));
      if (u.email) localStorage.setItem("user_email", u.email);
    } else {
      inMemoryCachedUser = null;
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch (_) {}
}

export const authClient = {
  signInDemoAdmin: () => {
    throw new Error("Demo admin sign-in is disabled.");
  },

  isSignedIn: () => {
    const u = auth.currentUser || inMemoryCachedUser;
    return Boolean(u && !u.isAnonymous);
  },

  hasCurrentUser: () => {
    return Boolean(auth.currentUser || inMemoryCachedUser);
  },
  
  getToken: async (forceRefresh = false, waitForAuth = false) => {
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(forceRefresh);
        if (token) {
          try { localStorage.setItem("user_token", token); } catch (_) {}
          return token;
        }
      }

      if (auth.authStateReady) {
        const timeoutMs = waitForAuth ? 4000 : 2500;
        await Promise.race([
          auth.authStateReady(),
          new Promise((resolve) => setTimeout(resolve, timeoutMs))
        ]);
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken(forceRefresh);
          if (token) {
            try { localStorage.setItem("user_token", token); } catch (_) {}
            return token;
          }
        }
      }
    } catch (e) {
      console.error("Failed to get Firebase token", e);
    }

    try {
      const storedToken = localStorage.getItem("user_token") || localStorage.getItem("aura_admin_token") || "";
      if (storedToken) return storedToken;
    } catch (_) {}

    return "";
  },
  
  getUser: () => {
    return auth.currentUser || inMemoryCachedUser;
  },

  getCachedUser: () => {
    return inMemoryCachedUser;
  },

  getCachedAdminVerification: () => {
    if (!inMemoryAdminVerification && typeof window !== "undefined") {
      try {
        const rawAdmin = localStorage.getItem(ADMIN_VERIFY_CACHE_KEY);
        if (rawAdmin) {
          const parsed = JSON.parse(rawAdmin);
          if (parsed && parsed.authorized && parsed.verifiedAt && (Date.now() - parsed.verifiedAt < ADMIN_VERIFY_TTL)) {
            inMemoryAdminVerification = parsed;
          }
        }
        if (!inMemoryAdminVerification && localStorage.getItem("isAdmin") === "true") {
          inMemoryAdminVerification = {
            authorized: true,
            user: { email: localStorage.getItem("user_email") || "Admin" },
            verifiedAt: Date.now()
          };
        }
      } catch (_) {}
    }
    if (!inMemoryAdminVerification) return null;
    const now = Date.now();
    if (now - (inMemoryAdminVerification.verifiedAt || 0) > ADMIN_VERIFY_TTL) {
      inMemoryAdminVerification = null;
      try { localStorage.removeItem(ADMIN_VERIFY_CACHE_KEY); } catch (_) {}
      return null;
    }
    const currentUid = auth.currentUser?.uid || inMemoryCachedUser?.uid;
    if (inMemoryAdminVerification.uid && currentUid && inMemoryAdminVerification.uid !== currentUid) {
      inMemoryAdminVerification = null;
      try { localStorage.removeItem(ADMIN_VERIFY_CACHE_KEY); } catch (_) {}
      return null;
    }
    return inMemoryAdminVerification;
  },

  verifyAdminStatus: async (force = false) => {
    const currentUid = auth.currentUser?.uid || inMemoryCachedUser?.uid;
    if (!currentUid) return { authorized: false, user: null };

    if (!force) {
      const cached = authClient.getCachedAdminVerification();
      if (cached && cached.authorized) return cached;
    }

    try {
      const token = await authClient.getToken();
      if (!token) return { authorized: false, user: null };

      const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
      const res = await fetch(`${apiBase}/auth/admin-me`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data && data.success && data.authorized && data.role === "admin") {
          const verifiedPayload = {
            authorized: true,
            user: data.user || auth.currentUser || inMemoryCachedUser,
            uid: currentUid,
            verifiedAt: Date.now()
          };
          inMemoryAdminVerification = verifiedPayload;
          try {
            localStorage.setItem(ADMIN_VERIFY_CACHE_KEY, JSON.stringify(verifiedPayload));
            localStorage.setItem("isAdmin", "true");
          } catch (_) {}
          return verifiedPayload;
        }
      }
    } catch (err) {
      console.warn("[authClient] verifyAdminStatus error:", err?.message);
    }
    return { authorized: false, user: null };
  },

  clearAdminCache: () => {
    inMemoryAdminVerification = null;
    try {
      localStorage.removeItem(ADMIN_VERIFY_CACHE_KEY);
      localStorage.removeItem("isAdmin");
    } catch (_) {}
  },

  getCurrentUserAsync: async () => {
    if (auth.currentUser) return auth.currentUser;
    try {
      if (auth.authStateReady) {
        await auth.authStateReady();
      }
    } catch (_) {}
    return auth.currentUser || inMemoryCachedUser;
  },
  
  signInWithGoogle: async () => {
    try {
      localStorage.removeItem("aura_demo_user");
    } catch (_) {}
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (_) {}
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });
    const result = await signInWithPopup(auth, provider);
    saveCachedUser(result.user);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aura:auth-change", { detail: result.user }));
    }
    return result.user;
  },

  signInAnonymously: async () => {
    try {
      localStorage.removeItem("aura_demo_user");
    } catch (_) {}
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (_) {}
    const result = await signInAnonymously(auth);
    saveCachedUser(result.user);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aura:auth-change", { detail: result.user }));
    }
    return result.user;
  },

  signInWithEmail: async (email, password) => {
    const normalized = normalizeAuthEmail(email);
    if (!normalized || !isValidAuthEmail(normalized)) {
      const err = new Error("Please enter a valid email address.");
      err.code = "auth/invalid-email";
      throw err;
    }
    try {
      localStorage.removeItem("aura_demo_user");
    } catch (_) {}
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (_) {}
    const result = await signInWithEmailAndPassword(auth, normalized, password);
    saveCachedUser(result.user);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aura:auth-change", { detail: result.user }));
    }
    return result.user;
  },

  signUpWithEmail: async (email, password) => {
    const normalized = normalizeAuthEmail(email);
    if (!normalized || !isValidAuthEmail(normalized)) {
      const err = new Error("Please enter a valid email address.");
      err.code = "auth/invalid-email";
      throw err;
    }
    try {
      localStorage.removeItem("aura_demo_user");
    } catch (_) {}
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (_) {}
    const result = await createUserWithEmailAndPassword(auth, normalized, password);
    saveCachedUser(result.user);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aura:auth-change", { detail: result.user }));
    }
    return result.user;
  },

  setupRecaptcha: (containerId) => {
    try {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (_) {}
        window.recaptchaVerifier = null;
      }
      const el = typeof document !== "undefined" ? document.getElementById(containerId) : null;
      if (!el) return null;
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
      });
      return window.recaptchaVerifier;
    } catch (e) {
      console.warn("Recaptcha setup warning:", e);
      return null;
    }
  },

  clearRecaptcha: () => {
    if (typeof window !== "undefined" && window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (_) {}
      window.recaptchaVerifier = null;
    }
  },

  signInWithPhone: async (phoneNumber, appVerifier) => {
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  },
  
  signOut: async () => {
    try {
      await signOut(auth);
    } catch {}
    saveCachedUser(null);
    authClient.clearAdminCache();
    try {
      localStorage.removeItem("aura_demo_user");
      localStorage.removeItem("aura_ai_last_auth_uid");
      localStorage.removeItem("user_email");
      localStorage.removeItem("user_token");
      localStorage.removeItem("isAdmin");
      localStorage.removeItem(ADMIN_VERIFY_CACHE_KEY);
    } catch (_) {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aura:auth-change", { detail: null }));
    }
    return true;
  },
  
  onAuthStateChanged: (callback) => {
    const active = auth.currentUser || inMemoryCachedUser;
    if (active) {
      callback(active);
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      try {
        localStorage.removeItem("aura_demo_user");
        localStorage.removeItem("aura_admin_token");
      } catch (_) {}
      if (user) {
        saveCachedUser(user);
        callback(user);
      } else {
        saveCachedUser(null);
        authClient.clearAdminCache();
        callback(null);
      }
    });

    return () => {
      unsub();
    };
  },

  signInAsDemo: () => {
    throw new Error("Demo sign-in is disabled.");
  },

  sendVerificationEmail: async (user) => {
    const targetUser = user || auth.currentUser;
    if (!targetUser) {
      throw new Error("No authenticated user found to verify.");
    }

    // Authoritative email from Firebase User object
    const authoritativeEmail = targetUser.email ? normalizeAuthEmail(targetUser.email) : "";
    if (!authoritativeEmail) {
      throw new Error("User has no email address associated with their account.");
    }

    const actionCodeSettings = getEmailVerificationActionSettings();

    // Safe dev diagnostic (never logs tokens, passwords, or credentials)
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
      console.log(`[Auth Diagnostic] sendVerificationEmail -> target: ${authClient.maskEmail(authoritativeEmail)}, project: ${firebaseConfig.projectId}, origin: ${getAppOrigin()}`);
    }

    try {
      return await sendEmailVerification(targetUser, actionCodeSettings);
    } catch (err) {
      if (err?.code === "auth/unauthorized-continue-uri" || err?.code === "auth/invalid-continue-uri") {
        console.warn("[Auth] ActionCodeSettings continue URI warning, retrying with standard Firebase URL:", err?.message);
        return await sendEmailVerification(targetUser);
      }
      throw err;
    }
  },

  reloadCurrentUser: async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("aura:auth-change", { detail: auth.currentUser }));
      }
      return auth.currentUser;
    }
    return null;
  },

  updateUserProfile: async (profileData) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, profileData);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("aura:auth-change", { detail: auth.currentUser }));
      }
      return auth.currentUser;
    }
    return null;
  },

  sendPasswordReset: async (email) => {
    const normalizedEmail = normalizeAuthEmail(email);
    if (!normalizedEmail || !isValidAuthEmail(normalizedEmail)) {
      const err = new Error("Please enter a valid email address.");
      err.code = "auth/invalid-email";
      throw err;
    }

    const actionCodeSettings = getPasswordResetActionSettings();

    // Safe dev diagnostic (never logs tokens, passwords, or credentials)
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
      console.log(`[Auth Diagnostic] sendPasswordReset -> target: ${authClient.maskEmail(normalizedEmail)}, project: ${firebaseConfig.projectId}, origin: ${getAppOrigin()}`);
    }

    try {
      return await sendPasswordResetEmail(auth, normalizedEmail, actionCodeSettings);
    } catch (err) {
      if (err?.code === "auth/unauthorized-continue-uri" || err?.code === "auth/invalid-continue-uri") {
        console.warn("[Auth] ActionCodeSettings continue URI warning, retrying with standard Firebase URL:", err?.message);
        return await sendPasswordResetEmail(auth, normalizedEmail);
      }
      throw err;
    }
  },

  verifyResetCode: async (code) => {
    return await verifyPasswordResetCode(auth, code);
  },

  confirmPasswordReset: async (code, newPassword) => {
    return await confirmPasswordReset(auth, code, newPassword);
  },

  applyActionCode: async (code) => {
    return await applyActionCode(auth, code);
  },

  checkActionCode: async (code) => {
    return await checkActionCode(auth, code);
  },

  maskEmail: (email) => {
    if (!email || typeof email !== "string" || !email.includes("@")) return email || "";
    const clean = normalizeAuthEmail(email);
    const parts = clean.split("@");
    if (parts.length !== 2) return clean;
    const [local, domain] = parts;
    if (local.length <= 2) {
      return `${local[0] || "*"}***@${domain}`;
    }
    const visiblePrefix = local.slice(0, 2);
    const visibleSuffix = local.length > 4 ? local.slice(-1) : "";
    return `${visiblePrefix}****${visibleSuffix}@${domain}`;
  },

  formatAuthError: (err) => {
    if (!err) return "Authentication failed";
    const code = err.code || "";
    const msg = err.message || String(err);

    if (code === "auth/operation-not-allowed" || msg.includes("operation-not-allowed")) {
      return "This sign-in provider is not enabled yet in Firebase Console (Authentication > Sign-in method). Please enable Google / Email provider or use Email/Password sign-in.";
    }
    if (code === "auth/unauthorized-domain" || msg.includes("unauthorized-domain")) {
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "your-domain.run.app";
      return `Domain not authorized: Firebase requires "${currentHost}" to be added under Firebase Console > Authentication > Settings > Authorized Domains. (You can also use Email & Password sign-in or guest checkout in the meantime).`;
    }
    if (code === "auth/popup-blocked" || msg.includes("popup-blocked")) {
      return "The Google login popup was blocked by the browser. Please allow popups for this site or open the page in a new browser tab.";
    }
    if (code === "auth/network-request-failed" || msg.includes("network-request-failed")) {
      return "Unable to connect right now. Please check your internet connection and try again.";
    }
    if (code === "auth/popup-closed-by-user") {
      return "Sign-in popup was closed before completing.";
    }
    if (code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
      return "Email or password is incorrect. Please check your credentials and try again.";
    }
    if (code === "auth/email-already-in-use") {
      return "An account already exists with this email address. Please sign in or reset your password.";
    }
    if (code === "auth/weak-password") {
      return "Please choose a stronger password (at least 8 characters).";
    }
    if (code === "auth/invalid-email") {
      return "Please enter a valid email address.";
    }
    if (code === "auth/user-disabled") {
      return "This account has been disabled. Please contact Aura Rudraksha support.";
    }
    if (code === "auth/too-many-requests") {
      return "Too many attempts. Please wait a few moments before trying again.";
    }
    if (code === "auth/expired-action-code") {
      return "This link has expired. Please request a new verification or password reset email.";
    }
    if (code === "auth/invalid-action-code") {
      return "This link is invalid or has already been used.";
    }
    if (code === "auth/requires-recent-login") {
      return "Please sign in again to complete this sensitive action.";
    }
    if (code === "auth/invalid-phone-number") {
      return "Please enter a valid phone number with country code (e.g. +91 98765 43210).";
    }
    if (code === "auth/quota-exceeded" || msg.includes("quota-exceeded")) {
      return "SMS quota exceeded. Please try Email login or Google Sign-In.";
    }
    return msg || "Authentication failed. Please try again.";
  }
};

