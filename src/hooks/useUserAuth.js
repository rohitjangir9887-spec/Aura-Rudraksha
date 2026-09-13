import { useState, useEffect, useMemo, useCallback } from "react";
import { authClient } from "../lib/authClient";
import { db, onStoreUpdate } from "../lib/db";

// Local storage session keys
const CACHED_USER_KEY = "aura_cached_user";
const CACHED_PROFILE_KEY = "aura_cached_me";
const CACHED_ORDERS_KEY = "aura_cached_my_orders";
const CACHED_ADDRESSES_KEY = "aura_cached_addresses";

/**
 * Synchronously retrieves memoized session data from localStorage
 */
function getInitialSessionSnapshot() {
  if (typeof window === "undefined") {
    return {
      user: null,
      profile: null,
      ordersCount: 0,
      addressesCount: 0,
      hasCachedSession: false
    };
  }

  let user = null;
  let profile = null;
  let ordersCount = 0;
  let addressesCount = 0;

  try {
    const rawUser = localStorage.getItem(CACHED_USER_KEY);
    if (rawUser) {
      user = JSON.parse(rawUser);
    }
  } catch (_) {}

  try {
    const rawMe = db.getCachedCustomerMe();
    if (rawMe) {
      profile = rawMe;
    } else {
      const fallbackKey = db.getUserScopedKey(CACHED_PROFILE_KEY);
      const raw = localStorage.getItem(fallbackKey);
      if (raw) profile = JSON.parse(raw);
    }
  } catch (_) {}

  try {
    const cachedOrders = db.getCachedMyOrders();
    if (Array.isArray(cachedOrders)) {
      ordersCount = cachedOrders.length;
    }
  } catch (_) {}

  try {
    const cachedAddrs = db.getCachedAddresses();
    if (Array.isArray(cachedAddrs)) {
      addressesCount = cachedAddrs.length;
    }
  } catch (_) {}

  const activeFirebaseUser = authClient.getUser();
  const effectiveUser = activeFirebaseUser || user;

  const hasCachedSession = Boolean(
    (effectiveUser && !effectiveUser.isAnonymous) ||
    (profile && (profile.email || profile.name)) ||
    localStorage.getItem("user_email") ||
    localStorage.getItem("user_token")
  );

  return {
    user: effectiveUser,
    profile,
    ordersCount,
    addressesCount,
    hasCachedSession
  };
}

/**
 * useUserAuth - Memoized authentication hook
 * Eliminates cold-start and MongoDB latency by returning instant session cache
 * while verifying Firebase Auth and syncing MongoDB state in the background.
 */
export function useUserAuth() {
  const initial = useMemo(() => getInitialSessionSnapshot(), []);

  const [user, setUser] = useState(initial.user);
  const [profile, setProfile] = useState(initial.profile);
  const [ordersCount, setOrdersCount] = useState(initial.ordersCount);
  const [addressesCount, setAddressesCount] = useState(initial.addressesCount);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    // If we have cached session data, we don't block the UI
    if (initial.hasCachedSession) return false;
    // If no user is logged in at all, we also don't need to show a blocking loader
    if (!initial.user && !localStorage.getItem(CACHED_USER_KEY)) return false;
    return true;
  });

  const syncCustomerData = useCallback(async (activeUser) => {
    if (!activeUser || activeUser.isAnonymous) {
      setIsSyncing(false);
      setIsLoading(false);
      return;
    }

    setIsSyncing(true);
    try {
      const [meRes, ordersRes, addrRes] = await Promise.allSettled([
        db.getCustomerMe(),
        db.getMyOrders(),
        db.getAddresses()
      ]);

      if (meRes.status === "fulfilled" && meRes.value?.success && meRes.value.data) {
        const d = meRes.value.data;
        const googleName = activeUser.displayName || "";
        const googleAvatar = activeUser.photoURL || "";
        const resolvedName = (d.name && d.name !== "Customer" && d.name !== "Aura Devotee")
          ? d.name
          : (googleName || d.name || "Aura Devotee");
        const resolvedAvatar = d.avatar || googleAvatar || "";

        const updatedProfile = {
          ...d,
          name: resolvedName,
          avatar: resolvedAvatar,
          email: d.email || activeUser.email || ""
        };

        setProfile(updatedProfile);

        // Store with user-scoped key
        try {
          const cacheKey = db.getUserScopedKey(CACHED_PROFILE_KEY);
          if (cacheKey && typeof window !== "undefined") {
            localStorage.setItem(cacheKey, JSON.stringify(updatedProfile));
          }
        } catch (_) {}
      } else if (activeUser.email) {
        setProfile((prev) => prev || {
          name: activeUser.displayName || activeUser.email.split("@")[0],
          email: activeUser.email,
          avatar: activeUser.photoURL || "",
          role: "customer"
        });
      }

      if (ordersRes.status === "fulfilled" && ordersRes.value?.success && Array.isArray(ordersRes.value.data)) {
        setOrdersCount(ordersRes.value.data.length);
      }

      if (addrRes.status === "fulfilled" && addrRes.value?.success && Array.isArray(addrRes.value.data)) {
        setAddressesCount(addrRes.value.data.length);
      }
    } catch (err) {
      console.warn("[useUserAuth] Background sync notice:", err);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Check if initial user needs background sync
    const currentUser = authClient.getUser();
    if (currentUser && !currentUser.isAnonymous) {
      setUser(currentUser);
      syncCustomerData(currentUser);
    } else {
      // Check asynchronously if auth is still initializing
      authClient.getCurrentUserAsync().then((resolvedUser) => {
        if (!isMounted) return;
        if (resolvedUser && !resolvedUser.isAnonymous) {
          setUser(resolvedUser);
          syncCustomerData(resolvedUser);
        } else {
          setIsLoading(false);
        }
      });
    }

    // Auth state changes
    const unsubscribeAuth = authClient.onAuthStateChanged((nextUser) => {
      if (!isMounted) return;
      setUser(nextUser);
      if (nextUser && !nextUser.isAnonymous) {
        syncCustomerData(nextUser);
      } else {
        setProfile(null);
        setOrdersCount(0);
        setAddressesCount(0);
        setIsLoading(false);
        setIsSyncing(false);
      }
    });

    // Custom window auth event
    const handleAuthEvent = (e) => {
      if (!isMounted) return;
      const customUser = e.detail;
      setUser(customUser);
      if (customUser && !customUser.isAnonymous) {
        syncCustomerData(customUser);
      }
    };
    window.addEventListener("aura:auth-change", handleAuthEvent);

    // Database updates for real-time customer data changes
    const unsubscribeStore = onStoreUpdate((evt) => {
      if (!isMounted) return;
      const type = evt?.type || "";
      if (type.startsWith("customer") || type.startsWith("order") || type.startsWith("address")) {
        const u = authClient.getUser();
        if (u && !u.isAnonymous) {
          syncCustomerData(u);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      window.removeEventListener("aura:auth-change", handleAuthEvent);
      unsubscribeStore();
    };
  }, [syncCustomerData]);

  // Derived memoized values for fast access
  const isAuthenticated = useMemo(() => {
    return Boolean(user && !user.isAnonymous);
  }, [user]);

  const userEmail = useMemo(() => {
    return profile?.email || user?.email || (typeof window !== "undefined" ? localStorage.getItem("user_email") || "" : "");
  }, [profile?.email, user?.email]);

  const displayName = useMemo(() => {
    if (profile?.name && profile.name !== "Customer") return profile.name;
    if (user?.displayName) return user.displayName;
    if (userEmail && userEmail.includes("@")) return userEmail.split("@")[0];
    return "Aura Devotee";
  }, [profile?.name, user?.displayName, userEmail]);

  const displayPhone = useMemo(() => {
    return profile?.phone || user?.phoneNumber || "";
  }, [profile?.phone, user?.phoneNumber]);

  const avatar = useMemo(() => {
    return profile?.avatar || user?.photoURL || "";
  }, [profile?.avatar, user?.photoURL]);

  const isServerAdmin = useMemo(() => {
    return (profile?.role || "").toLowerCase() === "admin" || (typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true");
  }, [profile?.role]);

  const logout = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch (_) {}
    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(CACHED_PROFILE_KEY);
    localStorage.removeItem(CACHED_ORDERS_KEY);
    localStorage.removeItem(CACHED_ADDRESSES_KEY);
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_token");
    localStorage.removeItem("isAdmin");
    setUser(null);
    setProfile(null);
    setOrdersCount(0);
    setAddressesCount(0);
  }, []);

  return {
    user,
    profile,
    ordersCount,
    addressesCount,
    isLoading,
    isSyncing,
    isAuthenticated,
    userEmail,
    displayName,
    displayPhone,
    avatar,
    isServerAdmin,
    logout,
    refreshSession: () => user && syncCustomerData(user)
  };
}
