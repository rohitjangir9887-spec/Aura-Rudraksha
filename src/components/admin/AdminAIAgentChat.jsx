import React, { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles, AlertTriangle, Check, Volume2, RotateCcw, Copy } from "lucide-react";
import { auraAiClient } from "../../lib/auraAiClient";
import { AuraAIMessageContent } from "../AuraAIMessageContent";
import { VoiceReader } from "../VoiceReader";
import { emitToast } from "../../context/ToastContext";

const INITIAL_MESSAGE = {
  sender: "ai",
  text: "🙏 **Namaste Admin!** Main Aura AI Admin Agent hoon (Powered by Gemini & MongoDB Intelligence). Main store catalog research, SEO optimization, inventory analysis, aur sales strategy mein aapki poori madad karne ke liye tayyar hoon. Aap aaj kya analyze karna chahte hain?"
};

export function AdminAIAgentChat() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (overrideText = null) => {
    const textToSend = typeof overrideText === "string" ? overrideText.trim() : input.trim();
    if (!textToSend || isTyping) return;

    setInput("");
    setLastFailedMessage(null);

    const newMsgs = [...messages, { sender: "user", text: textToSend }];
    setMessages(newMsgs);
    setIsTyping(true);

    try {
      const res = await auraAiClient.sendAdminChat(newMsgs);
      if (res && res.text) {
        setMessages([...newMsgs, { sender: "ai", text: res.text }]);
      } else if (res && res.messages && Array.isArray(res.messages)) {
        setMessages(res.messages);
      } else if (res && res.error) {
        setLastFailedMessage(textToSend);
        setMessages([...newMsgs, { 
          sender: "ai", 
          text: `⚠️ **Aura AI Notice:** ${res.error}\n\n*Aap niche 'Retry' button par click karke request dohra sakte hain.*` 
        }]);
      } else {
        setLastFailedMessage(textToSend);
        setMessages([...newMsgs, { 
          sender: "ai", 
          text: "Store database sync active hai. Ek pal mein request process nahi ho payi, kripya retry karein." 
        }]);
      }
    } catch (e) {
      setLastFailedMessage(textToSend);
      setMessages([...newMsgs, { 
        sender: "ai", 
        text: `⚠️ **Connection notice:** AI response lene mein issue aaya (${e.message || "Network Error"}). Kripya 'Retry' karein.` 
      }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const handleQuickPrompt = (promptText) => {
    handleSend(promptText);
  };

  const handleResetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setLastFailedMessage(null);
    emitToast("Admin AI chat reset to initial state.", "info");
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSend(lastFailedMessage);
    }
  };

  return (
    <div 
      className="admin-ai-tab-content" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '660px', 
        maxHeight: '85vh',
        background: '#fff', 
        border: '1px solid #eadecd', 
        borderRadius: '12px', 
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(43,23,13,0.06)'
      }}
    >
      {/* Top Header */}
      <div style={{ 
        padding: '12px 16px', 
        background: 'linear-gradient(135deg, #fdfbf7 0%, #faede2 100%)', 
        borderBottom: '1px solid #eadecd', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#7c2d12', color: '#fff', width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', boxShadow: '0 2px 6px rgba(124,45,18,0.25)' }}>
            <Sparkles size={17} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#7c2d12' }}>Aura AI Admin Agent</h3>
            <span style={{ fontSize: '11px', color: '#9a7b6c', fontWeight: 500 }}>Autonomous Business Strategist • Live Catalog Intelligence</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleResetChat}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              fontSize: '11.5px',
              color: '#7c2d12',
              background: '#fff',
              border: '1px solid #e2d2c1',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              touchAction: 'manipulation'
            }}
            title="Start fresh conversation"
          >
            <RotateCcw size={13} /> Reset
          </button>
          <span style={{ 
            fontSize: '11px', 
            background: '#e5f6ea', 
            color: '#16a34a', 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            Active & Live
          </span>
        </div>
      </div>
      
      {/* Message List */}
      <div 
        ref={scrollRef} 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px',
          background: '#fcfbf9'
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '88%',
              padding: '12px 16px',
              borderRadius: '12px',
              background: m.sender === 'user' ? '#7c2d12' : '#ffffff',
              color: m.sender === 'user' ? '#fff' : '#2b170d',
              fontSize: '13.5px',
              lineHeight: '1.6',
              boxShadow: m.sender === 'user' ? '0 2px 8px rgba(124,45,18,0.18)' : '0 1px 4px rgba(43,23,13,0.06)',
              border: m.sender === 'ai' ? '1px solid #ebd9c8' : 'none'
            }}>
              {m.sender === 'user' ? (
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: 500 }}>
                  {m.text || m.content}
                </div>
              ) : (
                <>
                  <AuraAIMessageContent text={m.text || m.content} />
                  {m.text && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #f0e4d7' }}>
                      <VoiceReader text={m.text || m.content} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{ 
            alignSelf: 'flex-start', 
            background: '#ffffff', 
            padding: '12px 16px', 
            borderRadius: '12px', 
            border: '1px solid #ebd9c8', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            color: '#7c2d12', 
            fontSize: '13px',
            boxShadow: '0 2px 6px rgba(43,23,13,0.05)'
          }}>
            <Loader2 size={16} className="spin" style={{ color: '#7c2d12' }} /> 
            <span style={{ fontWeight: 600 }}>Aura AI Agent is analyzing catalog, inventory & sales...</span>
          </div>
        )}
        {lastFailedMessage && !isTyping && (
          <div style={{ alignSelf: 'flex-start', margin: '4px 0' }}>
            <button
              type="button"
              onClick={handleRetry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#991b1b',
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
            >
              <RotateCcw size={13} /> Retry last question
            </button>
          </div>
        )}
      </div>

      {/* Quick Prompt Recommendation Chips (One-Tap Direct Execution) */}
      <div style={{ 
        padding: '8px 12px', 
        background: '#faf7f2', 
        borderTop: '1px solid #eadecd', 
        display: 'flex', 
        gap: '6px', 
        overflowX: 'auto', 
        whiteSpace: 'nowrap',
        WebkitOverflowScrolling: 'touch'
      }}>
        <button 
          type="button" 
          disabled={isTyping}
          onClick={() => handleQuickPrompt("Analyze current store catalog and suggest top selling products")} 
          style={{ 
            padding: '6px 12px', 
            fontSize: '11.5px', 
            background: '#ffffff', 
            border: '1px solid #dcd1c6', 
            borderRadius: '14px', 
            color: '#7a320c', 
            cursor: isTyping ? 'not-allowed' : 'pointer', 
            fontWeight: '600',
            opacity: isTyping ? 0.6 : 1,
            touchAction: 'manipulation'
          }}
        >
          🔍 Analyze Catalog Sales
        </button>
        <button 
          type="button" 
          disabled={isTyping}
          onClick={() => handleQuickPrompt("Write a high-converting SEO product description for 5 Mukhi Nepal Mala with Shiva Purana references")} 
          style={{ 
            padding: '6px 12px', 
            fontSize: '11.5px', 
            background: '#ffffff', 
            border: '1px solid #dcd1c6', 
            borderRadius: '14px', 
            color: '#7a320c', 
            cursor: isTyping ? 'not-allowed' : 'pointer', 
            fontWeight: '600',
            opacity: isTyping ? 0.6 : 1,
            touchAction: 'manipulation'
          }}
        >
          ✍️ SEO Description
        </button>
        <button 
          type="button" 
          disabled={isTyping}
          onClick={() => handleQuickPrompt("Check current inventory and identify low stock products")} 
          style={{ 
            padding: '6px 12px', 
            fontSize: '11.5px', 
            background: '#ffffff', 
            border: '1px solid #dcd1c6', 
            borderRadius: '14px', 
            color: '#7a320c', 
            cursor: isTyping ? 'not-allowed' : 'pointer', 
            fontWeight: '600',
            opacity: isTyping ? 0.6 : 1,
            touchAction: 'manipulation'
          }}
        >
          📦 Inventory Status
        </button>
        <button 
          type="button" 
          disabled={isTyping}
          onClick={() => handleQuickPrompt("Suggest promotional discount offer strategy for upcoming festival")} 
          style={{ 
            padding: '6px 12px', 
            fontSize: '11.5px', 
            background: '#ffffff', 
            border: '1px solid #dcd1c6', 
            borderRadius: '14px', 
            color: '#7a320c', 
            cursor: isTyping ? 'not-allowed' : 'pointer', 
            fontWeight: '600',
            opacity: isTyping ? 0.6 : 1,
            touchAction: 'manipulation'
          }}
        >
          🏷️ Promotional Strategy
        </button>
      </div>

      {/* Semantic Form Input for Flawless Desktop & Mobile Touch / Enter Execution */}
      <form 
        onSubmit={handleSubmit}
        style={{ 
          padding: '12px', 
          background: '#fff', 
          borderTop: '1px solid #eadecd', 
          display: 'flex', 
          gap: '8px',
          alignItems: 'center'
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Aura AI to analyze products, sales, SEO, or inventory..."
          style={{ 
            flex: 1, 
            padding: '12px 14px', 
            borderRadius: '8px', 
            border: '1px solid #c2b4a5', 
            fontSize: '14px', 
            outline: 'none',
            color: '#2b170d',
            backgroundColor: '#ffffff',
            fontWeight: '500',
            touchAction: 'manipulation'
          }}
          disabled={isTyping}
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          style={{
            background: input.trim() && !isTyping ? '#7c2d12' : '#cbd5e1',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0 18px',
            height: '44px',
            fontWeight: '600',
            cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            touchAction: 'manipulation',
            boxShadow: input.trim() && !isTyping ? '0 2px 6px rgba(124,45,18,0.25)' : 'none'
          }}
        >
          {isTyping ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
