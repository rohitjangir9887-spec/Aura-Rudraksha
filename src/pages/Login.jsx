import React, { useState, useEffect } from "react";
import { Shell } from "../components/Shell";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { emitToast } from "../context/ToastContext";
import { authClient } from "../lib/authClient";
import { Mail, Phone, Lock, UserPlus, LogIn, Chrome } from "lucide-react";

export function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("select"); // select, email, phone, signup
  
  // Email/Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Phone OTP state
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = authClient.onAuthStateChanged((user) => {
      if (user && !user.isAnonymous) {
        redirectUser();
      }
    });
    return () => unsubscribe();
  }, [navigate, location]);

  useEffect(() => {
    // Setup reCAPTCHA when needed
    if (mode === "phone") {
      authClient.setupRecaptcha('recaptcha-container');
    }
  }, [mode]);

  const redirectUser = async () => {
    const intendedPage = location.state?.from;
    if (intendedPage && !intendedPage.startsWith('/admin')) {
      navigate(intendedPage, { replace: true });
    } else {
      navigate("/account", { replace: true });
    }
  };

  const getErrorMessage = (err) => {
    return authClient.formatAuthError(err);
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      setError("");
      await authClient.signInWithGoogle();
      emitToast("Signed in with Google", "success");
      redirectUser();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err) || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await authClient.signInWithEmail(email, password);
      emitToast("Signed in successfully", "success");
      redirectUser();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err) || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await authClient.signUpWithEmail(email, password);
      emitToast("Account created successfully", "success");
      redirectUser();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err) || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const appVerifier = window.recaptchaVerifier;
      const result = await authClient.signInWithPhone(phone, appVerifier);
      setConfirmationResult(result);
      emitToast("OTP sent successfully", "success");
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err) || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await confirmationResult.confirm(otp);
      emitToast("Phone number verified", "success");
      redirectUser();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err) || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <main className="page auth">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="auth-card"
        >
          <div className="brand">Aura<span>RUDRAKSHA</span></div>
          <h1>Welcome Back</h1>
          <p>Sign in to manage your orders and wishlist.</p>
          
          {error && <div style={{color: '#d84518', fontSize: '12px', margin: '10px 0'}}>{error}</div>}

          {mode === "select" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              <button type="button" onClick={handleGoogle} disabled={loading} className="outline-btn full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Chrome size={16} /> Continue with Google
              </button>
              <button type="button" onClick={() => setMode("phone")} disabled={loading} className="outline-btn full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Phone size={16} /> Continue with Phone
              </button>
              <button type="button" onClick={() => setMode("email")} disabled={loading} className="primary-btn full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Mail size={16} /> Continue with Email
              </button>
            </div>
          )}

          {mode === "email" && (
            <form onSubmit={handleEmailLogin} className="form" style={{ marginTop: '15px', textAlign: 'left' }}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="submit" disabled={loading} className="primary-btn full">Sign In</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '10px' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setMode("select"); }}>Back</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); }}>Create Account</a>
              </div>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleEmailSignup} className="form" style={{ marginTop: '15px', textAlign: 'left' }}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="submit" disabled={loading} className="primary-btn full">Sign Up</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '10px' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setMode("select"); }}>Back</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setMode("email"); }}>Have an account? Login</a>
              </div>
            </form>
          )}

          {mode === "phone" && (
            <div style={{ marginTop: '15px', textAlign: 'left' }}>
              {!confirmationResult ? (
                <form onSubmit={handleSendOTP} className="form">
                  <input type="tel" placeholder="Phone (e.g. +91...)" value={phone} onChange={e => setPhone(e.target.value)} required />
                  <div id="recaptcha-container"></div>
                  <button type="submit" disabled={loading} className="primary-btn full">Send OTP</button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="form">
                  <input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} required />
                  <button type="submit" disabled={loading} className="primary-btn full">Verify OTP</button>
                </form>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '10px' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setMode("select"); setConfirmationResult(null); }}>Back</a>
              </div>
            </div>
          )}
          
        </motion.div>
      </main>
    </Shell>
  );
}
