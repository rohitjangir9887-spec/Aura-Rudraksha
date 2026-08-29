import React, { useState, useEffect } from "react";
import { X, Mail, Phone, Lock, UserPlus, LogIn, Chrome, Loader2, AlertCircle, Copy, Check, ShieldCheck, ArrowRight } from "lucide-react";
import { authClient } from "../../lib/authClient";
import { emitToast } from "../../context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";

export function CheckoutAuthModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState("select"); // 'select', 'email', 'phone', 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone state
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  useEffect(() => {
    if (isOpen && mode === "phone") {
      try {
        authClient.setupRecaptcha("checkout-recaptcha-container");
      } catch (_) {}
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isUnauthorizedDomainError = error.includes("Domain not authorized") || error.includes("unauthorized-domain");

  const copyHostToClipboard = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      emitToast("Domain copied to clipboard!", "info");
      setTimeout(() => setCopiedDomain(false), 3000);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      setError("");
      const user = await authClient.signInWithGoogle();
      emitToast("Signed in with Google successfully!", "success");
      onSuccess(user);
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const user = await authClient.signInWithEmail(email, password);
      emitToast("Signed in successfully!", "success");
      onSuccess(user);
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const user = await authClient.signUpWithEmail(email, password);
      emitToast("Account created and signed in!", "success");
      onSuccess(user);
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const appVerifier = authClient.setupRecaptcha("checkout-recaptcha-container");
      const confirmation = await authClient.signInWithPhone(phone, appVerifier);
      setConfirmationResult(confirmation);
      emitToast("OTP code sent to your phone!", "info");
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const result = await confirmationResult.confirm(otp);
      emitToast("Phone verified and signed in!", "success");
      onSuccess(result.user);
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestCheckout = () => {
    emitToast("Proceeding with order...", "info");
    onSuccess({ isGuest: true, email: email || "" });
  };

  return (
    <div 
      id="checkout-auth-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(43, 23, 13, 0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto"
      }}
      onClick={onClose}
    >
      <motion.div
        id="checkout-auth-modal-box"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fffdf9",
          border: "1px solid #e8dac9",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "430px",
          padding: "24px 20px",
          boxShadow: "0 12px 36px rgba(0,0,0,0.25)",
          position: "relative",
          margin: "auto"
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            color: "#806f62",
            cursor: "pointer",
            padding: "4px"
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "50%", background: "#fbf3ea", color: "#b85d25", marginBottom: "8px" }}>
            <ShieldCheck size={22} />
          </div>
          <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "24px", fontWeight: "700", margin: "0 0 4px", color: "#2b170d" }}>
            Sign In or Checkout Directly
          </h2>
          <p style={{ fontSize: "12px", color: "#806f62", margin: 0 }}>
            Your cart and shipping details are safely saved.
          </p>
        </div>

        {/* Error / Unauthorized Domain Banner */}
        {error && (
          <div 
            style={{
              background: isUnauthorizedDomainError ? "#fff7ed" : "#fee2e2",
              border: `1px solid ${isUnauthorizedDomainError ? "#fed7aa" : "#fca5a5"}`,
              color: isUnauthorizedDomainError ? "#9a3412" : "#991b1b",
              borderRadius: "10px",
              padding: "10px 12px",
              fontSize: "12px",
              marginBottom: "16px",
              lineHeight: 1.45
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: isUnauthorizedDomainError ? "8px" : "0" }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>{isUnauthorizedDomainError ? "Firebase Authorized Domain Notice:" : "Authentication Notice:"}</strong>
                <p style={{ margin: "3px 0 0 0", fontSize: "11.5px" }}>{error}</p>
              </div>
            </div>

            {isUnauthorizedDomainError && (
              <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #fed7aa", display: "flex", flexDirection: "column", gap: "6px" }}>
                {currentHostname && (
                  <button
                    type="button"
                    onClick={copyHostToClipboard}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      background: "#ffffff",
                      border: "1px solid #fdba74",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#9a3412",
                      cursor: "pointer"
                    }}
                  >
                    {copiedDomain ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    <span>{copiedDomain ? "Domain Copied!" : `Copy domain: ${currentHostname}`}</span>
                  </button>
                )}
                <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                  <button
                    type="button"
                    onClick={() => { setMode("email"); setError(""); }}
                    style={{
                      flex: 1,
                      background: "#b85d25",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "7px 8px",
                      fontSize: "11.5px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Use Email Sign In
                  </button>
                  <button
                    type="button"
                    onClick={handleGuestCheckout}
                    style={{
                      flex: 1,
                      background: "#20a95a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "7px 8px",
                      fontSize: "11.5px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Continue as Guest
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE: SELECT */}
        {mode === "select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Email Login Option */}
            <button
              type="button"
              id="btn-modal-email"
              onClick={() => { setMode("email"); setError(""); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "12px",
                background: "#b85d25",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "13.5px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(184, 93, 37, 0.25)"
              }}
            >
              <Mail size={18} color="#ffffff" />
              <span>Sign In with Email & Password</span>
            </button>

            {/* Google Login */}
            <button
              type="button"
              id="btn-modal-google"
              onClick={handleGoogle}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "11px",
                background: "#ffffff",
                border: "1px solid #d4c5b9",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#2b170d",
                cursor: "pointer"
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Chrome size={17} color="#ea4335" />}
              <span>Continue with Google</span>
            </button>

            {/* Phone OTP Option */}
            <button
              type="button"
              id="btn-modal-phone"
              onClick={() => { setMode("phone"); setError(""); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "11px",
                background: "#ffffff",
                border: "1px solid #d4c5b9",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#2b170d",
                cursor: "pointer"
              }}
            >
              <Phone size={17} color="#b85d25" />
              <span>Continue with Mobile OTP</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", margin: "6px 0", gap: "10px" }}>
              <div style={{ flex: 1, height: "1px", background: "#e8dac9" }}></div>
              <span style={{ fontSize: "11px", color: "#806f62", textTransform: "uppercase", letterSpacing: "0.5px" }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "#e8dac9" }}></div>
            </div>

            {/* Instant Guest Checkout */}
            <button
              type="button"
              id="btn-modal-guest"
              onClick={handleGuestCheckout}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "11px",
                background: "#fbf5ef",
                border: "1px dashed #c88a3d",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#6b3e1b",
                cursor: "pointer"
              }}
            >
              <span>Place Order Directly as Guest</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* MODE: EMAIL LOGIN */}
        {mode === "email" && (
          <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d4c5b9", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d4c5b9", fontSize: "13px" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "6px",
                padding: "12px",
                background: "#b85d25",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              <span>Sign In & Place Order</span>
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginTop: "8px" }}>
              <button type="button" onClick={() => setMode("select")} style={{ background: "none", border: "none", color: "#806f62", cursor: "pointer" }}>
                ← Other methods
              </button>
              <button type="button" onClick={() => { setMode("signup"); setError(""); }} style={{ background: "none", border: "none", color: "#b85d25", fontWeight: "700", cursor: "pointer" }}>
                New user? Create Account
              </button>
            </div>
          </form>
        )}

        {/* MODE: EMAIL SIGNUP */}
        {mode === "signup" && (
          <form onSubmit={handleEmailSignup} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d4c5b9", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
                Create Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d4c5b9", fontSize: "13px" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "6px",
                padding: "12px",
                background: "#b85d25",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              <span>Create Account & Place Order</span>
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginTop: "8px" }}>
              <button type="button" onClick={() => setMode("select")} style={{ background: "none", border: "none", color: "#806f62", cursor: "pointer" }}>
                ← Other methods
              </button>
              <button type="button" onClick={() => { setMode("email"); setError(""); }} style={{ background: "none", border: "none", color: "#b85d25", fontWeight: "700", cursor: "pointer" }}>
                Already have account? Sign In
              </button>
            </div>
          </form>
        )}

        {/* MODE: PHONE OTP */}
        {mode === "phone" && (
          <div>
            {!confirmationResult ? (
              <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
                    Mobile Number (with country code)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d4c5b9", fontSize: "13px" }}
                  />
                </div>

                <div id="checkout-recaptcha-container" style={{ margin: "4px 0" }}></div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "12px",
                    background: "#b85d25",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
                  <span>Send OTP</span>
                </button>

                <button type="button" onClick={() => setMode("select")} style={{ background: "none", border: "none", color: "#806f62", fontSize: "11.5px", cursor: "pointer", marginTop: "4px" }}>
                  ← Other methods
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
                    Enter 6-Digit OTP sent to {phone}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d4c5b9", fontSize: "16px", textAlign: "center", letterSpacing: "4px", fontWeight: "700" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "12px",
                    background: "#20a95a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                  <span>Verify OTP & Continue</span>
                </button>

                <button type="button" onClick={() => setConfirmationResult(null)} style={{ background: "none", border: "none", color: "#806f62", fontSize: "11.5px", cursor: "pointer", marginTop: "4px" }}>
                  Change phone number
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
