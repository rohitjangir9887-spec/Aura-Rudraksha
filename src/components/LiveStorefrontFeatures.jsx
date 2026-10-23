import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, X, ArrowRight, ShieldCheck } from "lucide-react";

export function LiveStorefrontFeatures() {
  const location = useLocation();
  const [features, setFeatures] = useState([]);
  const [dismissedIds, setDismissedIds] = useState({});

  const isAdminRoute = (location.pathname || "").toLowerCase().startsWith("/admin");

  useEffect(() => {
    let mounted = true;
    const fetchFeatures = async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        const list = data?.settings?.aiCustomFeatures || data?.aiCustomFeatures || [];
        if (mounted && Array.isArray(list)) {
          setFeatures(list.filter(f => f && f.enabled !== false));
        }
      } catch (_) {}
    };
    fetchFeatures();
    const interval = setInterval(fetchFeatures, 12000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  if (isAdminRoute || !features.length) return null;

  const visibleFeatures = features.filter(f => !dismissedIds[f.id]);
  if (!visibleFeatures.length) return null;

  return (
    <div style={{ width: "100%", zIndex: 990, position: "relative" }}>
      {visibleFeatures.slice(0, 2).map((feat) => (
        <div
          key={feat.id}
          style={{
            background: feat.bgColor || "linear-gradient(90deg, #431407 0%, #7c2d12 50%, #431407 100%)",
            color: feat.textColor || "#fde68a",
            padding: "8px 16px",
            borderBottom: "1px solid rgba(251, 191, 36, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
            fontSize: "12.5px",
            fontWeight: 600,
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)"
          }}
        >
          <span
            style={{
              background: "#f59e0b",
              color: "#2b170d",
              padding: "2px 8px",
              borderRadius: "999px",
              fontSize: "10.5px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <Sparkles size={11} /> {feat.badge || "LIVE"}
          </span>
          <span style={{ color: "#fffbeb", fontWeight: 700 }}>{feat.title}</span>
          {feat.subtitle && (
            <span style={{ color: "#fde68a", opacity: 0.9, fontSize: "11.5px" }}>
              • {feat.subtitle}
            </span>
          )}
          {feat.ctaLink && (
            <Link
              to={feat.ctaLink}
              style={{
                background: "rgba(255,255,255,0.14)",
                color: "#fff",
                padding: "3px 10px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "11.5px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                border: "1px solid rgba(253, 230, 138, 0.35)"
              }}
            >
              {feat.ctaText || "Explore"} <ArrowRight size={12} />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setDismissedIds(prev => ({ ...prev, [feat.id]: true }))}
            style={{
              background: "transparent",
              border: "none",
              color: "#fde68a",
              cursor: "pointer",
              padding: "2px",
              display: "inline-flex",
              alignItems: "center",
              opacity: 0.75
            }}
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
