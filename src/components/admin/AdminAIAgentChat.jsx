import React, { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles, AlertTriangle, Check } from "lucide-react";
import { auraAiClient } from "../../lib/auraAiClient";
import { AuraAIMessageContent } from "../AuraAIMessageContent";
import { emitToast } from "../../context/ToastContext";

export function AdminAIAgentChat() {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Namaste! I am the Aura AI Admin Agent. I can help you research products, analyze SEO, verify inventory, or provide strategic recommendations. How can I assist you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isTakingAction, setIsTakingAction] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput("");
    
    const newMsgs = [...messages, { sender: "user", text: userText }];
    setMessages(newMsgs);
    setIsTyping(true);

    try {
      const res = await auraAiClient.sendAdminChat(newMsgs);
      if (res && res.messages) {
        setMessages(res.messages);
      } else {
        setMessages([...newMsgs, { sender: "ai", text: "I encountered an error while processing that request." }]);
      }
    } catch (e) {
      setMessages([...newMsgs, { sender: "ai", text: "Connection error with the Aura AI backend." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="admin-ai-tab-content" style={{ display: 'flex', flexDirection: 'column', height: '600px', background: '#fff', border: '1px solid #eadecd', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '16px', background: '#fdfbf7', borderBottom: '1px solid #eadecd', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={18} color="#b45309" />
        <h3 style={{ margin: 0, fontSize: '15px', color: '#7c2d12' }}>Aura AI Admin Agent</h3>
      </div>
      
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: '12px',
              background: m.sender === 'user' ? '#7c2d12' : '#f8f5f2',
              color: m.sender === 'user' ? '#fff' : '#2b170d',
              fontSize: '13.5px',
              lineHeight: '1.5',
              boxShadow: m.sender === 'user' ? '0 2px 8px rgba(124,45,18,0.15)' : 'none',
              border: m.sender === 'ai' ? '1px solid #eadecd' : 'none'
            }}>
              {m.sender === 'user' ? (
                m.text
              ) : (
                <AuraAIMessageContent content={m.text} />
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{ alignSelf: 'flex-start', background: '#f8f5f2', padding: '12px 16px', borderRadius: '12px', border: '1px solid #eadecd', display: 'flex', alignItems: 'center', gap: '8px', color: '#7a6a5e', fontSize: '13px' }}>
            <Loader2 size={14} className="spin" /> Thinking...
          </div>
        )}
      </div>

      <div style={{ padding: '12px', background: '#fff', borderTop: '1px solid #eadecd', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Aura AI to analyze products, sales, or SEO..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
          disabled={isTyping}
        />
        <button
          onClick={handleSend}
          disabled={isTyping || !input.trim()}
          style={{
            background: input.trim() && !isTyping ? '#c2410c' : '#fdba74',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0 16px',
            cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
