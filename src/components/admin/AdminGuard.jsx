import React, { useState, useEffect, useRef } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { authClient } from "../../lib/authClient";
import { ADMIN_LOGIN_PATH } from "../../lib/routes";

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

        if (!currentUser) {
          setAuthState({
            loading: false,
            authenticated: false,
            authorized: false,
            user: null,
            error: null
          });
          return;
        }

        // Verify with server as authoritative source of truth
        let serverAuthorized = false;
        let verifiedUserData = null;

        try {
          const token = await authClient.getToken();
          if (token) {
            const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
            const res = await fetch(`${apiBase}/auth/admin-me`, {
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              }
            });

            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data && data.success && data.authorized && data.role === "admin") {
                serverAuthorized = true;
                verifiedUserData = data.user;
              }
            }
          }
        } catch (apiErr) {
          console.warn("[AdminGuard] Server verification error:", apiErr?.message);
          serverAuthorized = false;
        }

        if (!isSubscribed || !mountedRef.current) return;

        if (serverAuthorized) {
          setAuthState({
            loading: false,
            authenticated: true,
            authorized: true,
            user: verifiedUserData || currentUser,
            error: null
          });
        } else {
          setAuthState({
            loading: false,
            authenticated: true,
            authorized: false,
            user: currentUser,
            error: "Access Denied: Only designated administrators can access this portal."
          });
        }
      } catch (err) {
        if (!isSubscribed || !mountedRef.current) return;
        console.error("Admin authentication check error:", err);
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
