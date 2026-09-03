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
  text: "Namaste Devotee 🙏 Main AI Panditji (🕉️) hoon — 35+ varshon ke anubhav ke sath aapka Vedic Jyotish, Rashi, Nakshatra aur Rudraksha Guide.\n\nAaj main aapki Rashi, Kundali ya Rudraksha dharan vidhi mein kis prakar sahayata karun?",
  quickReplies: ["Rashi Rudraksha", "Dharan Vidhi", "1-14 Mukhi Benefits", "Gauri Shankar"],
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

  clearLocalChats() {
    try {
      localStorage.removeItem(STORAGE_KEY_MSGS_STANDARD);
      localStorage.removeItem(STORAGE_KEY_MSGS_PANDITJI);
      localStorage.removeItem(STORAGE_KEY_CONV_ID);
      localStorage.removeItem("aura_ai_unified_chat_history");
    } catch (_) {}
  },

  getStorageKey(mode = "standard") {
    return mode === "panditji" ? STORAGE_KEY_MSGS_PANDITJI : STORAGE_KEY_MSGS_STANDARD;
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

  // Safe Auth Sync that preserves chat history on refresh
  syncAuthSession(currentUser, mode = "standard") {
    const currentUid = currentUser?.uid || (currentUser?.email ? `email_${currentUser.email}` : "guest");
    let lastUid = null;
    try {
      lastUid = localStorage.getItem("aura_ai_last_auth_uid");
    } catch (_) {}

    // First time or same user session (page refresh / reload) -> Keep all local messages!
    if (!lastUid || lastUid === currentUid) {
      try {
        localStorage.setItem("aura_ai_last_auth_uid", currentUid);
      } catch (_) {}
      return {
        messages: this.getMessages(mode),
        conversationId: this.getConversationId(),
        accountSwitched: false
      };
    }

    // If user switched between two distinct authenticated accounts (e.g. user1 -> user2)
    const isDistinctAccountSwitch = lastUid !== "guest" && currentUid !== "guest" && lastUid !== currentUid;
    if (isDistinctAccountSwitch) {
      this.clearLocalChats();
      const newConvId = "conv_u_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      this.setConversationId(newConvId);
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
    }

    // Transition between guest <-> user keeps ongoing session
    try {
      localStorage.setItem("aura_ai_last_auth_uid", currentUid);
    } catch (_) {}
    return {
      messages: this.getMessages(mode),
      conversationId: this.getConversationId(),
      accountSwitched: false
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

  // Start a new chat session for active mode
  startNewSession(mode = "standard") {
    const newConvId = "conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    try {
      localStorage.setItem(STORAGE_KEY_CONV_ID, newConvId);
    } catch (_) {}

    const dividerMessage = {
      id: "session_div_" + Date.now(),
      type: "session_divider",
      text: "Nayi Baat-cheet Shuru Hui (New Session)",
      timestamp: new Date().toISOString()
    };

    const welcomeMessage = mode === "panditji" ? {
      id: "init_panditji_" + Date.now(),
      sender: "ai",
      text: "Namaste Devotee 🙏 Main AI Panditji (🕉️) hoon. Nayi Vedic consultation shuru ho gayi hai.\n\nAaj aap kis Rashi ya Rudraksha ke baare mein janna chahte hain?",
      quickReplies: ["Rashi Rudraksha", "Dharan Vidhi", "1-14 Mukhi Benefits", "Gauri Shankar"],
      timestamp: new Date().toISOString()
    } : {
      id: "init_standard_" + Date.now(),
      sender: "ai",
      text: "Namaste 🙏 Main Aura AI hoon. Nayi consultation shuru ho gayi hai.\n\nAaj aap kis Rudraksha ya Mala ke baare mein janna chahte hain?",
      quickReplies: ["Find a Rudraksha", "Today's Offers", "Track Order", "Help Me Choose"],
      timestamp: new Date().toISOString()
    };

    const current = this.getMessages(mode);
    const updated = [...current, dividerMessage, welcomeMessage];
    this.saveMessages(updated, mode);
    return { newConvId, messages: updated };
  },

  setConversationId(id) {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY_CONV_ID, id);
      }
    } catch (_) {}
  },

  // Get active conversation ID
  getConversationId() {
    try {
      let cid = localStorage.getItem(STORAGE_KEY_CONV_ID);
      if (!cid) {
        cid = "conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
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
  }
};

