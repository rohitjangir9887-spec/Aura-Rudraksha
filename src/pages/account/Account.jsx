import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ClipboardList, 
  Heart, 
  MapPin, 
  Settings, 
  ChevronRight, 
  User, 
  Headphones, 
  LogOut, 
  LogIn, 
  ShoppingBag, 
  ShieldCheck, 
  Sparkles, 
  Edit3, 
  Phone, 
  Mail, 
  CheckCircle2, 
  MessageSquare,
  Package,
  Lock,
  ArrowRight
} from "lucide-react";
import { Shell } from "../../components/Shell";
import { ConfirmModal } from "../../components/ConfirmModal";
import { motion } from "framer-motion";
import { db } from "../../lib/db";
import { authClient } from "../../lib/authClient";
import { useWishlist } from "../../hooks/useWishlist";
import { emitToast } from "../../context/ToastContext";
import { AuraAISupportAssistant } from "../../components/AuraAISupportAssistant";

export function Account() {
  const navigate = useNavigate();
  const { count: wishlistCount } = useWishlist();
  const [user, setUser] = useState(() => authClient.getUser());
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [addressesCount, setAddressesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_token");
    localStorage.removeItem("isAdmin");
    setUser(null);
    setProfile(null);
    setUserEmail("");
    setShowLogoutModal(false);
    emitToast("Logged out successfully from Aura Rudraksha", "success");
    navigate("/account");
  };

  useEffect(() => {
    async function loadAccountData(u) {
      try {
        const [meRes, ordersRes, addrRes] = await Promise.all([
          db.getCustomerMe().catch(() => null),
          db.getMyOrders().catch(() => null),
          db.getAddresses().catch(() => null)
        ]);

        if (meRes?.success && meRes.data) {
          const authUser = authClient.getUser();
          const googleName = authUser?.displayName || "";
          const googleAvatar = authUser?.photoURL || "";
          const resolvedName = (meRes.data.name && meRes.data.name !== "Customer" && meRes.data.name !== "Aura Devotee") 
            ? meRes.data.name 
            : (googleName || meRes.data.name || "");
          const resolvedAvatar = meRes.data.avatar || googleAvatar || "";

          setProfile({
            ...meRes.data,
            name: resolvedName,
            avatar: resolvedAvatar
          });
          setUserEmail(meRes.data.email || u?.email || "");
          if (Array.isArray(meRes.data.addresses)) {
            setAddressesCount(meRes.data.addresses.length);
          }
        } else if (u?.email) {
          setUserEmail(u.email);
          setProfile({
            name: u.displayName || u.email.split("@")[0],
            email: u.email,
            avatar: u.photoURL || "",
            role: "customer"
          });
        }

        if (ordersRes?.success && Array.isArray(ordersRes.data)) {
          setOrdersCount(ordersRes.data.length);
        }

        if (addrRes?.success && Array.isArray(addrRes.data)) {
          setAddressesCount(addrRes.data.length);
        }
      } catch (_) {
        if (u?.email) setUserEmail(u.email);
      } finally {
        setLoading(false);
      }
    }

    const initialUser = authClient.getUser();
    setUser(initialUser);
    if (initialUser && !initialUser.isAnonymous) {
      loadAccountData(initialUser);
    } else {
      setLoading(false);
    }

    const unsubscribe = authClient.onAuthStateChanged((u) => {
      setUser(u);
      if (u && !u.isAnonymous) {
        loadAccountData(u);
      } else {
        setProfile(null);
        setUserEmail("");
        setOrdersCount(0);
        setAddressesCount(0);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Determine provider name
  const getProviderName = () => {
    if (!user) return "Guest";
    const providerId = user.providerData?.[0]?.providerId;
    if (providerId === "google.com") return "Google Account";
    if (providerId === "phone") return "Phone OTP";
    if (providerId === "password") return "Email & Password";
    if (user.isAnonymous) return "Guest Session";
    return "Verified Firebase ID";
  };

  // Only allow admin if verified user matches authorized email (Rohitjangir8740@gmail.com / rohitjangir9887@gmail.com) or phone (+91 9672996531)
  const isAuthorizedAdminIdentity = () => {
    const email = (userEmail || user?.email || profile?.email || "").trim().toLowerCase();
    const phone = (profile?.phone || user?.phoneNumber || "").replace(/[^0-9]/g, "");
    const allowedEmails = ["rohitjangir8740@gmail.com", "rohitjangir9887@gmail.com", "rohitjangir80055@gmail.com", "rohitjangir80055@gmail.com"];
    const targetPhoneDigits = "9672996531";
    return allowedEmails.includes(email) || (phone.endsWith(targetPhoneDigits));
  };

  const isServerAdmin = isAuthorizedAdminIdentity();

  if (loading) {
    return (
      <Shell>
        <main className="page" style={{ maxWidth: 860, margin: "0 auto", textAlign: "center", padding: "80px 20px" }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "3px solid #e8dac9",
            borderTopColor: "#a54d2b",
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "spin 1s linear infinite"
          }} />
          <p style={{ color: "#806f62", fontSize: "15px", fontFamily: '"Cormorant Garamond", serif', fontStyle: "italic" }}>
            Loading your sacred devotee portal...
          </p>
        </main>
      </Shell>
    );
  }

  // GUEST / NOT LOGGED IN VIEW
  if (!user || user.isAnonymous) {
    return (
      <Shell>
        <main className="page" style={{ maxWidth: 680, margin: "0 auto", paddingBottom: "80px", paddingTop: "20px" }}>
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ 
              background: "#fffdf9", 
              border: "1px solid #e8dac9", 
              borderRadius: "18px", 
              padding: "36px 24px", 
              textAlign: "center",
              boxShadow: "0 4px 24px rgba(43, 23, 13, 0.04)"
            }}
          >
            <div style={{
              width: "76px", 
              height: "76px", 
              borderRadius: "50%", 
              background: "linear-gradient(135deg, #a54d2b 0%, #7a351a 100%)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 18px",
              boxShadow: "0 6px 18px rgba(165,77,43,0.25)"
            }}>
              <User size={38} />
            </div>

            <div style={{ color: "#a54d2b", letterSpacing: "2px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", marginBottom: "4px" }}>
              AURA DEVOTEE PORTAL
            </div>

            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", margin: "6px 0 12px", color: "#2b170d", fontWeight: "700" }}>
              Welcome to Aura Rudraksha
            </h1>

            <p style={{ color: "#66574d", fontSize: "14.5px", lineHeight: "1.6", maxWidth: "460px", margin: "0 auto 24px" }}>
              Sign in to track your sacred orders, access certificate records, manage saved shipping addresses, and receive devotee blessings.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginBottom: "28px" }}>
              <Link 
                to="/login" 
                state={{ from: "/account" }}
                id="btn-account-login"
                style={{
                  background: "linear-gradient(135deg, #a54d2b 0%, #7a351a 100%)",
                  color: "#fff",
                  padding: "14px 32px",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: "700",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 6px 18px rgba(165,77,43,0.3)",
                  border: "none"
                }}
              >
                <LogIn size={18} /> Sign In / Register
              </Link>
            </div>

            {/* Guest Benefits Grid */}
            <div style={{
              background: "#faf5ee",
              borderRadius: "14px",
              padding: "18px 16px",
              border: "1px solid #efe3d5",
              textAlign: "left",
              marginBottom: "24px"
            }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#4a3528", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={14} color="#a54d2b" />
                <span>Devotee Account Privileges:</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#6e5d50", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li>Live GPS & courier tracking for sacred Nepal Rudraksha orders</li>
                <li>100% Original X-Ray & Lab Certification records</li>
                <li>Fast 1-click checkout with saved delivery addresses</li>
                <li>Devotee wishlist synchronization across devices</li>
              </ul>
            </div>

            <div style={{ borderTop: "1px dashed #e8dac9", paddingTop: "20px" }}>
              <p style={{ fontSize: "12.5px", color: "#806f62", marginBottom: "12px" }}>Need assistance or looking to explore?</p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <Link to="/shop" style={{ color: "#a54d2b", fontSize: "13.5px", fontWeight: "700", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <ShoppingBag size={15} /> Browse Sacred Catalog
                </Link>
                <Link to="/shipping-policy" style={{ color: "#a54d2b", fontSize: "13.5px", fontWeight: "700", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Headphones size={15} /> Support & Policies
                </Link>
              </div>
            </div>
          </motion.div>
        </main>
      </Shell>
    );
  }

  // LOGGED IN ACCOUNT VIEW
  const displayName = profile?.name || user?.displayName || userEmail.split("@")[0] || "Aura Devotee";
  const displayPhone = profile?.phone || user?.phoneNumber || "";

  return (
    <Shell>
      <main className="page" style={{ maxWidth: 880, margin: "0 auto", paddingBottom: "90px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* 1. Customer Identity Card */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "linear-gradient(135deg, #fffdf9 0%, #fbf4ea 100%)",
              border: "1px solid #e8dac9",
              borderRadius: "18px",
              padding: "24px 20px",
              boxShadow: "0 4px 20px rgba(43, 23, 13, 0.04)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Ambient Background Accent */}
            <div style={{
              position: "absolute",
              top: "-40px",
              right: "-40px",
              width: "140px",
              height: "140px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(165,77,43,0.08) 0%, rgba(255,255,255,0) 70%)",
              pointerEvents: "none"
            }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Avatar */}
                <div style={{ 
                  position: "relative",
                  width: "74px", 
                  height: "74px", 
                  borderRadius: "50%", 
                  background: profile?.avatar ? "transparent" : "linear-gradient(135deg, #a54d2b 0%, #7a351a 100%)", 
                  color: "#fff", 
                  display: "grid", 
                  placeItems: "center", 
                  fontSize: "26px", 
                  fontWeight: "700",
                  border: "2px solid #fff",
                  boxShadow: "0 4px 14px rgba(165,77,43,0.2)",
                  flexShrink: 0,
                  overflow: "hidden"
                }}>
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ 
                      fontSize: "11px", 
                      letterSpacing: "1.5px", 
                      textTransform: "uppercase", 
                      color: "#a54d2b", 
                      fontWeight: "800" 
                    }}>
                      AURA DEVOTEE
                    </span>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "#eaf6ed",
                      color: "#1b7339",
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      border: "1px solid #cde8d4"
                    }}>
                      <CheckCircle2 size={11} /> Verified Account
                    </span>
                  </div>

                  <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "28px", margin: "4px 0 3px", color: "#2b170d", fontWeight: "700" }}>
                    {displayName}
                  </h1>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", fontSize: "12.5px", color: "#7a6759" }}>
                    {userEmail && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Mail size={13} color="#a54d2b" /> {userEmail}
                      </span>
                    )}
                    {displayPhone && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Phone size={13} color="#a54d2b" /> {displayPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Link 
                  to="/account/profile" 
                  id="btn-view-profile"
                  style={{
                    background: "#2b170d",
                    color: "#ffffff",
                    padding: "9px 18px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "600",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(43,23,13,0.15)"
                  }}
                >
                  <User size={14} />
                  <span>View Profile</span>
                </Link>

                <Link 
                  to="/account/profile?edit=1" 
                  id="btn-edit-profile"
                  style={{
                    background: "#fff",
                    color: "#a54d2b",
                    border: "1px solid #e8dac9",
                    padding: "9px 16px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "600",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </Link>
              </div>
            </div>

            {/* Account Quick Metrics */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "10px",
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid #eedecf"
            }}>
              <Link to="/account/orders" style={{ textDecoration: "none" }}>
                <div style={{ background: "#ffffff", border: "1px solid #efe4d5", borderRadius: "10px", padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "#8c786a", fontWeight: "600" }}>Total Orders</div>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "#2b170d", fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    {ordersCount}
                  </div>
                </div>
              </Link>

              <Link to="/wishlist" style={{ textDecoration: "none" }}>
                <div style={{ background: "#ffffff", border: "1px solid #efe4d5", borderRadius: "10px", padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "#8c786a", fontWeight: "600" }}>Wishlist Beads</div>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "#a54d2b", fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    {wishlistCount}
                  </div>
                </div>
              </Link>

              <Link to="/account/profile" style={{ textDecoration: "none" }}>
                <div style={{ background: "#ffffff", border: "1px solid #efe4d5", borderRadius: "10px", padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "#8c786a", fontWeight: "600" }}>Saved Addresses</div>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "#2b170d", fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    {addressesCount}
                  </div>
                </div>
              </Link>

              <div style={{ background: "#ffffff", border: "1px solid #efe4d5", borderRadius: "10px", padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#8c786a", fontWeight: "600" }}>Member Status</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#1b7339", marginTop: "4px" }}>
                  Active Devotee
                </div>
              </div>
            </div>
          </motion.div>

          {/* Aura AI Help & Order Assistance Experience */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
            <AuraAISupportAssistant compact={false} />
          </motion.div>

          {/* 2. Account Shortcuts Navigation List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* My Orders */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Link 
                to="/account/orders" 
                id="link-my-orders"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "#fffdf9",
                  border: "1px solid #e8dac9",
                  borderRadius: "14px",
                  padding: "16px 18px",
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow: "0 2px 10px rgba(43, 23, 13, 0.02)",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#fcf0e6",
                  color: "#a54d2b",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  border: "1px solid #eedecf"
                }}>
                  <ClipboardList size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <b style={{ fontSize: "15px", color: "#2b170d" }}>My Orders & Tracking</b>
                    {ordersCount > 0 && (
                      <span style={{
                        background: "#a54d2b",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "1px 7px",
                        borderRadius: "8px"
                      }}>
                        {ordersCount}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "12.5px", color: "#7a6759", display: "block", marginTop: "2px" }}>
                    Track live deliveries, dispatched parcels, and purchase receipts
                  </span>
                </div>
                <ChevronRight size={20} color="#b8a89b" />
              </Link>
            </motion.div>

            {/* Wishlist */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Link 
                to="/wishlist" 
                id="link-wishlist"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "#fffdf9",
                  border: "1px solid #e8dac9",
                  borderRadius: "14px",
                  padding: "16px 18px",
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow: "0 2px 10px rgba(43, 23, 13, 0.02)"
                }}
              >
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#fef0f0",
                  color: "#d84518",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  border: "1px solid #f9dede"
                }}>
                  <Heart size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <b style={{ fontSize: "15px", color: "#2b170d" }}>Wishlist & Sacred Beads</b>
                    {wishlistCount > 0 && (
                      <span style={{
                        background: "#d84518",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "1px 7px",
                        borderRadius: "8px"
                      }}>
                        {wishlistCount}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "12.5px", color: "#7a6759", display: "block", marginTop: "2px" }}>
                    View and manage your saved Rudraksha beads, Malas & Bracelets
                  </span>
                </div>
                <ChevronRight size={20} color="#b8a89b" />
              </Link>
            </motion.div>

            {/* Saved Addresses */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Link 
                to="/account/profile" 
                id="link-addresses"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "#fffdf9",
                  border: "1px solid #e8dac9",
                  borderRadius: "14px",
                  padding: "16px 18px",
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow: "0 2px 10px rgba(43, 23, 13, 0.02)"
                }}
              >
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#f0f7f3",
                  color: "#1e7e34",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  border: "1px solid #dceee2"
                }}>
                  <MapPin size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: "15px", color: "#2b170d" }}>Saved Delivery Addresses</b>
                  <span style={{ fontSize: "12.5px", color: "#7a6759", display: "block", marginTop: "2px" }}>
                    Manage home & office delivery addresses for fast 1-click checkout
                  </span>
                </div>
                <ChevronRight size={20} color="#b8a89b" />
              </Link>
            </motion.div>

            {/* Account & Security */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div 
                style={{
                  background: "#fffdf9",
                  border: "1px solid #e8dac9",
                  borderRadius: "14px",
                  padding: "16px 18px",
                  boxShadow: "0 2px 10px rgba(43, 23, 13, 0.02)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "#f4effa",
                    color: "#6b3ba6",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    border: "1px solid #e8ddf5"
                  }}>
                    <Lock size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                      <b style={{ fontSize: "15px", color: "#2b170d" }}>Account & Authentication</b>
                      <span style={{ fontSize: "11px", color: "#1b7339", fontWeight: "700", background: "#eaf6ed", padding: "2px 7px", borderRadius: "6px" }}>
                        Active Session
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#7a6759", marginTop: "3px" }}>
                      Signed in via <b>{getProviderName()}</b> • Firebase Token Verified
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Customer Support & Policies */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Link 
                to="/shipping-policy" 
                id="link-support"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "#fffdf9",
                  border: "1px solid #e8dac9",
                  borderRadius: "14px",
                  padding: "16px 18px",
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow: "0 2px 10px rgba(43, 23, 13, 0.02)"
                }}
              >
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#eaf4fd",
                  color: "#1877f2",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  border: "1px solid #d2e7fa"
                }}>
                  <Headphones size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: "15px", color: "#2b170d" }}>Customer Support & Policies</b>
                  <span style={{ fontSize: "12.5px", color: "#7a6759", display: "block", marginTop: "2px" }}>
                    WhatsApp help (+91 9672996531), return & exchange policy, Lab authenticity
                  </span>
                </div>
                <ChevronRight size={20} color="#b8a89b" />
              </Link>
            </motion.div>

            {/* Admin Dashboard (ONLY when verified server-side role is admin) */}
            {isServerAdmin && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Link 
                  to="/admin" 
                  id="link-admin-panel"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    background: "linear-gradient(135deg, #fff9f5 0%, #fbf2eb 100%)",
                    border: "1.5px solid #a54d2b",
                    borderRadius: "14px",
                    padding: "16px 18px",
                    textDecoration: "none",
                    color: "inherit",
                    boxShadow: "0 4px 14px rgba(165, 77, 43, 0.12)"
                  }}
                >
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #a54d2b 0%, #7a351a 100%)",
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(165,77,43,0.25)"
                  }}>
                    <Settings size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <b style={{ fontSize: "15px", color: "#a54d2b" }}>Admin Control Center</b>
                      <span style={{
                        background: "#a54d2b",
                        color: "#fff",
                        fontSize: "10.5px",
                        fontWeight: "800",
                        padding: "1px 6px",
                        borderRadius: "6px",
                        textTransform: "uppercase"
                      }}>
                        Authorized
                      </span>
                    </div>
                    <span style={{ fontSize: "12.5px", color: "#7a6759", display: "block", marginTop: "2px" }}>
                      Manage products, orders, coupons, inventory & customer analytics
                    </span>
                  </div>
                  <ChevronRight size={20} color="#a54d2b" />
                </Link>
              </motion.div>
            )}

            {/* Logout Button */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <button 
                type="button"
                id="btn-account-logout"
                onClick={() => setShowLogoutModal(true)} 
                style={{ 
                  width: "100%", 
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "#fff8f8",
                  border: "1px solid #fcdada",
                  borderRadius: "14px",
                  padding: "15px 18px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s"
                }}
              >
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#ffebee",
                  color: "#c62828",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  border: "1px solid #ffcdd2"
                }}>
                  <LogOut size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: "15px", color: "#c62828" }}>Sign Out of Aura Rudraksha</b>
                  <span style={{ fontSize: "12px", color: "#9e5f5f", display: "block", marginTop: "2px" }}>
                    Safely terminate your current authenticated session
                  </span>
                </div>
                <ChevronRight size={18} color="#c62828" />
              </button>
            </motion.div>

          </div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <ConfirmModal 
        isOpen={showLogoutModal}
        title="Sign Out from Aura"
        message="Are you sure you want to sign out from your Aura Rudraksha devotee account? You can log back in anytime with your credentials."
        confirmText="Yes, Sign Out"
        cancelText="Stay Signed In"
        isDanger={true}
        onConfirm={handleLogout}
        onClose={() => setShowLogoutModal(false)}
      />
    </Shell>
  );
}


