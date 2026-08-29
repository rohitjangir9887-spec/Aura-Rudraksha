import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

export function emitToast(message, type = "success") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("aura:toast", {
        detail: { message, type }
      })
    );
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "success", duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]); // Keep max 5 toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  useEffect(() => {
    const handleCustomToast = (e) => {
      if (e.detail && e.detail.message) {
        addToast(e.detail.message, e.detail.type || "success");
      }
    };
    window.addEventListener("aura:toast", handleCustomToast);
    return () => window.removeEventListener("aura:toast", handleCustomToast);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "90vw",
          width: "360px",
          pointerEvents: "none",
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            let bg = "#fffdfa";
            let border = "#e5dcd3";
            let iconColor = "#a54d2b";
            let IconComp = CheckCircle2;

            if (t.type === "error") {
              bg = "#fff5f5";
              border = "#fecaca";
              iconColor = "#dc2626";
              IconComp = AlertCircle;
            } else if (t.type === "warning") {
              bg = "#fffbeb";
              border = "#fde68a";
              iconColor = "#d97706";
              IconComp = AlertTriangle;
            } else if (t.type === "info") {
              bg = "#eff6ff";
              border = "#bfdbfe";
              iconColor = "#2563eb";
              IconComp = Info;
            }

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                style={{
                  pointerEvents: "auto",
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: "12px",
                  padding: "12px 16px",
                  boxShadow: "0 10px 25px -5px rgba(43, 23, 13, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "#2b170d",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                <div style={{ color: iconColor, flexShrink: 0, display: "grid", placeItems: "center" }}>
                  <IconComp size={20} />
                </div>
                <div style={{ flex: 1, lineHeight: "1.4", wordBreak: "break-word" }}>{t.message}</div>
                <button
                  onClick={() => removeToast(t.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#806f62",
                    cursor: "pointer",
                    padding: "4px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "4px",
                  }}
                  aria-label="Close notification"
                >
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      addToast: (msg, type) => emitToast(msg, type),
      removeToast: () => {},
    };
  }
  return ctx;
}
