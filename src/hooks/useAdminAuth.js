import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient } from "../lib/authClient";
import { ADMIN_LOGIN_PATH } from "../lib/routes";

export function useAdminAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [adminSession, setAdminSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const userEmail =
    adminSession?.email ||
    authClient.getUser()?.email ||
    authClient.getUser()?.displayName ||
    "Admin";

  useEffect(() => {
    let isSubscribed = true;

    async function checkAuth() {
      try {
        const currentUser = await authClient.getCurrentUserAsync();
        if (!isSubscribed) return;

        if (!currentUser) {
          setAdminSession(null);
          setLoadingAuth(false);
          navigate(ADMIN_LOGIN_PATH, {
            replace: true,
            state: { from: location.pathname + location.search + location.hash }
          });
          return;
        }

        let isAuthorizedAdmin = false;
        let verifiedUserData = null;

        // Verify with server as single authoritative source
        try {
          const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
          const token = await authClient.getToken().catch(() => "");
          if (token) {
            const res = await fetch(`${apiBase}/auth/admin-me`, {
              headers: { Authorization: "Bearer " + token }
            }).catch(() => null);

            if (res && res.ok) {
              const json = await res.json().catch(() => ({}));
              if (json && json.success && json.authorized && json.role === "admin") {
                isAuthorizedAdmin = true;
                verifiedUserData = json.user;
              }
            }
          }
        } catch (_) {
          // Fail-closed on network or server error
          isAuthorizedAdmin = false;
        }

        if (!isSubscribed) return;

        if (!isAuthorizedAdmin) {
          setAdminSession(null);
          setLoadingAuth(false);
          navigate(ADMIN_LOGIN_PATH, { replace: true });
          return;
        }

        const displayIdentifier =
          verifiedUserData?.email ||
          currentUser?.email ||
          currentUser?.displayName ||
          "Admin";

        setAdminSession({
          email: displayIdentifier,
          name: verifiedUserData?.name || currentUser?.displayName || displayIdentifier
        });
      } catch (err) {
        if (!isSubscribed) return;
        setAdminSession(null);
        navigate(ADMIN_LOGIN_PATH, { replace: true });
      } finally {
        if (isSubscribed) setLoadingAuth(false);
      }
    }

    checkAuth();

    return () => {
      isSubscribed = false;
    };
  }, [location.pathname, navigate]);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (_) {}
    setAdminSession(null);
    navigate(ADMIN_LOGIN_PATH, { replace: true });
  };

  return { adminSession, loadingAuth, userEmail, handleLogout };
}

