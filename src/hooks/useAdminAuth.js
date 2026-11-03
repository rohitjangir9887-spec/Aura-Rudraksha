import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../lib/authClient";
import { ADMIN_LOGIN_PATH } from "../lib/routes";

export function useAdminAuth() {
  const navigate = useNavigate();
  const cachedAdmin = authClient.getCachedAdminVerification();

  const [adminSession, setAdminSession] = useState(() => {
    if (cachedAdmin && cachedAdmin.authorized) {
      const displayIdentifier =
        cachedAdmin.user?.email ||
        cachedAdmin.user?.displayName ||
        "Admin";
      return {
        email: displayIdentifier,
        name: cachedAdmin.user?.name || cachedAdmin.user?.displayName || displayIdentifier
      };
    }
    const activeUser = authClient.getUser();
    if (activeUser) {
      const displayIdentifier = activeUser.email || activeUser.displayName || "Admin";
      return {
        email: displayIdentifier,
        name: activeUser.displayName || displayIdentifier
      };
    }
    return { email: "Admin", name: "Admin" };
  });

  // AdminGuard already protects all /admin/* routes before AdminLayout mounts,
  // so AdminLayout should never block page rendering with a second auth spinner.
  const [loadingAuth, setLoadingAuth] = useState(false);

  const userEmail =
    adminSession?.email ||
    authClient.getUser()?.email ||
    authClient.getUser()?.displayName ||
    "Admin";

  useEffect(() => {
    let isSubscribed = true;

    async function syncAdminIdentity() {
      const cached = authClient.getCachedAdminVerification();
      if (cached && cached.authorized) {
        const displayIdentifier =
          cached.user?.email ||
          cached.user?.displayName ||
          "Admin";
        if (isSubscribed) {
          setAdminSession({
            email: displayIdentifier,
            name: cached.user?.name || cached.user?.displayName || displayIdentifier
          });
          setLoadingAuth(false);
        }
        return;
      }

      try {
        const currentUser = await authClient.getCurrentUserAsync();
        if (!isSubscribed) return;

        if (currentUser) {
          const verifyResult = await authClient.verifyAdminStatus();
          if (!isSubscribed) return;

          if (verifyResult.authorized) {
            const displayIdentifier =
              verifyResult.user?.email ||
              currentUser?.email ||
              currentUser?.displayName ||
              "Admin";

            setAdminSession({
              email: displayIdentifier,
              name: verifyResult.user?.name || currentUser?.displayName || displayIdentifier
            });
          }
        }
      } catch (_) {
        // Handled by AdminGuard
      } finally {
        if (isSubscribed) setLoadingAuth(false);
      }
    }

    syncAdminIdentity();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (_) {}
    setAdminSession(null);
    navigate(ADMIN_LOGIN_PATH, { replace: true });
  };

  return { adminSession, loadingAuth, userEmail, handleLogout };
}

