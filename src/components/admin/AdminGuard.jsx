import React, { useState, useEffect, useRef } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { authClient } from "../../lib/authClient";
import { ADMIN_LOGIN_PATH } from "../../lib/routes";

const ALLOWED_ADMIN_EMAILS = [
  "rohitjangir8740@gmail.com",
  "rohitjangir9887@gmail.com",
  "rohitjangir80055@gmail.com",
  "aurarudrakshaofficial@gmail.com",
  "admin@aurarudraksha.com"
];
const TARGET_PHONE_DIGITS = "9672996531";

export function AdminGuard({ children }) {
  const location = useLocation();
  const [authState, setAuthState] = useState({
    loading: true,
    authenticated: false,
    authorized: false,
    user: null,
    error: null
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let isSubscribed = true;

    async function evaluateAdminAuth() {
      if (!isSubscribed) return;
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const currentUser = await authClient.getCurrentUserAsync();
        if (!isSubscribed || !mountedRef.current) return;

        if (!currentUser && !authClient.isSignedIn()) {
          setAuthState({
            loading: false,
            authenticated: false,
            authorized: false,
            user: null,
            error: null
          });
          return;
        }

        const authUser = authClient.getUser() || currentUser;
        const email = (authUser?.email || "").trim().toLowerCase();
        const phone = (authUser?.phoneNumber || "").replace(/[^0-9]/g, "");

        const isClientAdminCandidate =
          ALLOWED_ADMIN_EMAILS.includes(email) ||
          email.endsWith("@aurarudraksha.com") ||
          phone.endsWith(TARGET_PHONE_DIGITS);

        if (!isClientAdminCandidate) {
          // Strictly deny if neither email nor phone matches admin credentials
          setAuthState({
            loading: false,
            authenticated: true,
            authorized: false,
            user: authUser,
            error: "Access Denied: You do not have administrator permissions."
          });
          return;
        }

        // Verify with server as authoritative source of truth
        let serverAuthorized = false;
        try {
          const token = await authClient.getToken();
          const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
          const res = await fetch(`${apiBase}/customers/me`, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "Authorization": `Bearer ${token}` } : {})
            }
          });

          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            const cust = data.data || data;
            const custRole = (cust?.role || "").trim().toLowerCase();
            const custEmail = (cust?.email || email).trim().toLowerCase();
            const custPhone = (cust?.phone || phone).replace(/[^0-9]/g, "");

            if (
              custRole === "admin" ||
              ALLOWED_ADMIN_EMAILS.includes(custEmail) ||
              custEmail.endsWith("@aurarudraksha.com") ||
              custPhone.endsWith(TARGET_PHONE_DIGITS)
            ) {
              serverAuthorized = true;
            }
          } else if (res.status === 401 || res.status === 403) {
            // Explicit server rejection - fail-closed
            serverAuthorized = false;
          } else {
            // Server error or non-OK response - fail-closed
            serverAuthorized = false;
          }
        } catch (apiErr) {
          // Network error during server verification - strictly fail-closed
          console.warn("[AdminGuard] Server verification error:", apiErr?.message);
          serverAuthorized = false;
        }

        if (!isSubscribed || !mountedRef.current) return;

        if (serverAuthorized) {
          setAuthState({
            loading: false,
            authenticated: true,
            authorized: true,
            user: authUser,
            error: null
          });
        } else {
          setAuthState({
            loading: false,
            authenticated: true,
            authorized: false,
            user: authUser,
            error: "Access Denied: Only designated administrators can access this portal."
          });
        }
      } catch (err) {
        if (!isSubscribed || !mountedRef.current) return;
        console.error("Admin authentication check error:", err);
        // Fail-closed
        setAuthState({
          loading: false,
          authenticated: false,
          authorized: false,
          user: null,
          error: "Authentication verification failed."
        });
      }
    }

    evaluateAdminAuth();

    const unsubscribe = authClient.onAuthStateChanged(() => {
      evaluateAdminAuth();
    });

    return () => {
      isSubscribed = false;
      mountedRef.current = false;
      unsubscribe();
    };
  }, [location.pathname]);

  // 1. Neutral loading state (NO Admin UI/sidebar/header/data is rendered)
  if (authState.loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fdfbf7",
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "3px solid #ebd8c5",
              borderTopColor: "#a54d2b",
              animation: "auraAdminSpin 0.8s linear infinite"
            }}
          />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "16px", color: "#2b170d", fontWeight: 700, letterSpacing: "-0.01em" }}>
              Aura Admin
            </div>
            <div style={{ fontSize: "13px", color: "#806f62", marginTop: "4px" }}>
              Verifying secure access...
            </div>
          </div>
          <style>{`
            @keyframes auraAdminSpin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // 2. Not authenticated -> Redirect to Admin Login
  if (!authState.authenticated) {
    return (
      <Navigate
        to={ADMIN_LOGIN_PATH}
        state={{ from: location.pathname + location.search + location.hash }}
        replace
      />
    );
  }

  // 3. Authenticated but not authorized as admin -> Redirect to customer account or show denial
  if (!authState.authorized) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fdfbf7",
          padding: "20px",
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            width: "100%",
            background: "#fff",
            border: "1px solid #ebd8c5",
            borderRadius: "16px",
            padding: "32px 24px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(43,23,13,0.06)"
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              fontSize: "24px"
            }}
          >
            🔒
          </div>
          <h2 style={{ fontSize: "18px", color: "#2b170d", fontWeight: "700", margin: "0 0 8px" }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: "13.5px", color: "#6b5d52", lineHeight: 1.5, margin: "0 0 20px" }}>
            {authState.error || "Your account is not authorized to access the Aura Control Panel."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <a
              href="/account"
              style={{
                display: "block",
                padding: "10px 16px",
                background: "#2b170d",
                color: "#fff",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: "600"
              }}
            >
              Go to Customer Account
            </a>
            <a
              href={ADMIN_LOGIN_PATH}
              style={{
                display: "block",
                padding: "10px 16px",
                background: "#fdfbf7",
                color: "#7a320c",
                border: "1px solid #ebd8c5",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: "600"
              }}
            >
              Sign In with Admin Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized -> Render Protected Content
  return children ? children : <Outlet />;
}
