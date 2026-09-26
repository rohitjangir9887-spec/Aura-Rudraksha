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

  clearActiveBirthDetails() {
    try {
      const uid = this.getCurrentUserUid();
      localStorage.removeItem(`aura_ai_birth_details_${uid}`);
      window.dispatchEvent(new CustomEvent("aura_ai_birth_details_cleared", { detail: { uid } }));
    } catch (_) {}
  },

  getVerifiedBirthDetails() {
    try {
      const uid = this.getCurrentUserUid();
      const raw = localStorage.getItem(`aura_ai_birth_details_${uid}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.dob && (parsed.birthTime || parsed.time) && (parsed.birthPlace || parsed.place)) {
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  },

  saveVerifiedBirthDetails(details) {
    if (!details || !details.dob) return;
    try {
      const uid = this.getCurrentUserUid();
      const normalized = {
        name: details.name || "Devotee",
        dob: details.dob,
        birthTime: details.birthTime || details.time || "12:00",
        birthPlace: details.birthPlace || details.place || "",
        concern: details.concern || "all",
        relation: details.relation || "Self",
        savedAt: details.savedAt || new Date().toISOString()
      };
      
      // 1. Save as active birth details
      localStorage.setItem(`aura_ai_birth_details_${uid}`, JSON.stringify(normalized));
      
      // 2. Automatically save into persistent Saved Kundalis collection
      const kundaliKey = `aura_ai_saved_kundalis_${uid}`;
      let savedKundalis = [];
      try {
        const rawK = localStorage.getItem(kundaliKey);
        if (rawK) savedKundalis = JSON.parse(rawK);
      } catch (_) {}
      
      // Check if profile with same name and dob already exists
      const existingIdx = savedKundalis.findIndex(
        (k) => (k.name || "").trim().toLowerCase() === (normalized.name || "").trim().toLowerCase() && k.dob === normalized.dob
      );
      
      if (existingIdx >= 0) {
        savedKundalis[existingIdx] = {
          ...savedKundalis[existingIdx],
          ...normalized,
          id: savedKundalis[existingIdx].id || "prof_" + Date.now(),
          updatedAt: new Date().toISOString()
        };
      } else {
        savedKundalis.unshift({
          id: "prof_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          ...normalized,
          time: normalized.birthTime,
          place: normalized.birthPlace,
          savedAt: new Date().toISOString()
        });
      }
      
      // Keep up to 30 saved kundalis
      localStorage.setItem(kundaliKey, JSON.stringify(savedKundalis.slice(0, 30)));

      window.dispatchEvent(new CustomEvent("aura_ai_birth_details_updated", { detail: { uid, details: normalized } }));
      window.dispatchEvent(new CustomEvent("aura_ai_saved_kundalis_updated", { detail: { uid, kundalis: savedKundalis } }));
    } catch (e) {
      console.warn("Could not auto-save birth details:", e);
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

  // Get messages for active mode
  getMessages(mode = "standard") {
    try {
      const key = this.getStorageKey(mode);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If only 1 message and it is the initial welcome message, refresh with latest text & quick replies
          if (parsed.length === 1 && parsed[0]?.id?.startsWith("init_welcome")) {
            return [this.getDefaultInitialMessage(mode)];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error reading Aura AI chats from localStorage:", e);
    }
    return [this.getDefaultInitialMessage(mode)];
  },

  // Save messages for active mode and broadcast to all components/tabs
  saveMessages(messages, mode = "standard") {
    try {
      if (!Array.isArray(messages) || messages.length === 0) return;
      const key = this.getStorageKey(mode);
      localStorage.setItem(key, JSON.stringify(messages));
      window.dispatchEvent(new CustomEvent("aura_ai_chat_sync", { detail: { messages, mode } }));
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
  upsertMessage(msg, mode = "standard") {
    const current = this.getMessages(mode);
    const idx = current.findIndex((m) => m.id === msg.id);
    let updated;
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], ...msg };
    } else {
      updated = [...current, msg];
    }
    this.saveMessages(updated, mode);
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

    const welcomeMessage = mode === "panditji" ? {
      id: "init_panditji_" + Date.now(),
      sender: "ai",
      text: "Namaste Devotee 🙏 Main AI Panditji (🕉️) hoon. Nayi Vedic consultation shuru ho gayi hai.\n\nAaj aap kis Rashi, Kundali ya Rudraksha ke baare mein janna chahte hain?",
      quickReplies: ["Rashi Rudraksha", "Dharan Vidhi", "1-14 Mukhi Benefits", "Gauri Shankar"],
      timestamp: new Date().toISOString()
    } : {
      id: "init_standard_" + Date.now(),
      sender: "ai",
      text: "Namaste 🙏 Main Aura AI hoon. Nayi shopping aur spiritual consultation shuru ho gayi hai.\n\nAaj main aapki kis cheez mein madad karun?",
      quickReplies: ["Find a Rudraksha", "Today's Offers", "Track Order", "Help Me Choose"],
      timestamp: new Date().toISOString()
    };

    const updated = [welcomeMessage];
    this.saveMessages(updated, mode);
    return { newConvId, messages: updated };
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

  // Helper to trigger chat assistant in standard or panditji mode
  triggerChat(prompt = "", mode = "standard") {
    this.setMode(mode);
    this.setFloatingDismissed(false);
    this.setFloatingOpen(true);
    try {
      window.dispatchEvent(
        new CustomEvent("aura_ai_trigger_chat", {
          detail: { mode, prompt }
        })
      );
      window.dispatchEvent(new CustomEvent("aura_ai_open_change", { detail: true }));
    } catch (_) {}
  }
};


