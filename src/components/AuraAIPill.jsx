import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function AuraAIPill({ className = "" }) {
  return (
    <Link
      to="/aura-ai"
      id="aura-ai-header-pill"
      className={`aura-ai-pill-btn ${className}`}
      title="Open Aura AI Spiritual Shopping & Support Guide"
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
