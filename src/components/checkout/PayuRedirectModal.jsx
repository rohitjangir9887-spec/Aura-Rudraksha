import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Lock, Zap, CheckCircle2, AlertCircle, 
  RefreshCw, X, Sparkles 
} from "lucide-react";

export function PayuRedirectModal({ 
  isOpen, 
  onClose, 
  onRetry, 
  step = 2, // 1: Order Confirmed, 2: Connecting to PayU, 3: Secure Payment, 4: Redirecting
  errorMsg = null,
  timeoutOccurred = false
}) {
  const [activeStep, setActiveStep] = useState(step);

  useEffect(() => {
    setActiveStep(step);
  }, [step]);

  if (!isOpen) return null;

  const steps = [
    { id: 1, label: "Order Confirmed" },
    { id: 2, label: "Connecting to PayU" },
    { id: 3, label: "Secure Payment" },
    { id: 4, label: "Redirecting" }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Soft Blurred & Dimmed Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 bg-[#2b170d]/60 backdrop-blur-md"
          onClick={timeoutOccurred || errorMsg ? onClose : undefined}
        />

        {/* Centered Premium Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#fffdf9] border border-[#e8dac9] rounded-2xl shadow-2xl p-6 sm:p-8 text-center overflow-hidden z-10 my-auto"
        >
          {/* Subtle Spiritual Gold Ambient Glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button ONLY if error/timeout occurs */}
          {(timeoutOccurred || errorMsg) && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-[#806f62] hover:text-[#2b170d] p-1.5 rounded-full hover:bg-[#f5ece2] transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Aura Rudraksha Spiritual Luxury Branding */}
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f8ebd9] to-[#ebd2b8] border border-[#d9b896] flex items-center justify-center shadow-inner mb-2 text-[#b85d25]">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="8" stroke="#b85d25" strokeDasharray="2 2" />
                <path d="M12 4C10 7 8 10 8 12C8 14.2 9.8 16 12 16C14.2 16 16 14.2 16 12C16 10 14 7 12 4Z" fill="#b85d25" fillOpacity="0.15" />
                <circle cx="12" cy="12" r="2.5" fill="#b85d25" />
              </svg>
            </div>
            <h3 className="font-serif text-xl font-bold text-[#2b170d] tracking-wide">
              Aura Rudraksha
            </h3>

            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#f5ece2] text-[#7a421d] text-xs font-semibold border border-[#e8dac9] mt-1 tracking-wider uppercase">
              <span>Secure</span>
              <span className="text-amber-600">•</span>
              <span>Fast</span>
              <span className="text-amber-600">•</span>
              <span>Hassle-Free</span>
            </div>
          </div>

          {/* Main Status & Heading */}
          <div className="mb-6">
            <h2 className="font-serif text-2xl font-bold text-[#2b170d] mb-1.5">
              {errorMsg ? "Payment Notice" : timeoutOccurred ? "Redirect Taking Longer" : "Connecting to PayU"}
            </h2>
            <p className="text-xs sm:text-sm text-[#7a6a5d] leading-relaxed max-w-xs mx-auto">
              {errorMsg
                ? errorMsg
                : timeoutOccurred
                ? "Connecting to PayU is taking a bit longer than expected. You can retry or wait for the secure gateway."
                : "Please wait while we securely redirect you to the PayU payment gateway…"}
            </p>
          </div>

          {/* Animated Secure Payment Loader */}
          {!errorMsg && !timeoutOccurred && (
            <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              {/* Outer Rotating Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#b85d25] border-r-[#d97706] border-b-[#e67e22]/20"
              />
              {/* Middle Pulsing Ring */}
              <motion.div
                animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute inset-2 rounded-full border border-[#e8dac9] bg-[#fbf7f0]"
              />
              {/* Inner Shield Icon */}
              <div className="relative z-10 text-[#b85d25]">
                <ShieldCheck className="w-8 h-8" />
              </div>
            </div>
          )}

          {/* Error / Timeout Action Controls */}
          {(timeoutOccurred || errorMsg) && (
            <div className="mb-6 space-y-2.5">
              <button
                type="button"
                onClick={onRetry}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#b85d25] to-[#d97706] text-white font-semibold text-sm shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                <span>Retry Redirect to PayU</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl border border-[#e8dac9] bg-white text-[#4a2c11] font-medium text-xs hover:bg-[#fbf7f0] transition-colors"
              >
                Cancel & Return to Checkout
              </button>
            </div>
          )}

          {/* Progress Steps Indicator */}
          <div className="mb-6 px-1">
            <div className="flex items-center justify-between text-[11px] font-medium text-[#806f62] mb-2">
              {steps.map((s) => {
                const isDone = activeStep > s.id;
                const isCurrent = activeStep === s.id;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-1 ${
                      isDone
                        ? "text-[#15803d] font-semibold"
                        : isCurrent
                        ? "text-[#b85d25] font-bold"
                        : "text-[#aa9a8d]"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#15803d]" />
                    ) : (
                      <span
                        className={`w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center ${
                          isCurrent
                            ? "bg-[#b85d25] text-white"
                            : "bg-[#e8dac9] text-[#806f62]"
                        }`}
                      >
                        {s.id}
                      </span>
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Progress Line */}
            <div className="w-full h-1.5 bg-[#f5ece2] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#b85d25] via-[#d97706] to-[#15803d]"
                initial={{ width: "25%" }}
                animate={{ width: `${Math.min(activeStep * 25, 100)}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Supported Payment Methods Badges */}
          <div className="mb-6 pt-4 border-t border-[#f0e4d5]">
            <p className="text-[11px] uppercase tracking-wider text-[#806f62] font-semibold mb-2.5">
              Supported Payment Options
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <span className="px-2.5 py-1 rounded-md bg-white border border-[#e8dac9] text-[11px] font-bold text-[#4285F4] shadow-2xs flex items-center gap-1">
                <span className="text-[#34A853]">G</span>Pay
              </span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-[#e8dac9] text-[11px] font-bold text-[#5f259f] shadow-2xs">
                PhonePe
              </span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-[#e8dac9] text-[11px] font-bold text-[#00baf2] shadow-2xs">
                Paytm
              </span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-[#e8dac9] text-[11px] font-bold text-[#1a1f71] shadow-2xs italic">
                VISA
              </span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-[#e8dac9] text-[11px] font-bold text-[#eb001b] shadow-2xs">
                Mastercard
              </span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-[#e8dac9] text-[11px] font-bold text-[#008080] shadow-2xs">
                RuPay
              </span>
            </div>
          </div>

          {/* Trust Badges Grid */}
          <div className="grid grid-cols-2 gap-2 mb-5 text-left">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#fbf7f0] border border-[#f0e4d5]">
              <ShieldCheck className="w-4 h-4 text-[#15803d] shrink-0" />
              <span className="text-[11px] font-medium text-[#2b170d]">Secure Payment</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#fbf7f0] border border-[#f0e4d5]">
              <Lock className="w-4 h-4 text-[#b85d25] shrink-0" />
              <span className="text-[11px] font-medium text-[#2b170d]">256-bit SSL</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#fbf7f0] border border-[#f0e4d5]">
              <Zap className="w-4 h-4 text-[#d97706] shrink-0" />
              <span className="text-[11px] font-medium text-[#2b170d]">Fast Gateway</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#fbf7f0] border border-[#f0e4d5]">
              <Sparkles className="w-4 h-4 text-[#7a421d] shrink-0" />
              <span className="text-[11px] font-medium text-[#2b170d]">Powered by PayU</span>
            </div>
          </div>

          {/* Cautionary Warning Message */}
          <div className="p-3 rounded-xl bg-[#fff8ef] border border-[#f3d9be] text-left flex items-start gap-2.5 text-[#804218]">
            <AlertCircle className="w-4 h-4 text-[#b85d25] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-snug font-medium">
              Please do not close or refresh this page. You will be redirected automatically.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
