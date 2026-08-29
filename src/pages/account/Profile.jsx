import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shell } from "../../components/Shell";
import { ConfirmModal } from "../../components/ConfirmModal";
import { db } from "../../lib/db";
import { authClient } from "../../lib/authClient";
import { useWishlist } from "../../hooks/useWishlist";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  LogOut, 
  ClipboardList, 
  Heart, 
  Edit3, 
  ArrowLeft, 
  Camera, 
  Check, 
  Save, 
  Plus, 
  Trash2, 
  Star, 
  Lock,
  Building,
  CheckCircle2,
  X,
  Sparkles
} from "lucide-react";
import { emitToast } from "../../context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { uploadMedia } from "../../lib/imageUtils";

export function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { count: wishlistCount } = useWishlist();

  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    avatar: ""
  });
  const [addresses, setAddresses] = useState([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Address Modal / Form State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false
  });
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  // Delete Address Modal State
  const [addressToDelete, setAddressToDelete] = useState(null);

  // Logout Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("edit") === "1" || searchParams.get("edit") === "true") {
      setIsEditing(true);
    }
  }, [location.search]);

  useEffect(() => {
    const unsubscribe = authClient.onAuthStateChanged((user) => {
      if (!user || user.isAnonymous) {
        navigate("/login", { state: { from: location.pathname } });
      } else {
        loadProfileData();
      }
    });
    return () => unsubscribe();
  }, [navigate, location]);
  
  async function loadProfileData() {
    setLoading(true);
    try {
      const authUser = authClient.getUser();
      const googleName = authUser?.displayName || "";
      const googleAvatar = authUser?.photoURL || "";
      const googleEmail = authUser?.email || "";
      const googlePhone = authUser?.phoneNumber || "";

      const [meRes, ordersRes, addrRes] = await Promise.all([
        db.getCustomerMe().catch(() => null),
        db.getMyOrders().catch(() => null),
        db.getAddresses().catch(() => null)
      ]);

      if (meRes?.success && meRes.data) {
        const p = meRes.data;
        const resolvedName = (p.name && p.name !== "Customer" && p.name !== "Aura Devotee") ? p.name : (googleName || "");
        const resolvedAvatar = p.avatar || googleAvatar || "";
        const resolvedEmail = p.email || googleEmail || "";
        const resolvedPhone = p.phone || googlePhone || "";

        setEmail(resolvedEmail);
        setProfile({
          name: resolvedName,
          email: resolvedEmail,
          phone: resolvedPhone,
          address: p.address || "",
          avatar: resolvedAvatar
        });
        if (Array.isArray(p.addresses) && p.addresses.length > 0) {
          setAddresses(p.addresses);
        }
      } else {
        setEmail(googleEmail);
        setProfile({
          name: googleName,
          email: googleEmail,
          phone: googlePhone,
          address: "",
          avatar: googleAvatar
        });
      }

      if (addrRes?.success && Array.isArray(addrRes.data) && addrRes.data.length > 0) {
        setAddresses(addrRes.data);
      }

      if (ordersRes?.success && Array.isArray(ordersRes.data)) {
        setOrdersCount(ordersRes.data.length);
        const active = ordersRes.data.filter(o => 
          o.status !== "Delivered" && o.status !== "Cancelled" && o.orderStatus !== "Delivered" && o.orderStatus !== "Cancelled"
        );
        setActiveOrdersCount(active.length);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      emitToast("Uploading avatar...", "info");
      const compressed = await uploadMedia(file);
      if (compressed) {
        const updated = { ...profile, avatar: compressed };
        setProfile(updated);
        await db.saveCustomerProfile(email, updated);
        emitToast("Profile photo updated successfully!", "success");
      }
    } catch (err) {
      emitToast(err.message || "Failed to upload image", "error");
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await db.updateCustomerMe({
        name: profile.name,
        phone: profile.phone,
        address: profile.address
      });
      await db.saveCustomerProfile(email, profile);
      setIsEditing(false);
      emitToast("Devotee profile updated successfully!", "success");
    } catch (err) {
      emitToast(err.message || "Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // Open Add Address Modal
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      name: profile.name || "",
      phone: profile.phone || "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: addresses.length === 0
    });
    setShowAddressModal(true);
  };

  // Open Edit Address Modal
  const handleOpenEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      name: addr.name || profile.name || "",
      phone: addr.phone || profile.phone || "",
      address: addr.address || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      isDefault: Boolean(addr.isDefault)
    });
    setShowAddressModal(true);
  };

  // Save Address (Add or Update)
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.address || !addressForm.city || !addressForm.pincode) {
      emitToast("Please fill in required address fields", "error");
      return;
    }

    setAddressSubmitting(true);
    try {
      const addressPayload = {
        ...addressForm,
        id: editingAddressId || undefined
      };

      const res = await db.saveAddress(addressPayload);
      if (res?.success) {
        if (Array.isArray(res.data)) {
          setAddresses(res.data);
        } else {
          // Refresh addresses
          const updated = await db.getAddresses();
          if (updated?.success && Array.isArray(updated.data)) {
            setAddresses(updated.data);
          }
        }
        setShowAddressModal(false);
        emitToast(editingAddressId ? "Address updated successfully!" : "New delivery address added!", "success");
      } else {
        throw new Error(res?.message || "Failed to save address");
      }
    } catch (err) {
      emitToast(err.message || "Error saving address", "error");
    } finally {
      setAddressSubmitting(false);
    }
  };

  // Set Address as Default
  const handleSetDefaultAddress = async (addrId) => {
    try {
      const target = addresses.find(a => a.id === addrId);
      if (!target) return;
      const res = await db.saveAddress({ ...target, isDefault: true });
      if (res?.success) {
        const updated = await db.getAddresses();
        if (updated?.success && Array.isArray(updated.data)) {
          setAddresses(updated.data);
        }
        emitToast("Default shipping address updated!", "success");
      }
    } catch (err) {
      emitToast("Failed to update default address", "error");
    }
  };

  // Delete Address
  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;
    try {
      const res = await db.deleteAddress(addressToDelete.id);
      if (res?.success) {
        setAddresses(addresses.filter(a => a.id !== addressToDelete.id));
        emitToast("Address removed successfully", "success");
      }
    } catch (err) {
      emitToast("Failed to delete address", "error");
    } finally {
      setAddressToDelete(null);
    }
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (_) {}
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_token");
    localStorage.removeItem("isAdmin");
    setShowLogoutModal(false);
    emitToast("Logged out successfully", "success");
    navigate("/login");
  };

  const user = authClient.getUser();
  const getProviderName = () => {
    if (!user) return "Guest";
    const providerId = user.providerData?.[0]?.providerId;
    if (providerId === "google.com") return "Google Authentication";
    if (providerId === "phone") return "Phone OTP Verification";
    if (providerId === "password") return "Email & Password";
    return "Firebase Verified Session";
  };

  if (loading) {
    return (
      <Shell>
        <main className="page" style={{ maxWidth: 860, margin: "0 auto", textAlign: "center", padding: "80px 20px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: "3px solid #e8dac9",
            borderTopColor: "#a54d2b",
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "spin 1s linear infinite"
          }} />
          <p style={{ color: "#806f62", fontSize: "15px", fontFamily: '"Cormorant Garamond", serif', fontStyle: "italic" }}>
            Loading devotee profile and saved addresses...
          </p>
        </main>
      </Shell>
    );
  }

  const displayName = profile.name || user?.displayName || email.split("@")[0] || "Aura Devotee";

  return (
    <Shell>
      <main className="page" style={{ maxWidth: 880, margin: "0 auto", paddingBottom: "90px" }}>
        
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: "18px" }}>
          <Link 
            to="/account" 
            id="link-back-account"
            style={{
              display: "inline-flex", 
              alignItems: "center", 
              gap: "6px", 
              fontSize: "13px", 
              color: "#a54d2b", 
              fontWeight: "700", 
              textDecoration: "none",
              background: "#fffdf9",
              border: "1px solid #e8dac9",
              padding: "7px 14px",
              borderRadius: "10px"
            }}
          >
            <ArrowLeft size={16} /> Back to Devotee Account
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          
          {/* 1. Profile Hero Card */}
          <div style={{
            background: "linear-gradient(135deg, #fffdf9 0%, #fbf4ea 100%)",
            border: "1px solid #e8dac9",
            borderRadius: "18px",
            padding: "24px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            boxShadow: "0 4px 20px rgba(43,23,13,0.03)",
            position: "relative"
          }}>
            {/* Avatar with Camera Trigger */}
            <div style={{ position: "relative", width: "84px", height: "84px", flexShrink: 0 }}>
              <div style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: profile.avatar ? "transparent" : "linear-gradient(135deg, #a54d2b 0%, #7a351a 100%)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                border: "3px solid #fff",
                boxShadow: "0 4px 14px rgba(165,77,43,0.2)",
                fontSize: "30px",
                fontWeight: "700"
              }}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <label 
                title="Change Photo" 
                id="btn-upload-avatar"
                style={{
                  position: "absolute",
                  bottom: "-2px",
                  right: "-2px",
                  background: "#2b170d",
                  color: "#fff",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  border: "2px solid #fff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
                }}
              >
                <Camera size={13} />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
              </label>
            </div>

            {/* Devotee Info */}
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
                <span style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#a54d2b", fontWeight: "800" }}>
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
                  <CheckCircle2 size={11} /> 100% Verified
                </span>
              </div>

              <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "28px", margin: "2px 0 4px", color: "#2b170d", fontWeight: "700" }}>
                {displayName}
              </h1>

              <div style={{ color: "#7a6759", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Mail size={13} color="#a54d2b" /> {email}
                </span>
                {profile.phone && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Phone size={13} color="#a54d2b" /> {profile.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Toggle Edit Button */}
            <button 
              type="button"
              id="btn-toggle-edit-mode"
              onClick={() => setIsEditing(!isEditing)} 
              style={{
                background: isEditing ? "#fff" : "#2b170d",
                color: isEditing ? "#2b170d" : "#fff",
                border: "1.5px solid #2b170d",
                padding: "9px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
              }}
            >
              <Edit3 size={15} /> {isEditing ? "Close Editing" : "Edit Profile"}
            </button>
          </div>

          {/* 2. Personal Information Section (Edit Mode vs Info Card) */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.form 
                key="edit-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSaveProfile} 
                style={{
                  background: "#fffdf9",
                  border: "1px solid #e8dac9",
                  borderRadius: "16px",
                  padding: "24px 20px",
                  marginBottom: "24px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.02)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "22px", margin: 0, color: "#2b170d", fontWeight: "700" }}>
                    Edit Devotee Details
                  </h2>
                  <span style={{ fontSize: "12px", color: "#8c786a" }}>Updates sync directly to MongoDB database</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4a3528", marginBottom: "6px" }}>
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      id="input-profile-name"
                      value={profile.name} 
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })} 
                      placeholder="e.g. Rohit Kumar"
                      style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #e8dac9", fontSize: "13.5px", background: "#fff" }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4a3528", marginBottom: "6px" }}>
                      Phone Number
                    </label>
                    <input 
                      type="tel" 
                      id="input-profile-phone"
                      value={profile.phone} 
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })} 
                      placeholder="+91 98765 43210"
                      style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #e8dac9", fontSize: "13.5px", background: "#fff" }} 
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4a3528", marginBottom: "6px" }}>
                    Verified Email Address (Protected)
                  </label>
                  <input 
                    type="email" 
                    value={profile.email || email} 
                    disabled 
                    style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #efe4d7", fontSize: "13.5px", background: "#f8f3ed", color: "#7a6759" }} 
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4a3528", marginBottom: "6px" }}>
                    Default Quick Delivery Address Note
                  </label>
                  <textarea 
                    rows={2}
                    id="input-profile-address"
                    value={profile.address} 
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })} 
                    placeholder="House/Apartment, Street, Landmark, City, Pincode"
                    style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #e8dac9", fontSize: "13.5px", background: "#fff", resize: "vertical" }} 
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button 
                    type="submit" 
                    id="btn-save-profile"
                    disabled={savingProfile}
                    style={{ 
                      padding: "11px 24px", 
                      borderRadius: "10px", 
                      background: "linear-gradient(135deg, #a54d2b 0%, #7a351a 100%)",
                      color: "#fff",
                      border: "none",
                      fontSize: "13.5px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "inline-flex", 
                      alignItems: "center", 
                      gap: "6px",
                      boxShadow: "0 4px 12px rgba(165,77,43,0.25)"
                    }}
                  >
                    <Save size={15} /> {savingProfile ? "Saving Details..." : "Save Profile Details"}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)} 
                    style={{ 
                      background: "#fff", 
                      border: "1px solid #dcd1c6", 
                      padding: "11px 20px", 
                      borderRadius: "10px", 
                      fontSize: "13px", 
                      fontWeight: "600", 
                      cursor: "pointer", 
                      color: "#665a51" 
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            ) : null}
          </AnimatePresence>

          {/* 3. Account Summary Grid */}
          <div style={{
            background: "#fffdf9",
            border: "1px solid #e8dac9",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "22px",
            boxShadow: "0 2px 10px rgba(43,23,13,0.02)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <ShieldCheck size={18} color="#a54d2b" />
              <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", margin: 0, color: "#2b170d", fontWeight: "700" }}>
                Devotee Account Summary
              </h2>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
              gap: "12px"
            }}>
              <div style={{ background: "#faf5ee", border: "1px solid #efe4d5", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#8c786a", fontWeight: "600" }}>Total Orders</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#2b170d", fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  {ordersCount}
                </div>
                <Link to="/account/orders" style={{ fontSize: "11px", color: "#a54d2b", fontWeight: "700", textDecoration: "none" }}>
                  View All →
                </Link>
              </div>

              <div style={{ background: "#faf5ee", border: "1px solid #efe4d5", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#8c786a", fontWeight: "600" }}>Active Dispatches</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#a54d2b", fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  {activeOrdersCount}
                </div>
                <span style={{ fontSize: "11px", color: "#1b7339", fontWeight: "700" }}>In Transit</span>
              </div>

              <div style={{ background: "#faf5ee", border: "1px solid #efe4d5", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#8c786a", fontWeight: "600" }}>Wishlist Beads</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#d84518", fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  {wishlistCount}
                </div>
                <Link to="/wishlist" style={{ fontSize: "11px", color: "#d84518", fontWeight: "700", textDecoration: "none" }}>
                  Saved Items →
                </Link>
              </div>

              <div style={{ background: "#faf5ee", border: "1px solid #efe4d5", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#8c786a", fontWeight: "600" }}>Saved Addresses</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e7e34", fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  {addresses.length}
                </div>
                <span style={{ fontSize: "11px", color: "#7a6759" }}>1-Click Ready</span>
              </div>
            </div>
          </div>

          {/* 4. Saved Addresses Management Section */}
          <div style={{
            background: "#fffdf9",
            border: "1px solid #e8dac9",
            borderRadius: "16px",
            padding: "22px 20px",
            marginBottom: "22px",
            boxShadow: "0 2px 10px rgba(43,23,13,0.02)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin size={20} color="#a54d2b" />
                <div>
                  <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "21px", margin: 0, color: "#2b170d", fontWeight: "700" }}>
                    Saved Delivery Addresses
                  </h2>
                  <span style={{ fontSize: "12px", color: "#8c786a" }}>
                    Manage delivery destinations for seamless and fast checkout
                  </span>
                </div>
              </div>

              <button 
                type="button"
                id="btn-add-address"
                onClick={handleOpenAddAddress}
                style={{
                  background: "#a54d2b",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(165,77,43,0.2)"
                }}
              >
                <Plus size={15} /> Add New Address
              </button>
            </div>

            {/* Addresses List */}
            {addresses.length === 0 ? (
              <div style={{
                background: "#faf5ee",
                border: "1px dashed #e2d1c1",
                borderRadius: "12px",
                padding: "28px 16px",
                textAlign: "center"
              }}>
                <MapPin size={32} color="#b8a89b" style={{ margin: "0 auto 10px" }} />
                <p style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "700", color: "#4a3528" }}>
                  No saved delivery addresses yet
                </p>
                <p style={{ margin: "0 0 14px", fontSize: "12.5px", color: "#806f62" }}>
                  Save your home or office address for instant 1-click spiritual parcel deliveries.
                </p>
                <button 
                  type="button"
                  onClick={handleOpenAddAddress}
                  style={{
                    background: "#2b170d",
                    color: "#fff",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  + Add Primary Address
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "14px" }}>
                {addresses.map((addr, idx) => {
                  const isDefault = Boolean(addr.isDefault || idx === 0 && !addresses.some(a => a.isDefault));
                  return (
                    <div 
                      key={addr.id || idx}
                      style={{
                        background: isDefault ? "#fffbf7" : "#ffffff",
                        border: isDefault ? "1.5px solid #a54d2b" : "1px solid #e8dac9",
                        borderRadius: "14px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        position: "relative",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ fontWeight: "700", fontSize: "14px", color: "#2b170d" }}>
                            {addr.name || displayName}
                          </div>
                          {isDefault ? (
                            <span style={{
                              background: "#a54d2b",
                              color: "#fff",
                              fontSize: "10.5px",
                              fontWeight: "800",
                              padding: "2px 7px",
                              borderRadius: "6px",
                              textTransform: "uppercase"
                            }}>
                              Default
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#8c786a",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: "pointer",
                                padding: 0
                              }}
                            >
                              Set as Default
                            </button>
                          )}
                        </div>

                        <div style={{ fontSize: "13px", color: "#54453a", lineHeight: "1.5", marginBottom: "10px" }}>
                          <div>{addr.address}</div>
                          <div>{addr.city}{addr.state ? `, ${addr.state}` : ""} - <b>{addr.pincode}</b></div>
                        </div>

                        {addr.phone && (
                          <div style={{ fontSize: "12px", color: "#7a6759", display: "flex", alignItems: "center", gap: "5px", marginBottom: "12px" }}>
                            <Phone size={12} color="#a54d2b" /> Phone: {addr.phone}
                          </div>
                        )}
                      </div>

                      {/* Action Links */}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "10px", borderTop: "1px dashed #efe4d5" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditAddress(addr)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#a54d2b",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddressToDelete(addr)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#c62828",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Account Security & Session Management */}
          <div style={{
            background: "#fffdf9",
            border: "1px solid #e8dac9",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            boxShadow: "0 2px 10px rgba(43,23,13,0.02)"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <Lock size={16} color="#1b7339" />
                <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "19px", margin: 0, color: "#2b170d", fontWeight: "700" }}>
                  Account Security & Session
                </h3>
              </div>
              <p style={{ fontSize: "12.5px", color: "#7a6759", margin: 0 }}>
                Signed in securely as <b>{email || user?.phoneNumber || "Devotee"}</b> via {getProviderName()}.
              </p>
            </div>

            <button 
              type="button"
              id="btn-profile-logout"
              onClick={() => setShowLogoutModal(true)}
              style={{
                background: "#fff0ed",
                border: "1px solid #ffcdd2",
                color: "#c62828",
                padding: "9px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>

        </motion.div>
      </main>

      {/* Add / Edit Address Modal Form */}
      <AnimatePresence>
        {showAddressModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "grid",
            placeItems: "center",
            padding: "16px",
            background: "rgba(20, 10, 5, 0.55)",
            backdropFilter: "blur(3px)"
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              style={{
                background: "#fffdf9",
                border: "1px solid #e8dac9",
                borderRadius: "18px",
                padding: "24px",
                width: "100%",
                maxWidth: "480px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
                maxHeight: "90vh",
                overflowY: "auto"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "22px", margin: 0, color: "#2b170d", fontWeight: "700" }}>
                  {editingAddressId ? "Edit Delivery Address" : "Add New Delivery Address"}
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowAddressModal(false)}
                  style={{ background: "none", border: "none", color: "#8c786a", cursor: "pointer", padding: "4px" }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveAddress}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
                      Contact Name
                    </label>
                    <input 
                      type="text" 
                      required
                      value={addressForm.name} 
                      onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })} 
                      placeholder="e.g. Rohit Kumar"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e8dac9", fontSize: "13px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
                      Mobile Number
                    </label>
                    <input 
                      type="tel" 
                      required
                      value={addressForm.phone} 
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} 
                      placeholder="+91 96729 96531"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e8dac9", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
                    Flat / House No. / Building / Street Address
                  </label>
                  <textarea 
                    rows={2}
                    required
                    value={addressForm.address} 
                    onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })} 
                    placeholder="e.g. Flat 402, Shivam Enclave, Main Road"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e8dac9", fontSize: "13px", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
                      City / Town
                    </label>
                    <input 
                      type="text" 
                      required
                      value={addressForm.city} 
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} 
                      placeholder="e.g. Jaipur"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e8dac9", fontSize: "13px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
                      Pincode
                    </label>
                    <input 
                      type="text" 
                      required
                      maxLength={6}
                      value={addressForm.pincode} 
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })} 
                      placeholder="e.g. 302001"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e8dac9", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
                    State
                  </label>
                  <input 
                    type="text" 
                    value={addressForm.state} 
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} 
                    placeholder="e.g. Rajasthan"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e8dac9", fontSize: "13px" }}
                  />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#4a3528", cursor: "pointer", marginBottom: "20px" }}>
                  <input 
                    type="checkbox" 
                    checked={addressForm.isDefault} 
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} 
                    style={{ accentColor: "#a54d2b" }}
                  />
                  <span>Make this my default shipping address</span>
                </label>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button 
                    type="button" 
                    onClick={() => setShowAddressModal(false)}
                    style={{ background: "#fff", border: "1px solid #dcd1c6", padding: "10px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", color: "#665a51" }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={addressSubmitting}
                    style={{
                      background: "linear-gradient(135deg, #a54d2b 0%, #7a351a 100%)",
                      color: "#fff",
                      border: "none",
                      padding: "10px 22px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    {addressSubmitting ? "Saving..." : "Save Address"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Address Confirmation Modal */}
      <ConfirmModal 
        isOpen={Boolean(addressToDelete)}
        title="Delete Address"
        message={`Are you sure you want to remove this delivery address (${addressToDelete?.city} - ${addressToDelete?.pincode})?`}
        confirmText="Delete Address"
        cancelText="Keep Address"
        isDanger={true}
        onConfirm={confirmDeleteAddress}
        onClose={() => setAddressToDelete(null)}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmModal 
        isOpen={showLogoutModal}
        title="Sign Out from Aura"
        message="Are you sure you want to sign out from your Aura Rudraksha devotee account?"
        confirmText="Yes, Sign Out"
        cancelText="Stay Signed In"
        isDanger={true}
        onConfirm={handleLogout}
        onClose={() => setShowLogoutModal(false)}
      />
    </Shell>
  );
}

