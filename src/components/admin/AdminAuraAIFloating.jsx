import React, { useState, useRef, useEffect } from "react";
import { Briefcase, BrainCircuit, X, Send, Maximize2, Minimize2, Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AdminAuraAIFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState([
    { role: "model", text: "Namaste Admin 🙏 Main Aura AI Agent (Nemotron-3) hoon. Aapka research aur sales expert employee. Aaj main aapki kaise sahayata kar sakta hoon?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = { role: "user", text: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem("aura_admin_token") || sessionStorage.getItem("aura_admin_token");
      const res = await fetch("/api/aura-ai/admin-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ messages: newMessages })
      });
      
      const data = await res.json();
      if (res.ok && data.text) {
        setMessages([...newMessages, { role: "model", text: data.text }]);
      } else {
        setMessages([...newMessages, { role: "model", text: "Sorry, network error occurred while reaching the AI." }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: "model", text: "Sorry, something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              color: 'white',
              border: 'none',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}
          >
            <Briefcase size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: isMaximized ? '0' : '24px',
              right: isMaximized ? '0' : '24px',
              width: isMaximized ? '100vw' : '400px',
              height: isMaximized ? '100vh' : '600px',
              maxWidth: '100%',
              maxHeight: '100%',
              background: '#fff',
              borderRadius: isMaximized ? '0' : '16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 10000,
              border: isMaximized ? 'none' : '1px solid #e2e8f0'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              background: '#0f172a',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BrainCircuit size={24} style={{ color: '#60a5fa' }} />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>Aura AI Admin Agent</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Search size={10} /> Research & Sales Employee
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setIsMaximized(!isMaximized)} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }}>
                  {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: '#f8fafc'
            }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: msg.role === 'user' ? '#0f172a' : '#ffffff',
                    color: msg.role === 'user' ? 'white' : '#1e293b',
                    border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                    boxShadow: msg.role === 'model' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    {msg.role === 'model' ? (
                      <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.text}
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#64748b',
                    fontSize: '13px'
                  }}>
                    <Loader2 size={16} className="animate-spin" /> Thinking & Searching...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
              padding: '16px',
              background: 'white',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '12px'
            }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask for research, writing, or web search..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '24px',
                  border: '1px solid #cbd5e1',
                  background: '#f1f5f9',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                style={{
                  background: input.trim() && !isLoading ? '#0f172a' : '#94a3b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s'
                }}
              >
                <Send size={18} style={{ marginLeft: '2px' }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
