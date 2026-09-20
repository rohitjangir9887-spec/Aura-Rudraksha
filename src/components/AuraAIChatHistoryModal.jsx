import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  History, 
  MessageSquare, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  Plus, 
  X, 
  Calendar, 
  ArrowRight,
  Clock,
  ChevronRight
} from "lucide-react";
import { auraChatStore } from "../lib/auraChatStore";
import { emitToast } from "../context/ToastContext";

export function AuraAIChatHistoryModal({
  isOpen,
  onClose,
  activeMode = "standard",
  currentMode,
  onSelectSession,
  onStartNewChat
}) {
  const [sessions, setSessions] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all"); // "all" | "panditji" | "standard"
  const [deletingId, setDeletingId] = useState(null);

  const loadSessions = () => {
    try {
      const all = auraChatStore.getArchivedSessions("all");
      setSessions(all);
    } catch (e) {
      console.warn("Error loading archived sessions:", e);
      setSessions([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    if (selectedFilter === "all") return true;
    return s.mode === selectedFilter;
  });

  const handleDelete = (e, sessionId, sessionMode) => {
    e.stopPropagation();
    try {
      auraChatStore.deleteArchivedSession(sessionId, sessionMode);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      emitToast("बातचीत सफलतापूर्वक हटा दी गई (Chat deleted)", "info");
    } catch (err) {
      emitToast("हटाने में समस्या आई", "error");
    }
  };

  const handleSelect = (session) => {
    if (onSelectSession) {
      onSelectSession(session);
    }
    onClose();
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("hi-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (_) {
      return isoStr;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-[#f5e6d3]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4A0E17] to-[#781B28] px-4 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <History size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-amber-100 flex items-center gap-1.5">
                पुरानी बातचीत का इतिहास (Chat History)
              </h3>
              <p className="text-[11px] text-amber-200/80">
                आपकी सभी पूर्व वैदिक व शॉपिंग परामर्श यहाँ सुरक्षित हैं
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="बंद करें (Close)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Action & Filter Bar */}
        <div className="p-3 bg-[#fdfbf7] border-b border-[#f5e6d3] flex flex-wrap items-center justify-between gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedFilter("all")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                selectedFilter === "all"
                  ? "bg-[#4A0E17] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              सभी ({sessions.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("panditji")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                selectedFilter === "panditji"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              <span>🕉️</span> AI पंडित जी ({sessions.filter(s => s.mode === "panditji").length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("standard")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                selectedFilter === "standard"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60"
              }`}
            >
              <Sparkles size={10} /> Aura AI ({sessions.filter(s => s.mode !== "panditji").length})
            </button>
          </div>

          {/* New Chat Button */}
          {onStartNewChat && (
            <button
              type="button"
              onClick={() => {
                onStartNewChat();
                onClose();
              }}
              className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-medium rounded-full flex items-center gap-1 shadow-sm transition-all"
            >
              <Plus size={12} />
              <span>नयी चैट शुरू करें</span>
            </button>
          )}
        </div>

        {/* Sessions List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2.5 max-h-[50vh]">
          {filteredSessions.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={20} />
              </div>
              <h4 className="text-sm font-semibold text-gray-800 mb-1">
                कोई पुरानी बातचीत नहीं मिली
              </h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                जब आप AI पंडित जी या Aura AI से बात करते हैं और नयी चैट शुरू करते हैं, तो आपकी पुरानी चैट यहाँ सुरक्षित हो जाती है।
              </p>
              {onStartNewChat && (
                <button
                  type="button"
                  onClick={() => {
                    onStartNewChat();
                    onClose();
                  }}
                  className="mt-4 px-4 py-1.5 bg-[#4A0E17] hover:bg-[#601420] text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>अभी बात शुरू करें</span>
                </button>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isPandit = session.mode === "panditji";
              const messageCount = Array.isArray(session.messages) ? session.messages.length : 0;
              const firstUserMsg = session.messages?.find(m => m.sender === "user")?.text;
              const previewText = firstUserMsg || session.title || "Vedic Consultation";

              return (
                <div
                  key={session.id}
                  onClick={() => handleSelect(session)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                    isPandit
                      ? "bg-amber-50/40 hover:bg-amber-50/90 border-amber-200/80 hover:border-amber-400"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${
                        isPandit ? "bg-amber-500/20 text-amber-800 border border-amber-300" : "bg-blue-100 text-blue-700"
                      }`}>
                        {isPandit ? "🕉️" : <Sparkles size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isPandit ? "bg-amber-200 text-amber-900" : "bg-blue-100 text-blue-800"
                          }`}>
                            {isPandit ? "AI पंडित जी" : "Aura AI"}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock size={9} />
                            {formatDate(session.savedAt || session.timestamp)}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-gray-900 line-clamp-1 group-hover:text-[#4A0E17]">
                          {session.title || previewText}
                        </h4>
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                          {previewText}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500">
                        {messageCount} संदेश
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, session.id, session.mode)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="चैट हटाएं (Delete)"
                      >
                        <Trash2 size={13} />
                      </button>
                      <div className="p-1 text-gray-400 group-hover:text-amber-700">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#fdfbf7] border-t border-[#f5e6d3] flex items-center justify-between text-xs text-gray-500">
          <span>कुल सुरक्षित बातचीत: {sessions.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium"
          >
            बंद करें
          </button>
        </div>
      </motion.div>
    </div>
  );
}
