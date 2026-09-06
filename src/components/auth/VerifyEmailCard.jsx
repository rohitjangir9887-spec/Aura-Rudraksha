import React, { useState, useEffect } from "react";
import { Mail, CheckCircle2, RotateCw, Loader2, LogOut, AlertCircle, ArrowLeft } from "lucide-react";
import { authClient } from "../../lib/authClient";

export function VerifyEmailCard({
  email,
  onCheckVerified,
  onResendEmail,
  onSignOut,
  onBackToSignIn,
  loading,
  verificationError,
  verificationNotice
}) {
  const [cooldown, setCooldown] = useState(45);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let timer = null;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    try {
      setResending(true);
      await onResendEmail();
      setCooldown(45);
    } finally {
      setResending(false);
    }
  };

  const masked = authClient.maskEmail(email);

  return (
    <div className="w-full text-center space-y-4">
      {/* Icon Badge */}
      <div className="w-14 h-14 mx-auto rounded-full bg-[#fbf2eb] border border-[#e8dac9] flex items-center justify-center text-[#8c2b10] shadow-[0_2px_8px_rgba(140,43,16,0.1)]">
        <Mail className="w-7 h-7 animate-pulse" />
      </div>

      {/* Headings */}
      <div>
        <h2 className="text-[22px] sm:text-[24px] font-bold text-[#2b170d] font-serif tracking-tight">
          Verify your email
        </h2>
        <p className="text-[13px] text-[#735e50] mt-1">
          We sent a verification link to
        </p>
        <div className="inline-block mt-2 px-3.5 py-1.5 bg-[#f5ede3] border border-[#e2d2c1] rounded-full text-[13px] font-semibold text-[#3d2516] tracking-wide">
          {masked}
        </div>
      </div>

      <p className="text-[12.5px] text-[#786355] max-w-sm mx-auto leading-relaxed">
        Open the link in the email to activate your Aura Rudraksha account. If you don't see it within a few minutes, check your Spam or Promotions folder.
      </p>

      {/* Inline Verification Notice / Error */}
      {verificationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-[12px] text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>{verificationError}</div>
        </div>
      )}

      {verificationNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left text-[12px] text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>{verificationNotice}</div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2.5 pt-2">
        {/* I Verified Button */}
        <button
          id="btn-verified-check"
          type="button"
          onClick={onCheckVerified}
          disabled={loading}
          className="w-full py-3 px-4 bg-[#8c2b10] hover:bg-[#72220c] text-white font-semibold text-[14px] rounded-xl shadow-[0_2px_8px_rgba(140,43,16,0.25)] hover:shadow-[0_4px_12px_rgba(140,43,16,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking verification status...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>I Verified My Email</span>
            </>
          )}
        </button>

        {/* Resend Button */}
        <button
          id="btn-resend-verification"
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending || loading}
          className="w-full py-2.5 px-4 bg-white hover:bg-[#faf5ee] border border-[#d8c8b8] text-[#3d2b20] font-medium text-[13px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {resending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8c2b10]" />
              <span>Sending email...</span>
            </>
          ) : (
            <>
              <RotateCw className="w-3.5 h-3.5 text-[#8c2b10]" />
              <span>
                {cooldown > 0
                  ? `Resend Verification Email (${cooldown}s)`
                  : "Resend Verification Email"}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Footnote / Change account */}
      <div className="pt-3 border-t border-[#f0e4d8] flex items-center justify-between text-[12px] text-[#806f62]">
        <button
          type="button"
          onClick={onBackToSignIn}
          className="hover:text-[#2b170d] transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </button>
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="text-[#8c2b10] hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Use different account</span>
          </button>
        )}
      </div>
    </div>
  );
}
