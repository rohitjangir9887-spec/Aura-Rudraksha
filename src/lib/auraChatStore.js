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
  text: "Namaste 🙏 Main Aura AI hoon — Aura Rudraksha ka personal shopping aur Vedic spiritual guide.\n\nAaj main aapki kis cheez mein madad karun?",
  quickReplies: ["Find a Rudraksha", "Today's Offers", "Track Order", "Help Me Choose"],
  timestamp: new Date().toISOString()
};

const DEFAULT_INITIAL_MESSAGE_PANDITJI = {
  id: "init_welcome_panditji",
  sender: "ai",
  text: "🙏 प्रणाम भक्त! मैं AI पंडित जी (🕉️) हूँ — वैदिक ज्योतिष, जन्म कुंडली, नक्षत्र, ग्रह दशा व सिद्ध रुद्राक्ष विशेषज्ञ।\n\nआज मैं आपकी कुंडली, राशि, ग्रह शांति या रुद्राक्ष धारण विधि में किस प्रकार सहायता करूँ?",
  quickReplies: ["🌟 मेरी कुंडली विश्लेषण", "📿 राशि अनुसार रुद्राक्ष", "🌿 रुद्राक्ष धारण विधि", "🛡️ शनि व ग्रह दोष शांति"],
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
        if (parsed && parsed.dob && parsed.birthTime && parsed.birthPlace) {
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  },

  saveVerifiedBirthDetails(details) {
    if (!details || !details.dob || !details.birthTime || !details.birthPlace) return;
    try {
      const uid = this.getCurrentUserUid();
      localStorage.setItem(`aura_ai_birth_details_${uid}`, JSON.stringify(details));
      window.dispatchEvent(new CustomEvent("aura_ai_birth_details_updated", { detail: { uid, details } }));
      // Also automatically save to saved Kundali library for future quick recall
      this.saveKundaliProfile(details);
    } catch (_) {}
  },

  // --- SAVED KUNDALI PROFILES LIBRARY ---
  getSavedKundalis() {
    try {
      const uid = this.getCurrentUserUid();
      const key = `aura_ai_saved_kundalis_${uid}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  },

  saveKundaliProfile(profile) {
    if (!profile || !profile.name || !profile.dob) return;
    try {
      const uid = this.getCurrentUserUid();
      const key = `aura_ai_saved_kundalis_${uid}`;
      const existing = this.getSavedKundalis();
      
      const newEntry = {
        id: profile.id || `kundali_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: profile.name.trim(),
        dob: profile.dob,
        birthTime: profile.birthTime || "12:00",
        birthPlace: profile.birthPlace || "",
        concern: profile.concern || "all",
        rashi: profile.rashi || profile.rashiHindi || "",
        recommendedMukhi: profile.recommendedMukhi || "",
        savedAt: new Date().toISOString()
      };

      // Replace if same name & DOB exist, else prepend
      const filtered = existing.filter(
        (k) => !(k.name.toLowerCase() === newEntry.name.toLowerCase() && k.dob === newEntry.dob)
      );
      const updated = [newEntry, ...filtered].slice(0, 20); // Keep last 20 profiles
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("aura_ai_saved_kundalis_updated", { detail: updated }));
      return updated;
    } catch (_) {}
  },

  deleteSavedKundali(id) {
    try {
      const uid = this.getCurrentUserUid();
      const key = `aura_ai_saved_kundalis_${uid}`;
      const existing = this.getSavedKundalis();
      const updated = existing.filter((k) => k.id !== id);
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("aura_ai_saved_kundalis_updated", { detail: updated }));
      return updated;
    } catch (_) {}
  },

  // --- SAVED / ARCHIVED SESSION HISTORY ---
  getArchivedSessions(mode = "standard") {
    try {
      const uid = this.getCurrentUserUid();
      const key = `aura_ai_archived_sessions_${mode}_${uid}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  },

  archiveCurrentSession(mode = "standard", customTitle = "") {
    try {
      const msgs = this.getMessages(mode);
      // Only archive if there is actual conversation beyond the initial greeting
      const userMsg = msgs.find((m) => m.sender === "user");
      if (!userMsg) return null;

      const uid = this.getCurrentUserUid();
      const key = `aura_ai_archived_sessions_${mode}_${uid}`;
      const existing = this.getArchivedSessions(mode);

      const title = customTitle || userMsg.text.slice(0, 60) || "Astrology Consultation";
      const sessionEntry = {
        id: "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        title,
        conversationId: this.getConversationId(),
        mode,
        messagesCount: msgs.length,
        messages: msgs,
        savedAt: new Date().toISOString()
      };

      const updated = [sessionEntry, ...existing].slice(0, 30); // Keep last 30 sessions
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("aura_ai_sessions_archived", { detail: { mode, updated } }));
      return sessionEntry;
    } catch (e) {
      console.warn("Could not archive session:", e);
      return null;
    }
  },

  deleteArchivedSession(id, mode = "standard") {
    try {
      const uid = this.getCurrentUserUid();
      const key = `aura_ai_archived_sessions_${mode}_${uid}`;
      const existing = this.getArchivedSessions(mode);
      const updated = existing.filter((s) => s.id !== id);
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("aura_ai_sessions_archived", { detail: { mode, updated } }));
      return updated;
    } catch (_) {}
  },

  loadArchivedSession(id, mode = "standard") {
    try {
      const sessions = this.getArchivedSessions(mode);
      const target = sessions.find((s) => s.id === id);
      if (target && Array.isArray(target.messages)) {
        this.saveMessages(target.messages, mode);
        if (target.conversationId) {
          this.setConversationId(target.conversationId);
        }
        return target;
      }
    } catch (_) {}
    return null;
  },

  // --- EXPORT, COPY & WHATSAPP SHARING ---
  formatChatForExport(messages, mode = "standard", extra = {}) {
    const list = Array.isArray(messages) ? messages : this.getMessages(mode);
    const isPandit = mode === "panditji";
    let output = isPandit 
      ? "🕉️ *AURA RUDRAKSHA - वैदिक कुंडली व रुद्राक्ष परामर्श*\n====================================\n\n"
      : "📿 *AURA RUDRAKSHA - Consultation Report*\n====================================\n\n";

    if (extra.devoteeName) {
      output += `👤 जातक: ${extra.devoteeName}\n`;
    }
    if (extra.dob) {
      output += `🗓️ जन्म तिथि: ${extra.dob} (${extra.birthPlace || ""})\n`;
    }
    if (extra.recommendedMukhi) {
      output += `📿 अनुशंसित रुद्राक्ष: ${extra.recommendedMukhi}\n\n`;
    }

    list.forEach((m) => {
      if (!m.text) return;
      const isAI = m.sender === "ai";
      const senderName = isAI ? (isPandit ? "🕉️ AI पंडित जी:" : "📿 Aura AI:") : "👤 भक्त / User:";
      output += `${senderName}\n${m.text.trim()}\n\n`;
    });

    output += "------------------------------------\n";
    output += "🌿 100% प्राण-प्रतिष्ठित व सिद्ध लैब प्रमाणित रुद्राक्ष हेतु विज़िट करें:\n";
    output += "🌐 https://aurarudraksha.bond\n";
    output += "हर हर महादेव! 🙏";

    return output;
  },

  async copyChatToClipboard(messages, mode = "standard", extra = {}) {
    try {
      const formatted = this.formatChatForExport(messages, mode, extra);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formatted);
        return true;
      }
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = formatted;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch (e) {
      console.warn("Clipboard copy error:", e);
      return false;
    }
  },

  shareChatOnWhatsApp(messages, mode = "standard", extra = {}) {
    try {
      const formatted = this.formatChatForExport(messages, mode, extra);
      const encoded = encodeURIComponent(formatted);
      const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
      return true;
    } catch (e) {
      console.warn("WhatsApp share error:", e);
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

  // Start a new clean chat session for active mode
  startNewSession(mode = "standard", options = {}) {
    // Automatically archive current active conversation before starting fresh
    if (options.autoArchive !== false) {
      this.archiveCurrentSession(mode);
    }

    const uid = this.getCurrentUserUid();
    const newConvId = "conv_" + (uid !== "guest" ? "u_" : "g_") + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    this.setConversationId(newConvId);

    // Clear active birth details so new consultation starts 100% fresh for new person
    if (options.clearBirthDetails !== false) {
      this.clearActiveBirthDetails();
    }

    const welcomeMessage = mode === "panditji" ? {
      id: "init_panditji_" + Date.now(),
      sender: "ai",
      text: "🙏 प्रणाम भक्त! मैं AI पंडित जी (🕉️) हूँ। आपकी नई वैदिक परामर्श शुरू हो गई है।\n\nआज आप किस राशि, कुंडली, ग्रह शांति या सिद्ध रुद्राक्ष के बारे में जानना चाहते हैं?",
      quickReplies: ["🌟 मेरी कुंडली विश्लेषण", "📿 राशि अनुसार रुद्राक्ष", "🌿 रुद्राक्ष धारण विधि", "🛡️ शनि व ग्रह दोष शांति"],
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

