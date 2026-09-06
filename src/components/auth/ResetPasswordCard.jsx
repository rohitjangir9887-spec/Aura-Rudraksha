import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound, ArrowRight } from "lucide-react";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { authClient } from "../../lib/authClient";

export function ResetPasswordCard({ oobCode, onPasswordResetSuccess, onBackToSignIn }) {
  const [verifyingCode, setVerifyingCode] = useState(true);
  const [accountEmail, setAccountEmail] = useState("");
  const [codeError, setCodeError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function checkCode() {
      if (!oobCode) {
        setCodeError("No password reset code found in the link.");
        setVerifyingCode(false);
        return;
      }
      try {
        setVerifyingCode(true);
        const email = await authClient.verifyResetCode(oobCode);
        setAccountEmail(email);
      } catch (err) {
        console.error("Verify reset code error:", err);
        setCodeError(authClient.formatAuthError(err));
      } finally {
        setVerifyingCode(false);
      }
    }
    checkCode();
  }, [oobCode]);

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;
  const isPasswordValid = password && password.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      await authClient.confirmPasswordReset(oobCode, password);
      setIsSuccess(true);
    } catch (err) {
      console.error("Confirm reset error:", err);
      setSubmitError(authClient.formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (verifyingCode) {
    return (
      <div className="py-8 text-center space-y-3">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#8c2b10]" />
        <p className="text-[13px] text-[#786355]">Verifying reset link security...</p>
      </div>
    );
  }

  if (codeError) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-[#2b170d] font-serif">
            Invalid or Expired Link
          </h2>
          <p className="text-[12.5px] text-rose-700 mt-1 max-w-xs mx-auto">
            {codeError}
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToSignIn}
          className="w-full py-2.5 px-4 bg-[#8c2b10] hover:bg-[#72220c] text-white font-semibold text-[13px] rounded-xl shadow transition-all cursor-pointer"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-[22px] font-bold text-[#2b170d] font-serif">
            Password Updated Successfully
          </h2>
          <p className="text-[13px] text-[#735e50] mt-1">
            Your Aura Rudraksha password has been securely reset. You can now sign in with your new password.
          </p>
        </div>
        <button
          type="button"
          onClick={onPasswordResetSuccess}
          className="w-full py-3 px-4 bg-[#8c2b10] hover:bg-[#72220c] text-white font-semibold text-[14px] rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Sign In Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full text-left space-y-3.5">
      <div className="text-center space-y-1 mb-2">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#fbf2eb] border border-[#e8dac9] flex items-center justify-center text-[#8c2b10] mb-2">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-[22px] font-bold text-[#2b170d] font-serif">
          Create New Password
        </h2>
        {accountEmail && (
          <p className="text-[12.5px] text-[#735e50]">
            For: <span className="font-semibold text-[#2b170d]">{accountEmail}</span>
          </p>
        )}
      </div>

      {submitError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-[12px] text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>{submitError}</div>
        </div>
      )}

      {/* New Password */}
      <div>
        <label
          htmlFor="reset-new-password"
          className="block text-[12px] font-semibold text-[#3d2b20] mb-1"
        >
          New Password <span className="text-[#8c2b10]">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806f62]">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="reset-new-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#d8c8b8] rounded-xl text-[14px] text-[#2b170d] placeholder-[#a6968a] focus:outline-none focus:ring-2 focus:ring-[#8c2b10]/20 focus:border-[#8c2b10] transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#806f62] hover:text-[#2b170d]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <PasswordStrengthMeter password={password} showCriteria={true} />
      </div>

      {/* Confirm New Password */}
      <div>
        <label
          htmlFor="reset-confirm-password"
          className="block text-[12px] font-semibold text-[#3d2b20] mb-1"
        >
          Confirm New Password <span className="text-[#8c2b10]">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806f62]">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="reset-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-xl text-[14px] text-[#2b170d] placeholder-[#a6968a] focus:outline-none transition-all ${
              passwordsMismatch
                ? "border-rose-400 focus:ring-2 focus:ring-rose-200"
                : passwordsMatch
                ? "border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                : "border-[#d8c8b8] focus:ring-2 focus:ring-[#8c2b10]/20 focus:border-[#8c2b10]"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#806f62] hover:text-[#2b170d]"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        id="btn-confirm-password-reset"
        type="submit"
        disabled={submitting || !isPasswordValid || passwordsMismatch}
        className="w-full mt-2 py-3 px-4 bg-[#8c2b10] hover:bg-[#72220c] text-white font-semibold text-[14px] rounded-xl shadow-[0_2px_8px_rgba(140,43,16,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Updating Password...</span>
          </>
        ) : (
          <span>Update Password</span>
        )}
      </button>

      <div className="pt-3 text-center border-t border-[#f0e4d8]">
        <button
          type="button"
          onClick={onBackToSignIn}
          className="text-[13px] font-semibold text-[#8c2b10] hover:underline cursor-pointer"
        >
          Cancel & Back to Sign In
        </button>
      </div>
    </form>
  );
}
