import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Sparkles, 
  Package, 
  Truck, 
  HelpCircle, 
  Send, 
  RotateCcw, 
  ShieldCheck, 
  Tag, 
  PhoneCall, 
  MessageSquare, 
  CheckCircle2, 
  ChevronRight, 
  ArrowRight,
  ExternalLink,
  LifeBuoy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, onStoreUpdate } from "../lib/db";
import { authClient } from "../lib/authClient";
import { auraAiClient } from "../lib/auraAiClient";
import { auraChatStore, formatMessageTime } from "../lib/auraChatStore";
import { parseAuraAiPayload, customerSafeAiText } from "../lib/auraAiResponse";
import { emitToast } from "../context/ToastContext";
import { AuraAIMessageContent } from "./AuraAIMessageContent";
import { SupportTicketsDrawer } from "./support/SupportTicketsDrawer";
import { SupportTicketForm } from "./support/SupportTicketForm";
import { SupportChatView } from "./support/SupportChatView";

export function AuraAISupportAssistant({ defaultTopic = "orders", compact = false }) {
  const [user, setUser] = useState(() => authClient.getUser());
  const [recentOrders, setRecentOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [customerTickets, setCustomerTickets] = useState([]);
  const [showMyTickets, setShowMyTickets] = useState(false);

  useEffect(() => {
    loadTickets();
    const unsub = onStoreUpdate ? onStoreUpdate(() => loadTickets()) : () => {};
    return () => unsub();
  }, [user]);

  const loadTickets = async () => {
    try {
      const u = authClient.getUser();
      const userEmail = (u?.email || "").toLowerCase().trim();
      const userUid = u?.authUserId || u?.uid || "";
      if (!userEmail && !userUid) {
        setCustomerTickets([]);
        return;
      }
      await db.fetchTickets();
      const all = db.getTickets() || [];
      const mine = all.filter(t => {
        const ticketEmail = (t.email || t.userEmail || "").toLowerCase().trim();
        const ticketUid = t.authUserId || t.userId || "";
        const emailMatch = Boolean(userEmail && ticketEmail && ticketEmail === userEmail);
        const uidMatch = Boolean(userUid && ticketUid && ticketUid === userUid);
        return emailMatch || uidMatch;
      });
      setCustomerTickets(mine);
    } catch (_) {
      setCustomerTickets([]);
    }
  };

  useEffect(() => {
    const u = authClient.getUser();
    setUser(u);
    if (u && !u.isAnonymous) {
      setLoadingOrders(true);
      db.getMyOrders()
        .then(res => {
          if (res?.success && Array.isArray(res.data)) {
            const sorted = [...res.data].sort((a, b) => new Date(b.date) - new Date(a.date));
            setRecentOrders(sorted.slice(0, 3));
            if (sorted.length > 0) {
              setSelectedOrder(sorted[0]);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingOrders(false));
    }
  }, []);

  const handleAskQuickQuery = async (queryText, relatedOrder = null) => {
    if (loadingAi) return;
    const u = authClient.getUser();
    
    const userMsg = {
      id: "u_" + Date.now(),
      sender: "user",
      text: queryText,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setLoadingAi(true);

    try {
      const res = await auraAiClient.sendMessage({
        message: queryText,
        userEmail: u?.email || "",
        userName: u?.displayName || "Devotee",
        history: chatMessages.slice(-4)
      });

      if (res) {
        const parsed = parseAuraAiPayload(res);
        const aiMsg = {
          id: "ai_" + Date.now(),
          sender: "ai",
          text: parsed.text || "Namaste 🙏 How else may I assist you with your sacred Rudraksha order?",
          coupons: parsed.coupons,
          requiresHuman: parsed.requiresHuman,
          quickReplies: parsed.quickReplies,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, aiMsg]);
        
        // Also sync to unified chat store
        auraChatStore.appendMessage(userMsg);
        auraChatStore.appendMessage(aiMsg);
      }
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          id: "err_" + Date.now(),
          sender: "ai",
          text: "Namaste 🙏 We are experiencing high devotional inquiry volume. For immediate order tracking or cancellation queries, you can also reach our dedicated team at +91 9672996531 on WhatsApp.",
          requiresHuman: true,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    try {
      const u = authClient.getUser();
      const ticketObj = {
        id: "TKT-" + Math.floor(100000 + Math.random() * 900000),
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        orderId: selectedOrder?.id || "",
        email: u?.email || "devotee@aurarudraksha.com",
        name: u?.displayName || u?.name || "Devotee",
        phone: u?.phone || "",
        status: "Open",
        priority: "Normal",
        adminResponse: "",
        date: new Date().toISOString()
      };

      await db.saveTicket(ticketObj);
      await loadTickets();

      setTicketSuccess(true);
      emitToast("Support ticket created successfully! Our spiritual care team will review and reply.", "success");
      
      handleAskQuickQuery(`I have created support ticket #${ticketObj.id} regarding: ${ticketSubject}`);
      
      setTimeout(() => {
        setShowTicketForm(false);
        setTicketSubject("");
        setTicketMessage("");
        setTicketSuccess(false);
        setShowMyTickets(true);
      }, 2000);
    } catch (err) {
      emitToast(err.message || "Could not submit ticket. Please reach out via WhatsApp.", "error");
    }
  };

  return (
    <div className="aura-ai-support-widget" style={{
      background: "linear-gradient(135deg, #fffdfa 0%, #faf3eb 100%)",
      border: "1.5px solid #d4af37",
      borderRadius: "16px",
      padding: compact ? "14px 16px" : "20px 22px",
      boxShadow: "0 4px 20px rgba(43, 23, 13, 0.05)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Decorative Aura Accent */}
      <div style={{
        position: "absolute",
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,175,55,0.15) 0%, rgba(255,255,255,0) 70%)",
        pointerEvents: "none"
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #8c2b10 0%, #6e1e07 100%)",
            color: "#d4af37",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #d4af37",
            boxShadow: "0 2px 8px rgba(140,43,16,0.25)"
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#2b1408", margin: 0 }}>
                Aura AI Customer & Order Assistance
              </h3>
              <span style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: "#8c2b10",
                background: "rgba(212, 175, 55, 0.22)",
                padding: "2px 6px",
                borderRadius: 999,
                border: "0.8px solid #d4af37"
              }}>
                OFFICIAL GUIDE
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#7a6759", margin: "2px 0 0 0" }}>
              Instant answers on deliveries, cancellations, energization & authentic Rudraksha guidance
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <a 
            href="https://wa.me/919672996531?text=Namaste,%20I%20need%20assistance%20with%20my%20Aura%20Rudraksha%20order"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "#25D366",
              color: "#fff",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(37,211,102,0.2)"
            }}
          >
            <PhoneCall size={13} /> WhatsApp Help
          </a>
        </div>
      </div>

      {/* Authenticated User Order Context Banner */}
      {user && !user.isAnonymous && recentOrders.length > 0 && (
        <div style={{
          background: "#fff",
          border: "1px solid #ebdccb",
          borderRadius: 12,
          padding: "10px 14px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={16} color="#8c2b10" />
            <div>
              <span style={{ fontSize: 11, color: "#7a6759", fontWeight: 600 }}>Your Latest Order: </span>
              <strong style={{ fontSize: 12.5, color: "#2b1408" }}>#{recentOrders[0].id}</strong>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#16a34a",
                background: "#dcfce7",
                padding: "1px 6px",
                borderRadius: 4,
                marginLeft: 6
              }}>
                {recentOrders[0].status || "In Transit"}
              </span>
            </div>
          </div>
          <button
            onClick={() => handleAskQuickQuery(`Where is my order #${recentOrders[0].id} right now?`)}
            disabled={loadingAi}
            style={{
              background: "#fdf5ed",
              border: "1px solid #b85d25",
              color: "#8c2b10",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            Track with Aura AI
          </button>
        </div>
      )}

      {/* Quick Action Assistance Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        <button
          onClick={() => handleAskQuickQuery(user && !user.isAnonymous ? "Check my recent order status and delivery timeline." : "How can I track my order?")}
          className="aura-ai-chip-btn"
        >
          📦 Track Order Status
        </button>
        <button
          onClick={() => handleAskQuickQuery("What is the return, replacement, and cancellation policy for Rudraksha?")}
          className="aura-ai-chip-btn"
        >
          🔄 Returns & Exchanges
        </button>
        <button
          onClick={() => handleAskQuickQuery("What active coupons and discount codes are available today?")}
          className="aura-ai-chip-btn"
        >
          🏷️ Today's Coupons
        </button>
        <button
          onClick={() => handleAskQuickQuery("How are Aura Rudraksha beads consecrated and lab certified?")}
          className="aura-ai-chip-btn"
        >
          🛡️ Lab Authenticity & Consecration
        </button>
        <button
          onClick={() => setShowTicketForm(!showTicketForm)}
          className="aura-ai-chip-btn"
          style={{ background: showTicketForm ? "#8c2b10" : "#fff", color: showTicketForm ? "#fff" : "#6f3518" }}
        >
          📝 Raise Support Ticket
        </button>
        <button
          onClick={() => { setShowMyTickets(!showMyTickets); loadTickets(); }}
          className="aura-ai-chip-btn"
          style={{ background: showMyTickets ? "#15803d" : "#fff", color: showMyTickets ? "#fff" : "#166534" }}
        >
          📋 My Support Tickets ({customerTickets.length})
        </button>
      </div>

      <SupportTicketsDrawer
        showMyTickets={showMyTickets}
        setShowMyTickets={setShowMyTickets}
        customerTickets={customerTickets}
      />

      <SupportTicketForm
        showTicketForm={showTicketForm}
        setShowTicketForm={setShowTicketForm}
        ticketSuccess={ticketSuccess}
        ticketSubject={ticketSubject}
        setTicketSubject={setTicketSubject}
        ticketMessage={ticketMessage}
        setTicketMessage={setTicketMessage}
        handleCreateTicket={handleCreateTicket}
      />

      <SupportChatView
        chatMessages={chatMessages}
        loadingAi={loadingAi}
        input={input}
        setInput={setInput}
        handleAskQuickQuery={handleAskQuickQuery}
      />
    </div>
  );
}
