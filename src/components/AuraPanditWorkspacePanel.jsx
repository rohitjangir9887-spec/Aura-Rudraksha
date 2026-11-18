import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileText,
  Bookmark,
  History,
  ChevronDown,
  MessageSquare,
  SlidersHorizontal,
  PieChart
} from "lucide-react";

const PANEL_EASE = [0.16, 1, 0.3, 1];

export const PANDIT_ASTROLOGY_QUICK_TOPICS = [
  {
    label: "नौकरी व करियर",
    query: "मेरी जन्म कुंडली और ग्रह स्थिति के अनुसार नौकरी, करियर व पदोन्नति के योग बताएं।"
  },
  {
    label: "धन, व्यापार व आर्थिक स्थिति",
    query: "मेरी कुंडली में धन योग, व्यापार व आर्थिक स्थिति मजबूत करने के उपाय बताएं।"
  },
  {
    label: "विवाह, संबंध व जीवनसाथी",
    query: "मेरी कुंडली के अनुसार विवाह योग, संबंध व जीवनसाथी का विचार बताएं।"
  },
  {
    label: "रुद्राक्ष धारण विधि",
    query: "रुद्राक्ष को शुद्ध करने, प्राण-प्रतिष्ठा और धारण करने की संपूर्ण वैदिक विधि व बीज मंत्र बताएं।"
  }
];

export function AuraPanditWorkspacePanel({
  conversationId,
  savedSessions = [],
  onNewChat,
  onSelectSession,
  onToggleBirthForm,
  onOpenSavedKundalis,
  onOpenHistory,
  onSendQuickPrompt,
  panditPrefs = { responseStyle: "detailed", chartStyle: "auto" },
  onChangePanditPref,
  onOpenVedicTools
}) {
  const [showOptions, setShowOptions] = useState(false);

  const findSessionByKeyword = (kw) =>
    savedSessions.find(
      (s) => s && typeof s.title === "string" && s.title.includes(kw) && s.id !== conversationId
    );

  const activeStyleLabel = panditPrefs.responseStyle === "balanced" ? "अपनी मर्जी की बात" : "विस्तृत";
  const chartMap = {
    auto: "Auto",
    chart: "चक्र+ग्राफ",
    cards: "कार्ड",
    table: "तालिका"
  };
  const activeChartLabel = chartMap[panditPrefs.chartStyle] || "Auto";

  return (
    <div className="aura-pandit-workspace">
      {/* A. Kundli Controls: 4 equal-height compact controls */}
      <div className="aura-pandit-kundli-controls" role="group" aria-label="Kundli Controls">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onNewChat}
          className="aura-pandit-ctrl-btn aura-pandit-ctrl-btn-primary"
        >
          <Plus size={13} strokeWidth={2.3} aria-hidden="true" />
          <span>New Chat</span>
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onToggleBirthForm}
          className="aura-pandit-ctrl-btn"
        >
          <FileText size={13} strokeWidth={2.1} aria-hidden="true" />
          <span>Kundli Form</span>
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onOpenSavedKundalis}
          className="aura-pandit-ctrl-btn"
        >
          <Bookmark size={13} strokeWidth={2.1} aria-hidden="true" />
          <span>Saved Kundalis</span>
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onOpenHistory}
          className="aura-pandit-ctrl-btn"
        >
          <History size={13} strokeWidth={2.1} aria-hidden="true" />
          <span>History</span>
        </motion.button>
      </div>

      {/* Collapsible Settings & Chat Options Summary Trigger */}
      <button
        type="button"
        onClick={() => setShowOptions((prev) => !prev)}
        aria-expanded={showOptions}
        className="aura-pandit-settings-toggle"
      >
        <span className="aura-pandit-settings-summary">
          <SlidersHorizontal size={12} strokeWidth={2.1} className="text-[#702A20] shrink-0" aria-hidden="true" />
          <span>अंदाज़: <b>{activeStyleLabel}</b></span>
          <span className="aura-pandit-dot-sep" aria-hidden="true">•</span>
          <span>ग्राफ: <b>{activeChartLabel}</b></span>
        </span>
        <motion.span
          animate={{ rotate: showOptions ? 180 : 0 }}
          transition={{ duration: 0.2, ease: PANEL_EASE }}
          className="text-[#887565] inline-flex shrink-0"
          aria-hidden="true"
        >
          <ChevronDown size={14} strokeWidth={2.2} />
        </motion.span>
      </button>

      {/* B, C, D: Expandable Chat, अंदाज़, and Graph Settings */}
      <AnimatePresence initial={false}>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: PANEL_EASE }}
            className="overflow-hidden"
          >
            <div className="aura-pandit-settings-drawer">
              {/* B. Chat and Astrology Options */}
              <div className="aura-pandit-opt-group">
                <div className="aura-pandit-opt-label">
                  <MessageSquare size={11} strokeWidth={2.2} aria-hidden="true" />
                  <span>चैट व परामर्श</span>
                </div>
                <div className="aura-pandit-pill-row">
                  <button
                    type="button"
                    onClick={onNewChat}
                    className="aura-pandit-pill-btn"
                  >
                    नया चैट
                  </button>
                  <button
                    type="button"
                    onClick={onOpenHistory}
                    className="aura-pandit-pill-btn is-active"
                  >
                    सक्रिय चैट
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const matched = findSessionByKeyword("नमस्ते पंडित जी");
                      if (matched && onSelectSession) {
                        onSelectSession(matched.id);
                      } else if (onSendQuickPrompt) {
                        onSendQuickPrompt("नमस्ते पंडित जी 🙏 कृपया मेरी कुंडली व जीवन का मार्गदर्शन करें।");
                      }
                    }}
                    className="aura-pandit-pill-btn"
                  >
                    नमस्ते पंडित जी
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const matched = findSessionByKeyword("नमस्ते पंडित");
                      if (matched && onSelectSession) {
                        onSelectSession(matched.id);
                      } else if (onSendQuickPrompt) {
                        onSendQuickPrompt("नमस्ते पंडित 🙏 मुझे वैदिक उपाय व रुद्राक्ष परामर्श चाहिए।");
                      }
                    }}
                    className="aura-pandit-pill-btn"
                  >
                    नमस्ते पंडित
                  </button>
                </div>
              </div>

              {/* C. अंदाज़ Settings */}
              <div className="aura-pandit-opt-group">
                <div className="aura-pandit-opt-label">
                  <SlidersHorizontal size={11} strokeWidth={2.2} aria-hidden="true" />
                  <span>अंदाज़</span>
                </div>
                <div className="aura-pandit-pill-row">
                  <button
                    type="button"
                    onClick={() => onChangePanditPref?.({ responseStyle: "detailed" })}
                    className={`aura-pandit-pill-btn ${panditPrefs.responseStyle === "detailed" ? "is-active" : ""}`}
                  >
                    विस्तृत
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangePanditPref?.({ responseStyle: "balanced" })}
                    className={`aura-pandit-pill-btn ${panditPrefs.responseStyle === "balanced" ? "is-active" : ""}`}
                  >
                    अपनी मर्जी की बात
                  </button>
                </div>
              </div>

              {/* D. Graph Settings */}
              <div className="aura-pandit-opt-group">
                <div className="aura-pandit-opt-label">
                  <PieChart size={11} strokeWidth={2.2} aria-hidden="true" />
                  <span>ग्राफ व दृश्य</span>
                </div>
                <div className="aura-pandit-pill-row">
                  {[
                    { id: "auto", label: "Auto" },
                    { id: "chart", label: "चक्र+ग्राफ" },
                    { id: "cards", label: "कार्ड" },
                    { id: "table", label: "तालिका" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangePanditPref?.({ chartStyle: opt.id })}
                      className={`aura-pandit-pill-btn ${panditPrefs.chartStyle === opt.id ? "is-active" : ""}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onOpenVedicTools?.("milan")}
                    className="aura-pandit-pill-btn aura-pandit-pill-tools"
                  >
                    टूल्स
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
