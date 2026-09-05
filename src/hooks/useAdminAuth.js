import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient } from "../lib/authClient";

export function useAdminAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [adminSession, setAdminSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const userEmail = adminSession?.email || (authClient.getUser()?.email) || (authClient.getUser()?.displayName) || "Admin";

  useEffect(() => {
    // Check role from backend / client auth
    async function checkAuth() {
      try {
        const currentUser = await authClient.getCurrentUserAsync();
        if (!currentUser && !authClient.isSignedIn()) {
          setLoadingAuth(false);
          navigate("/admin/login", { replace: true, state: { from: location.pathname + location.search + location.hash } });
          return;
        }

        const authUser = authClient.getUser() || currentUser;
        const allowedEmails = [
          "rohitjangir8740@gmail.com",
          "rohitjangir9887@gmail.com",
          "rohitjangir80055@gmail.com",
          "aurarudrakshaofficial@gmail.com",
          "admin@aurarudraksha.com"
        ];
        const targetPhoneDigits = "9672996531";

        const localEmail = (authUser?.email || "").trim().toLowerCase();
        const localPhone = (authUser?.phoneNumber || "").replace(/[^0-9]/g, "");

        let isAuthorizedAdmin = allowedEmails.includes(localEmail) ||
                                localEmail.endsWith("@aurarudraksha.com") ||
                                localPhone.endsWith(targetPhoneDigits) ||
                                authUser?.uid === "DEMO-ADMIN-UID";

        // Try API check if available
        try {
          const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
          const token = await authClient.getToken().catch(() => "");
          const res = await fetch(`${apiBase}/customers/me`, {
            headers: { ...(token ? { "Authorization": "Bearer " + token } : {}) }
          }).catch(() => null);

          if (res && res.ok) {
            const json = await res.json().catch(() => ({}));
            const resEmail = (json.data?.email || localEmail).trim().toLowerCase();
            const resPhone = (json.data?.phone || localPhone).replace(/[^0-9]/g, "");
            if (allowedEmails.includes(resEmail) || resEmail.endsWith("@aurarudraksha.com") || resPhone.endsWith(targetPhoneDigits)) {
              isAuthorizedAdmin = true;
            }
          }
        } catch (_) {
          // If network or database is unavailable, preserve local authorization state
        }

        if (!isAuthorizedAdmin) {
          setLoadingAuth(false);
          navigate("/account", { replace: true });
          return;
        }

        const displayIdentifier = authUser?.email || authUser?.displayName || authUser?.phoneNumber || "Admin";
        setAdminSession({
          email: displayIdentifier,
          name: authUser?.displayName || displayIdentifier
        });
      } catch (err) {
        const authUser = authClient.getUser();
        if (authUser) {
          const displayIdentifier = authUser.email || authUser.displayName || authUser.phoneNumber || "Admin";
          setAdminSession({ email: displayIdentifier, name: authUser.displayName || displayIdentifier });
        } else {
          navigate("/admin/login", { replace: true });
        }
      } finally {
        setLoadingAuth(false);
      }
    }
    checkAuth();
  }, [location.pathname, navigate]);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (_) {}
    navigate("/admin/login", { replace: true });
  };

  return { adminSession, loadingAuth, userEmail, handleLogout };
}
