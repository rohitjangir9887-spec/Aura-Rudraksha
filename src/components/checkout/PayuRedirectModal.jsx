import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { 
  ShieldCheck, Lock, Zap, AlertCircle, 
  RefreshCw, ArrowLeft, CheckCircle2
} from "lucide-react";

export function PayuRedirectModal({ 
  isOpen, 
  onClose, 
  onRetry, 
  errorMsg = null,
  timeoutOccurred = false
}) {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const modalRef = React.useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    let previouslyFocusedElement = null;

    if (isOpen) {
      previouslyFocusedElement = document.activeElement;
      modalRef.current?.focus();
    }

    return () => {
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
        try {
          previouslyFocusedElement.focus();
        } catch(e) {}
      }
    };
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      // Intentionally do nothing on Escape to prevent cancelling in-flight payment
      e.preventDefault();
      return;
    }

    // Focus Trap
    if (e.key === 'Tab' && modalRef.current) {
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

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onKeyDown={handleKeyDown}
        >
          {/* Soft Blurred & Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(43, 23, 13, 0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          />

          {/* Centered Premium White Card */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payu-modal-title"
            tabIndex="-1"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "relative", width: "100%", maxWidth: "400px", backgroundColor: "#fffdf9", border: "1px solid #e8dac9", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", padding: "32px 24px", textAlign: "center", overflow: "hidden", zIndex: 10, margin: "auto", outline: "none", boxSizing: "border-box" }}
          >
          {/* Subtle Warm Antique-Gold Ambient Background Glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 bg-[#f3e5d8]/60 rounded-full blur-3xl pointer-events-none" />

          {/* Top Security & Payment Illustration Section */}
          <div style={{ position: "relative", marginBottom: "24px", paddingTop: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {/* Surrounding Payment Badges Orbit Ring */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Pulsing Back Ring */}
              <motion.div
                animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.4, 0.7, 0.4] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(217, 184, 150, 0.4)", backgroundColor: "rgba(250, 242, 232, 0.5)" }}
              />

              {/* Gentle Rotating Accent Arc */}
              {!errorMsg && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  style={{ position: "absolute", inset: "4px", borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#b85d25", borderRightColor: "rgba(217, 119, 6, 0.3)" }}
                />
              )}

              {/* Center Security Emblem Card */}
              <motion.div
                animate={errorMsg ? {} : { y: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-b from-white to-[#faf5ef] border border-[#e8dac9] shadow-md flex items-center justify-center text-[#b85d25]"
              >
                {errorMsg ? (
                  <AlertCircle style={{ width: "36px", height: "36px", color: "#d97706" }} />
                ) : (
                  <div className="relative flex items-center justify-center">
                    <ShieldCheck style={{ width: "36px", height: "36px", color: "#b85d25" }} />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      style={{ position: "absolute", top: "-4px", right: "-4px", width: "12px", height: "12px", backgroundColor: "#10b981", borderRadius: "50%", border: "2px solid #ffffff" }}
                    />
                  </div>
                )}
              </motion.div>

              {/* Surrounding Payment Badges */}
              {/* GPay Badge (Top Right) */}
              <motion.div
                animate={errorMsg ? {} : { y: [-2, 3, -2] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                className="absolute -top-1 -right-2 px-2 py-1 rounded-lg bg-white border border-[#e8dac9] shadow-xs text-[10px] font-bold text-[#4285F4] flex items-center gap-0.5"
              >
                <span className="text-[#34A853]">G</span>Pay
              </motion.div>

              {/* PhonePe Badge (Top Left) */}
              <motion.div
                animate={errorMsg ? {} : { y: [2, -2, 2] }}
                transition={{ repeat: Infinity, duration: 2.7, ease: "easeInOut" }}
                className="absolute -top-1 -left-2 px-2 py-1 rounded-lg bg-white border border-[#e8dac9] shadow-xs text-[10px] font-bold text-[#5f259f]"
              >
                PhonePe
              </motion.div>

              {/* Paytm Badge (Bottom Left) */}
              <motion.div
                animate={errorMsg ? {} : { y: [-1, 2, -1] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                className="absolute -bottom-1 -left-2 px-2 py-1 rounded-lg bg-white border border-[#e8dac9] shadow-xs text-[10px] font-bold text-[#00baf2]"
              >
                Paytm
              </motion.div>

              {/* UPI Badge (Bottom Right) */}
              <motion.div
                animate={errorMsg ? {} : { y: [2, -1, 2] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
                className="absolute -bottom-1 -right-2 px-2 py-1 rounded-lg bg-white border border-[#e8dac9] shadow-xs text-[10px] font-bold text-[#7a421d]"
              >
                UPI
              </motion.div>

              {/* Card Badge (Bottom Center) */}
              <motion.div
                animate={errorMsg ? {} : { y: [-2, 1, -2] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-white border border-[#e8dac9] shadow-2xs text-[9px] font-bold text-[#2b170d] flex items-center gap-1"
              >
                <span>Cards</span>
                <span className="text-amber-600">•</span>
                <span className="italic text-[#1a1f71]">VISA</span>
              </motion.div>
            </div>
          </div>

          {/* Main Headings */}
          <div className="mb-5">
            <h2 id="payu-modal-title" className="font-serif text-2xl font-bold text-[#2b170d] mb-1.5 tracking-tight">
              {errorMsg
                ? "Payment Connection Issue"
                : timeoutOccurred
                ? "Redirect Taking Longer"
                : "Redirecting to PayU…"}
            </h2>
            <p className="text-xs sm:text-sm text-[#6b584c] leading-relaxed max-w-xs mx-auto">
              {errorMsg
                ? "We couldn’t connect to the payment gateway. Your payment has not been completed."
                : timeoutOccurred
                ? "Connecting to PayU is taking longer than expected. You can retry or return to checkout."
                : "Please wait while we securely redirect you to PayU’s payment gateway to complete your payment."}
            </p>
          </div>

          {/* Subtle Animated Progress Bar */}
          {!errorMsg && (
            <div className="mb-5 max-w-xs mx-auto">
              <div className="w-full h-1.5 bg-[#f2e7dc] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#b85d25] via-[#d97706] to-[#15803d]"
                  animate={{
                    x: ["-100%", "100%"]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </div>
          )}

          {/* Error / Timeout Actions */}
          {(errorMsg || timeoutOccurred) && (
            <div className="mb-6 space-y-2.5">
              <button
                type="button"
                onClick={onRetry}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#b85d25] to-[#7a421d] text-white font-semibold text-sm shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl border border-[#e8dac9] bg-white text-[#4a2c11] font-medium text-xs hover:bg-[#faf5ef] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Checkout</span>
              </button>
            </div>
          )}

          {/* Three Small Trust Indicators */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-5 py-3 px-2 rounded-xl bg-[#faf5ef] border border-[#f0e2d3] text-center">
            <div className="flex flex-col items-center justify-center gap-1 p-1">
              <Lock className="w-4 h-4 text-[#b85d25]" />
              <span className="text-[10px] font-semibold text-[#2b170d] leading-tight">
                256-Bit SSL Secured
              </span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 p-1 border-x border-[#e8dac9]">
              <ShieldCheck className="w-4 h-4 text-[#15803d]" />
              <span className="text-[10px] font-semibold text-[#2b170d] leading-tight">
                Safe & Secure Payments
              </span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 p-1">
              <Zap className="w-4 h-4 text-[#d97706]" />
              <span className="text-[10px] font-semibold text-[#2b170d] leading-tight">
                Fast & Reliable
              </span>
            </div>
          </div>

          {/* Soft Green Security Information Box */}
          <div className="p-3 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-left flex items-start gap-2.5 text-[#15803d]">
            <CheckCircle2 className="w-4 h-4 text-[#15803d] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-snug font-medium text-[#166534]">
              You will be automatically redirected… Please do not refresh or close this page.
            </p>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
