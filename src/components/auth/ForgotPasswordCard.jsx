import React, { useState, useEffect } from "react";
import { KeyRound, Mail, ArrowLeft, Loader2, MailCheck, RotateCw } from "lucide-react";
import { authClient } from "../../lib/authClient";

export function ForgotPasswordCard({
  email,
  setEmail,
  onSubmit,
  onBackToSignIn,
  loading,
  isSent,
  onResend
}) {
  const [cooldown, setCooldown] = useState(45);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let timer = null;
    if (isSent && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSent, cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    try {
      setResending(true);
      await onResend();
      setCooldown(45);
    } finally {
      setResending(false);
    }
  };

  const masked = authClient.maskEmail(email);

  if (isSent) {
    return (
      <div className="w-full text-center space-y-4">
        {/* Icon */}
        <div className="w-14 h-14 mx-auto rounded-full bg-[#fbf2eb] border border-[#e8dac9] flex items-center justify-center text-[#8c2b10] shadow-[0_2px_8px_rgba(140,43,16,0.1)]">
          <MailCheck className="w-7 h-7 text-[#8c2b10]" />
        </div>

        <div>
          <h2 className="text-[22px] sm:text-[24px] font-bold text-[#2b170d] font-serif tracking-tight">
            Check your email
          </h2>
          <p className="text-[13px] text-[#735e50] mt-1">
            We've sent a password reset link to:
          </p>
          <div className="inline-block mt-2 px-3.5 py-1.5 bg-[#f5ede3] border border-[#e2d2c1] rounded-full text-[13px] font-semibold text-[#3d2516] tracking-wide">
            {masked}
          </div>
        </div>

        <p className="text-[12.5px] text-[#786355] max-w-sm mx-auto leading-relaxed">
          Open the link in the email to set a new password. If you don't see it within a minute, please check your spam folder.
        </p>

        <div className="space-y-2.5 pt-2">
          <button
            id="btn-back-to-signin-after-reset"
            type="button"
            onClick={onBackToSignIn}
            className="w-full py-3 px-4 bg-[#8c2b10] hover:bg-[#72220c] text-white font-semibold text-[14px] rounded-xl shadow-[0_2px_8px_rgba(140,43,16,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Back to Sign In</span>
          </button>

          <button
            id="btn-resend-reset-link"
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="w-full py-2.5 px-4 bg-white hover:bg-[#faf5ee] border border-[#d8c8b8] text-[#3d2b20] font-medium text-[13px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {resending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8c2b10]" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <RotateCw className="w-3.5 h-3.5 text-[#8c2b10]" />
                <span>
                  {cooldown > 0 ? `Resend Link (${cooldown}s)` : "Resend Reset Link"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full text-left space-y-4">
      <div className="text-center space-y-1 mb-2">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#fbf2eb] border border-[#e8dac9] flex items-center justify-center text-[#8c2b10] mb-2">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-[22px] sm:text-[24px] font-bold text-[#2b170d] font-serif">
          Reset your password
        </h2>
        <p className="text-[13px] text-[#735e50]">
          Enter the email address associated with your Aura Rudraksha account.
        </p>
      </div>

      <div>
        <label
          htmlFor="forgot-email"
          className="block text-[12px] font-semibold text-[#3d2b20] mb-1.5"
        >
          Email Address <span className="text-[#8c2b10]">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806f62]">
            <Mail className="w-4 h-4" />
          </div>
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#d8c8b8] rounded-xl text-[14px] text-[#2b170d] placeholder-[#a6968a] focus:outline-none focus:ring-2 focus:ring-[#8c2b10]/20 focus:border-[#8c2b10] transition-all"
          />
        </div>
      </div>

      <button
        id="btn-send-reset-link"
        type="submit"
        disabled={loading}
        className="w-full mt-2 py-3 px-4 bg-[#8c2b10] hover:bg-[#72220c] text-white font-semibold text-[14px] rounded-xl shadow-[0_2px_8px_rgba(140,43,16,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Sending Reset Link...</span>
          </>
        ) : (
          <span>Send Reset Link</span>
        )}
      </button>

      <div className="pt-3 text-center border-t border-[#f0e4d8]">
        <button
          type="button"
          onClick={onBackToSignIn}
          className="text-[13px] font-semibold text-[#8c2b10] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </button>
      </div>
    </form>
  );
}
