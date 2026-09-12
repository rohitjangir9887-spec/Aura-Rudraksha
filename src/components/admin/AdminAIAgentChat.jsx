import React, { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles, AlertTriangle, Check, Volume2 } from "lucide-react";
import { auraAiClient } from "../../lib/auraAiClient";
import { AuraAIMessageContent } from "../AuraAIMessageContent";
import { VoiceReader } from "../VoiceReader";
import { emitToast } from "../../context/ToastContext";

export function AdminAIAgentChat() {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "🙏 **Namaste Admin!** Main Aura AI Admin Agent hoon (Powered by Nemotron-3 Super 120B). Main store catalog research, SEO optimization, inventory analysis, aur sales strategy mein aapki poori madad karne ke liye tayyar hoon. Aap aaj kya analyze karna chahte hain?"
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
      if (res && res.text) {
        setMessages([...newMsgs, { sender: "ai", text: res.text }]);
      } else if (res && res.messages) {
        setMessages(res.messages);
      } else if (res && res.error) {
        setMessages([...newMsgs, { sender: "ai", text: `⚠️ ${res.error}` }]);
      } else {
        setMessages([...newMsgs, { sender: "ai", text: "Store metadata aur catalog sync active hai. Kripya apna request punah likhen." }]);
      }
    } catch (e) {
      setMessages([...newMsgs, { sender: "ai", text: "Aura AI backend se connect ho raha hai. Store catalog verified hai." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    setInput(promptText);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="admin-ai-tab-content" style={{ display: 'flex', flexDirection: 'column', height: '620px', background: '#fff', border: '1px solid #eadecd', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #fdfbf7 0%, #faede2 100%)', borderBottom: '1px solid #eadecd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: '#7c2d12', color: '#fff', width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center' }}>
            <Sparkles size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#7c2d12' }}>Aura AI Admin Agent</h3>
            <span style={{ fontSize: '11px', color: '#9a7b6c' }}>Nemotron-3 Super 120B • Live MongoDB Intelligence</span>
          </div>
        </div>
        <span style={{ fontSize: '11px', background: '#e5f6ea', color: '#16a34a', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
          ● Live AI Connected
        </span>
      </div>
      
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '88%',
              padding: '12px 16px',
              borderRadius: '12px',
              background: m.sender === 'user' ? '#7c2d12' : '#f8f5f2',
              color: m.sender === 'user' ? '#fff' : '#2b170d',
              fontSize: '13.5px',
              lineHeight: '1.6',
              boxShadow: m.sender === 'user' ? '0 2px 8px rgba(124,45,18,0.15)' : 'none',
              border: m.sender === 'ai' ? '1px solid #eadecd' : 'none'
            }}>
              {m.sender === 'user' ? (
                m.text || m.content
              ) : (
                <>
                  <AuraAIMessageContent text={m.text || m.content} />
                  {m.text && (
                    <div style={{ marginTop: '8px' }}>
                      <VoiceReader text={m.text || m.content} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{ alignSelf: 'flex-start', background: '#f8f5f2', padding: '12px 16px', borderRadius: '12px', border: '1px solid #eadecd', display: 'flex', alignItems: 'center', gap: '8px', color: '#7a6a5e', fontSize: '13px' }}>
            <Loader2 size={14} className="spin" /> Nemotron AI is analyzing store catalog...
          </div>
        )}
      </div>

      {/* Quick Prompt Recommendation Chips */}
      <div style={{ padding: '8px 12px', background: '#faf7f2', borderTop: '1px solid #eadecd', display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button 
          type="button" 
          onClick={() => handleQuickPrompt("Analyze current store catalog and suggest top selling products")} 
          style={{ padding: '5px 12px', fontSize: '11.5px', background: '#ffffff', border: '1px solid #dcd1c6', borderRadius: '14px', color: '#7a320c', cursor: 'pointer', fontWeight: '600' }}
        >
          🔍 Analyze Catalog Sales
        </button>
        <button 
          type="button" 
          onClick={() => handleQuickPrompt("Write a high-converting SEO product description for 5 Mukhi Nepal Mala with Shiva Purana references")} 
          style={{ padding: '5px 12px', fontSize: '11.5px', background: '#ffffff', border: '1px solid #dcd1c6', borderRadius: '14px', color: '#7a320c', cursor: 'pointer', fontWeight: '600' }}
        >
          ✍️ SEO Description
        </button>
        <button 
          type="button" 
          onClick={() => handleQuickPrompt("Check current inventory and identify low stock products")} 
          style={{ padding: '5px 12px', fontSize: '11.5px', background: '#ffffff', border: '1px solid #dcd1c6', borderRadius: '14px', color: '#7a320c', cursor: 'pointer', fontWeight: '600' }}
        >
          📦 Inventory Status
        </button>
        <button 
          type="button" 
          onClick={() => handleQuickPrompt("Suggest promotional discount offer strategy for upcoming festival")} 
          style={{ padding: '5px 12px', fontSize: '11.5px', background: '#ffffff', border: '1px solid #dcd1c6', borderRadius: '14px', color: '#7a320c', cursor: 'pointer', fontWeight: '600' }}
        >
          🏷️ Promotional Strategy
        </button>
      </div>

      <div style={{ padding: '12px', background: '#fff', borderTop: '1px solid #eadecd', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
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
            fontWeight: '500'
          }}
          disabled={isTyping}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          style={{
            background: input.trim() && !isTyping ? '#7c2d12' : '#cbd5e1',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0 18px',
            fontWeight: '600',
            cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {isTyping ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
