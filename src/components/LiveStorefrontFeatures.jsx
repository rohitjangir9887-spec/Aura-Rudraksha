import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { db, onStoreUpdate } from "../lib/db";
import { authClient } from "../lib/authClient";
import {
  captureAdAttribution,
  trackMetaPageView,
  isRestrictedPixelPath,
  hasSensitiveQueryParams,
  syncMetaUserMatching
} from "../lib/metaPixel";

export function LiveStorefrontFeatures() {
  const location = useLocation();
  const [features, setFeatures] = useState([]);
  const [dismissedIds, setDismissedIds] = useState({});

  const isAdminRoute = (location.pathname || "").toLowerCase().startsWith("/admin");
  const isBlockedPixelRoute = isRestrictedPixelPath(location.pathname);

  useEffect(() => {
    // Capture Meta / UTM ad attribution parameters (fbclid, igshid, utm_source, etc.) and fire clean PageView
    captureAdAttribution();
    const isPaymentResultWithSensitiveParams =
      (location.pathname || "").toLowerCase() === "/payment-result" &&
      hasSensitiveQueryParams(location.search);

    if (!isBlockedPixelRoute && !isPaymentResultWithSensitiveParams && !hasSensitiveQueryParams(location.search)) {
      trackMetaPageView();
    }
  }, [location.pathname, location.search, isBlockedPixelRoute]);

  useEffect(() => {
    const syncCustomerForMatching = (u) => {
      try {
        const cachedMe = db.getCachedCustomerMe?.() || {};
        const target = u && !u.isAnonymous ? u : null;
        if (target || cachedMe?.email || cachedMe?.phone) {
          syncMetaUserMatching({
            email: cachedMe?.email || target?.email,
            phone: cachedMe?.phone || target?.phoneNumber,
            name: cachedMe?.name || target?.displayName,
            city: cachedMe?.city,
            state: cachedMe?.state,
            pincode: cachedMe?.pincode,
            userId: target?.uid || target?.authUserId || cachedMe?.authUserId
          });
        }
      } catch (_) {}
    };

    syncCustomerForMatching(authClient.getUser?.());
    const unsubAuth = authClient.onAuthStateChanged?.((u) => {
      syncCustomerForMatching(u);
    });

    const syncFromStoreSettings = () => {
      try {
        const settingsObj = db.getSettings() || {};
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(
            "aura_meta_capi_enabled",
            settingsObj?.metaCapiEnabled ? "1" : "0"
          );
        }
        const list = settingsObj?.aiCustomFeatures || [];
        if (Array.isArray(list)) {
          const activeList = list.filter(f => f && f.enabled !== false);
          setFeatures(prev => {
            if (prev.length === activeList.length && JSON.stringify(prev) === JSON.stringify(activeList)) {
              return prev;
            }
            return activeList;
          });
        }
      } catch (_) {}
    };

    syncFromStoreSettings();
    const unsub = onStoreUpdate((detail, _payload, type) => {
      const evType = String(type || detail?.type || "");
      if (!evType || evType === "batch:synced" || evType === "home:synced" || evType.includes("settings")) {
        syncFromStoreSettings();
      }
    });
    return () => {
      unsub();
      if (typeof unsubAuth === "function") unsubAuth();
    };
  }, []);

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
