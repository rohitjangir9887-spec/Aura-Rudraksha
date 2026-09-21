import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, Trash2, MessageSquare, Clock, Plus, ArrowRight } from "lucide-react";
import { auraChatStore, formatMessageTime, getDateDividerLabel } from "../lib/auraChatStore";
import { emitToast } from "../context/ToastContext";

export function AuraAIChatHistoryModal({ isOpen, onClose, onSelectSession, currentMode = "panditji" }) {
  const [sessions, setSessions] = useState([]);
  const [activeConvId, setActiveConvId] = useState("");

  const loadSessions = () => {
    try {
      const convId = auraChatStore.getConversationId();
      setActiveConvId(convId);
      const uid = auraChatStore.getCurrentUserUid();
      const storageKey = `aura_ai_saved_sessions_${currentMode}_${uid}`;
      const raw = localStorage.getItem(storageKey);
      let list = [];
      if (raw) {
        list = JSON.parse(raw);
      }
      
      // Also check current active messages
      const activeMsgs = auraChatStore.getMessages(currentMode);
      const hasUserMsg = activeMsgs.some(m => m.sender === "user");
      if (hasUserMsg && !list.some(s => s.id === convId)) {
        const firstUserMsg = activeMsgs.find(m => m.sender === "user")?.text || "Vedic Consultation";
        list.unshift({
          id: convId,
          title: firstUserMsg.slice(0, 45) + (firstUserMsg.length > 45 ? "..." : ""),
          timestamp: new Date().toISOString(),
          messageCount: activeMsgs.length,
          messages: activeMsgs
        });
      }
      setSessions(list);
    } catch (_) {
      setSessions([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, currentMode]);

  const handleSelect = (session) => {
    if (onSelectSession) {
      onSelectSession(session);
    }
    onClose();
  };

  const handleDelete = (e, sessionId) => {
    e.stopPropagation();
    try {
      const uid = auraChatStore.getCurrentUserUid();
      const storageKey = `aura_ai_saved_sessions_${currentMode}_${uid}`;
      const updated = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setSessions(updated);
      emitToast("परामर्श सत्र हटा दिया गया (Chat Deleted)", "info");
    } catch (_) {}
  };

  const handleNewChat = () => {
    const { newConvId, messages } = auraChatStore.startNewSession(currentMode);
    if (onSelectSession) {
      onSelectSession({ id: newConvId, messages });
    }
    emitToast("नया सत्र प्रारंभ हुआ (New Chat Started)", "success");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="chat-history-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="chat-history-modal-dialog"
            initial={{ opacity: 0, scale: 0.93, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full max-w-md bg-[#fdfaf5] border border-[#dfcfbc] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            style={{ boxShadow: "0 8px 36px rgba(74, 14, 23, 0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#8c2b10] to-[#5c1c0a] text-white">
            <div className="flex items-center gap-2">
              <History size={16} className="text-amber-300" />
              <h3 className="text-sm font-bold tracking-wide">
                {currentMode === "panditji" ? "📜 पुरानी चैट व परामर्श इतिहास" : "📜 Chat History"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/10 transition-colors text-amber-100"
            >
              <X size={16} />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3 bg-white border-b border-[#e5d2b8]">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full py-2 px-3 bg-[#8c2b10] hover:bg-[#6e220c] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>+ नया सत्र शुरू करें (Start New Consultation)</span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[160px]">
            {sessions.length === 0 ? (
              <div className="text-center py-10 text-xs text-amber-900/60">
                <MessageSquare size={28} className="mx-auto mb-2 text-amber-800/30" />
                <p className="font-medium">कोई पिछला परामर्श सत्र नहीं मिला।</p>
                <p className="text-[11px] mt-1 text-stone-500">नया प्रश्न पूछने पर आपका चैट इतिहास यहाँ सुरक्षित रहेगा।</p>
              </div>
            ) : (
              sessions.map((s, idx) => {
                const isActive = s.id === activeConvId;
                return (
                  <div
                    key={s.id || idx}
                    onClick={() => handleSelect(s)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isActive 
                        ? "bg-amber-50/80 border-[#c47a3a] shadow-sm" 
                        : "bg-white border-[#ebdccb] hover:border-[#c47a3a]/60 hover:bg-stone-50/70"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={13} className={isActive ? "text-[#8c2b10]" : "text-stone-400"} />
                        <h4 className="text-xs font-bold text-[#2b1408] truncate">
                          {s.title || "Vedic Astrological Consultation"}
                        </h4>
                        {isActive && (
                          <span className="text-[9.5px] bg-[#8c2b10] text-white px-1.5 py-0.2 rounded font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10.5px] text-stone-500">
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} /> {getDateDividerLabel(s.timestamp)} ({formatMessageTime(s.timestamp)})
                        </span>
                        {s.messageCount && (
                          <span>• {s.messageCount} संदेश</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, s.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Session"
                      >
                        <Trash2 size={13} />
                      </button>
                      <span className="text-stone-400">
                        <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-[#f4ebd9] border-t border-[#e5d2b8] text-[11px] text-[#5c3014] text-center">
            🔒 आपका चैट इतिहास 100% सुरक्षित एवं केवल आपके डिवाइस पर उपलब्ध है।
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
