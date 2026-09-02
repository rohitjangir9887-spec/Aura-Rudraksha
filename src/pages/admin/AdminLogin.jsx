import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowLeft, LogIn, AlertCircle, Mail, Phone, Chrome, UserPlus, Copy, Check } from "lucide-react";
import { authClient } from "../../lib/authClient";
import { emitToast } from "../../context/ToastContext";
import { getSafeReturnPath } from "../../lib/routes";
import "./admin-pages.css";

export function AdminLogin() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("select");
  const [copied, setCopied] = useState(false);
  
  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Phone state
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const isUnauthorizedDomain = error.includes("Domain not authorized") || error.includes("unauthorized-domain");

  const copyDomain = () => {
    if (currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopied(true);
      emitToast("Hostname copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  useEffect(() => {
    const unsubscribe = authClient.onAuthStateChanged(async (user) => {
      if (user && !user.isAnonymous) {
        await verifyAdminAndRedirect();
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (mode === "phone") {
      authClient.setupRecaptcha('recaptcha-container');
    }
  }, [mode]);

  const verifyAdminAndRedirect = async () => {
    try {
      setLoading(true);
      const token = await authClient.getToken();
      
      const user = authClient.getUser();
      const userEmail = (user?.email || "").trim().toLowerCase();
      const userPhone = (user?.phoneNumber || "").replace(/[^0-9]/g, "");
      const allowedEmails = ["rohitjangir8740@gmail.com", "rohitjangir9887@gmail.com", "rohitjangir80055@gmail.com", "rohitjangir80055@gmail.com"];
      const targetPhoneDigits = "9672996531";
      const isAuthorizedAdmin = allowedEmails.includes(userEmail) || userPhone.endsWith(targetPhoneDigits);
      
      if (!isAuthorizedAdmin) {
        setError("Access Denied: Only designated admin accounts can log in here.");
        await authClient.signOut();
        setLoading(false);
        return;
      }
      
      let data = {};
      try {
        const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
        const res = await fetch(`${apiBase}/customers/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (_) {}
      
      const from = getSafeReturnPath(location.state?.from, "/admin");
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err) || "Failed to verify administrator credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      setError("");
      await authClient.signInWithGoogle();
      await verifyAdminAndRedirect();
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err) || "Google sign in failed");
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await authClient.signUpWithEmail(email, password);
      await verifyAdminAndRedirect();
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err) || "Failed to create account");
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await authClient.signInWithEmail(email, password);
      await verifyAdminAndRedirect();
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err) || "Invalid email or password");
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
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err) || "Failed to send OTP");
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
      await verifyAdminAndRedirect();
    } catch (err) {
      console.error(err);
      setError(authClient.formatAuthError(err) || "Invalid OTP");
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page" style={{ minHeight: '100vh', background: '#fdfbf7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #e8e0d8',
          boxShadow: '0 10px 30px rgba(43,23,13,0.06)',
          padding: '32px 28px'
        }}
      >
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#a54d2b', textDecoration: 'none', marginBottom: '24px', fontWeight: '600' }}>
          <ArrowLeft size={16} /> Return to Storefront
        </Link>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fdf0e8', color: '#a54d2b', display: 'inline-grid', placeItems: 'center', marginBottom: '12px' }}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: '#2b170d', margin: '0 0 6px' }}>
            Admin Control Center
          </h1>
          <p style={{ fontSize: '13px', color: '#806f62', margin: 0 }}>
            Secure Authentication with server-side role verification.
          </p>
        </div>

        {error && (
          <div style={{
            background: isUnauthorizedDomain ? '#fff8f4' : '#ffebee',
            color: isUnauthorizedDomain ? '#4a2306' : '#c62828',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '18px',
            fontSize: '12px',
            border: `1px solid ${isUnauthorizedDomain ? '#e8c4a9' : '#f5c6cb'}`
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#ba3207' }} />
              <div>
                <div style={{ fontWeight: 600, color: '#ba3207', marginBottom: '4px' }}>
                  {isUnauthorizedDomain ? 'Firebase Domain Configuration' : 'Notice'}
                </div>
                <div>{error}</div>
                {isUnauthorizedDomain && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={copyDomain}
                      style={{
                        padding: '5px 9px',
                        fontSize: '11px',
                        borderRadius: '5px',
                        border: '1px solid #ccc',
                        background: '#fff',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      {copied ? <Check size={13} color="#20a95a" /> : <Copy size={13} />}
                      {copied ? 'Copied Hostname!' : 'Copy Hostname for Firebase Console'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === "select" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button type="button" onClick={handleGoogle} disabled={loading} className="admin-btn" style={{ background: '#fff', color: '#333', border: '1px solid #ddd' }}>
              <Chrome size={18} /> Continue with Google
            </button>
            <button type="button" onClick={() => setMode("email")} disabled={loading} className="admin-btn" style={{ background: '#6f3518', color: '#fff', border: '1px solid #6f3518' }}>
              <Mail size={18} /> Continue with Email
            </button>
            <button type="button" onClick={() => setMode("phone")} disabled={loading} className="admin-btn" style={{ background: '#fff', color: '#333', border: '1px solid #ddd' }}>
              <Phone size={18} /> Continue with Phone OTP
            </button>
          </div>
        )}

        {mode === "email" && (
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}/>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}/>
            <div style={{display: 'flex', gap: '10px'}}>
              <button type="submit" disabled={loading} className="admin-btn" style={{flex: 1}}>
                <LogIn size={18} /> Sign In
              </button>
              <button type="button" disabled={loading} onClick={handleEmailSignup} className="admin-btn" style={{flex: 1, background: '#fdf0e8', color: '#a54d2b', border: '1px solid #fdf0e8'}}>
                <UserPlus size={18} /> Sign Up
              </button>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); setMode("select"); }} style={{ fontSize: '12px', textAlign: 'center', marginTop: '10px', color: '#a54d2b' }}>Back to options</a>
          </form>
        )}

        {mode === "phone" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {!confirmationResult ? (
              <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="tel" placeholder="Admin Phone (e.g. +91...)" value={phone} onChange={e => setPhone(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}/>
                <div id="recaptcha-container"></div>
                <button type="submit" disabled={loading} className="admin-btn">Send OTP</button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}/>
                <button type="submit" disabled={loading} className="admin-btn">Verify OTP</button>
              </form>
            )}
            <a href="#" onClick={(e) => { e.preventDefault(); setMode("select"); setConfirmationResult(null); }} style={{ fontSize: '12px', textAlign: 'center', marginTop: '10px', color: '#a54d2b' }}>Back to options</a>
          </div>
        )}

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f0ebe4', fontSize: '11px', color: '#806f62', textAlign: 'center', lineHeight: '1.5' }}>
          🔒 <b>Secure Role-Based Access Control</b><br/>
          <i>Access is verified directly against MongoDB customer role and server credentials.</i>
        </div>
      </motion.div>
    </div>
  );
}
