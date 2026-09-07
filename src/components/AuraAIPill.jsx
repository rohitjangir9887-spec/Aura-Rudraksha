import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { auraChatStore } from "../lib/auraChatStore";

export function AuraAIPill({ className = "" }) {
  const location = useLocation();
  const isDedicatedAiPage = location.pathname === "/aura-ai";

  const handleClick = (e) => {
    if (!isDedicatedAiPage) {
      e.preventDefault();
      auraChatStore.setFloatingDismissed(false);
      auraChatStore.setFloatingOpen(true);
      window.dispatchEvent(
        new CustomEvent("aura_ai_trigger_chat", { 
          detail: { mode: "standard", fullWindow: true } 
        })
      );
    }
  };

  return (
    <Link
      to="/aura-ai"
      id="aura-ai-header-pill"
      className={`aura-ai-pill-btn ${className}`}
      title="Open Aura AI Spiritual Shopping & Support Guide"
      onClick={handleClick}
    >
      <motion.span
        className="aura-ai-pill-glow"
        animate={{
          opacity: [0.35, 0.75, 0.35],
          scale: [0.98, 1.02, 0.98]
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="aura-ai-pill-icon-box"
        animate={{
          rotate: [0, 8, -8, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{
          repeat: Infinity,
          duration: 4,
          ease: "easeInOut"
        }}
      >
        <Sparkles size={14} className="aura-ai-sparkle-icon" />
      </motion.div>
      <span className="aura-ai-pill-text">Aura AI</span>
      <span className="aura-ai-live-dot" />
    </Link>
  );
}
