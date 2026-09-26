import React, { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { auraChatStore } from "../lib/auraChatStore";

export const AuraAIPill = memo(function AuraAIPill({ className = "" }) {
  const location = useLocation();
  const isDedicatedAiPage = location.pathname === "/aura-ai";

  const handlePreload = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aura_ai_trigger_chat_preload"));
    }
  };

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
      onPointerEnter={handlePreload}
      onTouchStart={handlePreload}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <span className="aura-ai-pill-glow" style={{ willChange: "opacity, transform" }} />
      <div className="aura-ai-pill-icon-box" style={{ willChange: "transform" }}>
        <Sparkles size={14} className="aura-ai-sparkle-icon" />
      </div>
      <span className="aura-ai-pill-text">Aura AI</span>
      <span className="aura-ai-live-dot" />
    </Link>
  );
});
