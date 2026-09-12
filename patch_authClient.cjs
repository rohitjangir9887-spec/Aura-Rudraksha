const fs = require('fs');

const authContent = `import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
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

const firebaseConfig = {
  projectId: "alert-will-28gvj",
  appId: "1:165075487673:web:c922a62ff4ca1a0cf24468",
  apiKey: "AIzaSyD1KOeewt0nM5y4UX1Q6l_bCvrHRVIwqow",
  authDomain: "alert-will-28gvj.firebaseapp.com",
  storageBucket: "alert-will-28gvj.firebasestorage.app",
  messagingSenderId: "165075487673"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const authClient = {
  isSignedIn: () => {
    return !!auth.currentUser;
  },
  
  getToken: async () => {
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken(true);
      } catch (e) {
        console.error("Failed to get Firebase token", e);
        return "";
      }
    }
    return "";
  },
  
  getUser: () => {
    return auth.currentUser;
  },
  
  signInWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (e) {
      console.error("Google sign in failed", e);
      throw e;
    }
  },

  signInAnonymously: async () => {
    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (e) {
      console.error("Anonymous sign in failed", e);
      throw e;
    }
  },
  
  signOut: async () => {
    try {
      await signOut(auth);
      return true;
    } catch (e) {
      console.error("Sign out failed", e);
      return false;
    }
  },
  
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  }
};
`;

fs.writeFileSync('src/lib/authClient.js', authContent);
