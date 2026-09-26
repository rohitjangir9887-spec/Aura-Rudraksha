import React, { useState, useEffect, useCallback } from "react";
import { 
  Bot, 
  Search, 
  RefreshCw, 
  Trash2, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Database, 
  Activity, 
  User, 
  Globe, 
  Smartphone, 
  Laptop, 
  MessageSquare, 
  Sparkles, 
  Flame, 
  Calendar, 
  Clock, 
  MapPin, 
  ScrollText, 
  X, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  Eye, 
  Share2,
  Lock,
  Layers
} from "lucide-react";
import { authClient } from "../../lib/authClient";
import { emitToast } from "../../context/ToastContext";
import { ConfirmModal } from "../../components/ConfirmModal";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = ((((typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env.VITE_API_BASE_URL : undefined) || "/api").replace(/\/$/, "")) + "/aura-ai";

export function AdminAIChats() {
  const [chats, setChats] = useState([]);
  const [metrics, setMetrics] = useState({
    totalSessions: 0,
    totalMessages: 0,
    guestCount: 0,
    registeredCount: 0,
    panditjiCount: 0,
    quickAiCount: 0,
    uniqueIpsCount: 0
  });
  const [dbStatus, setDbStatus] = useState({
    connected: false,
    mongoUriMasked: "",
    lastSync: null,
    totalDbRecords: 0
  });
  const [loading, setLoading] = useState(true);
  const [testingDb, setTestingDb] = useState(false);
  const [dbHealthReport, setDbHealthReport] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all"); // 'all' | 'panditji' | 'standard' | 'guest' | 'registered' | 'kundli'
  
  // Selected conversation modal
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatDetail, setActiveChatDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const fetchChats = useCallback(async (showToastNotice = false) => {
    try {
      setLoading(true);
      const token = await authClient.getToken();
      const res = await fetch(`${API_BASE}/admin/all-chats?search=${encodeURIComponent(searchQuery)}&mode=${selectedFilter === "panditji" ? "panditji" : selectedFilter === "standard" ? "standard" : "all"}&userType=${selectedFilter === "guest" ? "guest" : selectedFilter === "registered" ? "registered" : "all"}&limit=100`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setChats(data.chats || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.dbStatus) setDbStatus(data.dbStatus);
        if (showToastNotice) emitToast("AI चैट रिकॉर्ड्स अपडेट हो गए", "success");
      }
    } catch (err) {
      console.error("Failed to fetch admin AI chats:", err);
      emitToast("AI चैट्स लोड करने में समस्या आई", "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedFilter]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Check MongoDB connection live
  const checkMongoDbHealth = async () => {
    try {
      setTestingDb(true);
      const token = await authClient.getToken();
      const res = await fetch(`${API_BASE}/admin/db-health`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        setDbHealthReport(data);
        setDbStatus({
          connected: data.connected,
          mongoUriMasked: data.maskedUri,
          lastSync: data.lastSync,
          totalDbRecords: data.totalSavedChats
        });
        emitToast(
          data.connected 
            ? `MongoDB Atlas Live (${data.pingTimeMs || 1}ms ping, ${data.totalSavedChats} chats saved)` 
            : "MongoDB in-memory mode active", 
          data.connected ? "success" : "info"
        );
      }
    } catch (err) {
      emitToast("MongoDB कनेक्शन चेक करने में त्रुटि", "error");
    } finally {
      setTestingDb(false);
    }
  };

  // Open Transcript Detail
  const handleOpenChatDetail = async (id) => {
    try {
      setActiveChatId(id);
      setLoadingDetail(true);
      const token = await authClient.getToken();
      const res = await fetch(`${API_BASE}/admin/chats/${id}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && data.chat) {
        setActiveChatDetail(data.chat);
      } else {
        emitToast("बातचीत लोड नहीं हो पाई", "error");
      }
    } catch (err) {
      emitToast("बातचीत लोड करने में त्रुटि", "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Delete Single Chat
  const handleDeleteChat = async () => {
    if (!deleteTargetId) return;
    try {
      const token = await authClient.getToken();
      const res = await fetch(`${API_BASE}/admin/chats/${deleteTargetId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        emitToast("बातचीत सफलतापूर्वक हटा दी गई", "success");
        setChats(prev => prev.filter(c => (c.id !== deleteTargetId && c.conversationId !== deleteTargetId)));
        if (activeChatId === deleteTargetId) {
          setActiveChatId(null);
          setActiveChatDetail(null);
        }
      }
    } catch (err) {
      emitToast("हटाने में विफलता", "error");
    } finally {
      setDeleteTargetId(null);
    }
  };

  // Clear All Chats
  const handleClearAllChats = async () => {
    try {
      const token = await authClient.getToken();
      const res = await fetch(`${API_BASE}/admin/chats-clear`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        emitToast("सभी AI चैट्स खाली कर दी गईं", "success");
        setChats([]);
        setActiveChatId(null);
        setActiveChatDetail(null);
        fetchChats();
      }
    } catch (err) {
      emitToast("चैट्स साफ़ करने में त्रुटि", "error");
    } finally {
      setShowClearAllModal(false);
    }
  };

  // Copy Full Transcript
  const handleCopyTranscript = () => {
    if (!activeChatDetail) return;
    const lines = [];
    lines.push(`--- AURA RUDRAKSHA AI CONVERSATION TRANSCRIPT ---`);
    lines.push(`Session ID: ${activeChatDetail.conversationId || activeChatDetail.id}`);
    lines.push(`User: ${activeChatDetail.userName || "Guest User"} (${activeChatDetail.userEmail || "No email"})`);
    lines.push(`Tracked IP: ${activeChatDetail.userIp || activeChatDetail.ipAddress || "127.0.0.1"}`);
    lines.push(`Device: ${activeChatDetail.deviceInfo || "Mobile/Desktop"}`);
    lines.push(`Mode: ${activeChatDetail.mode === "panditji" ? "AI Panditji (Vedic Astrologer)" : "Aura AI Shopping Guide"}`);
    lines.push(`Date: ${new Date(activeChatDetail.createdAt || activeChatDetail.updatedAt).toLocaleString()}`);
    lines.push(`--------------------------------------------------\n`);

    if (activeChatDetail.verifiedBirthDetails || activeChatDetail.authoritativeKundali) {
      const bd = activeChatDetail.verifiedBirthDetails || activeChatDetail.authoritativeKundali?.verifiedBirthData || {};
      lines.push(`[Active Kundli Chart: ${bd.name || "Devotee"} | DOB: ${bd.dob || "N/A"} ${bd.birthTime || ""} | Place: ${bd.birthPlace || ""}]\n`);
    }

    (activeChatDetail.messages || []).forEach((m, idx) => {
      const senderName = m.sender === "user" ? (activeChatDetail.userName || "Devotee") : (activeChatDetail.mode === "panditji" ? "🕉️ AI Pandit Ji" : "✨ Aura AI");
      lines.push(`[${new Date(m.timestamp).toLocaleTimeString()}] ${senderName}:`);
      lines.push(`${m.text}\n`);
    });

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopiedTranscript(true);
      emitToast("सम्पूर्ण बातचीत कॉपी हो गई!", "success");
      setTimeout(() => setCopiedTranscript(false), 2000);
    });
  };

  // Export Transcript JSON
  const handleExportJson = () => {
    if (!activeChatDetail) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeChatDetail, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `aura_ai_chat_${activeChatDetail.conversationId || "session"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    emitToast("JSON फाइल डाउनलोड हो गई", "info");
  };

  // Filtered Chats
  const filteredChats = chats.filter(c => {
    if (selectedFilter === "panditji" && c.mode !== "panditji") return false;
    if (selectedFilter === "standard" && c.mode === "panditji") return false;
    if (selectedFilter === "guest" && c.userId && c.userId !== "guest") return false;
    if (selectedFilter === "registered" && (!c.userId || c.userId === "guest")) return false;
    if (selectedFilter === "kundli" && !c.hasKundli) return false;
    return true;
  });

  return (
    <div style={{ padding: "16px 20px 60px", maxWidth: "1400px", margin: "0 auto", color: "#2B170D" }}>
      
      {/* 1. Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #2A140A 0%, #5C270E 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#D4AF37",
                boxShadow: "0 4px 12px rgba(42, 20, 10, 0.2)"
              }}
            >
              <Bot size={22} strokeWidth={2} />
            </div>
            <div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', 'Cinzel', serif", fontSize: "24px", fontWeight: 700, margin: 0, color: "#2A140A" }}>
                AI Bot All Chats & Inquiries Tracker
              </h1>
              <p style={{ fontSize: "12px", color: "#7A6556", margin: "2px 0 0" }}>
                Live Devotee Conversations • Real IP Tracking • Vedic Kundali Logs • MongoDB Synchronization
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={checkMongoDbHealth}
            disabled={testingDb}
            style={{
              height: "36px",
              padding: "0 14px",
              borderRadius: "8px",
              background: dbStatus.connected ? "#ECFDF5" : "#FFFBEB",
              border: `1px solid ${dbStatus.connected ? "#10B981" : "#F59E0B"}`,
              color: dbStatus.connected ? "#065F46" : "#92400E",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <Database size={15} />
            <span>{testingDb ? "Checking MongoDB..." : dbStatus.connected ? "MongoDB Live ✓" : "Check MongoDB"}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchChats(true)}
            disabled={loading}
            style={{
              height: "36px",
              padding: "0 14px",
              borderRadius: "8px",
              background: "#FAF5ED",
              border: "1px solid #E8DEC7",
              color: "#4E2A18",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          {chats.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearAllModal(true)}
              style={{
                height: "36px",
                padding: "0 12px",
                borderRadius: "8px",
                background: "#FEE2E2",
                border: "1px solid #FCA5A5",
                color: "#991B1B",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer"
              }}
            >
              <Trash2 size={14} />
              <span>Clear Chats</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MongoDB Health Status Banner */}
      <div
        style={{
          borderRadius: "14px",
          background: dbStatus.connected 
            ? "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)" 
            : "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
          border: `1.5px solid ${dbStatus.connected ? "#86EFAC" : "#FDE68A"}`,
          padding: "12px 16px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: dbStatus.connected ? "#10B981" : "#F59E0B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF"
            }}
          >
            <Database size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <strong style={{ fontSize: "14px", color: dbStatus.connected ? "#065F46" : "#92400E" }}>
                {dbStatus.connected ? "Authoritative MongoDB Atlas Connected" : "Resilient In-Memory Mode Active"}
              </strong>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  background: dbStatus.connected ? "#059669" : "#D97706",
                  color: "#FFFFFF",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  textTransform: "uppercase"
                }}
              >
                {dbStatus.connected ? "Live Storage" : "Fallback Safe"}
              </span>
            </div>
            <p style={{ fontSize: "11px", color: dbStatus.connected ? "#047857" : "#B45309", margin: "2px 0 0" }}>
              Database URI: <code>{dbStatus.mongoUriMasked || "mongodb+srv://.../aurarudraksha"}</code> • Total Saved Records: <strong>{dbStatus.totalDbRecords || chats.length}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: "#6B7280" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Activity size={13} color={dbStatus.connected ? "#10B981" : "#F59E0B"} />
            <span>Automatic Silent Chat Persistence Active (100% Zero Data Loss)</span>
          </div>
        </div>
      </div>

      {/* 3. Analytics KPI Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "12px",
          marginBottom: "20px"
        }}
      >
        <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #EFE6DA", padding: "14px", boxShadow: "0 2px 8px rgba(42,20,10,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#8C796D", fontSize: "11px", fontWeight: 600 }}>
            <span>Total Chat Sessions</span>
            <MessageSquare size={15} color="#C59B27" />
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#2A140A", marginTop: "6px" }}>
            {metrics.totalSessions || chats.length}
          </div>
          <div style={{ fontSize: "10px", color: "#16A34A", marginTop: "2px" }}>
            ✓ Real-time captured
          </div>
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #EFE6DA", padding: "14px", boxShadow: "0 2px 8px rgba(42,20,10,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#8C796D", fontSize: "11px", fontWeight: 600 }}>
            <span>Total Messages Exchanged</span>
            <Sparkles size={15} color="#E07A22" />
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#2A140A", marginTop: "6px" }}>
            {metrics.totalMessages || chats.reduce((acc, c) => acc + (c.messageCount || 0), 0)}
          </div>
          <div style={{ fontSize: "10px", color: "#60341F", marginTop: "2px" }}>
            User & Panditji messages
          </div>
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #EFE6DA", padding: "14px", boxShadow: "0 2px 8px rgba(42,20,10,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#8C796D", fontSize: "11px", fontWeight: 600 }}>
            <span>Guest Users (Tracked IPs)</span>
            <Globe size={15} color="#3B82F6" />
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#1D4ED8", marginTop: "6px" }}>
            {metrics.guestCount || chats.filter(c => !c.userId || c.userId === "guest").length}
          </div>
          <div style={{ fontSize: "10px", color: "#3B82F6", marginTop: "2px" }}>
            IP & Device Fingerprinted
          </div>
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #EFE6DA", padding: "14px", boxShadow: "0 2px 8px rgba(42,20,10,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#8C796D", fontSize: "11px", fontWeight: 600 }}>
            <span>Logged-in Devotees</span>
            <User size={15} color="#10B981" />
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#065F46", marginTop: "6px" }}>
            {metrics.registeredCount || chats.filter(c => c.userId && c.userId !== "guest").length}
          </div>
          <div style={{ fontSize: "10px", color: "#059669", marginTop: "2px" }}>
            Name & Email Verified
          </div>
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #EFE6DA", padding: "14px", boxShadow: "0 2px 8px rgba(42,20,10,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#8C796D", fontSize: "11px", fontWeight: 600 }}>
            <span>🕉️ AI Panditji Astrological</span>
            <ScrollText size={15} color="#D97706" />
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#B45309", marginTop: "6px" }}>
            {metrics.panditjiCount || chats.filter(c => c.mode === "panditji").length}
          </div>
          <div style={{ fontSize: "10px", color: "#D97706", marginTop: "2px" }}>
            Birth chart inquiries
          </div>
        </div>
      </div>

      {/* 4. Search & Filter Bar */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "14px",
          border: "1px solid #EFE6DA",
          padding: "12px 16px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <Search size={16} color="#8C796D" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by User Name, Email, IP Address, Session ID, or Message query..."
            style={{
              width: "100%",
              height: "38px",
              padding: "0 12px 0 36px",
              borderRadius: "8px",
              border: "1px solid #E8DEC7",
              background: "#FCFAF7",
              fontSize: "12px",
              color: "#2A140A",
              outline: "none"
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All Chats" },
            { id: "panditji", label: "🕉️ AI Panditji" },
            { id: "standard", label: "⚡ Quick AI" },
            { id: "guest", label: "🌐 Guest (IPs)" },
            { id: "registered", label: "👤 Registered" },
            { id: "kundli", label: "📜 With Kundli" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "11.5px",
                fontWeight: selectedFilter === tab.id ? 700 : 500,
                background: selectedFilter === tab.id ? "#2A140A" : "#FAF5ED",
                color: selectedFilter === tab.id ? "#FAF5ED" : "#4E2A18",
                border: selectedFilter === tab.id ? "1px solid #2A140A" : "1px solid #E8DEC7",
                cursor: "pointer"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Conversations Table / Card List */}
      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", background: "#FFFFFF", borderRadius: "14px", border: "1px solid #EFE6DA" }}>
          <RefreshCw size={28} className="animate-spin" style={{ color: "#C59B27", margin: "0 auto 12px" }} />
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#2A140A" }}>Loading AI Conversations...</div>
        </div>
      ) : filteredChats.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "#FFFFFF", borderRadius: "14px", border: "1px solid #EFE6DA" }}>
          <MessageSquare size={36} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#2A140A", marginBottom: "4px" }}>
            No AI Chat Records Found
          </div>
          <p style={{ fontSize: "12px", color: "#8C796D", maxWidth: "400px", margin: "0 auto" }}>
            When users or guests chat with the Floating Window AI Bot, AI Panditji, or on the Kundli page, every interaction will appear here automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredChats.map((conv) => {
            const isGuest = !conv.userId || conv.userId === "guest";
            const isPanditji = conv.mode === "panditji";
            const formattedDate = new Date(conv.updatedAt || conv.createdAt).toLocaleString();

            return (
              <div
                key={conv.id || conv.conversationId}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "14px",
                  border: "1px solid #EFE6DA",
                  padding: "14px 16px",
                  boxShadow: "0 2px 6px rgba(42,20,10,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  transition: "border-color 0.2s, box-shadow 0.2s"
                }}
              >
                {/* Top Row: User / Guest details & Status Tags */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* User Avatar Badge */}
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        background: isPanditji 
                          ? "linear-gradient(135deg, #E07A22 0%, #C04D28 100%)" 
                          : isGuest 
                            ? "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)" 
                            : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        fontSize: "18px",
                        fontWeight: 700
                      }}
                    >
                      {isPanditji ? "🧘‍♂️" : isGuest ? "🌐" : "👤"}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#2A140A" }}>
                          {isGuest ? (conv.userName || "Guest Devotee") : conv.userName}
                        </span>

                        {isGuest ? (
                          <span style={{ fontSize: "10px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", padding: "1px 6px", borderRadius: "6px", fontWeight: 600 }}>
                            Guest User
                          </span>
                        ) : (
                          <span style={{ fontSize: "10px", background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0", padding: "1px 6px", borderRadius: "6px", fontWeight: 600 }}>
                            Registered User
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 7px",
                            borderRadius: "6px",
                            background: isPanditji ? "#FEF3C7" : "#F3E8FF",
                            color: isPanditji ? "#B45309" : "#6B21A8",
                            border: `1px solid ${isPanditji ? "#FDE68A" : "#E9D5FF"}`
                          }}
                        >
                          {isPanditji ? "🕉️ AI Panditji" : "⚡ Quick AI"}
                        </span>
                      </div>

                      {/* User Network & Device Metadata */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "#7A6556", marginTop: "3px", flexWrap: "wrap" }}>
                        <span>
                          <strong>IP:</strong> <code style={{ background: "#F5EFE6", padding: "1px 4px", borderRadius: "4px", color: "#2A140A" }}>{conv.userIp || "127.0.0.1"}</code>
                        </span>
                        {conv.userEmail && <span><strong>Email:</strong> {conv.userEmail}</span>}
                        <span><strong>Device:</strong> {conv.deviceInfo || "Mobile / Desktop"}</span>
                        <span><strong>Session:</strong> {String(conv.conversationId || conv.id).slice(0, 16)}...</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Timestamp & Action buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#8C796D", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={12} /> {formattedDate}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenChatDetail(conv.id || conv.conversationId)}
                      style={{
                        height: "30px",
                        padding: "0 10px",
                        borderRadius: "6px",
                        background: "#2A140A",
                        border: "none",
                        color: "#FAF5ED",
                        fontSize: "11px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        cursor: "pointer"
                      }}
                    >
                      <Eye size={13} />
                      <span>Transcript ({conv.messageCount || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(conv.id || conv.conversationId)}
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "6px",
                        background: "#FEE2E2",
                        border: "1px solid #FCA5A5",
                        color: "#991B1B",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        padding: 0
                      }}
                      title="Delete chat log"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Kundli badge if available */}
                {conv.hasKundli && (
                  <div
                    style={{
                      background: "#FAF5ED",
                      border: "1px dashed #D4AF37",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      color: "#60341F",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <span>📜</span>
                    <span>
                      <strong>Vedic Kundali Attached:</strong> {conv.verifiedBirthDetails?.name || "Devotee"} ({conv.verifiedBirthDetails?.dob || "Birth chart evaluated"})
                    </span>
                  </div>
                )}

                {/* Last Message Snippet */}
                {conv.lastMessageText && (
                  <div
                    style={{
                      background: "#FCFAF7",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "11.5px",
                      color: "#4E2A18",
                      lineHeight: "1.4",
                      borderLeft: "3px solid #D4AF37"
                    }}
                  >
                    <strong>Last message:</strong> {conv.lastMessageText}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Full Transcript Modal */}
      <AnimatePresence>
        {activeChatId && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 10020,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "16px"
            }}
            onClick={() => {
              setActiveChatId(null);
              setActiveChatDetail(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              style={{
                width: "100%",
                maxWidth: "780px",
                maxHeight: "90vh",
                background: "#FFFFFF",
                borderRadius: "20px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, #2A140A 0%, #4E2A18 100%)",
                  color: "#FAF5ED",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "rgba(212, 175, 55, 0.2)",
                      border: "1.5px solid #D4AF37",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#D4AF37",
                      fontSize: "18px"
                    }}
                  >
                    {activeChatDetail?.mode === "panditji" ? "🧘‍♂️" : "✨"}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#FAF5ED" }}>
                      AI Conversation Transcript
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#E8DEC7" }}>
                      Session ID: <code>{activeChatDetail?.conversationId || activeChatId}</code>
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={handleCopyTranscript}
                    style={{
                      height: "30px",
                      padding: "0 10px",
                      borderRadius: "6px",
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      color: "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer"
                    }}
                  >
                    {copiedTranscript ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                    <span>{copiedTranscript ? "Copied!" : "Copy"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportJson}
                    style={{
                      height: "30px",
                      padding: "0 10px",
                      borderRadius: "6px",
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      color: "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer"
                    }}
                  >
                    <Download size={13} />
                    <span>JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveChatId(null);
                      setActiveChatDetail(null);
                    }}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.15)",
                      border: "none",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body Info Strip */}
              {activeChatDetail && (
                <div
                  style={{
                    padding: "10px 20px",
                    background: "#FAF5ED",
                    borderBottom: "1px solid #EFE6DA",
                    fontSize: "11.5px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "8px",
                    color: "#4E2A18"
                  }}
                >
                  <div><strong>User:</strong> {activeChatDetail.userName || "Guest Devotee"}</div>
                  <div><strong>Email:</strong> {activeChatDetail.userEmail || "No email (Guest)"}</div>
                  <div><strong>Tracked IP:</strong> <code>{activeChatDetail.userIp || activeChatDetail.ipAddress || "127.0.0.1"}</code></div>
                  <div><strong>Device / OS:</strong> {activeChatDetail.deviceInfo || "Mobile/Desktop"}</div>
                  <div><strong>Total Messages:</strong> {(activeChatDetail.messages || []).length}</div>
                  <div><strong>Started:</strong> {new Date(activeChatDetail.createdAt || activeChatDetail.updatedAt).toLocaleTimeString()}</div>
                </div>
              )}

              {/* Active Kundli Box if attached */}
              {activeChatDetail?.verifiedBirthDetails && (
                <div style={{ margin: "12px 20px 0", padding: "10px 14px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: "10px", fontSize: "11.5px", color: "#92400E" }}>
                  <strong>📜 Active Vedic Kundli:</strong> {activeChatDetail.verifiedBirthDetails.name || "Devotee"} • DOB: {activeChatDetail.verifiedBirthDetails.dob} {activeChatDetail.verifiedBirthDetails.birthTime || ""} • Place: {activeChatDetail.verifiedBirthDetails.birthPlace || "India"}
                </div>
              )}

              {/* Message Transcript Container */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  background: "#FCFAF7"
                }}
              >
                {loadingDetail ? (
                  <div style={{ padding: "40px 0", textAlign: "center" }}>
                    <RefreshCw size={24} className="animate-spin" style={{ color: "#C59B27", margin: "0 auto" }} />
                    <div style={{ fontSize: "12px", color: "#7A6556", marginTop: "8px" }}>Loading full transcript...</div>
                  </div>
                ) : (activeChatDetail?.messages || []).length === 0 ? (
                  <div style={{ padding: "30px 0", textAlign: "center", color: "#8C796D", fontSize: "13px" }}>
                    No messages recorded in this conversation yet.
                  </div>
                ) : (
                  activeChatDetail?.messages.map((msg, index) => {
                    const isUser = msg.sender === "user";
                    const msgTime = new Date(msg.timestamp || activeChatDetail.updatedAt).toLocaleTimeString();

                    return (
                      <div
                        key={msg.id || index}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isUser ? "flex-end" : "flex-start"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "10.5px",
                            color: "#8C796D",
                            marginBottom: "3px",
                            padding: "0 4px"
                          }}
                        >
                          <span>{isUser ? (activeChatDetail.userName || "Devotee") : (activeChatDetail.mode === "panditji" ? "AI Pandit Ji" : "Aura AI")}</span>
                          <span>•</span>
                          <span>{msgTime}</span>
                        </div>

                        <div
                          style={{
                            maxWidth: "85%",
                            padding: "12px 16px",
                            borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            background: isUser ? "#2A140A" : "#FFFFFF",
                            color: isUser ? "#FAF5ED" : "#2A140A",
                            border: isUser ? "none" : "1.5px solid #EFE6DA",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                            fontSize: "12.5px",
                            lineHeight: "1.6",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontFamily: "'Noto Sans Devanagari', 'Plus Jakarta Sans', sans-serif"
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "12px 20px",
                  background: "#FFFFFF",
                  borderTop: "1px solid #EFE6DA",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(activeChatDetail?.conversationId || activeChatId)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "#FEE2E2",
                    border: "1px solid #FCA5A5",
                    color: "#991B1B",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveChatId(null);
                    setActiveChatDetail(null);
                  }}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "6px",
                    background: "#2A140A",
                    border: "none",
                    color: "#FAF5ED",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Single Chat Modal */}
      {deleteTargetId && (
        <ConfirmModal
          isOpen={Boolean(deleteTargetId)}
          title="Delete Conversation Record"
          message="Are you sure you want to permanently delete this chat transcript and associated user interaction log?"
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteChat}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}

      {/* Confirm Clear All Chats Modal */}
      {showClearAllModal && (
        <ConfirmModal
          isOpen={showClearAllModal}
          title="Clear All AI Conversations"
          message="Are you sure you want to clear all stored AI conversation logs from MongoDB and in-memory cache?"
          confirmText="Yes, Clear All"
          cancelText="Cancel"
          onConfirm={handleClearAllChats}
          onCancel={() => setShowClearAllModal(false)}
        />
      )}

    </div>
  );
}
