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
import firebaseAppletConfig from "../../firebase-applet-config.json" with { type: "json" };

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
export const CANONICAL_APP_ORIGIN = "https://www.aurarudraksha.bond";

/**
 * Returns the active or canonical application origin.
 * Ensures localhost / loopback IPs are never emitted in production action links.
 */
export function getAppOrigin() {
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (
      !origin.includes("localhost") && 
      !origin.includes("127.0.0.1") && 
      !origin.includes("0.0.0.0") &&
      origin.startsWith("http")
    ) {
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

// The demo/guest session is a development-only convenience so the UI is
// usable without live Firebase credentials while building. Vite statically
// resolves import.meta.env.DEV to `false` in production builds, so this can
// never be true in a shipped production bundle regardless of runtime env
// misconfiguration.
function readDemoUser() {
  return null;
}

export const authClient = {
  signInDemoAdmin: () => {
    throw new Error("Demo admin sign-in is disabled.");
  },

  isSignedIn: () => {
    return Boolean(auth.currentUser);
  },

  hasCurrentUser: () => {
    return Boolean(auth.currentUser);
  },
  
  getToken: async (forceRefresh = false, waitForAuth = false) => {
    try {
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken(forceRefresh);
      }

      if (waitForAuth && auth.authStateReady) {
        await Promise.race([
          auth.authStateReady(),
          new Promise((resolve) => setTimeout(resolve, 1200))
        ]);
        if (auth.currentUser) {
          return await auth.currentUser.getIdToken(forceRefresh);
        }
      }
    } catch (e) {
      console.error("Failed to get Firebase token", e);
    }
    return "";
  },
  
  getUser: () => {
    return auth.currentUser;
  },

  getCurrentUserAsync: async () => {
    if (auth.currentUser) return auth.currentUser;
    try {
      if (auth.authStateReady) {
        await auth.authStateReady();
      }
    } catch (_) {}
    return auth.currentUser;
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
    try {
      localStorage.removeItem("aura_demo_user");
      localStorage.removeItem("aura_ai_last_auth_uid");
    } catch (_) {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aura:auth-change", { detail: null }));
    }
    return true;
  },
  
  onAuthStateChanged: (callback) => {
    if (auth.currentUser) {
      callback(auth.currentUser);
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      try {
        localStorage.removeItem("aura_demo_user");
        localStorage.removeItem("aura_admin_token");
      } catch (_) {}
      callback(user || null);
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

