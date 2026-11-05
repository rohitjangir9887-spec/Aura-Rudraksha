import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  Trash2,
  Cpu,
  Key,
  Check,
  X,
  Bot
} from "lucide-react";
import { auraAiClient } from "../../lib/auraAiClient";
import { AuraAIMessageContent } from "../AuraAIMessageContent";
import { emitToast } from "../../context/ToastContext";

const AVAILABLE_NIM_MODELS = [
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "NVIDIA Llama-3.1-Nemotron-70B-Instruct (Recommended)" },
  { id: "meta/llama-3.3-70b-instruct", label: "Meta Llama-3.3-70B-Instruct (NVIDIA NIM)" },
  { id: "mistralai/mixtral-8x22b-instruct-v0.1", label: "Mixtral 8x22B Instruct (NVIDIA NIM)" },
  { id: "deepseek-ai/deepseek-r1", label: "DeepSeek-R1 (NVIDIA NIM)" }
];

export function AdminAIAgentChat({ compact = false }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome_msg",
      role: "assistant",
      content: "🙏 **Namaste Admin!** Main Aura Rudraksha ka normal AI Chat Bot hoon (Powered by **NVIDIA NIM**).\n\nAap mujhse store products, Rudraksha descriptions, customer queries, coupons, ya Vedic knowledge ke bare mein kuchh bhi puchh sakte hain."
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // NVIDIA NIM Configuration Modal
  const [showNimModal, setShowNimModal] = useState(false);
  const [selectedNimModel, setSelectedNimModel] = useState("nvidia/llama-3.1-nemotron-70b-instruct");
  const [nvidiaApiKeyInput, setNvidiaApiKeyInput] = useState("");
  const [savingNimSettings, setSavingNimSettings] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    auraAiClient.getSettings().then((s) => {
      if (s) {
        if (s.selectedNimModel || s.nvidiaModel || s.nemotronModel) {
          setSelectedNimModel(s.selectedNimModel || s.nvidiaModel || s.nemotronModel);
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSend = async (customPrompt = null) => {
    const text = (customPrompt !== null ? customPrompt : input).trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: "u_" + Date.now(),
      role: "user",
      content: text
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (customPrompt === null) setInput("");
    setIsTyping(true);

    try {
      const res = await auraAiClient.sendMessage({
        message: text,
        mode: "standard",
        history: nextMessages.slice(-8).map((m) => ({
          sender: m.role === "user" ? "user" : "ai",
          text: m.content
        }))
      });

      const replyText =
        res?.text ||
        res?.data?.text ||
        "🙏 Har Har Mahadev! Kripya apna prashn punah puchhein.";

      setMessages((prev) => [
        ...prev,
        {
          id: "a_" + Date.now(),
          role: "assistant",
          content: replyText
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err_" + Date.now(),
          role: "assistant",
          content: "🙏 Kshama karein, abhi sampark mein samasya aayi. Kripya punah prayas karein."
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome_" + Date.now(),
        role: "assistant",
        content: "🙏 **Chat Cleared!** Aap naya prashn puchh sakte hain."
      }
    ]);
    emitToast("Chat history cleared", "info");
  };

  const handleSaveNimConfig = async (e) => {
    e.preventDefault();
    setSavingNimSettings(true);
    try {
      const payload = {
        selectedNimModel,
        nvidiaModel: selectedNimModel,
        nemotronModel: selectedNimModel
      };
      if (nvidiaApiKeyInput.trim()) {
        payload.nvidiaApiKey = nvidiaApiKeyInput.trim();
        payload.nemotronApiKey = nvidiaApiKeyInput.trim();
      }
      await auraAiClient.updateSettings(payload);
      emitToast("NVIDIA NIM model configuration saved!", "success");
      setShowNimModal(false);
      setNvidiaApiKeyInput("");
    } catch (err) {
      emitToast("Could not save NVIDIA NIM settings", "error");
    } finally {
      setSavingNimSettings(false);
    }
  };

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5dccb",
        borderRadius: "14px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: compact ? "480px" : "620px",
        boxShadow: "0 6px 24px rgba(42, 22, 13, 0.06)"
      }}
    >
      {/* Top Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #2a160d 0%, #4a2715 100%)",
          color: "#fff",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "rgba(245, 158, 11, 0.2)",
              border: "1px solid rgba(245, 158, 11, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fbbf24"
            }}
          >
            <Bot size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "14.5px", color: "#fff" }}>
                Aura AI Chat Bot
              </span>
              <span
                style={{
                  fontSize: "10.5px",
                  background: "rgba(118, 185, 0, 0.22)",
                  color: "#a3e635",
                  border: "1px solid rgba(118, 185, 0, 0.45)",
                  padding: "2px 7px",
                  borderRadius: "999px",
                  fontWeight: 700
                }}
              >
                NVIDIA NIM
              </span>
            </div>
            <div style={{ fontSize: "11.5px", color: "#d6c7b2" }}>
              Model: {selectedNimModel}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setShowNimModal(true)}
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "#fde68a",
              border: "1px solid rgba(253, 230, 138, 0.3)",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "12px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer"
            }}
          >
            <Cpu size={13} />
            <span>NVIDIA NIM Model</span>
          </button>

          <button
            type="button"
            onClick={handleClearChat}
            title="Clear Chat"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "#fca5a5",
              border: "1px solid rgba(252, 165, 165, 0.25)",
              borderRadius: "8px",
              padding: "6px 9px",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer"
            }}
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div
        style={{
          padding: "8px 14px",
          background: "#fdfbf7",
          borderBottom: "1px solid #efe6d8",
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          whiteSpace: "nowrap"
        }}
      >
        {[
          "📿 5 Mukhi Rudraksha ke labh batao",
          "🎁 Active store coupons kya hain?",
          "💎 Spatika Mala details batao",
          "🕉️ 1 se 14 Mukhi Rudraksha summary"
        ].map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(q)}
            style={{
              background: "#fff",
              border: "1px solid #e5d5c0",
              borderRadius: "999px",
              padding: "4px 11px",
              fontSize: "11.5px",
              color: "#5c2b09",
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          background: "#faf7f2",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}
      >
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: isUser
                  ? "linear-gradient(135deg, #7c2d12 0%, #5c1c0a 100%)"
                  : "#ffffff",
                color: isUser ? "#ffffff" : "#1f1a17",
                border: isUser ? "none" : "1px solid #e7dac9",
                borderRadius: isUser ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                padding: "10px 14px",
                fontSize: "13.5px",
                lineHeight: 1.55,
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
              }}
            >
              {isUser ? (
                <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
              ) : (
                <AuraAIMessageContent text={m.content} />
              )}
            </div>
          );
        })}

        {isTyping && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "#ffffff",
              border: "1px solid #e7dac9",
              borderRadius: "14px",
              padding: "10px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12.5px",
              color: "#7c2d12",
              fontWeight: 600
            }}
          >
            <Loader2 size={15} className="animate-spin" />
            <span>NVIDIA NIM typing response...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          padding: "10px 14px",
          background: "#ffffff",
          borderTop: "1px solid #ebdcd0",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message to Aura AI Chat Bot..."
          style={{
            flex: 1,
            border: "1px solid #decbb6",
            borderRadius: "10px",
            padding: "9px 13px",
            fontSize: "13.5px",
            outline: "none",
            background: "#fdfbf7",
            color: "#1f1a17"
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          style={{
            background: "linear-gradient(135deg, #8c2b10 0%, #5c1c0a 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            padding: "9px 16px",
            fontSize: "13.5px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            cursor: !input.trim() || isTyping ? "not-allowed" : "pointer",
            opacity: !input.trim() || isTyping ? 0.6 : 1
          }}
        >
          <Send size={15} />
          <span>Send</span>
        </button>
      </form>

      {/* NVIDIA NIM Model Settings Modal */}
      {showNimModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 10050,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "460px",
              width: "100%",
              padding: "20px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              border: "1px solid #e5dccb"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#2a160d", display: "flex", alignItems: "center", gap: "8px" }}>
                <Cpu size={18} style={{ color: "#16a34a" }} />
                NVIDIA NIM Configuration
              </h3>
              <button
                type="button"
                onClick={() => setShowNimModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b5e55" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNimConfig} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#4a2715", marginBottom: "5px" }}>
                  Select NVIDIA NIM Model (Website-Wide):
                </label>
                <select
                  value={selectedNimModel}
                  onChange={(e) => setSelectedNimModel(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 11px",
                    borderRadius: "8px",
                    border: "1px solid #d6c4b0",
                    fontSize: "13px",
                    background: "#fdfbf7"
                  }}
                >
                  {AVAILABLE_NIM_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#4a2715", marginBottom: "5px" }}>
                  NVIDIA NIM API Key (Optional if set in server env):
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Key size={15} style={{ color: "#8c2b10" }} />
                  <input
                    type="password"
                    value={nvidiaApiKeyInput}
                    onChange={(e) => setNvidiaApiKeyInput(e.target.value)}
                    placeholder="nvapi-..."
                    style={{
                      flex: 1,
                      padding: "8px 11px",
                      borderRadius: "8px",
                      border: "1px solid #d6c4b0",
                      fontSize: "13px"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowNimModal(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #d6c4b0",
                    background: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNimSettings}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#15803d",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    cursor: "pointer"
                  }}
                >
                  <Check size={14} />
                  <span>{savingNimSettings ? "Saving..." : "Save Configuration"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminAIAgentChat;
