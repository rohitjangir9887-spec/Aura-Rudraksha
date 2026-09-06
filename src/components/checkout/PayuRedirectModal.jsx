import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { 
  ShieldCheck, Lock, Zap, AlertCircle, AlertTriangle,
  RefreshCw, ArrowLeft, CheckCircle2,
  CreditCard, Smartphone, Wallet, Landmark,
  X, ExternalLink, Clock
} from "lucide-react";

/**
 * PayuRedirectModal - Premium Mobile-First Centered Payment Gateway Modal
 * 
 * Supports all states inside the SAME modal:
 * - CONNECTING / INITIATING: "Connecting to PayU Securely..."
 * - REDIRECTING: "Redirecting to PayU..."
 * - PENDING: "Payment Processing"
 * - FAILED: "Payment Failed"
 * - CANCELLED: "Payment Cancelled"
 * - SUCCESS: "Payment Verified & Paid"
 */
export function PayuRedirectModal({ 
  isOpen, 
  onClose, 
  onRetry, 
  state = "CONNECTING", // CONNECTING, REDIRECTING, PENDING, FAILED, CANCELLED, SUCCESS
  errorMsg = null,
  timeoutOccurred = false,
  amount = null,
  orderId = null
}) {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Prevent background body scroll while modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      // Allow escape only on failure/cancel/timeout states, not during in-flight redirect
      if (isTerminalOrError && onClose) {
        onClose();
      } else {
        e.preventDefault();
      }
      return;
    }

    // Focus Trap
    if (e.key === "Tab" && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement || document.activeElement === modalRef.current) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  if (!mounted || typeof document === "undefined") return null;

  // Determine current active display state
  const isFailed = state === "FAILED" || Boolean(errorMsg) || timeoutOccurred;
  const isCancelled = state === "CANCELLED";
  const isPending = state === "PENDING";
  const isRedirecting = state === "REDIRECTING";
  const isSuccess = state === "SUCCESS";
  const isConnecting = !isFailed && !isCancelled && !isPending && !isRedirecting && !isSuccess;
  const isTerminalOrError = isFailed || isCancelled || timeoutOccurred;

  // Title & Subtitle Mapping
  let title = "Connecting to PayU Securely…";
  let subtitle = "Please wait while we prepare your secure payment.";
  let badgeTheme = "connecting";

  if (isFailed) {
    title = timeoutOccurred ? "Connection Taking Longer" : "Payment Failed";
    subtitle = errorMsg 
      ? errorMsg 
      : timeoutOccurred 
      ? "Connecting to PayU took longer than expected. Please retry or choose another method." 
      : "Your payment could not be completed. Your order is safely saved.";
    badgeTheme = "failed";
  } else if (isCancelled) {
    title = "Payment Cancelled";
    subtitle = "The payment session was cancelled. You can retry whenever you're ready.";
    badgeTheme = "cancelled";
  } else if (isPending) {
    title = "Payment Processing";
    subtitle = "Your payment is being verified. Please do not start another payment.";
    badgeTheme = "pending";
  } else if (isRedirecting) {
    title = "Redirecting to PayU…";
    subtitle = "Taking you to the secure payment page.";
    badgeTheme = "redirecting";
  } else if (isSuccess) {
    title = "Payment Verified & Paid";
    subtitle = "Your transaction has been securely confirmed.";
    badgeTheme = "success";
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          id="payu-redirect-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100dvh",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "max(16px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
            boxSizing: "border-box",
            margin: 0,
            overflowX: "hidden",
            overflowY: "auto"
          }}
          onKeyDown={handleKeyDown}
        >
          {/* Soft Dimmed & Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(35, 18, 9, 0.72)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              zIndex: 1,
              cursor: "default"
            }}
          />

          {/* Centered Premium Ivory Card */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payu-modal-title"
            tabIndex="-1"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              maxWidth: "380px",
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
              overflowX: "hidden",
              backgroundColor: "#fffdf9",
              background: "linear-gradient(180deg, #fffdfa 0%, #faf4ed 100%)",
              border: "1.5px solid #e8dac9",
              borderRadius: "20px",
              boxShadow: "0 25px 50px -12px rgba(43, 23, 13, 0.35), 0 0 0 1px rgba(232, 218, 201, 0.6)",
              padding: "24px 20px 20px 20px",
              textAlign: "center",
              boxSizing: "border-box",
              margin: "auto",
              outline: "none"
            }}
          >
            {/* Brand Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "14px" }}>
              <img 
                src="https://i.ibb.co/Q3C3gZTd/file-00000000fb188211907f8ce113ccb17a.png"
                alt="Aura Rudraksha"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
                style={{ height: "20px", objectFit: "contain" }}
              />
              <span style={{ 
                fontFamily: '"Cormorant Garamond", Georgia, serif', 
                fontSize: "13px", 
                fontWeight: "700", 
                letterSpacing: "1px", 
                color: "#8b4d24",
                textTransform: "uppercase"
              }}>
                Aura Sacred Checkout
              </span>
            </div>

            {/* Center Animated Icon Ring */}
            <div style={{ position: "relative", width: "88px", height: "88px", margin: "0 auto 16px auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Pulsing Back Ring */}
              <motion.div
                animate={shouldReduceMotion ? {} : { scale: [0.96, 1.06, 0.96], opacity: [0.4, 0.7, 0.4] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: isFailed 
                    ? "1.5px solid rgba(220, 38, 38, 0.3)" 
                    : isCancelled 
                    ? "1.5px solid rgba(217, 119, 6, 0.3)"
                    : isPending
                    ? "1.5px solid rgba(217, 119, 6, 0.4)"
                    : isSuccess
                    ? "1.5px solid rgba(22, 163, 74, 0.4)"
                    : "1.5px solid rgba(184, 93, 37, 0.3)",
                  backgroundColor: isFailed
                    ? "rgba(254, 242, 242, 0.6)"
                    : isCancelled || isPending
                    ? "rgba(254, 243, 199, 0.5)"
                    : isSuccess
                    ? "rgba(220, 252, 231, 0.6)"
                    : "rgba(250, 242, 232, 0.6)"
                }}
              />

              {/* Rotating Accent Arc for active states */}
              {(isConnecting || isRedirecting || isPending) && !shouldReduceMotion && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: isRedirecting ? 1.5 : 3, ease: "linear" }}
                  style={{
                    position: "absolute",
                    inset: "3px",
                    borderRadius: "50%",
                    border: "2px solid transparent",
                    borderTopColor: isPending ? "#d97706" : "#b85d25",
                    borderRightColor: isPending ? "rgba(217, 119, 6, 0.3)" : "rgba(217, 119, 6, 0.4)"
                  }}
                />
              )}

              {/* Central Emblem Badge */}
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e8dac9",
                  boxShadow: "0 4px 12px rgba(43, 23, 13, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {isFailed ? (
                  <AlertCircle size={28} color="#dc2626" />
                ) : isCancelled ? (
                  <AlertTriangle size={28} color="#d97706" />
                ) : isPending ? (
                  <Clock size={28} color="#d97706" />
                ) : isSuccess ? (
                  <CheckCircle2 size={28} color="#16a34a" />
                ) : isRedirecting ? (
                  <ExternalLink size={26} color="#b85d25" />
                ) : (
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldCheck size={28} color="#b85d25" />
                    <motion.div
                      animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      style={{
                        position: "absolute",
                        top: "-2px",
                        right: "-2px",
                        width: "9px",
                        height: "9px",
                        backgroundColor: "#10b981",
                        borderRadius: "50%",
                        border: "1.5px solid #ffffff"
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Main Headings */}
            <div style={{ marginBottom: "14px" }}>
              <h2
                id="payu-modal-title"
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: "22px",
                  fontWeight: "700",
                  color: isFailed ? "#991b1b" : isCancelled ? "#92400e" : isSuccess ? "#166534" : "#2b170d",
                  margin: "0 0 6px 0",
                  lineHeight: "1.25",
                  letterSpacing: "-0.2px"
                }}
              >
                {title}
              </h2>
              <p
                style={{
                  fontSize: "12.5px",
                  color: "#6b584c",
                  lineHeight: "1.5",
                  margin: "0 auto",
                  maxWidth: "320px"
                }}
              >
                {subtitle}
              </p>
            </div>

            {/* Optional Amount Pill */}
            {amount && amount > 0 && !isFailed && !isCancelled && (
              <div style={{ marginBottom: "14px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#f5ece2",
                    border: "1px solid #ebdccb",
                    padding: "4px 12px",
                    borderRadius: "100px",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#7a3717"
                  }}
                >
                  <span>Payable Amount:</span>
                  <span style={{ color: "#2b170d", fontSize: "13px" }}>₹{Number(amount).toLocaleString("en-IN")}</span>
                </span>
              </div>
            )}

            {/* Optional Order ID Pill for Pending/Failed/Cancelled */}
            {orderId && (isFailed || isCancelled || isPending) && (
              <div style={{ marginBottom: "14px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#faf5ef",
                    border: "1px solid #ebdccb",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#6b584c"
                  }}
                >
                  Order #{orderId}
                </span>
              </div>
            )}

            {/* Animated Progress Bar (for Connecting and Redirecting states) */}
            {(isConnecting || isRedirecting || isPending) && (
              <div style={{ marginBottom: "16px", maxWidth: "260px", margin: "0 auto 16px auto" }}>
                <div style={{ width: "100%", height: "5px", backgroundColor: "#f0e4d7", borderRadius: "100px", overflow: "hidden" }}>
                  <motion.div
                    style={{
                      height: "100%",
                      width: "45%",
                      background: "linear-gradient(90deg, #b85d25 0%, #d97706 50%, #166534 100%)",
                      borderRadius: "100px"
                    }}
                    animate={shouldReduceMotion ? {} : {
                      x: ["-100%", "250%"]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: isRedirecting ? 1.2 : 1.8,
                      ease: "easeInOut"
                    }}
                  />
                </div>
              </div>
            )}

            {/* Supported Payment Channels Grid (Clean, Responsive, No Leaking) */}
            {(isConnecting || isRedirecting) && (
              <div
                style={{
                  background: "#fdfbf8",
                  border: "1px solid #f0e4d7",
                  borderRadius: "12px",
                  padding: "10px 8px",
                  marginBottom: "14px",
                  boxSizing: "border-box"
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#806f62", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Supported Payment Modes
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                  <div style={{ background: "#ffffff", border: "1px solid #ebdccb", borderRadius: "8px", padding: "6px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                    <Smartphone size={14} color="#097939" />
                    <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#2b170d" }}>UPI</span>
                  </div>
                  <div style={{ background: "#ffffff", border: "1px solid #ebdccb", borderRadius: "8px", padding: "6px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                    <CreditCard size={14} color="#1a1f71" />
                    <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#2b170d" }}>Cards</span>
                  </div>
                  <div style={{ background: "#ffffff", border: "1px solid #ebdccb", borderRadius: "8px", padding: "6px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                    <Landmark size={14} color="#b88a58" />
                    <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#2b170d" }}>Banking</span>
                  </div>
                  <div style={{ background: "#ffffff", border: "1px solid #ebdccb", borderRadius: "8px", padding: "6px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                    <Wallet size={14} color="#5f259f" />
                    <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#2b170d" }}>Wallets</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error / Timeout / Cancelled / Pending Action Buttons */}
            {(isFailed || isCancelled || isPending) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    style={{
                      width: "100%",
                      padding: "11px 16px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)",
                      color: "#ffffff",
                      fontWeight: "700",
                      fontSize: "13.5px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(165, 77, 43, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      transition: "transform 0.1s, filter 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
                  >
                    <RefreshCw size={15} />
                    <span>Retry Payment</span>
                  </button>
                )}
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      width: "100%",
                      padding: "9px 16px",
                      borderRadius: "12px",
                      background: "#ffffff",
                      border: "1px solid #e8dac9",
                      color: "#4a2d1b",
                      fontWeight: "600",
                      fontSize: "12.5px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#faf5ef"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                  >
                    <ArrowLeft size={14} />
                    <span>{orderId ? "View My Orders" : "Back to Checkout"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Trust Badges Strip (3 Columns) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "4px",
                padding: "8px 6px",
                borderRadius: "10px",
                backgroundColor: "#faf5ef",
                border: "1px solid #f0e2d3",
                marginBottom: "12px",
                fontSize: "9.5px",
                color: "#2b170d",
                fontWeight: "600"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                <Lock size={13} color="#b85d25" />
                <span>256-Bit SSL</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", borderLeft: "1px solid #ebdccb", borderRight: "1px solid #ebdccb" }}>
                <ShieldCheck size={13} color="#166534" />
                <span>100% Secure</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                <Zap size={13} color="#d97706" />
                <span>Instant PayU</span>
              </div>
            </div>

            {/* Soft Green Security Disclaimer */}
            <div
              style={{
                padding: "8px 10px",
                borderRadius: "10px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                textAlign: "left"
              }}
            >
              <CheckCircle2 size={13} color="#166534" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "10.5px", color: "#166534", fontWeight: "500", lineHeight: "1.3" }}>
                {isFailed || isCancelled 
                  ? "Your order and cart details are safely preserved."
                  : "Please do not refresh or press back while connecting."}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
