import { authClient } from "./authClient.js";
import { parseAuraAiPayload, customerSafeAiText } from "./auraAiResponse.js";
import { auraChatStore } from "./auraChatStore.js";

const API_BASE = ((((typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env.VITE_API_BASE_URL : undefined) || "/api").replace(/\/$/, "")) + "/aura-ai";

async function getAuthToken() {
  try {
    const token = await authClient.getToken();
    if (token) return token;
  } catch (_) {}
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem("aura_admin_token") || localStorage.getItem("aura_token") || "";
  }
  return "";
}

let activeStreamAbortController = null;

export const auraAiClient = {
  abortActiveStream() {
    if (activeStreamAbortController) {
      try {
        activeStreamAbortController.abort();
      } catch (_) {}
      activeStreamAbortController = null;
    }
  },

  // Send chat message to Aura AI (Streaming SSE enabled)
  async sendMessageStream({
    message,
    conversationId,
    userEmail,
    userName,
    mode = "standard",
    cartItems = [],
    history = [],
    birthDetails = null,
    notesContext = "",
    onChunk,
    onStatus,
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
          if (onChunk) onChunk(chunkDelta, safeAccumulated, finalData);
        } else if (parsed.type === "status" && parsed.message) {
          if (onStatus) onStatus(parsed.message);
        } else if (parsed.type === "meta" && (parsed.data || parsed.products || parsed.coupons || parsed.quickReplies || parsed.kundali)) {
          const payload = parsed.data || parsed;
          const parsedMeta = parseAuraAiPayload(payload);
          finalData = { ...(finalData || {}), ...parsedMeta };
          if (onChunk) onChunk("", customerSafeAiText(accumulatedRaw), finalData);
        } else if (parsed.type === "final" && parsed.data) {
          finalData = { ...(finalData || {}), ...parseAuraAiPayload(parsed.data) };
        }
      } catch (_) {}
    };

    try {
      this.abortActiveStream();
      activeStreamAbortController = new AbortController();

      const token = await authClient.getToken();
      const guestSessionId = auraChatStore.getGuestSessionId();
      const effectiveBirthDetails = birthDetails || (mode === "panditji" ? auraChatStore.getVerifiedBirthDetails() : null);

      const res = await fetch(`${API_BASE}/chat?stream=true`, {
        method: "POST",
        signal: activeStreamAbortController.signal,
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          "X-Guest-Session-ID": guestSessionId,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message,
          conversationId,
          guestSessionId,
          userEmail,
          userName,
          mode,
          cartItems,
          history,
          birthDetails: effectiveBirthDetails,
          notesContext,
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

        let safeFinalText = finalData?.text ? customerSafeAiText(finalData.text) : "";
        let safeAccumulated = customerSafeAiText(accumulatedRaw);

        let resultText = safeFinalText || safeAccumulated;

        // If both empty, attempt non-streaming fallback request preserving mode and birth details
        if (!resultText.trim()) {
          try {
            const fallbackRes = await this.sendMessage({
              message,
              conversationId,
              userEmail,
              userName,
              mode,
              cartItems,
              history,
              birthDetails
            });
            if (fallbackRes && fallbackRes.text && fallbackRes.text.trim()) {
              finalData = fallbackRes;
              resultText = customerSafeAiText(fallbackRes.text);
            }
          } catch (_) {}
        }

        // Final safety net message so output is NEVER blank
        if (!resultText.trim()) {
          resultText = mode === "panditji" 
            ? "प्रणाम 🙏 आपका संदेश प्राप्त हुआ। कृपया एक क्षण प्रतीक्षा करें, मैं आपकी सहायता कर रहा हूँ।"
            : "Namaste 🙏 Aapka sawaal samajh gaya. Ek moment dijiye, main aapki help karta hoon.";
        }

        const result = {
          text: resultText,
          products: finalData?.products || [],
          coupons: finalData?.coupons || [],
          kundali: finalData?.kundali || null,
          showBirthForm: Boolean(finalData?.showBirthForm),
          recommendedProductIds: finalData?.recommendedProductIds || [],
          couponCodes: finalData?.couponCodes || [],
          requiresHuman: Boolean(finalData?.requiresHuman),
          quickReplies: finalData?.quickReplies?.length ? finalData.quickReplies : (mode === "panditji" ? ["🕉️ Kundali Consultation", "📿 Mukhi Guide", "📦 Track Order"] : ["Talk to Support", "Today's Offers", "Help Me Choose"]),
          orderInfo: finalData?.orderInfo || null,
          conversationId: finalData?.conversationId || conversationId
        };

        if (onDone) onDone(result);
        return result;
      } else {
        const fallbackContentType = res.headers.get("content-type") || "";
        if (!fallbackContentType.includes("application/json")) {
          let textBody = "";
          try {
            textBody = await res.text();
            textBody = textBody.slice(0, 300);
          } catch (_) {}
          throw new Error(`Server returned HTML/Non-JSON content type: ${fallbackContentType || "unknown"}. Body start: ${textBody}`);
        }
        let data;
        try {
          data = await res.json();
        } catch (jsonErr) {
          throw new Error("Failed to parse JSON response: " + jsonErr.message);
        }
        const parsed = parseAuraAiPayload(data.data || data);
        let text = customerSafeAiText(parsed.text);
        if (!text.trim()) {
          text = "Namaste 🙏 Aapka sawaal samajh gaya. Ek moment dijiye, main aapki help karta hoon.";
        }
        const result = { ...parsed, text };
        if (onChunk) onChunk(result.text, result.text, result);
        if (onDone) onDone(result);
        return result;
      }
    } catch (err) {
      if (err.name === "AbortError") {
        return { aborted: true };
      }
      console.warn("Aura AI streaming notice:", err?.message || err);
      if (onError) onError(err);
      
      const preservedKundali = finalData?.kundali || null;
      let errorText = "Namaste 🙏 Aapka sawaal samajh gaya. Ek moment dijiye, main aapki help karta hoon.";
      if (preservedKundali) {
        errorText = "🙏 **प्रणाम! हर हर महादेव।**\n\nआपकी जन्म पत्रिका की खगोलीय गणना पूर्ण हो चुकी है (नीचे विवरण देखें)। AI पंडित जी का विस्तृत विश्लेषण वर्तमान में अनुपलब्ध है, परंतु आपके परिणाम नीचे सुरक्षित हैं।";
      } else {
        const errMsg = String(err?.message || "").toLowerCase();
        if (errMsg.includes("503") || errMsg.includes("database") || errMsg.includes("html") || errMsg.includes("json") || errMsg.includes("status")) {
          errorText = "Namaste! 🙏 Our digital temple is currently undergoing a brief Vedic alignment & routine maintenance. Our sevaks are working swiftly to restore full access. Please try again in a few moments or reach out to us on WhatsApp!";
        }
      }

      const fallbackResult = {
        text: errorText,
        products: finalData?.products || [],
        coupons: finalData?.coupons || [],
        kundali: preservedKundali,
        quickReplies: preservedKundali ? ["📿 Mukhi Guide", "🕉️ Kundali Consultation", "Talk to Support"] : ["Talk to Support", "Today's Offers", "Help Me Choose"],
        requiresHuman: true,
        conversationId
      };
      if (onDone) onDone(fallbackResult);
      return fallbackResult;
    } finally {
      activeStreamAbortController = null;
    }
  },

  // Send chat message to Aura AI (Standard Promise)
  async sendMessage({ message, conversationId, userEmail, userName, mode = "standard", cartItems = [], history = [], birthDetails = null }) {
    try {
      const token = await authClient.getToken();
      const guestSessionId = auraChatStore.getGuestSessionId();
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Guest-Session-ID": guestSessionId,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message,
          conversationId,
          guestSessionId,
          userEmail,
          userName,
          mode,
          cartItems,
          history,
          birthDetails
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        let textBody = "";
        try {
          textBody = await res.text();
          textBody = textBody.slice(0, 300);
        } catch (_) {}
        throw new Error(`Expected JSON response from server but received: ${contentType || "unknown"}. Body start: ${textBody}`);
      }

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("Failed to parse JSON response: " + jsonErr.message);
      }

      if (!data.success) {
        throw new Error(data.message || "Failed to communicate with Aura AI.");
      }
      return parseAuraAiPayload(data.data || data);
    } catch (err) {
      console.warn("Aura AI API notice:", err?.message || err);
      return {
        text: `Aura AI abhi temporarily unavailable hai. 🙏\nAap hamari customer support team se directly contact kar sakte hain:\n\n📞 **Phone / WhatsApp:** +91 9672996531\n✉️ **Email:** aurarudrakshaofficial@gmail.com`,
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
      const token = await getAuthToken();
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
      const token = await getAuthToken();
      const guestSessionId = auraChatStore.getGuestSessionId();
      const res = await fetch(`${API_BASE}/conversations?guestSessionId=${encodeURIComponent(guestSessionId)}`, {
        headers: {
          "X-Guest-Session-ID": guestSessionId,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) return data.data || [];
    } catch (_) {}
    return [];
  },

  // Get Single Conversation
  async getConversationById(id) {
    try {
      const token = await getAuthToken();
      const guestSessionId = auraChatStore.getGuestSessionId();
      const res = await fetch(`${API_BASE}/conversations/${id}?guestSessionId=${encodeURIComponent(guestSessionId)}`, {
        headers: {
          "X-Guest-Session-ID": guestSessionId,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) return data.data;
    } catch (_) {}
    return null;
  },

  // Delete Conversation
  async deleteConversation(id) {
    try {
      const token = await getAuthToken();
      const guestSessionId = auraChatStore.getGuestSessionId();
      const res = await fetch(`${API_BASE}/conversations/${id}`, {
        method: "DELETE",
        headers: {
          "X-Guest-Session-ID": guestSessionId,
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
      const token = await getAuthToken();
      const guestSessionId = auraChatStore.getGuestSessionId();
      await fetch(`${API_BASE}/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Guest-Session-ID": guestSessionId,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ conversationId, action, productId, guestSessionId })
      });
    } catch (_) {}
  },

  // Calculate Authentic Astronomical Kundali & Recommendations
  async calculateKundali({ dob, birthTime, birthPlace, name, gender, concern }) {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/kundali`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ dob, birthTime, birthPlace, name, gender, concern })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "Kundali calculation failed" };
      }
      return { success: true, data: json.data, kundali: json.data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Get Admin AI Advanced Intelligence Report
  async getAdminIntelligence() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/admin-intelligence`, {
        signal: controller.signal,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && data.data) return data.data;
    } catch (_) {
    } finally {
      clearTimeout(timeoutId);
    }
    return null;
  },

  // Get Analytics (Admin)
  async getAnalytics() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/analytics`, {
        signal: controller.signal,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && data.data) return data.data;
    } catch (_) {
    } finally {
      clearTimeout(timeoutId);
    }
    return null;
  }
};
