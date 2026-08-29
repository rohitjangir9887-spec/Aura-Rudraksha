// Aura AI Unified Chat Store & Persistence Manager
// Manages shared chat history between floating window, full window modal, and full page Aura AI.

const STORAGE_KEY_MSGS = "aura_ai_unified_chat_history";
const STORAGE_KEY_CONV_ID = "aura_ai_active_conv_id";

// In-memory dismissal state so closing the floating icon hides it during SPA navigation,
// but refreshing the page (F5/reload) automatically restores the floating icon as requested!
let isFloatingDismissedSession = false;

// Clear any old permanent localStorage flag on load
try {
  localStorage.removeItem("aura_ai_floating_dismissed");
} catch (_) {}

const DEFAULT_INITIAL_MESSAGE = {
  id: "init_welcome_1",
  sender: "ai",
  text: "Namaste 🙏 Main Aura AI hoon — Aura Rudraksha ka personal shopping aur Vedic spiritual guide.\n\nAaj main aapki kis cheez mein madad karun?",
  quickReplies: ["Find a Rudraksha", "Today's Offers", "Track Order", "Help Me Choose"],
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
      return target.toLocaleDateString("en-US", { weekday: "long" }); // "Monday", "Tuesday", etc.
    } else {
      return target.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); // e.g. "24 Aug 2026"
    }
  } catch (_) {
    return "Today";
  }
}

export const auraChatStore = {
  // Get all unified messages
  getMessages() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MSGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error reading Aura AI chats from localStorage:", e);
    }
    return [DEFAULT_INITIAL_MESSAGE];
  },

  // Save unified messages and broadcast to all components/tabs
  saveMessages(messages) {
    try {
      localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(messages));
      window.dispatchEvent(new CustomEvent("aura_ai_chat_sync", { detail: messages }));
    } catch (e) {
      console.warn("Error saving Aura AI chats:", e);
    }
  },

  // Append new messages without overwriting old ones
  appendMessage(msg) {
    const current = this.getMessages();
    const withTimestamp = {
      ...msg,
      id: msg.id || "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      timestamp: msg.timestamp || new Date().toISOString()
    };
    const updated = [...current, withTimestamp];
    this.saveMessages(updated);
    return updated;
  },

  // Start a new chat session without deleting old chats
  startNewSession() {
    const newConvId = "conv_" + Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_CONV_ID, newConvId);
    } catch (_) {}

    const dividerMessage = {
      id: "session_div_" + Date.now(),
      type: "session_divider",
      text: "Nayi Baat-cheet Shuru Hui (New Session)",
      timestamp: new Date().toISOString()
    };

    const welcomeMessage = {
      id: "init_" + Date.now(),
      sender: "ai",
      text: "Namaste 🙏 Main Aura AI hoon. Nayi consultation shuru ho gayi hai.\n\nAaj aap kis Rudraksha ya Mala ke baare mein janna chahte hain?",
      quickReplies: ["Find a Rudraksha", "Today's Offers", "Track Order", "Help Me Choose"],
      timestamp: new Date().toISOString()
    };

    const current = this.getMessages();
    const updated = [...current, dividerMessage, welcomeMessage];
    this.saveMessages(updated);
    return { newConvId, messages: updated };
  },

  // Get active conversation ID
  getConversationId() {
    try {
      return localStorage.getItem(STORAGE_KEY_CONV_ID) || "conv_" + Date.now();
    } catch (_) {
      return "conv_" + Date.now();
    }
  },

  // Floating Button Dismissed State (Resets on page refresh, stays dismissed during in-app navigation)
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

