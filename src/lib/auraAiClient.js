import { authClient } from "./authClient";
import { parseAuraAiPayload } from "./auraAiResponse";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "")) + "/aura-ai";

export const auraAiClient = {
  // Send chat message to Aura AI (Streaming SSE enabled)
  async sendMessageStream({
    message,
    conversationId,
    userEmail,
    userName,
    cartItems = [],
    history = [],
    onChunk,
    onDone,
    onError
  }) {
    try {
      const token = await authClient.getToken();
      const res = await fetch(`${API_BASE}/chat?stream=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message,
          conversationId,
          userEmail,
          userName,
          cartItems,
          history,
          stream: true
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";
        let finalData = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6);
              if (dataStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === "chunk" && parsed.delta) {
                  accumulatedText += parsed.delta;
                  if (onChunk) onChunk(parsed.delta, accumulatedText);
                } else if (parsed.type === "final" && parsed.data) {
                  finalData = parseAuraAiPayload(parsed.data);
                }
              } catch (_) {}
            }
          }
        }

        const result = finalData || {
          text: accumulatedText,
          products: [],
          coupons: [],
          quickReplies: [],
          conversationId
        };
        if (onDone) onDone(result);
        return result;
      } else {
        const data = await res.json();
        const parsed = parseAuraAiPayload(data.data || data);
        if (onChunk) onChunk(parsed.text, parsed.text);
        if (onDone) onDone(parsed);
        return parsed;
      }
    } catch (err) {
      console.warn("Aura AI streaming notice:", err?.message || err);
      if (onError) onError(err);
      throw err;
    }
  },

  // Send chat message to Aura AI (Standard Promise)
  async sendMessage({ message, conversationId, userEmail, userName, cartItems = [], history = [] }) {
    try {
      const token = await authClient.getToken();
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message,
          conversationId,
          userEmail,
          userName,
          cartItems,
          history
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to communicate with Aura AI.");
      }
      return parseAuraAiPayload(data.data);
    } catch (err) {
      console.warn("Aura AI API notice:", err?.message || err);
      // Client-side fallback if backend is unreachable
      return {
        text: `Aura AI abhi temporarily unavailable hai. 🙏\nAap hamari customer support team se directly contact kar sakte hain:\n\n📞 **Phone / WhatsApp:** +91 9672996531\n✉️ **Email:** support@aurarudraksha.com`,
        products: [],
        coupons: [],
        requiresHuman: true,
        quickReplies: ["Talk to Support", "Today's Offers", "Help Me Choose"],
        conversationId
      };
    }
  },

  // Get AI Configuration & Feature Toggles
  async getSettings() {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const data = await res.json();
      if (data.success && data.data) return data.data;
    } catch (_) {}
    return {
      enabled: true,
      showFloatingButton: true,
      showHeaderButton: true,
      language: "auto",
      tone: "polite_spiritual",
      greeting: "Namaste 🙏 Main Aura AI hoon — Aura Rudraksha ka personal shopping aur support assistant. Aaj main aapki kis cheez mein help karun?",
      recommendProducts: true,
      recommendOffers: true,
      cartActions: true,
      orderSupport: true,
      humanSupport: true
    };
  },

  // Update AI Settings (Admin)
  async updateSettings(settings) {
    try {
      const token = await authClient.getToken();
      const res = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Get Conversations (user history or admin overview).
  // Admin rights are verified server-side from the Firebase token -
  // the client never claims a role.
  async getConversations() {
    try {
      const token = await authClient.getToken();
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) return data.data || [];
    } catch (_) {}
    return [];
  },

  // Delete Conversation (Privacy control - owner or admin, verified server-side)
  async deleteConversation(id) {
    try {
      const token = await authClient.getToken();
      const res = await fetch(`${API_BASE}/conversations/${id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Track product click or cart add from AI
  async trackAction({ conversationId, action, productId }) {
    try {
      await fetch(`${API_BASE}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, action, productId })
      });
    } catch (_) {}
  },

  // Get Analytics (Admin)
  async getAnalytics() {
    try {
      const token = await authClient.getToken();
      const res = await fetch(`${API_BASE}/analytics`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && data.data) return data.data;
    } catch (_) {}
    // No fabricated fallback: when analytics cannot be loaded, the UI must
    // show a "No data yet" state instead of fake numbers.
    return null;
  }
};
