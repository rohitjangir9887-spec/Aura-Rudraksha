import React, { useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, UserPlus, Loader2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

export function SignUpForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onSignUp,
  onGoogleSignIn,
  onSwitchMode,
  loading
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submittedAttempt, setSubmittedAttempt] = useState(false);

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;
  const isPasswordValid = password && password.length >= 8;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmittedAttempt(true);
    if (!name.trim() || !email.trim() || !password || !confirmPassword) return;
    if (password !== confirmPassword) return;
    if (password.length < 8) return;
    onSignUp(e);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full text-left space-y-3.5">
      {/* Full Name */}
      <div>
        <label
          htmlFor="signup-name"
          className="block text-[12px] font-semibold text-[#3d2b20] mb-1"
        >
          Full Name <span className="text-[#8c2b10]">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806f62]">
            <User className="w-4 h-4" />
          </div>
          <input
            id="signup-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rohit Sharma"
            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#d8c8b8] rounded-xl text-[14px] text-[#2b170d] placeholder-[#a6968a] focus:outline-none focus:ring-2 focus:ring-[#8c2b10]/20 focus:border-[#8c2b10] transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
          />
        </div>
      </div>

      {/* Email Address */}
      <div>
        <label
          htmlFor="signup-email"
          className="block text-[12px] font-semibold text-[#3d2b20] mb-1"
        >
          Email Address <span className="text-[#8c2b10]">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806f62]">
            <Mail className="w-4 h-4" />
          </div>
          <input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#d8c8b8] rounded-xl text-[14px] text-[#2b170d] placeholder-[#a6968a] focus:outline-none focus:ring-2 focus:ring-[#8c2b10]/20 focus:border-[#8c2b10] transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="signup-password"
          className="block text-[12px] font-semibold text-[#3d2b20] mb-1"
        >
          Create Password <span className="text-[#8c2b10]">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806f62]">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#d8c8b8] rounded-xl text-[14px] text-[#2b170d] placeholder-[#a6968a] focus:outline-none focus:ring-2 focus:ring-[#8c2b10]/20 focus:border-[#8c2b10] transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#806f62] hover:text-[#2b170d] transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <PasswordStrengthMeter password={password} showCriteria={true} />
      </div>

      {/* Confirm Password */}
      <div>
        <label
          htmlFor="signup-confirm-password"
          className="block text-[12px] font-semibold text-[#3d2b20] mb-1"
        >
          Confirm Password <span className="text-[#8c2b10]">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806f62]">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="signup-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-xl text-[14px] text-[#2b170d] placeholder-[#a6968a] focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] ${
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
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#806f62] hover:text-[#2b170d] transition-colors"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {passwordsMismatch && (
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-rose-600">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Passwords do not match</span>
          </div>
        )}
        {passwordsMatch && (
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Passwords match</span>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        id="btn-auth-signup"
        type="submit"
        disabled={loading || (submittedAttempt && (!isPasswordValid || passwordsMismatch))}
        className="w-full mt-2 py-3 px-4 bg-[#8c2b10] hover:bg-[#72220c] active:bg-[#5b1a08] text-white font-semibold text-[14px] rounded-xl shadow-[0_2px_8px_rgba(140,43,16,0.25)] hover:shadow-[0_4px_12px_rgba(140,43,16,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Creating Account...</span>
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            <span>Create Account →</span>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center my-3">
        <div className="flex-1 h-px bg-[#ebd8c8]"></div>
        <span className="px-3 text-[11px] uppercase tracking-wider text-[#8a796e] font-medium">
          or
        </span>
        <div className="flex-1 h-px bg-[#ebd8c8]"></div>
      </div>

      {/* Google Auth Button */}
      <button
        id="btn-auth-signup-google"
        type="button"
        onClick={onGoogleSignIn}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-white hover:bg-[#fbf7f2] border border-[#d8c8b8] hover:border-[#bfaea0] text-[#2b170d] font-medium text-[13.5px] rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Switch to Login */}
      <div className="pt-3 text-center border-t border-[#f0e4d8]">
        <p className="text-[13px] text-[#735e50]">
          Already have an account?{" "}
          <button
            id="btn-switch-to-signin"
            type="button"
            onClick={() => onSwitchMode("signin")}
            className="font-bold text-[#8c2b10] hover:text-[#631c09] hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors ml-1"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </p>
      </div>
    </form>
  );
}
