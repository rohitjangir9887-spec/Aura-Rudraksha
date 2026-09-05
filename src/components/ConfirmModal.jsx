import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Delete",
  cancelText = "Cancel",
  isDanger = true,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          display: "grid",
          placeItems: "center",
          padding: "16px",
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(20, 10, 5, 0.55)",
            backdropFilter: "blur(3px)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "400px",
            background: "#fffdf9",
            border: "1px solid #e8e0d8",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: isDanger ? "#fee2e2" : "#fef3c7",
                color: isDanger ? "#dc2626" : "#d97706",
                display: "grid",
                placeItems: "center",
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#806f62",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
              }}
            >
              <X size={18} />
            </button>
          </div>

          <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "22px", color: "#2b170d", margin: "0 0 8px", fontWeight: "600" }}>
            {title}
          </h3>
          <p style={{ fontSize: "13px", color: "#6e5d52", margin: "0 0 24px", lineHeight: "1.5" }}>
            {message}
          </p>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: "1px solid #dcd1c6",
                background: "#ffffff",
                color: "#4a3b32",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: "none",
                background: isDanger ? "#dc2626" : "#a54d2b",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: isDanger ? "0 4px 12px rgba(220, 38, 38, 0.25)" : "0 4px 12px rgba(165, 77, 43, 0.25)",
              }}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
