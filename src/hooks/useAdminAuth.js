import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient } from "../lib/authClient";
import { ADMIN_LOGIN_PATH } from "../lib/routes";

const ALLOWED_ADMIN_EMAILS = [
  "rohitjangir8740@gmail.com",
  "rohitjangir9887@gmail.com",
  "rohitjangir80055@gmail.com",
  "aurarudrakshaofficial@gmail.com",
  "admin@aurarudraksha.com"
];
const TARGET_PHONE_DIGITS = "9672996531";

export function useAdminAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialUser = authClient.getUser();
  const [adminSession, setAdminSession] = useState(
    initialUser
      ? {
          email: initialUser.email || initialUser.displayName || initialUser.phoneNumber || "Admin",
          name: initialUser.displayName || initialUser.email || "Admin"
        }
      : null
  );
  const [loadingAuth, setLoadingAuth] = useState(!initialUser && typeof window !== "undefined" && !authClient.isSignedIn());

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

        if (!currentUser && !authClient.isSignedIn()) {
          setAdminSession(null);
          setLoadingAuth(false);
          navigate(ADMIN_LOGIN_PATH, {
            replace: true,
            state: { from: location.pathname + location.search + location.hash }
          });
          return;
        }

        const authUser = authClient.getUser() || currentUser;
        const localEmail = (authUser?.email || "").trim().toLowerCase();
        const localPhone = (authUser?.phoneNumber || "").replace(/[^0-9]/g, "");

        let isAuthorizedAdmin =
          ALLOWED_ADMIN_EMAILS.includes(localEmail) ||
          localEmail.endsWith("@aurarudraksha.com") ||
          localPhone.endsWith(TARGET_PHONE_DIGITS);

        // Verify with server as authoritative source
        try {
          const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
          const token = await authClient.getToken().catch(() => "");
          if (token) {
            const res = await fetch(`${apiBase}/customers/me`, {
              headers: { Authorization: "Bearer " + token }
            }).catch(() => null);

            if (res && res.ok) {
              const json = await res.json().catch(() => ({}));
              const cust = json.data || json;
              const resEmail = (cust?.email || localEmail).trim().toLowerCase();
              const resPhone = (cust?.phone || localPhone).replace(/[^0-9]/g, "");
              const resRole = (cust?.role || "").trim().toLowerCase();

              if (
                resRole === "admin" ||
                ALLOWED_ADMIN_EMAILS.includes(resEmail) ||
                resEmail.endsWith("@aurarudraksha.com") ||
                resPhone.endsWith(TARGET_PHONE_DIGITS)
              ) {
                isAuthorizedAdmin = true;
              } else {
                isAuthorizedAdmin = false;
              }
            } else {
              // Server rejected or returned error - fail-closed
              isAuthorizedAdmin = false;
            }
          } else {
            isAuthorizedAdmin = false;
          }
        } catch (_) {
          // Strictly fail-closed on network or API verification error
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
          authUser?.email || authUser?.displayName || authUser?.phoneNumber || "Admin";
        setAdminSession({
          email: displayIdentifier,
          name: authUser?.displayName || displayIdentifier
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
