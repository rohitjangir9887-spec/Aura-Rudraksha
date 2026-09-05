import React from "react";
import { Sparkles, Send } from "lucide-react";
import { AuraAIMessageContent } from "../AuraAIMessageContent";
import { customerSafeAiText } from "../../lib/auraAiResponse";

export function SupportChatView({ chatMessages, loadingAi, input, setInput, handleAskQuickQuery }) {
  return (
    <>
      {/* Interactive Conversation View */}
      {chatMessages.length > 0 && (
        <div style={{
          maxHeight: 240,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 12,
          padding: "10px 12px",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #ebdccb"
        }}>
          {chatMessages.map((m, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                background: m.sender === "user" ? "linear-gradient(135deg, #8c2b10 0%, #6e1e07 100%)" : "#ffffff",
                color: m.sender === "user" ? "#fff" : "#2b1408",
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: 12.5,
                maxWidth: "88%",
                lineHeight: 1.5,
                border: m.sender === "user" ? "none" : "1px solid #ebdccb",
                boxShadow: "0 1px 4px rgba(43, 20, 8, 0.04)"
              }}
            >
              <AuraAIMessageContent text={customerSafeAiText(m.text)} sender={m.sender} />
            </div>
          ))}
          {loadingAi && (
            <div style={{ alignSelf: "flex-start", fontSize: 11, color: "#8c2b10", display: "flex", alignItems: "center", gap: 5 }}>
              <Sparkles size={12} className="aura-ai-sparkle-spin" /> Aura AI is consulting store records...
            </div>
          )}
        </div>
      )}

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            handleAskQuickQuery(input.trim());
            setInput("");
          }
        }}
        style={{
          display: "flex",
          gap: 6,
          background: "#fff",
          border: "1px solid #dfcfbc",
          borderRadius: 10,
          padding: "3px 4px 3px 10px"
        }}
      >
        <input
          type="text"
          placeholder="Ask Aura AI about your order, tracking, returns, or bead selection..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loadingAi}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            fontSize: 12.5,
            outline: "none",
            color: "#2b1408"
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loadingAi}
          style={{
            background: "#8c2b10",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: !input.trim() || loadingAi ? "not-allowed" : "pointer",
            opacity: !input.trim() || loadingAi ? 0.6 : 1
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </>
  );
}
