import { authClient } from "./authClient";
import { parseAuraAiPayload, customerSafeAiText } from "./auraAiResponse";

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
    let accumulatedRaw = "";
    let finalData = null;

    const processLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) return;
      const dataStr = trimmed.slice(6).trim();
      if (!dataStr || dataStr === "[DONE]") return;

      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.type === "chunk" && parsed.delta) {
          // Ignore explicit reasoning fields
          if (parsed.delta.reasoning_content || parsed.delta.thinking || parsed.delta.reasoning) {
            return;
          }
          const chunkDelta = typeof parsed.delta === "string" ? parsed.delta : String(parsed.delta.content || "");
          accumulatedRaw += chunkDelta;

          const safeAccumulated = customerSafeAiText(accumulatedRaw);
          if (onChunk) onChunk(chunkDelta, safeAccumulated);
        } else if (parsed.type === "final" && parsed.data) {
          finalData = parseAuraAiPayload(parsed.data);
        }
      } catch (_) {}
    };

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

        while (true) {
          const { done, value } = await reader.read();
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              processLine(line);
            }
          }
          if (done) {
            // Flush remaining decoder buffer on stream end
            buffer += decoder.decode();
            if (buffer.trim()) {
              const lines = buffer.split("\n");
              for (const line of lines) {
                processLine(line);
              }
            }
            break;
          }
        }

        // Fallback strategy per Technical Requirement C:
        let safeFinalText = finalData?.text ? customerSafeAiText(finalData.text) : "";
        let safeAccumulated = customerSafeAiText(accumulatedRaw);

        let resultText = safeFinalText || safeAccumulated;

        // If both empty, attempt non-streaming fallback request
        if (!resultText.trim()) {
          try {
            const fallbackRes = await this.sendMessage({ message, conversationId, userEmail, userName, cartItems, history });
            if (fallbackRes && fallbackRes.text && fallbackRes.text.trim()) {
              finalData = fallbackRes;
              resultText = customerSafeAiText(fallbackRes.text);
            }
          } catch (_) {}
        }

        // Final safety net message so output is NEVER blank
        if (!resultText.trim()) {
          resultText = "Namaste 🙏 Aapka sawaal samajh gaya. Ek moment dijiye, main aapki help karta hoon.";
        }

        const result = {
          text: resultText,
          products: finalData?.products || [],
          coupons: finalData?.coupons || [],
          recommendedProductIds: finalData?.recommendedProductIds || [],
          couponCodes: finalData?.couponCodes || [],
          requiresHuman: Boolean(finalData?.requiresHuman),
          quickReplies: finalData?.quickReplies?.length ? finalData.quickReplies : ["Talk to Support", "Today's Offers", "Help Me Choose"],
          orderInfo: finalData?.orderInfo || null,
          conversationId: finalData?.conversationId || conversationId
        };

        if (onDone) onDone(result);
        return result;
      } else {
        const data = await res.json();
        const parsed = parseAuraAiPayload(data.data || data);
        let text = customerSafeAiText(parsed.text);
        if (!text.trim()) {
          text = "Namaste 🙏 Aapka sawaal samajh gaya. Ek moment dijiye, main aapki help karta hoon.";
        }
        const result = { ...parsed, text };
        if (onChunk) onChunk(result.text, result.text);
        if (onDone) onDone(result);
        return result;
      }
    } catch (err) {
      console.warn("Aura AI streaming notice:", err?.message || err);
      if (onError) onError(err);
      
      const fallbackResult = {
        text: "Namaste 🙏 Aapka sawaal samajh gaya. Ek moment dijiye, main aapki help karta hoon.",
        products: [],
        coupons: [],
        quickReplies: ["Talk to Support", "Today's Offers", "Help Me Choose"],
        requiresHuman: true,
        conversationId
      };
      if (onDone) onDone(fallbackResult);
      return fallbackResult;
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
      return parseAuraAiPayload(data.data || data);
    } catch (err) {
      console.warn("Aura AI API notice:", err?.message || err);
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

  // Get Conversations (user history or admin overview)
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

  // Delete Conversation
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
    return null;
  }
};
