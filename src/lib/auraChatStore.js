// Aura AI Unified Chat Store & Persistence Manager
// Manages shared chat history between floating window, full window modal, and full page Aura AI.

const STORAGE_KEY_MSGS_STANDARD = "aura_ai_unified_chat_history_standard";
const STORAGE_KEY_MSGS_PANDITJI = "aura_ai_unified_chat_history_panditji";
const STORAGE_KEY_CONV_ID = "aura_ai_active_conv_id";

// Migrate legacy chat key to standard key if present
try {
  const oldRaw = localStorage.getItem("aura_ai_unified_chat_history");
  if (oldRaw && !localStorage.getItem(STORAGE_KEY_MSGS_STANDARD)) {
    localStorage.setItem(STORAGE_KEY_MSGS_STANDARD, oldRaw);
    localStorage.removeItem("aura_ai_unified_chat_history");
  }
} catch (_) {}

// In-memory dismissal & open states so floating window state persists smoothly across client navigation
let isFloatingDismissedSession = false;
let isFloatingOpenState = false;
let currentActiveMode = "standard";
let _pendingTrigger = null;

// High performance in-memory message cache & debounced disk sync to prevent touch freezing during streaming
const _messagesCache = {
  standard: null,
  panditji: null
};
let _saveDebounceTimer = null;
const _pendingSaveModes = new Set();

// Clear any old permanent localStorage flag on load
try {
  localStorage.removeItem("aura_ai_floating_dismissed");
} catch (_) {}

const DEFAULT_INITIAL_MESSAGE_STANDARD = {
  id: "init_welcome_standard",
  sender: "ai",
  text: "🙏 नमस्ते! मैं Aura AI हूँ — Aura Rudraksha का पर्सनल शॉपिंग व सर्टिफाइड रुद्राक्ष गाइड।\n\nआज मैं आपके लिए क्या खोजूँ?",
  quickReplies: [
    "📿 सिद्ध 1 से 14 मुखी रुद्राक्ष देखें",
    "✨ फ्री कुंडली व राशि अनुसार रुद्राक्ष",
    "🎁 आज के एक्टिव डिस्काउंट कूपन",
    "📦 मेरा ऑर्डर ट्रैक करें"
  ],
  timestamp: new Date().toISOString()
};

const DEFAULT_INITIAL_MESSAGE_PANDITJI = {
  id: "init_welcome_panditji",
  sender: "ai",
  text: "🙏 प्रणाम भक्त! हर हर महादेव।\n\nमैं AI पंडित जी (🕉️) हूँ — वैदिक ज्योतिष, जन्म कुंडली, ग्रह दशा, मुहूर्त व रुद्राक्ष परामर्श में आपका आध्यात्मिक मार्गदर्शक।\n\nआज मैं आपकी जन्म कुंडली, महादशा, विवाह/करियर योग या सिद्ध रुद्राक्ष धारण में किस प्रकार सहायता करूँ?",
  quickReplies: [
    "✨ मेरी जन्म कुंडली व महादशा देखें",
    "📿 मेरे लिए सबसे शुभ रुद्राक्ष कौन सा है?",
    "💰 धन, व्यापार व करियर में उन्नति के उपाय",
    "❤️ विवाह में देरी व दांपत्य सुख के उपाय"
  ],
  timestamp: new Date().toISOString()
};

// Format Timestamp to Time: "10:35 AM"
export function formatMessageTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (_) {
    return "";
  }
}

// Format Date to Dynamic Label ("Today", "Yesterday", "Sunday", "Monday", ..., or "24 Aug 2026")
export function getDateDividerLabel(isoString) {
  if (!isoString) return "Today";
  try {
    const msgDate = new Date(isoString);
    if (isNaN(msgDate.getTime())) return "Today";

    const now = new Date();
    
    // Normalize dates to midnight for accurate calendar day differences
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    
    const diffTime = today.getTime() - target.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays > 1 && diffDays < 7) {
      return target.toLocaleDateString("en-US", { weekday: "long" });
    } else {
      return target.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }
  } catch (_) {
    return "Today";
  }
}

export const auraChatStore = {
  getGuestSessionId() {
    try {
      let gid = localStorage.getItem("aura_ai_guest_session_id");
      if (!gid || typeof gid !== "string" || !gid.startsWith("guest_")) {
        gid = "guest_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("aura_ai_guest_session_id", gid);
      }
      return gid;
    } catch (_) {
      return "guest_fallback_" + Date.now();
    }
  },

  resetGuestSession() {
    try {
      const newGid = "guest_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      localStorage.setItem("aura_ai_guest_session_id", newGid);
      return newGid;
    } catch (_) {
      return "guest_fallback_" + Date.now();
    }
  },

  getCurrentUserUid() {
    try {
      const rawUser = localStorage.getItem("auth_user") || localStorage.getItem("aura_auth_user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const resolved = u?.authUserId || u?.uid || (u?.email ? `email_${u.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}` : "guest");
        if (resolved && resolved !== "guest") return resolved;
      }
    } catch (_) {}
    return "guest";
  },

  clearLocalChats() {
    try {
      const uid = this.getCurrentUserUid();
      localStorage.removeItem(`aura_ai_chat_standard_${uid}`);
      localStorage.removeItem(`aura_ai_chat_panditji_${uid}`);
      localStorage.removeItem(`aura_ai_birth_details_${uid}`);
      localStorage.removeItem(`aura_ai_active_conv_${uid}`);
      localStorage.removeItem(STORAGE_KEY_MSGS_STANDARD);
      localStorage.removeItem(STORAGE_KEY_MSGS_PANDITJI);
      localStorage.removeItem(STORAGE_KEY_CONV_ID);
      localStorage.removeItem("aura_ai_unified_chat_history");
    } catch (_) {}
  },

  _birthDetailsClearedInMemory: false,

  cleanKundaliName(rawVal) {
    if (!rawVal) return "";
    let cleaned = String(rawVal)
      .replace(/[।॥|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    cleaned = cleaned
      .replace(/(?:\s+(?:है|हैं|था|थी|जी|hai|hain|is))+$/i, "")
      .replace(/[।॥|.,;:!?]+$/g, "")
      .trim();
    return cleaned;
  },

  isBirthDetailsCleared() {
    if (this._birthDetailsClearedInMemory) return true;
    try {
      const uid = this.getCurrentUserUid();
      return sessionStorage.getItem(`aura_ai_clear_birth_pending_${uid}`) === "1";
    } catch (_) {
      return false;
    }
  },

  setBirthDetailsCleared(flag) {
    this._birthDetailsClearedInMemory = Boolean(flag);
    try {
      const uid = this.getCurrentUserUid();
      if (flag) {
        sessionStorage.setItem(`aura_ai_clear_birth_pending_${uid}`, "1");
      } else {
        sessionStorage.removeItem(`aura_ai_clear_birth_pending_${uid}`);
      }
    } catch (_) {}
  },

  clearActiveBirthDetails() {
    try {
      const uid = this.getCurrentUserUid();
      this.setBirthDetailsCleared(true);
      localStorage.removeItem(`aura_ai_birth_details_${uid}`);
      window.dispatchEvent(new CustomEvent("aura_ai_birth_details_cleared", { detail: { uid } }));

      if (typeof fetch === "function") {
        const token = localStorage.getItem("token") || localStorage.getItem("aura_auth_token") || "";
        const headers = {
          "Content-Type": "application/json",
          "X-Guest-Session-ID": this.getGuestSessionId()
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        fetch("/api/aura-ai/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            clearBirthDetails: true,
            clearOnly: true,
            sessionId: this.getConversationId()
          })
        }).catch(() => {});
      }
    } catch (_) {}
  },

  getVerifiedBirthDetails() {
    try {
      const uid = this.getCurrentUserUid();
      const raw = localStorage.getItem(`aura_ai_birth_details_${uid}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.dob && (parsed.birthTime || parsed.time) && (parsed.birthPlace || parsed.place)) {
          const cleanedName = this.cleanKundaliName(parsed.name || parsed.devoteeName || "Devotee") || "Devotee";
          if (cleanedName !== parsed.name) {
            parsed.name = cleanedName;
            localStorage.setItem(`aura_ai_birth_details_${uid}`, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  },

  getSavedKundalis() {
    try {
      const uid = this.getCurrentUserUid();
      const kundaliKey = `aura_ai_saved_kundalis_${uid}`;
      const raw = localStorage.getItem(kundaliKey);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : [];
        let mutated = false;
        const normalizedList = list.map((item, idx) => {
          if (!item || typeof item !== "object") return null;
          let id = item.id;
          if (!id) {
            id = `prof_mig_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
            mutated = true;
          }
          const rawItemName = (item.name || item.devoteeName || "Devotee").trim() || "Devotee";
          const cleanedItemName = this.cleanKundaliName(rawItemName) || "Devotee";
          if (cleanedItemName !== item.name) {
            mutated = true;
          }
          return {
            ...item,
            id,
            name: cleanedItemName,
            birthTime: item.birthTime || item.time || "12:00",
            time: item.time || item.birthTime || "12:00",
            birthPlace: item.birthPlace || item.place || "",
            place: item.place || item.birthPlace || ""
          };
        }).filter(Boolean);
        if (mutated) {
          localStorage.setItem(kundaliKey, JSON.stringify(normalizedList));
        }
        return normalizedList;
      }

      // Only seed when key is genuinely uninitialized (raw === null), never after explicit clear/delete ("[]")
      const active = this.getVerifiedBirthDetails();
      if (active && active.dob) {
        const initial = [{
          id: active.id || "prof_initial_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          name: this.cleanKundaliName(active.name || active.devoteeName || "Devotee") || "Devotee",
          dob: active.dob,
          birthTime: active.birthTime || active.time || "12:00",
          time: active.time || active.birthTime || "12:00",
          birthPlace: active.birthPlace || active.place || "",
          place: active.place || active.birthPlace || "",
          concern: active.concern || "all",
          relation: active.relation || "Self",
          savedAt: active.savedAt || new Date().toISOString()
        }];
        localStorage.setItem(kundaliKey, JSON.stringify(initial));
        return initial;
      }
      return [];
    } catch (_) {
      return [];
    }
  },

  addSavedKundali(profile) {
    if (!profile || !profile.dob) return [];
    try {
      this.setBirthDetailsCleared(false);
      const uid = this.getCurrentUserUid();
      const kundaliKey = `aura_ai_saved_kundalis_${uid}`;
      const existingList = this.getSavedKundalis();
      const cleanName = this.cleanKundaliName(profile.name || profile.devoteeName || "Devotee") || "Devotee";
      const cleanTime = String(profile.birthTime || profile.time || "12:00").trim() || "12:00";
      const cleanPlace = String(profile.birthPlace || profile.place || "").trim();
      const cleanDob = String(profile.dob).trim();

      const matchingExisting = existingList.find(
        (k) =>
          (profile.id && k.id === profile.id) ||
          (k.dob === cleanDob &&
            ((k.name || "").trim().toLowerCase() === cleanName.toLowerCase() ||
              (k.name || "").trim().toLowerCase() === "devotee"))
      );

      const newProf = {
        id: profile.id || matchingExisting?.id || `prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        dob: cleanDob,
        birthTime: cleanTime,
        time: cleanTime,
        birthPlace: cleanPlace,
        place: cleanPlace,
        concern: profile.concern || matchingExisting?.concern || "all",
        relation: profile.relation || matchingExisting?.relation || "Self",
        savedAt: new Date().toISOString()
      };

      const updated = [
        newProf,
        ...existingList.filter((k) => {
          if (k.id === newProf.id) return false;
          if (k.dob === newProf.dob && (k.name || "").trim().toLowerCase() === newProf.name.toLowerCase()) return false;
          if (k.dob === newProf.dob && (k.name || "").trim().toLowerCase() === "devotee" && newProf.name.toLowerCase() !== "devotee") return false;
          return true;
        })
      ].slice(0, 30);

      localStorage.setItem(kundaliKey, JSON.stringify(updated));

      // Keep activeBirthDetails in sync if it shares the same DOB or is empty
      const currentActive = this.getVerifiedBirthDetails();
      if (!currentActive || currentActive.dob === newProf.dob || currentActive.id === newProf.id) {
        localStorage.setItem(`aura_ai_birth_details_${uid}`, JSON.stringify(newProf));
        window.dispatchEvent(new CustomEvent("aura_ai_birth_details_updated", { detail: { uid, details: newProf } }));
      }

      window.dispatchEvent(new CustomEvent("aura_ai_saved_kundalis_updated", { detail: { uid, kundalis: updated } }));
      return updated;
    } catch (e) {
      console.warn("Could not add saved kundali:", e);
      return this.getSavedKundalis();
    }
  },

  deleteSavedKundali(id, fallbackIndex = -1, fallbackProfile = null) {
    try {
      const uid = this.getCurrentUserUid();
      const kundaliKey = `aura_ai_saved_kundalis_${uid}`;
      const existingList = this.getSavedKundalis();
      let removedProfile = fallbackProfile || null;

      const updated = existingList.filter((item, idx) => {
        const matchById = Boolean(id) && item.id === id;
        const matchByIndex = fallbackIndex >= 0 && idx === fallbackIndex && (!id || item.id === id);
        const matchByFields = Boolean(
          fallbackProfile &&
          item.dob === fallbackProfile.dob &&
          this.cleanKundaliName(item.name || "").toLowerCase() === this.cleanKundaliName(fallbackProfile.name || "").toLowerCase()
        );
        if (matchById || matchByIndex || matchByFields) {
          removedProfile = item;
          return false;
        }
        return true;
      });

      localStorage.setItem(kundaliKey, JSON.stringify(updated));

      // Clear activeBirthDetails if the deleted Kundli matched by ID or DOB, or if no saved Kundalis remain
      const currentActive = this.getVerifiedBirthDetails();
      if (updated.length === 0) {
        this.clearActiveBirthDetails();
      } else if (currentActive && removedProfile) {
        const sameId = Boolean(currentActive.id && removedProfile.id && currentActive.id === removedProfile.id);
        const sameDob = Boolean(currentActive.dob && removedProfile.dob && currentActive.dob === removedProfile.dob);
        if (sameId || sameDob) {
          this.clearActiveBirthDetails();
        }
      }

      // Also scrub deleted profile's birthDetails from saved history sessions so loading history doesn't resurrect it
      if (removedProfile && removedProfile.dob) {
        try {
          const histKey = `aura_ai_saved_sessions_panditji_${uid}`;
          const rawHist = localStorage.getItem(histKey);
          if (rawHist) {
            const parsedHist = JSON.parse(rawHist);
            if (Array.isArray(parsedHist)) {
              const cleanedHist = parsedHist.map((s) =>
                s?.birthDetails?.dob === removedProfile.dob ? { ...s, birthDetails: null } : s
              );
              localStorage.setItem(histKey, JSON.stringify(cleanedHist));
            }
          }
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent("aura_ai_saved_kundalis_updated", { detail: { uid, kundalis: updated } }));
      return updated;
    } catch (e) {
      console.warn("Could not delete saved kundali:", e);
      return this.getSavedKundalis();
    }
  },

  saveVerifiedBirthDetails(details, options = {}) {
    if (!details || !details.dob) return null;
    try {
      if (options?.userInitiated) {
        this.setBirthDetailsCleared(false);
      } else if (this.isBirthDetailsCleared()) {
        // Block background stream/session events from resurrecting a deleted/cleared Kundli
        return null;
      }

      const uid = this.getCurrentUserUid();
      const current = this.getVerifiedBirthDetails();
      const savedKundalis = this.getSavedKundalis();

      const rawName = this.cleanKundaliName(details.name || details.devoteeName || "");
      const isGenericName = !rawName || rawName.toLowerCase() === "devotee";
      const cleanTime = String(details.birthTime || details.time || "12:00").trim() || "12:00";
      const cleanPlace = String(details.birthPlace || details.place || "").trim();

      // Protect real user/saved name against fallback "Devotee" overwrites
      let resolvedName = rawName || "Devotee";
      let matchedSaved = null;
      if (details.id) {
        matchedSaved = savedKundalis.find((k) => k.id === details.id) || null;
      }
      if (!matchedSaved) {
        matchedSaved =
          savedKundalis.find(
            (k) =>
              k.dob === details.dob &&
              (!isGenericName
                ? this.cleanKundaliName(k.name || "").toLowerCase() === rawName.toLowerCase()
                : (k.birthTime || k.time || "12:00") === cleanTime)
          ) ||
          savedKundalis.find((k) => k.dob === details.dob && this.cleanKundaliName(k.name || "").toLowerCase() !== "devotee") ||
          null;
      }

      if (isGenericName) {
        const currentClean = this.cleanKundaliName(current?.name || "");
        const savedClean = this.cleanKundaliName(matchedSaved?.name || "");
        if (current && current.dob === details.dob && currentClean && currentClean.toLowerCase() !== "devotee") {
          resolvedName = currentClean;
        } else if (matchedSaved && savedClean && savedClean.toLowerCase() !== "devotee") {
          resolvedName = savedClean;
        }
      } else if (options?.userInitiated !== true) {
        // When coming from background server payload, never overwrite an already-saved clean name for the same DOB
        const currentClean = this.cleanKundaliName(current?.name || "");
        const savedClean = this.cleanKundaliName(matchedSaved?.name || "");
        if (current && current.dob === details.dob && currentClean && currentClean.toLowerCase() !== "devotee") {
          resolvedName = currentClean;
        } else if (matchedSaved && savedClean && savedClean.toLowerCase() !== "devotee") {
          resolvedName = savedClean;
        }
      }

      const resolvedId =
        details.id ||
        matchedSaved?.id ||
        (current?.dob === details.dob ? current?.id : undefined) ||
        "prof_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);

      // Skip redundant storage writes and event spam if details are identical
      if (
        current &&
        current.dob === details.dob &&
        (current.birthTime || current.time) === cleanTime &&
        (current.birthPlace || current.place) === cleanPlace &&
        (current.name || "") === resolvedName
      ) {
        return current;
      }

      const normalized = {
        id: resolvedId,
        name: resolvedName,
        dob: details.dob,
        birthTime: cleanTime,
        time: cleanTime,
        birthPlace: cleanPlace,
        place: cleanPlace,
        concern: details.concern || matchedSaved?.concern || "all",
        relation: details.relation || matchedSaved?.relation || "Self",
        savedAt: details.savedAt || matchedSaved?.savedAt || new Date().toISOString()
      };

      // 1. Save as active birth details
      localStorage.setItem(`aura_ai_birth_details_${uid}`, JSON.stringify(normalized));

      // 2. Automatically save/update into persistent Saved Kundalis collection without changing real name to Devotee
      const kundaliKey = `aura_ai_saved_kundalis_${uid}`;
      const existingIdx = savedKundalis.findIndex(
        (k) =>
          (k.id && k.id === normalized.id) ||
          (this.cleanKundaliName(k.name || "").toLowerCase() === normalized.name.toLowerCase() && k.dob === normalized.dob) ||
          (k.dob === normalized.dob && this.cleanKundaliName(k.name || "").toLowerCase() === "devotee")
      );

      let nextList;
      if (existingIdx >= 0) {
        nextList = [...savedKundalis];
        const prevEntry = nextList[existingIdx];
        const prevCleanName = this.cleanKundaliName(prevEntry.name || "");
        const finalEntryName =
          normalized.name.toLowerCase() === "devotee" && prevCleanName && prevCleanName.toLowerCase() !== "devotee"
            ? prevCleanName
            : normalized.name;
        nextList[existingIdx] = {
          ...prevEntry,
          ...normalized,
          name: finalEntryName,
          id: prevEntry.id || normalized.id,
          updatedAt: new Date().toISOString()
        };
      } else {
        nextList = [
          {
            ...normalized,
            savedAt: new Date().toISOString()
          },
          ...savedKundalis
        ];
      }

      // Keep up to 30 saved kundalis
      const trimmed = nextList.slice(0, 30);
      localStorage.setItem(kundaliKey, JSON.stringify(trimmed));

      window.dispatchEvent(new CustomEvent("aura_ai_birth_details_updated", { detail: { uid, details: normalized } }));
      window.dispatchEvent(new CustomEvent("aura_ai_saved_kundalis_updated", { detail: { uid, kundalis: trimmed } }));
      return normalized;
    } catch (e) {
      console.warn("Could not auto-save birth details:", e);
      return null;
    }
  },

  // Automatically save current chat conversation to user's saved session history
  saveSessionToHistory(mode = "standard", overrideMsgs = null, overrideConvId = null) {
    try {
      const uid = this.getCurrentUserUid();
      const convId = overrideConvId || this.getConversationId();
      const currentMsgs = overrideMsgs || this.getMessages(mode);

      // Only archive if there is at least one meaningful interaction beyond default greeting
      const userMsgs = (currentMsgs || []).filter(
        (m) => m.sender === "user" || (m.sender === "ai" && !m.id?.startsWith("init_welcome") && !m.id?.startsWith("init_panditji") && !m.id?.startsWith("init_standard"))
      );

      if (!userMsgs || userMsgs.length === 0) {
        return false;
      }

      const storageKey = `aura_ai_saved_sessions_${mode}_${uid}`;
      let list = [];
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) list = JSON.parse(raw);
      } catch (_) {}

      // Find first user question or AI topic for a meaningful session title
      const firstUserMsg = (currentMsgs || []).find((m) => m.sender === "user")?.text || "";
      let title = firstUserMsg.trim().replace(/\n+/g, " ");
      if (title.length > 55) {
        title = title.slice(0, 52) + "...";
      }
      if (!title) {
        title = mode === "panditji" ? "🕉️ वैदिक ज्योतिष व कुंडली परामर्श" : "📿 सिद्ध रुद्राक्ष परामर्श";
      }

      const activeBirth = this.getVerifiedBirthDetails();
      const sessionData = {
        id: convId,
        title,
        timestamp: new Date().toISOString(),
        messageCount: currentMsgs.length,
        messages: currentMsgs,
        birthDetails: activeBirth,
        mode
      };

      const existingIndex = list.findIndex((s) => s.id === convId);
      if (existingIndex >= 0) {
        list[existingIndex] = sessionData;
      } else {
        list.unshift(sessionData);
      }

      // Cap at 40 archived sessions
      const trimmedList = list.slice(0, 40);
      localStorage.setItem(storageKey, JSON.stringify(trimmedList));
      window.dispatchEvent(new CustomEvent("aura_ai_history_updated", { detail: { mode, uid, count: trimmedList.length } }));
      return true;
    } catch (e) {
      console.warn("Could not auto-save chat session to history:", e);
      return false;
    }
  },

  getStorageKey(mode = "standard") {
    const uid = this.getCurrentUserUid();
    const prefix = mode === "panditji" ? "aura_ai_chat_panditji" : "aura_ai_chat_standard";
    return `${prefix}_${uid}`;
  },

  getDefaultInitialMessage(mode = "standard") {
    return mode === "panditji" ? DEFAULT_INITIAL_MESSAGE_PANDITJI : DEFAULT_INITIAL_MESSAGE_STANDARD;
  },

  // Check if there are user messages beyond the default welcome message
  hasUserMessages(mode = "standard") {
    try {
      const msgs = this.getMessages(mode);
      return msgs.some((m) => m.sender === "user" || (m.sender === "ai" && !m.id?.startsWith("init_welcome")));
    } catch (_) {
      return false;
    }
  },

  // Get messages for active mode (in-memory cached for zero touch lag)
  getMessages(mode = "standard") {
    if (_messagesCache[mode] && Array.isArray(_messagesCache[mode]) && _messagesCache[mode].length > 0) {
      return _messagesCache[mode];
    }
    try {
      const key = this.getStorageKey(mode);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If only 1 message and it is the initial welcome message, refresh with latest text & quick replies
          if (parsed.length === 1 && parsed[0]?.id?.startsWith("init_welcome")) {
            const defMsg = [this.getDefaultInitialMessage(mode)];
            _messagesCache[mode] = defMsg;
            return defMsg;
          }
          _messagesCache[mode] = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error reading Aura AI chats from localStorage:", e);
    }
    const fallback = [this.getDefaultInitialMessage(mode)];
    _messagesCache[mode] = fallback;
    return fallback;
  },

  // Save messages for active mode and broadcast to all components/tabs with debounced disk I/O
  saveMessages(messages, mode = "standard", forceSync = false) {
    try {
      if (!Array.isArray(messages) || messages.length === 0) return;
      _messagesCache[mode] = messages;

      const doSave = (targetMode) => {
        const msgs = _messagesCache[targetMode];
        if (!msgs) return;
        const key = this.getStorageKey(targetMode);
        localStorage.setItem(key, JSON.stringify(msgs));
        window.dispatchEvent(new CustomEvent("aura_ai_chat_sync", { detail: { messages: msgs, mode: targetMode } }));
      };

      if (forceSync) {
        if (_saveDebounceTimer) {
          clearTimeout(_saveDebounceTimer);
          _saveDebounceTimer = null;
        }
        _pendingSaveModes.delete(mode);
        doSave(mode);
        return;
      }

      // High-frequency stream chunks: debounce storage writes to prevent UI and touch freezing
      _pendingSaveModes.add(mode);
      if (!_saveDebounceTimer) {
        _saveDebounceTimer = setTimeout(() => {
          _saveDebounceTimer = null;
          _pendingSaveModes.forEach((m) => doSave(m));
          _pendingSaveModes.clear();
        }, 300);
      }
    } catch (e) {
      console.warn("Error saving Aura AI chats:", e);
    }
  },

  // Auth Sync that isolates chat history per user and clears local chats on logout or account switch
  syncAuthSession(currentUser, mode = "standard") {
    const currentUid = currentUser?.authUserId || currentUser?.uid || (currentUser?.email ? `email_${currentUser.email}` : "guest");
    let lastUid = null;
    try {
      lastUid = localStorage.getItem("aura_ai_last_auth_uid");
    } catch (_) {}

    // First time or same user session (page refresh / reload) -> Keep current local messages
    if (lastUid && lastUid === currentUid) {
      return {
        messages: this.getMessages(mode),
        conversationId: this.getConversationId(),
        accountSwitched: false
      };
    }

    // Account changed or logged out (user1 -> user2, user1 -> guest, guest -> user1)
    // Always clear local chats to guarantee 100% data isolation!
    this.clearLocalChats();
    const newConvId = "conv_" + (currentUid !== "guest" ? "u_" : "g_") + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    this.setConversationId(newConvId);
    this.resetGuestSession();
    const initMsgs = [this.getDefaultInitialMessage(mode)];
    this.saveMessages(initMsgs, mode);
    try {
      localStorage.setItem("aura_ai_last_auth_uid", currentUid);
    } catch (_) {}

    return {
      messages: initMsgs,
      conversationId: newConvId,
      accountSwitched: true
    };
  },

  // Append new messages to active mode
  appendMessage(msg, mode = "standard") {
    const current = this.getMessages(mode);
    const withTimestamp = {
      ...msg,
      id: msg.id || "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      timestamp: msg.timestamp || new Date().toISOString()
    };
    const updated = [...current, withTimestamp];
    this.saveMessages(updated, mode);
    return updated;
  },

  // Upsert or replace message by ID
  upsertMessage(msg, mode = "standard", forceSync = false) {
    const current = this.getMessages(mode);
    const idx = current.findIndex((m) => m.id === msg.id);
    let updated;
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], ...msg };
    } else {
      updated = [...current, msg];
    }
    _messagesCache[mode] = updated;
    this.saveMessages(updated, mode, forceSync);
    return updated;
  },

  // Start a new clean chat session for active mode (automatically archiving the previous conversation first)
  startNewSession(mode = "standard", options = {}) {
    const uid = this.getCurrentUserUid();
    
    // 1. Automatically save current active conversation into session history before starting new chat
    this.saveSessionToHistory(mode);

    const newConvId = "conv_" + (uid !== "guest" ? "u_" : "g_") + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    this.setConversationId(newConvId);

    // Only clear active birth details if user explicitly asks for a full reset
    if (options.clearBirthDetails === true) {
      this.clearActiveBirthDetails();
    }

    const customTopicLine = options.topic ? `\n\n📌 विषय: **${String(options.topic).trim()}**` : "";
    const welcomeMessage = mode === "panditji" ? {
      id: "init_panditji_" + Date.now(),
      sender: "ai",
      text: `Namaste Devotee 🙏 Main AI Panditji (🕉️) hoon. Nayi consultation shuru ho gayi hai.${customTopicLine}\n\nAap apni marzi se kuch bhi pooch sakte hain — chahe simple baat ho, gyaan charcha ho, ya poori 11-bhag ki Kundali & Rudraksha report.`,
      quickReplies: ["✨ मेरी जन्म कुंडली देखें", "📿 मेरे लिए शुभ रुद्राक्ष", "🕉️ सरल आध्यात्मिक चर्चा", "💰 करियर व धन उपाय"],
      timestamp: new Date().toISOString()
    } : {
      id: "init_standard_" + Date.now(),
      sender: "ai",
      text: "Namaste 🙏 Main Aura AI hoon. Nayi shopping aur spiritual consultation shuru ho gayi hai.\n\nAaj main aapki kis cheez mein madad karun?",
      quickReplies: ["Find a Rudraksha", "Today's Offers", "Track Order", "Help Me Choose"],
      timestamp: new Date().toISOString()
    };

    const updated = [welcomeMessage];
    _messagesCache[mode] = updated;
    this.saveMessages(updated, mode, true);
    try {
      window.dispatchEvent(new CustomEvent("aura_ai_session_switched", { detail: { mode, conversationId: newConvId, messages: updated } }));
    } catch (_) {}
    return { newConvId, messages: updated };
  },

  // Get saved sessions list for current user & mode
  getSavedSessions(mode = "standard") {
    try {
      const uid = this.getCurrentUserUid();
      const storageKey = `aura_ai_saved_sessions_${mode}_${uid}`;
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  },

  // Switch active chat to an existing saved session (saving current session first)
  switchToSession(sessionOrId, mode = "standard") {
    try {
      const targetId = typeof sessionOrId === "string" ? sessionOrId : sessionOrId?.id;
      if (!targetId) return null;

      // Archive current session first so nothing is lost
      this.saveSessionToHistory(mode);

      const sessions = this.getSavedSessions(mode);
      const target = typeof sessionOrId === "object" && Array.isArray(sessionOrId?.messages)
        ? sessionOrId
        : sessions.find((s) => s.id === targetId);
      if (!target || !Array.isArray(target.messages) || target.messages.length === 0) return null;

      this.setConversationId(target.id);
      if (target.birthDetails && target.birthDetails.dob) {
        this.saveVerifiedBirthDetails(target.birthDetails);
      }
      _messagesCache[mode] = target.messages;
      this.saveMessages(target.messages, mode, true);
      try {
        window.dispatchEvent(
          new CustomEvent("aura_ai_session_switched", {
            detail: { mode, conversationId: target.id, messages: target.messages, session: target }
          })
        );
      } catch (_) {}
      return { conversationId: target.id, messages: target.messages, session: target };
    } catch (_) {
      return null;
    }
  },

  // Rename a saved session
  renameSession(sessionId, newTitle, mode = "standard") {
    try {
      const cleanTitle = String(newTitle || "").trim();
      if (!sessionId || !cleanTitle) return false;
      const uid = this.getCurrentUserUid();
      const storageKey = `aura_ai_saved_sessions_${mode}_${uid}`;
      const list = this.getSavedSessions(mode);
      const next = list.map((s) => (s.id === sessionId ? { ...s, title: cleanTitle.slice(0, 80) } : s));
      localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("aura_ai_history_updated", { detail: { mode, uid, count: next.length } }));
      return true;
    } catch (_) {
      return false;
    }
  },

  // Delete a saved session
  deleteSession(sessionId, mode = "standard") {
    try {
      if (!sessionId) return false;
      const uid = this.getCurrentUserUid();
      const storageKey = `aura_ai_saved_sessions_${mode}_${uid}`;
      const list = this.getSavedSessions(mode);
      const next = list.filter((s) => s.id !== sessionId);
      localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("aura_ai_history_updated", { detail: { mode, uid, count: next.length } }));
      return true;
    } catch (_) {
      return false;
    }
  },

  // Get & save user's AI Pandit Ji custom style/chart preferences
  getPanditPreferences() {
    const defaults = { responseStyle: "detailed", chartStyle: "auto" };
    try {
      const uid = this.getCurrentUserUid();
      const raw = localStorage.getItem(`aura_pandit_prefs_${uid}`);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return {
        responseStyle: ["detailed", "balanced", "concise"].includes(parsed?.responseStyle) ? parsed.responseStyle : "detailed",
        chartStyle: ["auto", "cards", "chart", "table"].includes(parsed?.chartStyle) ? parsed.chartStyle : "auto"
      };
    } catch (_) {
      return defaults;
    }
  },

  savePanditPreferences(prefs = {}) {
    try {
      const uid = this.getCurrentUserUid();
      const current = this.getPanditPreferences();
      const next = {
        responseStyle: ["detailed", "balanced", "concise"].includes(prefs.responseStyle)
          ? prefs.responseStyle
          : current.responseStyle,
        chartStyle: ["auto", "cards", "chart", "table"].includes(prefs.chartStyle)
          ? prefs.chartStyle
          : current.chartStyle
      };
      localStorage.setItem(`aura_pandit_prefs_${uid}`, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("aura_ai_pandit_prefs_updated", { detail: next }));
      return next;
    } catch (_) {
      return { responseStyle: "detailed", chartStyle: "auto" };
    }
  },

  setConversationId(id) {
    try {
      if (id) {
        const uid = this.getCurrentUserUid();
        localStorage.setItem(`aura_ai_active_conv_${uid}`, id);
        localStorage.setItem(STORAGE_KEY_CONV_ID, id);
      }
    } catch (_) {}
  },

  // Get active conversation ID
  getConversationId() {
    try {
      const uid = this.getCurrentUserUid();
      const userKey = `aura_ai_active_conv_${uid}`;
      let cid = localStorage.getItem(userKey) || localStorage.getItem(STORAGE_KEY_CONV_ID);
      if (!cid) {
        cid = "conv_" + (uid !== "guest" ? "u_" : "g_") + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
        localStorage.setItem(userKey, cid);
        localStorage.setItem(STORAGE_KEY_CONV_ID, cid);
      }
      return cid;
    } catch (_) {
      return "conv_" + Date.now();
    }
  },

  // Floating Window Open / Visibility State (persists across page transitions)
  isFloatingOpen() {
    return isFloatingOpenState;
  },

  setFloatingOpen(open) {
    isFloatingOpenState = !!open;
    try {
      window.dispatchEvent(new CustomEvent("aura_ai_open_change", { detail: isFloatingOpenState }));
    } catch (_) {}
  },

  // Floating Button Dismissed State
  isFloatingDismissed() {
    return isFloatingDismissedSession;
  },

  setFloatingDismissed(dismissed) {
    isFloatingDismissedSession = !!dismissed;
    try {
      window.dispatchEvent(new CustomEvent("aura_ai_floating_dismiss_sync", { detail: isFloatingDismissedSession }));
    } catch (_) {}
  },

  // Active Chat Mode (standard vs panditji)
  getMode() {
    return currentActiveMode;
  },

  setMode(mode = "standard") {
    currentActiveMode = mode === "panditji" ? "panditji" : "standard";
    try {
      window.dispatchEvent(new CustomEvent("aura_ai_mode_change", { detail: currentActiveMode }));
    } catch (_) {}
  },

  // Copy single message or entire conversation to clipboard
  copyChatToClipboard(messagesToCopy = null, mode = "standard") {
    try {
      const msgs = messagesToCopy || this.getMessages(mode);
      if (!Array.isArray(msgs) || msgs.length === 0) return false;
      const formatted = msgs
        .map((m) => {
          const senderLabel = m.sender === "user" ? "जातक (Devotee):" : "AI पंडित जी (Aura AI):";
          const text = (m.text || "").replace(/\[AURA_KEYWORDS\]:[^\n]*/g, "").trim();
          return `${senderLabel}\n${text}`;
        })
        .join("\n\n---\n\n");

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(formatted);
        return true;
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = formatted;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        return true;
      }
    } catch (e) {
      console.warn("Could not copy chat:", e);
      return false;
    }
  },

  // Share conversation directly on WhatsApp
  shareChatOnWhatsApp(messagesToShare = null, mode = "standard") {
    try {
      const msgs = messagesToShare || this.getMessages(mode);
      if (!Array.isArray(msgs) || msgs.length === 0) return;
      const lastAiMsg = [...msgs].reverse().find(m => m.sender === "ai");
      const summaryText = (lastAiMsg?.text || "")
        .replace(/\[AURA_KEYWORDS\]:[^\n]*/g, "")
        .slice(0, 750)
        .trim();

      const shareContent = `🕉️ *Aura Rudraksha — AI Pandit Ji Consultation*\n\n${summaryText}\n\n👉 अपनी जन्म कुंडली व सिद्ध रुद्राक्ष जानने के लिए देखें: https://aurarudraksha.bond/aura-ai`;
      const encoded = encodeURIComponent(shareContent);
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    } catch (e) {
      console.warn("Could not share on WhatsApp:", e);
    }
  },

  hasPendingTrigger() {
    return Boolean(_pendingTrigger && (Date.now() - (_pendingTrigger.createdAt || 0) < 30000));
  },

  consumePendingTrigger() {
    const t = _pendingTrigger;
    _pendingTrigger = null;
    if (!t || (Date.now() - (t.createdAt || 0) >= 30000)) return null;
    return t;
  },

  // Helper to trigger chat assistant in standard or panditji mode (queues pending trigger in case widget isn't mounted yet)
  triggerChat(prompt = "", mode = "standard", options = {}) {
    this.setMode(mode);
    this.setFloatingDismissed(false);
    this.setFloatingOpen(true);
    _pendingTrigger = {
      mode,
      prompt: String(prompt || ""),
      startNewChat: Boolean(options?.startNewChat),
      createdAt: Date.now()
    };
    try {
      window.dispatchEvent(new Event("aura:open-ai"));
      window.dispatchEvent(
        new CustomEvent("aura_ai_trigger_chat", {
          detail: { mode, prompt, startNewChat: Boolean(options?.startNewChat) }
        })
      );
      window.dispatchEvent(new CustomEvent("aura_ai_open_change", { detail: true }));
    } catch (_) {}
  }
};


