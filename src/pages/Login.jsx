import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shell } from "../components/Shell";
import { authClient, auth } from "../lib/authClient";
import { db } from "../lib/db";
import { getSafeReturnPath } from "../lib/routes";
import { emitToast } from "../context/ToastContext";
import { SignInForm } from "../components/auth/SignInForm";
import { SignUpForm } from "../components/auth/SignUpForm";
import { VerifyEmailCard } from "../components/auth/VerifyEmailCard";
import { ForgotPasswordCard } from "../components/auth/ForgotPasswordCard";
import { ResetPasswordCard } from "../components/auth/ResetPasswordCard";
import { AuthTrustFooter } from "../components/auth/AuthTrustFooter";
import { 
  ArrowLeft, 
  AlertCircle, 
  Copy, 
  Check, 
  Phone, 
  Loader2, 
  Sparkles,
  ShieldCheck
} from "lucide-react";

export function Login({ initialMode = "signin" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // URL mode detection (support query params like ?mode=signup, ?mode=forgot, or action codes)
  const urlMode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const determineInitialMode = () => {
    if (urlMode === "resetPassword" || (urlMode === "action" && oobCode) || initialMode === "reset-password") {
      return "reset-password";
    }
    if (urlMode === "verifyEmail" && oobCode) {
      return "action-verify";
    }
    if (urlMode === "signup" || initialMode === "signup") return "signup";
    if (urlMode === "forgot" || urlMode === "forgot-password" || initialMode === "forgot") return "forgot";
    if (urlMode === "verify" || urlMode === "verify-email" || initialMode === "verify-email") return "verify-email";
    if (initialMode === "phone") return "phone";
    return "signin";
  };

  const [mode, setMode] = useState(determineInitialMode);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Phone OTP states
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Status & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);

  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const isUnauthorizedDomain = error.includes("Domain not authorized") || error.includes("unauthorized-domain");

  // Sync mode with route/query changes
  useEffect(() => {
    setMode(determineInitialMode());
    setError("");
  }, [location.pathname, urlMode, oobCode, initialMode]);

  // Handle Firebase action link for automatic email verification if visited via link
  useEffect(() => {
    async function handleEmailVerificationAction() {
      if (urlMode === "verifyEmail" && oobCode) {
        try {
          setLoading(true);
          await authClient.applyActionCode(oobCode);
          emitToast("Email verified successfully! Welcome to Aura Rudraksha.", "success");
          await authClient.reloadCurrentUser();
          redirectUser();
        } catch (err) {
          console.error("Action code error:", err);
          setError(authClient.formatAuthError(err));
          setMode("signin");
        } finally {
          setLoading(false);
        }
      }
    }
    handleEmailVerificationAction();
  }, [urlMode, oobCode]);

  // Check if existing user is already signed in
  useEffect(() => {
    const user = authClient.getUser();
    if (user && !user.isAnonymous && mode === "signin") {
      // If user is already verified or signed in via Google
      if (user.emailVerified || !user.email) {
        redirectUser();
      } else if (!user.emailVerified && user.email) {
        // Unverified email account
        setMode("verify-email");
      }
    }
  }, []);

  // Phone Recaptcha lifecycle
  useEffect(() => {
    if (mode === "phone") {
      const timer = setTimeout(() => {
        try {
          authClient.setupRecaptcha("recaptcha-phone-auth");
        } catch (_) {}
      }, 100);
      return () => {
        clearTimeout(timer);
        authClient.clearRecaptcha();
      };
    } else {
      authClient.clearRecaptcha();
    }
  }, [mode]);

  const redirectUser = () => {
    const intended = location.state?.from;
    const safePath = getSafeReturnPath(intended, "/account");
    navigate(safePath, { replace: true });
  };

  const handleBackNavigation = () => {
    if (mode === "signup" || mode === "forgot" || mode === "phone") {
      setMode("signin");
      setError("");
      return;
    }
    if (mode === "verify-email") {
      setMode("signin");
      setError("");
      return;
    }
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const copyHostToClipboard = () => {
    if (currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedHost(true);
      emitToast("Hostname copied to clipboard!", "success");
      setTimeout(() => setCopiedHost(false), 3000);
    }
  };

  // 1. Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      const user = await authClient.signInWithGoogle();
      
      // Sync Google profile name with backend if available
      try {
        if (user?.displayName) {
          await db.updateCustomerMe({ name: user.displayName });
        }
      } catch (_) {}

      emitToast("Signed in with Google successfully!", "success");
      redirectUser();
    } catch (err) {
      console.error("Google sign in error:", err);
      setError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // 2. Email Sign In
  const handleEmailSignIn = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const user = await authClient.signInWithEmail(email.trim(), password);

      // Verify email check
      if (user && !user.emailVerified) {
        // Send a fresh verification email if not verified
        try {
          await authClient.sendVerificationEmail(user);
        } catch (_) {}
        setMode("verify-email");
        emitToast("Please verify your email to access all account features.", "info");
        return;
      }

      emitToast("Welcome back! Signed in successfully.", "success");
      redirectUser();
    } catch (err) {
      console.error("Sign in error:", err);
      setError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // 3. Email Sign Up
  const handleEmailSignUp = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      setLoading(true);
      setError("");

      // Create Firebase Auth user
      const user = await authClient.signUpWithEmail(email.trim(), password);

      // Set Display Name in Firebase profile
      if (name.trim()) {
        try {
          await authClient.updateUserProfile({ displayName: name.trim() });
        } catch (_) {}
      }

      // Send Firebase Email Verification
      try {
        await authClient.sendVerificationEmail(user);
      } catch (err) {
        console.warn("Could not send initial verification email:", err);
      }

      // Synchronize with MongoDB customer profile
      try {
        await db.updateCustomerMe({
          name: name.trim(),
          email: email.trim()
        });
      } catch (err) {
        console.warn("Backend customer profile sync note:", err);
      }

      emitToast("Account created! We've sent a verification email.", "success");
      setMode("verify-email");
    } catch (err) {
      console.error("Sign up error:", err);
      setError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // 4. "I Verified My Email" Check
  const handleCheckEmailVerified = async () => {
    try {
      setLoading(true);
      setVerificationError("");
      setVerificationNotice("");

      const user = await authClient.reloadCurrentUser();
      if (user?.emailVerified) {
        emitToast("Email verified successfully! Welcome.", "success");
        redirectUser();
      } else {
        setVerificationError(
          "Your email is not verified yet. Please open the link sent to your email inbox (or check your spam folder) and try again."
        );
      }
    } catch (err) {
      console.error("Check verification error:", err);
      setVerificationError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // 5. Resend Verification Email
  const handleResendVerification = async () => {
    try {
      setVerificationError("");
      const user = authClient.getUser();
      await authClient.sendVerificationEmail(user);
      setVerificationNotice("Verification email sent! Please check your inbox in a moment.");
      emitToast("Verification email resent!", "success");
    } catch (err) {
      console.error("Resend verification error:", err);
      setVerificationError(authClient.formatAuthError(err));
    }
  };

  // 6. Forgot Password Submit
  const handleForgotPassword = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await authClient.sendPasswordReset(email.trim());
      setForgotSent(true);
      emitToast("Password reset link sent to your email!", "success");
    } catch (err) {
      console.error("Forgot password error:", err);
      // Generic protection or mapped friendly error
      setError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // 7. Phone OTP Handlers
  const handleSendOTP = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const appVerifier = window.recaptchaVerifier;
      const result = await authClient.signInWithPhone(phone.trim(), appVerifier);
      setConfirmationResult(result);
      emitToast("OTP code sent to your mobile phone!", "info");
    } catch (err) {
      console.error("Send OTP error:", err);
      setError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await confirmationResult.confirm(otp.trim());
      emitToast("Mobile number verified & signed in!", "success");
      redirectUser();
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Sign out helper from unverified state
  const handleSignOutFromUnverified = async () => {
    try {
      await authClient.signOut();
      setMode("signin");
      setEmail("");
      setPassword("");
      emitToast("Signed out. You can now sign in with another account.", "info");
    } catch (_) {}
  };

  return (
    <Shell>
      <main className="min-h-[80vh] py-8 sm:py-12 px-4 flex flex-col items-center justify-center bg-[#faf6f0]">
        {/* Navigation & Header Controls */}
        <div className="w-full max-w-[430px] flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#786355] hover:text-[#2b170d] transition-colors py-1.5 px-2.5 rounded-lg hover:bg-[#ede0d2]/60 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#8c2b10] hover:underline"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Store Home</span>
          </Link>
        </div>

        {/* Master Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-[430px] bg-[#fffdfa] border border-[#ebd8c8] rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(43,23,13,0.06)] text-center relative"
        >
          {/* Brand Header */}
          {mode !== "verify-email" && mode !== "reset-password" && (
            <div className="mb-6">
              <div className="inline-block">
                <div className="font-serif text-[28px] font-bold tracking-tight text-[#2b170d] leading-none">
                  Aura<span className="text-[#8c2b10] font-sans text-[13px] tracking-[3px] ml-1 uppercase font-semibold">RUDRAKSHA</span>
                </div>
                <div className="text-[9px] uppercase tracking-[2.5px] text-[#8a796e] mt-1 font-medium">
                  Sacred & Certified Spiritual Store
                </div>
              </div>

              {mode === "signin" && (
                <div className="mt-4">
                  <h1 className="text-[22px] sm:text-[24px] font-bold text-[#2b170d] font-serif">
                    Welcome Back
                  </h1>
                  <p className="text-[12.5px] text-[#786355] mt-0.5">
                    Sign in to manage your orders, wishlist and account.
                  </p>
                </div>
              )}

              {mode === "signup" && (
                <div className="mt-4">
                  <h1 className="text-[22px] sm:text-[24px] font-bold text-[#2b170d] font-serif">
                    Create your account
                  </h1>
                  <p className="text-[12.5px] text-[#786355] mt-0.5">
                    Join Aura Rudraksha for an authentic, personalized experience.
                  </p>
                </div>
              )}

              {mode === "phone" && (
                <div className="mt-4">
                  <h1 className="text-[22px] sm:text-[24px] font-bold text-[#2b170d] font-serif">
                    Mobile OTP Sign In
                  </h1>
                  <p className="text-[12.5px] text-[#786355] mt-0.5">
                    Fast and password-free login with your registered mobile.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Primary Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-[12px] text-rose-800 leading-relaxed"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-rose-900 mb-0.5">
                    {isUnauthorizedDomain ? "Firebase Authorized Domain Notice:" : "Authentication Notice"}
                  </div>
                  <div>{error}</div>

                  {isUnauthorizedDomain && currentHost && (
                    <div className="mt-2.5 pt-2 border-t border-rose-200 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={copyHostToClipboard}
                        className="py-1.5 px-2.5 bg-white border border-rose-300 rounded-lg text-[11px] font-medium text-rose-900 inline-flex items-center justify-center gap-1.5 hover:bg-rose-50 cursor-pointer"
                      >
                        {copiedHost ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedHost ? "Hostname Copied!" : `Copy Host: ${currentHost}`}</span>
                      </button>
                      <div className="text-[11px] text-[#735e50]">
                        💡 Tip: You can also use Email & Password sign-in or Mobile OTP in the meantime.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Active View / Sub-Flow */}
          <AnimatePresence mode="wait">
            {/* 1. SIGN IN FORM */}
            {mode === "signin" && (
              <motion.div
                key="view-signin"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <SignInForm
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  onSignIn={handleEmailSignIn}
                  onGoogleSignIn={handleGoogleSignIn}
                  onSwitchMode={(newMode) => {
                    setMode(newMode);
                    setError("");
                  }}
                  loading={loading}
                />
              </motion.div>
            )}

            {/* 2. SIGN UP FORM */}
            {mode === "signup" && (
              <motion.div
                key="view-signup"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SignUpForm
                  name={name}
                  setName={setName}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  onSignUp={handleEmailSignUp}
                  onGoogleSignIn={handleGoogleSignIn}
                  onSwitchMode={(newMode) => {
                    setMode(newMode);
                    setError("");
                  }}
                  loading={loading}
                />
              </motion.div>
            )}

            {/* 3. VERIFY EMAIL SCREEN */}
            {mode === "verify-email" && (
              <motion.div
                key="view-verify"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <VerifyEmailCard
                  email={email || authClient.getUser()?.email}
                  onCheckVerified={handleCheckEmailVerified}
                  onResendEmail={handleResendVerification}
                  onSignOut={handleSignOutFromUnverified}
                  onBackToSignIn={() => {
                    setMode("signin");
                    setError("");
                  }}
                  loading={loading}
                  verificationError={verificationError}
                  verificationNotice={verificationNotice}
                />
              </motion.div>
            )}

            {/* 4. FORGOT PASSWORD FLOW */}
            {mode === "forgot" && (
              <motion.div
                key="view-forgot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ForgotPasswordCard
                  email={email}
                  setEmail={setEmail}
                  onSubmit={handleForgotPassword}
                  onBackToSignIn={() => {
                    setMode("signin");
                    setForgotSent(false);
                    setError("");
                  }}
                  loading={loading}
                  isSent={forgotSent}
                  onResend={() => handleForgotPassword()}
                />
              </motion.div>
            )}

            {/* 5. RESET PASSWORD ACTION (oobCode link) */}
            {mode === "reset-password" && (
              <motion.div
                key="view-reset"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ResetPasswordCard
                  oobCode={oobCode}
                  onPasswordResetSuccess={() => {
                    setMode("signin");
                    setError("");
                    emitToast("Password updated. Please sign in with your new credentials.", "success");
                  }}
                  onBackToSignIn={() => {
                    setMode("signin");
                    setError("");
                  }}
                />
              </motion.div>
            )}

            {/* 6. PHONE OTP VIEW */}
            {mode === "phone" && (
              <motion.div
                key="view-phone"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-left space-y-4"
              >
                {!confirmationResult ? (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div>
                      <label
                        htmlFor="phone-input"
                        className="block text-[12px] font-semibold text-[#3d2b20] mb-1.5"
                      >
                        Mobile Number (with country code) <span className="text-[#8c2b10]">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806f62]">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          id="phone-input"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 9876543210"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#d8c8b8] rounded-xl text-[14px] text-[#2b170d] placeholder-[#a6968a] focus:outline-none focus:ring-2 focus:ring-[#8c2b10]/20 focus:border-[#8c2b10] transition-all"
                        />
                      </div>
                    </div>

                    <div id="recaptcha-phone-auth" className="my-2 flex justify-center"></div>

                    <button
                      id="btn-send-phone-otp"
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-[#8c2b10] hover:bg-[#72220c] text-white font-semibold text-[14px] rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <span>Send 6-Digit OTP</span>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-4 text-center">
                    <div>
                      <label
                        htmlFor="otp-input"
                        className="block text-[12px] font-semibold text-[#3d2b20] mb-1.5 text-left"
                      >
                        Enter 6-Digit OTP sent to {phone} <span className="text-[#8c2b10]">*</span>
                      </label>
                      <input
                        id="otp-input"
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-full py-3 px-4 bg-white border border-[#d8c8b8] rounded-xl text-[20px] font-bold text-[#2b170d] tracking-[8px] text-center focus:outline-none focus:ring-2 focus:ring-[#8c2b10]/20 focus:border-[#8c2b10] transition-all"
                      />
                    </div>

                    <button
                      id="btn-verify-phone-otp"
                      type="submit"
                      disabled={loading || otp.length < 6}
                      className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[14px] rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <span>Verify & Sign In</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmationResult(null)}
                      className="text-[12px] text-[#8c2b10] hover:underline cursor-pointer"
                    >
                      Change phone number
                    </button>
                  </form>
                )}

                <div className="pt-3 text-center border-t border-[#f0e4d8]">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setError("");
                    }}
                    className="text-[12.5px] font-medium text-[#735e50] hover:text-[#2b170d] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Use Email & Password instead</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Security & Trust Footer */}
        <AuthTrustFooter />
      </main>
    </Shell>
  );
}
