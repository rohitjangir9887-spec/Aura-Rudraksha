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
  signInAnonymously
} from "firebase/auth";
import firebaseAppletConfig from "../../firebase-applet-config.json" with { type: "json" };

const firebaseConfig = {
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

// The demo/guest session is a development-only convenience so the UI is
// usable without live Firebase credentials while building. Vite statically
// resolves import.meta.env.DEV to `false` in production builds, so this can
// never be true in a shipped production bundle regardless of runtime env
// misconfiguration.
const DEV_DEMO_AUTH_ENABLED = !!(import.meta.env && import.meta.env.DEV);

function readDemoUser() {
  if (!DEV_DEMO_AUTH_ENABLED) return null;
  try {
    const demo = localStorage.getItem("aura_demo_user");
    return demo ? JSON.parse(demo) : null;
  } catch {
    return null;
  }
}

export const authClient = {
  isSignedIn: () => {
    if (auth.currentUser) return true;
    return !!readDemoUser();
  },
  
  getToken: async (forceRefresh = false) => {
    try {
      if (!auth.currentUser && auth.authStateReady) {
        await Promise.race([
          auth.authStateReady(),
          new Promise((resolve) => setTimeout(resolve, 1500))
        ]);
      }
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken(forceRefresh);
      }
      if (readDemoUser()) return "demo-token-123";
    } catch (e) {
      console.error("Failed to get Firebase token", e);
    }
    return "";
  },
  
  getUser: () => {
    if (auth.currentUser) return auth.currentUser;
    return readDemoUser();
  },

  getCurrentUserAsync: async () => {
    if (auth.currentUser) return auth.currentUser;
    const demo = readDemoUser();
    if (demo) return demo;
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
    try {
      localStorage.removeItem("aura_demo_user");
    } catch (_) {}
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (_) {}
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aura:auth-change", { detail: result.user }));
    }
    return result.user;
  },

  signUpWithEmail: async (email, password) => {
    try {
      localStorage.removeItem("aura_demo_user");
    } catch (_) {}
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (_) {}
    const result = await createUserWithEmailAndPassword(auth, email, password);
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
    } else {
      const initialDemo = readDemoUser();
      if (initialDemo) {
        callback(initialDemo);
      }
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        try {
          localStorage.removeItem("aura_demo_user");
        } catch (_) {}
        callback(user);
      } else {
        const demo = readDemoUser();
        callback(demo || null);
      }
    });

    const handleDemoChange = (e) => {
      callback(e.detail);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("aura:auth-change", handleDemoChange);
    }

    return () => {
      unsub();
      if (typeof window !== "undefined") {
        window.removeEventListener("aura:auth-change", handleDemoChange);
      }
    };
  },

  // Development-only guest/demo session. No-ops in production builds so a
  // real Firebase auth failure always surfaces a real error instead of
  // silently granting a fake (and, for isAdmin=true, admin-looking) session.
  signInAsDemo: (isAdmin = false) => {
    if (!DEV_DEMO_AUTH_ENABLED) {
      throw new Error("Demo sign-in is only available in development.");
    }
    const demoUser = {
      uid: isAdmin ? "DEMO-ADMIN-UID" : "DEMO-USER-UID",
      email: isAdmin ? "rohitjangir8740@gmail.com" : "customer@aurarudraksha.com",
      displayName: isAdmin ? "Aura Admin" : "Aura Devotee",
      phoneNumber: "+919672996531",
      emailVerified: true,
      isAnonymous: false,
      getIdToken: async () => "demo-token-123"
    };
    try {
      localStorage.setItem("aura_demo_user", JSON.stringify(demoUser));
    } catch (_) {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aura:auth-change", { detail: demoUser }));
    }
    return demoUser;
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
      return "Network error. If you are in the iframe preview, please open the app in a new tab or check your connection.";
    }
    if (code === "auth/popup-closed-by-user") {
      return "Sign-in popup was closed before completing.";
    }
    if (code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-credential") {
      return "Invalid credentials. Please verify your email/phone and password and try again.";
    }
    if (code === "auth/email-already-in-use") {
      return "An account already exists with this email address. Please sign in instead.";
    }
    if (code === "auth/invalid-phone-number") {
      return "Please enter a valid phone number with country code (e.g. +91 98765 43210).";
    }
    if (code === "auth/quota-exceeded" || msg.includes("quota-exceeded")) {
      return "SMS quota exceeded. Please try Email login or Google Sign-In.";
    }
    return msg || "Authentication failed";
  }
};

