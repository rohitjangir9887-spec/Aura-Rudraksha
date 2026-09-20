import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  X, 
  Sparkles, 
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { auraChatStore } from "../lib/auraChatStore";
import { emitToast } from "../context/ToastContext";

export function AuraAIChatShareModal({
  isOpen,
  onClose,
  messages = [],
  mode = "standard",
  extra = {}
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isPandit = mode === "panditji";

  const handleCopyChat = async () => {
    const success = await auraChatStore.copyChatToClipboard(messages, mode, extra);
    if (success) {
      setCopied(true);
      emitToast("सम्पूर्ण परामर्श कॉपी हो गया! (Chat Copied)", "success");
      setTimeout(() => setCopied(false), 2200);
    } else {
      emitToast("कॉपी करने में त्रुटि हुई", "error");
    }
  };

  const handleWhatsAppShare = () => {
    const success = auraChatStore.shareChatOnWhatsApp(messages, mode, extra);
    if (success) {
      emitToast("WhatsApp खुल रहा है...", "info");
      onClose();
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const text = auraChatStore.formatChatForExport(messages, mode, extra);
        await navigator.share({
          title: isPandit ? "Aura AI Panditji - वैदिक कुंडली व रुद्राक्ष परामर्श" : "Aura Rudraksha Consultation",
          text: text,
          url: window.location.href
        });
        emitToast("शेयर सफल!", "success");
        onClose();
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("Native share error:", err);
        }
      }
    } else {
      handleCopyChat();
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
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#f5e6d3]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4A0E17] via-[#651520] to-[#781B28] px-4 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-amber-100 flex items-center gap-1.5">
                {isPandit ? "वैदिक परामर्श शेयर करें (Share Reading)" : "बातचीत शेयर करें (Share Chat)"}
              </h3>
              <p className="text-[11px] text-amber-200/80">
                WhatsApp, SMS या अपने परिजनों के साथ साझा करें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="बंद करें"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content & Action Buttons */}
        <div className="p-4 space-y-3 bg-[#fdfbf7]">
          {/* WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="w-full p-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl shadow-md flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-lg">
                <MessageCircle size={20} />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm">WhatsApp पर शेयर करें</h4>
                <p className="text-[11px] text-emerald-100">सीधे परिवार या मित्रों को भेजें</p>
              </div>
            </div>
            <ExternalLink size={16} className="text-emerald-200 group-hover:text-white" />
          </button>

          {/* Copy Chat Button */}
          <button
            type="button"
            onClick={handleCopyChat}
            className="w-full p-3.5 bg-white hover:bg-gray-50 border-2 border-amber-300/80 text-gray-800 rounded-xl shadow-sm flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm text-[#4A0E17]">
                  {copied ? "कॉपी हो गया! ✓" : "पूरी बातचीत कॉपी करें (Copy)"}
                </h4>
                <p className="text-[11px] text-gray-500">क्लिपबोर्ड पर संपूर्ण वैदिक सारांश कॉपी करें</p>
              </div>
            </div>
            {copied && <span className="text-xs font-bold text-emerald-600">Copied</span>}
          </button>

          {/* System Share (Mobile/Desktop Web Share) */}
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all"
            >
              <Share2 size={14} />
              <span>अन्य ऐप्स (Gmail, Telegram, Messages) में शेयर करें</span>
            </button>
          )}

          <div className="pt-2 text-center text-[11px] text-gray-400">
            🙏 100% प्राण-प्रतिष्ठित व वैदिक लैब प्रमाणित रुद्राक्ष
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium"
          >
            बंद करें
          </button>
        </div>
      </motion.div>
    </div>
  );
}
