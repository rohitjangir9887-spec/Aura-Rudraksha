import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient } from "../lib/authClient";
import { ADMIN_LOGIN_PATH } from "../lib/routes";

export function useAdminAuth() {
  const location = useLocation();
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
    return null;
  });

  const [loadingAuth, setLoadingAuth] = useState(() => !(cachedAdmin && cachedAdmin.authorized));

  const userEmail =
    adminSession?.email ||
    authClient.getUser()?.email ||
    authClient.getUser()?.displayName ||
    "Admin";

  useEffect(() => {
    let isSubscribed = true;

    async function checkAuth() {
      // If already verified in cache, no need to show loading
      const cached = authClient.getCachedAdminVerification();
      if (cached && cached.authorized) {
        const displayIdentifier =
          cached.user?.email ||
          cached.user?.displayName ||
          "Admin";
        setAdminSession({
          email: displayIdentifier,
          name: cached.user?.name || cached.user?.displayName || displayIdentifier
        });
        setLoadingAuth(false);
        return;
      }

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

        const verifyResult = await authClient.verifyAdminStatus();
        if (!isSubscribed) return;

        if (!verifyResult.authorized) {
          setAdminSession(null);
          setLoadingAuth(false);
          navigate(ADMIN_LOGIN_PATH, { replace: true });
          return;
        }

        const displayIdentifier =
          verifyResult.user?.email ||
          currentUser?.email ||
          currentUser?.displayName ||
          "Admin";

        setAdminSession({
          email: displayIdentifier,
          name: verifyResult.user?.name || currentUser?.displayName || displayIdentifier
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
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (_) {}
    setAdminSession(null);
    navigate(ADMIN_LOGIN_PATH, { replace: true });
  };

  return { adminSession, loadingAuth, userEmail, handleLogout };
}

