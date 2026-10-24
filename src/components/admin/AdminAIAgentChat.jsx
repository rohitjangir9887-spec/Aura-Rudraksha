import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Loader2,
  Sparkles,
  RotateCcw,
  Trash2,
  Eye,
  Plus,
  Bug,
  Clock,
  Database,
  Undo2,
  Check,
  AlertTriangle,
  Play,
  Pause,
  Square,
  Monitor,
  Smartphone,
  ExternalLink,
  Layers,
  Package,
  Wand2,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  X
} from "lucide-react";
import { auraAiClient } from "../../lib/auraAiClient";
import { db, broadcastCacheInvalidation } from "../../lib/db";
import { AuraAIMessageContent } from "../AuraAIMessageContent";
import { VoiceReader } from "../VoiceReader";
import { emitToast } from "../../context/ToastContext";

export function AdminAIAgentChat({ compact = false }) {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState("chat"); // 'chat' | 'tasks' | 'actions' | 'bugs' | 'vault'
  const [messages, setMessages] = useState([]);
  const [pagesDirectory, setPagesDirectory] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);

  // Live Preview Panel state
  const [activePreviewRoute, setActivePreviewRoute] = useState("");
  const [activePreviewTitle, setActivePreviewTitle] = useState("Storefront Live Preview");
  const [previewViewport, setPreviewViewport] = useState("desktop"); // 'desktop' | 'mobile'
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [showSplitPreview, setShowSplitPreview] = useState(false);

  // Quick Modals / Drawers inside Chat
  const [showProductUploader, setShowProductUploader] = useState(false);
  const [showFeatureBuilder, setShowFeatureBuilder] = useState(false);
  const [showPagePicker, setShowPagePicker] = useState(false);

  // Product Upload Form State
  const [prodForm, setProdForm] = useState({
    name: "",
    mukhi: "5",
    price: "1499",
    comparePrice: "2199",
    stock: "25",
    category: "Rudraksha Beads",
    origin: "Nepal (Himalayan)",
    image: "/images/product-5mukhi.jpg",
    description: ""
  });

  // Feature Builder Form State
  const [featForm, setFeatForm] = useState({
    featureType: "flash_sale_banner",
    title: "🕉️ Sacred Rudraksha Mahotsav — Use Code SHIVA20 for Flat 20% OFF!",
    subtitle: "100% Lab-Certified Nepali Beads • Energized in Kashi",
    badge: "NEW FEATURE",
    ctaText: "Shop Sacred Beads",
    ctaLink: "/shop"
  });

  // Background Tasks State
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({
    title: "Autonomous SEO & Catalog Optimizer",
    prompt: "Check all products in MongoDB, enrich missing Vedic & SEO descriptions, and monitor low stock items.",
    taskType: "seo_optimizer",
    durationMinutes: 60,
    intervalMinutes: 5
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskCommandInputs, setTaskCommandInputs] = useState({});

  // Action Logs (Undo / Rollback) State
  const [actionLogs, setActionLogs] = useState([]);
  const [undoingId, setUndoingId] = useState("");

  // Bug Scanner State
  const [bugReport, setBugReport] = useState(null);
  const [scanningBugs, setScanningBugs] = useState(false);
  const [fixingBugs, setFixingBugs] = useState(false);

  // MongoDB Vault & Private Work Logs State
  const [vaultData, setVaultData] = useState(null);
  const [loadingVault, setLoadingVault] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const loadSessionAndTelemetry = useCallback(async (silent = false) => {
    try {
      const [sessRes, vaultRes] = await Promise.all([
        auraAiClient.getAdminAgentSession(),
        auraAiClient.getAdminVault()
      ]);
      if (sessRes?.success && sessRes.session) {
        setMessages(sessRes.session.messages || []);
        if (sessRes.pagesDirectory) setPagesDirectory(sessRes.pagesDirectory);
      }
      if (vaultRes?.success) {
        setVaultData(vaultRes);
        setActionLogs(vaultRes.actionLogs || []);
        setTasks(vaultRes.tasks || []);
      }
      if (!silent) {
        // Initial load complete
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadSessionAndTelemetry();
    // Poll every 6 seconds so background tasks & offline-completed chat replies sync automatically from MongoDB
    const interval = setInterval(() => {
      loadSessionAndTelemetry(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [loadSessionAndTelemetry]);

  useEffect(() => {
    if (scrollRef.current && subTab === "chat") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isTyping, subTab]);

  const handleSend = async (overrideText = null) => {
    const textToSend = typeof overrideText === "string" ? overrideText.trim() : input.trim();
    if (!textToSend || isTyping) return;

    setInput("");
    setLastFailedMessage(null);
    setSubTab("chat");

    const optimisticUserMsg = {
      id: "temp_u_" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toISOString()
    };
    const nextMsgs = [...messages, optimisticUserMsg];
    setMessages(nextMsgs);
    setIsTyping(true);

    try {
      const res = await auraAiClient.sendAdminChat(nextMsgs);
      if (res && res.messages && Array.isArray(res.messages)) {
        setMessages(res.messages);
      } else if (res && res.text) {
        setMessages([
          ...nextMsgs,
          {
            id: "amsg_ai_" + Date.now(),
            sender: "ai",
            text: res.text,
            modelUsed: res.modelUsed || "nvidia/nemotron-3-super-120b-a12b",
            actionsExecuted: res.actionsExecuted || [],
            previewRoute: res.previewRoute || "",
            previewTitle: res.previewTitle || "",
            timestamp: new Date().toISOString()
          }
        ]);
      } else if (res && res.error) {
        setLastFailedMessage(textToSend);
        setMessages([
          ...nextMsgs,
          {
            id: "amsg_err_" + Date.now(),
            sender: "ai",
            text: `⚠️ **Notice:** ${res.error}`
          }
        ]);
      }

      if (res?.previewRoute) {
        setActivePreviewRoute(res.previewRoute);
        setActivePreviewTitle(res.previewTitle || `Live Preview (${res.previewRoute})`);
        setPreviewRefreshKey(k => k + 1);
      }
      if (res?.actionsExecuted?.length > 0) {
        emitToast(`${res.actionsExecuted.length} AI Action(s) executed & saved in MongoDB!`, "success");
        broadcastCacheInvalidation();
        db.revalidateProducts(true).catch(() => {});
        db.fetchHomeData(true).catch(() => {});
        loadSessionAndTelemetry(true);
      }
    } catch (e) {
      setLastFailedMessage(textToSend);
      console.error("[AdminAgent] Chat send error:", e);
      setMessages([
        ...nextMsgs,
        {
          id: "amsg_err_" + Date.now(),
          sender: "ai",
          text: `⚠️ **Admin Agent Error:** Hum NVIDIA NIM aur Fallback AI dono se response nahi le paaye. Please try again, ya Admin Action button use karein.\n\n*(Error: ${e.message || "Network/System Error"})*`
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!msgId) return;
    const res = await auraAiClient.deleteAdminAgentMessage(msgId);
    if (res?.success && res.session) {
      setMessages(res.session.messages || []);
      emitToast("Message deleted from MongoDB.", "info");
    }
  };

  const handleResetChat = async () => {
    const res = await auraAiClient.clearAdminAgentSession();
    if (res?.success && res.session) {
      setMessages(res.session.messages || []);
      emitToast("Chat session cleared in MongoDB.", "info");
    }
  };

  const handleUndoAction = async (actionId) => {
    if (!actionId) return;
    setUndoingId(actionId);
    try {
      const res = await auraAiClient.undoAdminAction(actionId);
      if (res?.success) {
        emitToast("AI Change reverted & previous state restored in MongoDB!", "success");
        broadcastCacheInvalidation();
        await db.revalidateProducts(true).catch(() => {});
        await db.fetchHomeData(true).catch(() => {});
        setPreviewRefreshKey(k => k + 1);
        await loadSessionAndTelemetry(true);
      } else {
        emitToast(res?.message || "Could not undo action.", "error");
      }
    } finally {
      setUndoingId("");
    }
  };

  const handleDeleteActionLog = async (actionId) => {
    const res = await auraAiClient.deleteAdminActionLog(actionId);
    if (res?.success) {
      setActionLogs(prev => prev.filter(a => a.actionId !== actionId));
      emitToast("Action log deleted from MongoDB.", "info");
    }
  };

  const handleQuickCreateProduct = async (e) => {
    e.preventDefault();
    setIsTyping(true);
    try {
      const res = await auraAiClient.executeAdminAgentAction("CREATE_PRODUCT", prodForm);
      if (res?.success && res.result) {
        emitToast(`Product "${res.result.product?.name}" uploaded to MongoDB!`, "success");
        if (res.result.product) {
          db.cacheProduct(res.result.product);
          db.emitStoreUpdate("product:saved", res.result.product);
        }
        broadcastCacheInvalidation();
        await db.revalidateProducts(true).catch(() => {});
        await db.fetchHomeData(true).catch(() => {});
        setShowProductUploader(false);
        setActivePreviewRoute(res.result.previewRoute || "/");
        setActivePreviewTitle(res.result.previewTitle || "New Product Preview");
        setShowSplitPreview(true);
        setPreviewRefreshKey(k => k + 1);
        await loadSessionAndTelemetry(true);
      } else {
        emitToast(res?.message || "Failed to upload product.", "error");
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAddFeature = async (e) => {
    e.preventDefault();
    setIsTyping(true);
    try {
      const res = await auraAiClient.executeAdminAgentAction("ADD_WEBSITE_FEATURE", featForm);
      if (res?.success && res.result) {
        emitToast("New Live Website Feature added & published!", "success");
        setShowFeatureBuilder(false);
        setActivePreviewRoute("/");
        setActivePreviewTitle("Storefront Home (With New Feature)");
        setShowSplitPreview(true);
        setPreviewRefreshKey(k => k + 1);
        await loadSessionAndTelemetry(true);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleRunBugScan = async () => {
    setScanningBugs(true);
    setSubTab("bugs");
    try {
      const res = await auraAiClient.executeAdminAgentAction("SCAN_BUGS", {});
      if (res?.success && res.report) {
        setBugReport(res.report);
        emitToast(`Scan complete: ${res.report.bugsCount} issues detected.`, "info");
      }
    } finally {
      setScanningBugs(false);
    }
  };

  const handleAutoFixBugs = async () => {
    setFixingBugs(true);
    try {
      const res = await auraAiClient.executeAdminAgentAction("AUTO_FIX_BUGS", {});
      if (res?.success) {
        emitToast("All auto-fixable bugs repaired & logged in MongoDB!", "success");
        await handleRunBugScan();
        await loadSessionAndTelemetry(true);
      }
    } finally {
      setFixingBugs(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreatingTask(true);
    try {
      const res = await auraAiClient.createAdminTask(taskForm);
      if (res?.success && res.task) {
        setTasks(prev => [res.task, ...prev]);
        emitToast(`Background task "${res.task.title}" started for ${res.task.durationMinutes} mins!`, "success");
      }
    } finally {
      setCreatingTask(false);
    }
  };

  const handleTaskControl = async (taskId, command, extraData = {}) => {
    const res = await auraAiClient.controlAdminTask(taskId, command, extraData);
    if (res?.success) {
      emitToast(res?.message || `Task ${command} executed.`, "success");
      await loadSessionAndTelemetry(true);
    } else {
      emitToast(res?.message || "Task command failed.", "error");
    }
  };

  const handleSendTaskCommand = async (taskId) => {
    const instruction = (taskCommandInputs[taskId] || "").trim();
    if (!instruction) return;
    await handleTaskControl(taskId, "send_command", { instruction });
    setTaskCommandInputs(prev => ({ ...prev, [taskId]: "" }));
  };

  const handleDeleteTask = async (taskId) => {
    const res = await auraAiClient.deleteAdminTask(taskId);
    if (res?.success) {
      setTasks(prev => prev.filter(t => t.taskId !== taskId));
      emitToast("Background task deleted from MongoDB.", "info");
    }
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/admin");
    }
  };

  const runningTasksCount = tasks.filter(t => t.status === "running").length;
  const activeChangesCount = actionLogs.filter(a => !a.reverted).length;
  const mongoOk = vaultData?.mongodb?.connected !== false;

  return (
    <div
      className="admin-ai-agent-command-center"
      style={{
        display: "flex",
        flexDirection: "column",
        height: compact ? "620px" : "calc(100vh - 170px)",
        minHeight: compact ? "540px" : "680px",
        background: "#ffffff",
        border: "1px solid #e5d5c3",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 8px 30px rgba(43, 23, 13, 0.08)"
      }}
    >
      <style>{`
        .admin-ai-agent-command-center {
          --chat-header-bg: linear-gradient(135deg, #2b1409 0%, #5c220e 60%, #7c2d12 100%);
        }
        @media (max-width: 768px) {
          .admin-ai-agent-command-center {
            height: calc(100dvh - 110px) !important;
            min-height: 560px !important;
            max-height: none !important;
            border-radius: 10px !important;
            margin: 0 !important;
          }
          .admin-agent-header-row {
            padding: 8px 10px !important;
            gap: 6px !important;
          }
          .admin-agent-title-text {
            font-size: 13.5px !important;
          }
          .admin-agent-subtitle-text {
            display: none !important;
          }
          .admin-agent-subtabs-row {
            padding: 6px 8px !important;
            gap: 6px !important;
          }
          .admin-agent-subtab-btn {
            padding: 6px 10px !important;
            font-size: 11px !important;
            flex-shrink: 0 !important;
          }
          .admin-agent-toolbar-row {
            padding: 6px 8px !important;
            gap: 5px !important;
          }
          .admin-agent-tool-btn {
            padding: 5px 9px !important;
            font-size: 11px !important;
            flex-shrink: 0 !important;
          }
          .admin-agent-msg-stream {
            padding: 10px !important;
            gap: 10px !important;
          }
          .admin-agent-msg-bubble {
            max-width: 96% !important;
            padding: 10px 12px !important;
            font-size: 13.5px !important;
            line-height: 1.5 !important;
          }
          .admin-agent-input-form {
            padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px)) !important;
            gap: 6px !important;
          }
          .admin-agent-input-field {
            height: 44px !important;
            font-size: 15px !important;
            padding: 8px 12px !important;
          }
          .admin-agent-send-btn {
            height: 44px !important;
            min-width: 44px !important;
            padding: 0 14px !important;
          }
          .admin-agent-prompt-chips {
            padding: 6px 8px !important;
            gap: 5px !important;
          }
          .admin-agent-prompt-chip {
            padding: 4px 9px !important;
            font-size: 11px !important;
          }
        }
      `}</style>

      {/* TOP COMMAND HEADER */}
      <div
        className="admin-agent-header-row"
        style={{
          padding: "10px 14px",
          background: "linear-gradient(135deg, #2b1409 0%, #5c220e 60%, #7c2d12 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexShrink: 1 }}>
          {/* Back button that navigates to the previous page */}
          <button
            type="button"
            onClick={handleBack}
            className="admin-agent-back-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 10px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              background: "rgba(255, 255, 255, 0.16)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              cursor: "pointer",
              flexShrink: 0
            }}
            title="Go back to previous page"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#1c0d06",
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              boxShadow: "0 2px 10px rgba(245, 158, 11, 0.4)",
              flexShrink: 0
            }}
          >
            <Sparkles size={16} />
          </div>

          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <h3 className="admin-agent-title-text" style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#fffbeb", whiteSpace: "nowrap" }}>
                Aura AI Admin Agent
              </h3>
              <span
                style={{
                  fontSize: "9.5px",
                  background: "rgba(245, 158, 11, 0.22)",
                  color: "#fde68a",
                  border: "1px solid rgba(245, 158, 11, 0.45)",
                  padding: "2px 6px",
                  borderRadius: "999px",
                  fontWeight: 700,
                  whiteSpace: "nowrap"
                }}
              >
                NVIDIA NIM 120B
              </span>
            </div>
            <div className="admin-agent-subtitle-text" style={{ fontSize: "10.5px", color: "#fed7aa", opacity: 0.88, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Full Website & MongoDB Control • Background Tasks • 1-Click Undo
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {/* MongoDB Status Pill */}
          <button
            type="button"
            onClick={() => {
              setSubTab("vault");
              loadSessionAndTelemetry();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 9px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              background: mongoOk ? "rgba(22, 163, 74, 0.28)" : "rgba(234, 88, 12, 0.28)",
              color: mongoOk ? "#86efac" : "#fdba74",
              border: `1px solid ${mongoOk ? "rgba(134, 239, 172, 0.45)" : "rgba(253, 186, 116, 0.45)"}`,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
            title="Inspect MongoDB Connection & Saved AI Data"
          >
            <Database size={12} />
            {mongoOk ? "MongoDB Live" : "Syncing"}
          </button>

          {/* Toggle Split Live Preview (Desktop only) */}
          {!compact && (
            <button
              type="button"
              className="hidden md:inline-flex"
              onClick={() => {
                if (!activePreviewRoute) setActivePreviewRoute("/");
                setShowSplitPreview(v => !v);
              }}
              style={{
                alignItems: "center",
                gap: "4px",
                padding: "5px 9px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 700,
                background: showSplitPreview ? "#f59e0b" : "rgba(255,255,255,0.14)",
                color: showSplitPreview ? "#1c0d06" : "#fff",
                border: "1px solid rgba(255,255,255,0.25)",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              <Eye size={12} /> {showSplitPreview ? "Hide Preview" : "Live Preview"}
            </button>
          )}

          <button
            type="button"
            onClick={handleResetChat}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 9px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: 600,
              background: "rgba(255,255,255,0.12)",
              color: "#fecaca",
              border: "1px solid rgba(254, 202, 202, 0.25)",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
            title="Clear current chat in MongoDB"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>

      {/* SUB-NAVIGATION BAR */}
      <div
        className="admin-agent-subtabs-row"
        style={{
          display: "flex",
          gap: "4px",
          padding: "6px 12px",
          background: "#faf5ef",
          borderBottom: "1px solid #eadecd",
          overflowX: "auto",
          whiteSpace: "nowrap"
        }}
      >
        <button
          type="button"
          onClick={() => setSubTab("chat")}
          className="admin-agent-subtab-btn"
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            border: "none",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            background: subTab === "chat" ? "#7c2d12" : "transparent",
            color: subTab === "chat" ? "#fff" : "#5c3a21",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <Sparkles size={13} /> Agent Chat & Live Preview
        </button>

        <button
          type="button"
          onClick={() => setSubTab("tasks")}
          className="admin-agent-subtab-btn"
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            border: "none",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            background: subTab === "tasks" ? "#7c2d12" : "transparent",
            color: subTab === "tasks" ? "#fff" : "#5c3a21",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <Clock size={13} /> Background Tasks ({runningTasksCount} Active)
        </button>

        <button
          type="button"
          onClick={() => setSubTab("actions")}
          className="admin-agent-subtab-btn"
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            border: "none",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            background: subTab === "actions" ? "#7c2d12" : "transparent",
            color: subTab === "actions" ? "#fff" : "#5c3a21",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <Undo2 size={13} /> AI Changes & Undo ({activeChangesCount})
        </button>

        <button
          type="button"
          onClick={handleRunBugScan}
          className="admin-agent-subtab-btn"
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            border: "none",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            background: subTab === "bugs" ? "#7c2d12" : "transparent",
            color: subTab === "bugs" ? "#fff" : "#5c3a21",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <Bug size={13} /> Website Bug Scanner
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab("vault");
            loadSessionAndTelemetry();
          }}
          className="admin-agent-subtab-btn"
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            border: "none",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            background: subTab === "vault" ? "#7c2d12" : "transparent",
            color: subTab === "vault" ? "#fff" : "#5c3a21",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <Database size={13} /> Private AI Work & MongoDB Vault
        </button>
      </div>

      {/* MAIN BODY AREA */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* ===============================================================
            TAB 1: AGENT CHAT & INLINE / SPLIT LIVE PREVIEW
            =============================================================== */}
        {subTab === "chat" && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Left/Main Chat Column */}
            <div
              style={{
                flex: showSplitPreview ? "1 1 52%" : "1 1 100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderRight: showSplitPreview ? "1px solid #eadecd" : "none"
              }}
            >
              {/* Action Toolbar inside Chat */}
              <div
                className="admin-agent-toolbar-row"
                style={{
                  padding: "7px 12px",
                  background: "#fffcf8",
                  borderBottom: "1px solid #f0e4d7",
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  whiteSpace: "nowrap"
                }}
              >
                <button
                  type="button"
                  className="admin-agent-tool-btn"
                  onClick={() => {
                    setShowProductUploader(v => !v);
                    setShowFeatureBuilder(false);
                    setShowPagePicker(false);
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "8px",
                    border: "1px solid #d97706",
                    background: showProductUploader ? "#7c2d12" : "#fffbeb",
                    color: showProductUploader ? "#fff" : "#92400e",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Package size={13} /> + Upload Product Listing
                </button>

                <button
                  type="button"
                  className="admin-agent-tool-btn"
                  onClick={() => {
                    setShowFeatureBuilder(v => !v);
                    setShowProductUploader(false);
                    setShowPagePicker(false);
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "8px",
                    border: "1px solid #d97706",
                    background: showFeatureBuilder ? "#7c2d12" : "#fffbeb",
                    color: showFeatureBuilder ? "#fff" : "#92400e",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Wand2 size={13} /> + Add Website Feature
                </button>

                <button
                  type="button"
                  className="admin-agent-tool-btn"
                  onClick={() => {
                    setShowPagePicker(v => !v);
                    setShowProductUploader(false);
                    setShowFeatureBuilder(false);
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: showPagePicker ? "#7c2d12" : "#ffffff",
                    color: showPagePicker ? "#fff" : "#334155",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Layers size={13} /> Show Any Page in Chat ({pagesDirectory.length || 21})
                </button>

                <button
                  type="button"
                  className="admin-agent-tool-btn"
                  onClick={() => handleSend("Website aur MongoDB ke sabhi bugs scan karo aur report do")}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "8px",
                    border: "1px solid #fca5a5",
                    background: "#fef2f2",
                    color: "#991b1b",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Bug size={13} /> Check Website Bugs
                </button>

                {activeChangesCount > 0 && (
                  <button
                    type="button"
                    className="admin-agent-tool-btn"
                    onClick={() => {
                      const latest = actionLogs.find(a => !a.reverted);
                      if (latest) handleUndoAction(latest.actionId);
                    }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "8px",
                      border: "1px solid #fde047",
                      background: "#fefce8",
                      color: "#854d0e",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Undo2 size={13} /> Undo Last AI Change
                  </button>
                )}
              </div>

              {/* DRAWER 1: QUICK PRODUCT UPLOAD & AI LISTING */}
              {showProductUploader && (
                <form
                  onSubmit={handleQuickCreateProduct}
                  style={{
                    padding: "12px 14px",
                    background: "#fffbeb",
                    borderBottom: "2px solid #f59e0b",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "13px", color: "#78350f" }}>
                      📦 Direct Product Upload to MongoDB (With Auto Vedic SEO & Live Preview)
                    </strong>
                    <button
                      type="button"
                      onClick={() => setShowProductUploader(false)}
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
                    <input
                      type="text"
                      required
                      placeholder="Product Name (e.g. 11 Mukhi Nepali Rudraksha)"
                      value={prodForm.name}
                      onChange={e => setProdForm({ ...prodForm, name: e.target.value })}
                      style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "12px" }}
                    />
                    <input
                      type="number"
                      required
                      placeholder="Price (₹)"
                      value={prodForm.price}
                      onChange={e => setProdForm({ ...prodForm, price: e.target.value })}
                      style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "12px" }}
                    />
                    <input
                      type="number"
                      placeholder="Stock Quantity"
                      value={prodForm.stock}
                      onChange={e => setProdForm({ ...prodForm, stock: e.target.value })}
                      style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "12px" }}
                    />
                    <input
                      type="text"
                      placeholder="Image URL (/images/product-5mukhi.jpg)"
                      value={prodForm.image}
                      onChange={e => setProdForm({ ...prodForm, image: e.target.value })}
                      style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "12px" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Optional description (Leave blank for AI Vedic auto-generation)"
                      value={prodForm.description}
                      onChange={e => setProdForm({ ...prodForm, description: e.target.value })}
                      style={{ flex: 1, padding: "7px 10px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "12px" }}
                    />
                    <button
                      type="submit"
                      disabled={isTyping}
                      style={{
                        padding: "7px 16px",
                        background: "#7c2d12",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Publish & Preview Live
                    </button>
                  </div>
                </form>
              )}

              {/* DRAWER 2: ADD NEW LIVE WEBSITE FEATURE */}
              {showFeatureBuilder && (
                <form
                  onSubmit={handleQuickAddFeature}
                  style={{
                    padding: "12px 14px",
                    background: "#f0fdf4",
                    borderBottom: "2px solid #22c55e",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "13px", color: "#14532d" }}>
                      ✨ Add Live Feature / Banner to Customer Website (With 1-Click Undo)
                    </strong>
                    <button
                      type="button"
                      onClick={() => setShowFeatureBuilder(false)}
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                    <input
                      type="text"
                      required
                      placeholder="Feature Headline / Offer Text"
                      value={featForm.title}
                      onChange={e => setFeatForm({ ...featForm, title: e.target.value })}
                      style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #16a34a", fontSize: "12px" }}
                    />
                    <input
                      type="text"
                      placeholder="Subtitle (e.g. Lab Certified • Free Shipping)"
                      value={featForm.subtitle}
                      onChange={e => setFeatForm({ ...featForm, subtitle: e.target.value })}
                      style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #16a34a", fontSize: "12px" }}
                    />
                    <input
                      type="text"
                      placeholder="CTA Link (/shop)"
                      value={featForm.ctaLink}
                      onChange={e => setFeatForm({ ...featForm, ctaLink: e.target.value })}
                      style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #16a34a", fontSize: "12px" }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      style={{
                        padding: "7px 16px",
                        background: "#15803d",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Publish Feature to Live Website
                    </button>
                  </div>
                </form>
              )}

              {/* DRAWER 3: ALL WEBSITE & ADMIN PAGES PICKER (SHOW IN CHAT) */}
              {showPagePicker && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#f8fafc",
                    borderBottom: "2px solid #cbd5e1",
                    maxHeight: "170px",
                    overflowY: "auto"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "12px", color: "#1e293b" }}>
                      🖥️ Click any Storefront or Admin Page to view & control it right inside Chat:
                    </strong>
                    <button
                      type="button"
                      onClick={() => setShowPagePicker(false)}
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {(pagesDirectory.length > 0
                      ? pagesDirectory
                      : [
                          { title: "Home Page", route: "/" },
                          { title: "Shop Catalog", route: "/shop" },
                          { title: "Categories", route: "/categories" },
                          { title: "Rashi Calculator", route: "/rudraksha-calculator" },
                          { title: "Cart", route: "/cart" },
                          { title: "Admin Overview", route: "/admin" },
                          { title: "Admin Products", route: "/admin/products" },
                          { title: "Admin Orders", route: "/admin/orders" },
                          { title: "Admin Coupons", route: "/admin/coupons" },
                          { title: "Admin Banners", route: "/admin/banners" },
                          { title: "Admin Settings", route: "/admin/settings" }
                        ]
                    ).map((pg, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActivePreviewRoute(pg.route);
                          setActivePreviewTitle(pg.title);
                          setShowSplitPreview(true);
                          setShowPagePicker(false);
                          setMessages(prev => [
                            ...prev,
                            {
                              id: "amsg_pg_" + Date.now(),
                              sender: "ai",
                              text: `🖥️ **Opened Live Page in Chat:** **${pg.title}** (\`${pg.route}\`)\nAap niche ya side panel mein is page ka real-time interactive preview dekh sakte hain.`,
                              previewRoute: pg.route,
                              previewTitle: pg.title,
                              timestamp: new Date().toISOString()
                            }
                          ]);
                        }}
                        style={{
                          padding: "4px 10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          color: "#1e293b",
                          cursor: "pointer"
                        }}
                      >
                        {pg.title} ({pg.route})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CHAT MESSAGES STREAM */}
              <div
                ref={scrollRef}
                className="admin-agent-msg-stream"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  background: "#fcfbf9"
                }}
              >
                {messages.map((m, i) => (
                  <div
                    key={m.id || i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: m.sender === "user" ? "flex-end" : "flex-start"
                    }}
                  >
                    <div
                      className="admin-agent-msg-bubble"
                      style={{
                        maxWidth: "92%",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        background: m.sender === "user" ? "#7c2d12" : "#ffffff",
                        color: m.sender === "user" ? "#fff" : "#2b170d",
                        fontSize: "13.5px",
                        lineHeight: "1.6",
                        boxShadow:
                          m.sender === "user"
                            ? "0 2px 8px rgba(124,45,18,0.18)"
                            : "0 1px 4px rgba(43,23,13,0.06)",
                        border: m.sender === "ai" ? "1px solid #ebd9c8" : "none"
                      }}
                    >
                      {m.sender === "user" ? (
                        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontWeight: 500 }}>
                          {m.text || m.content}
                        </div>
                      ) : (
                        <>
                          <AuraAIMessageContent text={m.text || m.content} />

                          {/* Executed Actions Badges + Instant Undo Buttons */}
                          {Array.isArray(m.actionsExecuted) && m.actionsExecuted.length > 0 && (
                            <div
                              style={{
                                marginTop: "10px",
                                padding: "10px",
                                background: "#fffbeb",
                                border: "1px solid #fde68a",
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px"
                              }}
                            >
                              <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#92400e" }}>
                                ⚡ AI Actions Executed on MongoDB:
                              </div>
                              {m.actionsExecuted.map((act, ai) => (
                                <div
                                  key={ai}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "8px",
                                    background: "#fff",
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #fcd34d",
                                    fontSize: "12px"
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: "#451a03" }}>✓ {act.title}</span>
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    {act.previewRoute && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActivePreviewRoute(act.previewRoute);
                                          setActivePreviewTitle(act.previewTitle || act.title);
                                          setShowSplitPreview(true);
                                        }}
                                        style={{
                                          padding: "3px 8px",
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          background: "#eff6ff",
                                          color: "#1d4ed8",
                                          border: "1px solid #bfdbfe",
                                          borderRadius: "5px",
                                          cursor: "pointer"
                                        }}
                                      >
                                        Preview
                                      </button>
                                    )}
                                    {act.actionId && act.actionType !== "SHOW_PAGE" && (
                                      <button
                                        type="button"
                                        onClick={() => handleUndoAction(act.actionId)}
                                        disabled={undoingId === act.actionId}
                                        style={{
                                          padding: "3px 8px",
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          background: "#fef2f2",
                                          color: "#991b1b",
                                          border: "1px solid #fecaca",
                                          borderRadius: "5px",
                                          cursor: "pointer"
                                        }}
                                      >
                                        ↩️ Undo Change
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* INLINE LIVE WEBSITE PREVIEW CARD INSIDE CHAT BUBBLE */}
                          {m.previewRoute && (
                            <div
                              style={{
                                marginTop: "12px",
                                border: "1px solid #d97706",
                                borderRadius: "10px",
                                overflow: "hidden",
                                background: "#fff"
                              }}
                            >
                              <div
                                style={{
                                  padding: "7px 12px",
                                  background: "linear-gradient(90deg, #431407, #7c2d12)",
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  fontSize: "11.5px",
                                  fontWeight: 700
                                }}
                              >
                                <span>
                                  🖥️ {m.previewTitle || "Live Website Preview"} ({m.previewRoute})
                                </span>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActivePreviewRoute(m.previewRoute);
                                      setActivePreviewTitle(m.previewTitle || "Live Preview");
                                      setShowSplitPreview(true);
                                    }}
                                    style={{
                                      background: "#f59e0b",
                                      color: "#1c0d06",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "2px 8px",
                                      fontSize: "10.5px",
                                      fontWeight: 800,
                                      cursor: "pointer"
                                    }}
                                  >
                                    Expand Split View
                                  </button>
                                  <a
                                    href={m.previewRoute}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      color: "#fde68a",
                                      textDecoration: "none",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px"
                                    }}
                                  >
                                    Open <ExternalLink size={11} />
                                  </a>
                                </div>
                              </div>
                              <iframe
                                key={`${m.previewRoute}_${previewRefreshKey}`}
                                src={m.previewRoute}
                                title={m.previewTitle || "Inline Live Preview"}
                                style={{
                                  width: "100%",
                                  height: "310px",
                                  border: "none",
                                  background: "#fff"
                                }}
                              />
                            </div>
                          )}

                          {/* Bottom Message Meta Bar (Voice + Model + Delete from MongoDB) */}
                          <div
                            style={{
                              marginTop: "8px",
                              paddingTop: "6px",
                              borderTop: "1px dashed #f0e4d7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                              flexWrap: "wrap"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <VoiceReader text={m.text || m.content} />
                              <span style={{ fontSize: "10px", color: "#9a7b6c", fontWeight: 600 }}>
                                {m.modelUsed || "nvidia/nemotron-3-super-120b-a12b"}
                              </span>
                            </div>
                            {m.id && m.id !== "amsg_welcome" && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(m.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#b91c1c",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  opacity: 0.75
                                }}
                                title="Delete message from MongoDB"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div
                    style={{
                      alignSelf: "flex-start",
                      background: "#ffffff",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      border: "1px solid #ebd9c8",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      color: "#7c2d12",
                      fontSize: "13px"
                    }}
                  >
                    <Loader2 size={16} className="spin" />
                    <span style={{ fontWeight: 700 }}>
                      NVIDIA NIM Agent is executing command & syncing with MongoDB (Continues even if tab closes)...
                    </span>
                  </div>
                )}

                {lastFailedMessage && !isTyping && (
                  <button
                    type="button"
                    onClick={() => handleSend(lastFailedMessage)}
                    style={{
                      alignSelf: "flex-start",
                      padding: "6px 14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#991b1b",
                      background: "#fee2e2",
                      border: "1px solid #fca5a5",
                      borderRadius: "8px",
                      cursor: "pointer"
                    }}
                  >
                    <RotateCcw size={13} /> Retry Command
                  </button>
                )}
              </div>

              {/* ONE-TAP AUTONOMOUS PROMPT CHIPS */}
              <div
                className="admin-agent-prompt-chips"
                style={{
                  padding: "7px 12px",
                  background: "#faf7f2",
                  borderTop: "1px solid #eadecd",
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  whiteSpace: "nowrap"
                }}
              >
                <button
                  type="button"
                  className="admin-agent-prompt-chip"
                  disabled={isTyping}
                  onClick={() =>
                    handleSend(
                      "Ek naya 11 Mukhi Authentic Nepali Rudraksha product listing bnao price 4999 stock 25 ke sath aur live preview dikhao"
                    )
                  }
                  style={{
                    padding: "5px 11px",
                    fontSize: "11.5px",
                    background: "#fff",
                    border: "1px solid #dcd1c6",
                    borderRadius: "14px",
                    color: "#7a320c",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  📦 Auto-Create 11 Mukhi Product
                </button>
                <button
                  type="button"
                  className="admin-agent-prompt-chip"
                  disabled={isTyping}
                  onClick={() =>
                    handleSend(
                      "Website ke home page par ek naya Sacred Flash Sale 20% OFF feature banner add karo aur live preview dikhao"
                    )
                  }
                  style={{
                    padding: "5px 11px",
                    fontSize: "11.5px",
                    background: "#fff",
                    border: "1px solid #dcd1c6",
                    borderRadius: "14px",
                    color: "#7a320c",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  ✨ Add New Website Feature
                </button>
                <button
                  type="button"
                  className="admin-agent-prompt-chip"
                  disabled={isTyping}
                  onClick={() => handleSend("Home page aur Shop page ka live preview chat me dikhao")}
                  style={{
                    padding: "5px 11px",
                    fontSize: "11.5px",
                    background: "#fff",
                    border: "1px solid #dcd1c6",
                    borderRadius: "14px",
                    color: "#7a320c",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  🖥️ Show Live Store Preview
                </button>
                <button
                  type="button"
                  className="admin-agent-prompt-chip"
                  disabled={isTyping}
                  onClick={() => handleSend("Puri website aur MongoDB ke bugs check karo aur auto-fix karo")}
                  style={{
                    padding: "5px 11px",
                    fontSize: "11.5px",
                    background: "#fff",
                    border: "1px solid #dcd1c6",
                    borderRadius: "14px",
                    color: "#7a320c",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  🐛 Scan & Fix Website Bugs
                </button>
                <button
                  type="button"
                  className="admin-agent-prompt-chip"
                  disabled={isTyping}
                  onClick={() =>
                    handleSend(
                      "60 minute ke liye ek autonomous background task chalo jo catalog SEO aur inventory monitor kare"
                    )
                  }
                  style={{
                    padding: "5px 11px",
                    fontSize: "11.5px",
                    background: "#fff",
                    border: "1px solid #dcd1c6",
                    borderRadius: "14px",
                    color: "#7a320c",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  ⏱️ Start 60m Background Task
                </button>
              </div>

              {/* CHAT INPUT FORM */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSend();
                }}
                className="admin-agent-input-form"
                style={{
                  padding: "10px 12px",
                  background: "#fff",
                  borderTop: "1px solid #eadecd",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center"
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Command Aura AI: '11 Mukhi product bnao', 'Home page dikhao', 'Feature add karo', 'Undo', 'Bug check karo'..."
                  className="admin-agent-input-field"
                  style={{
                    flex: 1,
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: "1px solid #c2b4a5",
                    fontSize: "13.5px",
                    outline: "none",
                    color: "#2b170d",
                    fontWeight: 500
                  }}
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="admin-agent-send-btn"
                  style={{
                    background: input.trim() && !isTyping ? "#7c2d12" : "#cbd5e1",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0 18px",
                    height: "42px",
                    fontWeight: 700,
                    cursor: input.trim() && !isTyping ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {isTyping ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                  <span>Execute</span>
                </button>
              </form>
            </div>

            {/* Right Split-Screen Live Interactive Website Preview */}
            {showSplitPreview && (
              <div
                style={{
                  flex: "1 1 48%",
                  display: "flex",
                  flexDirection: "column",
                  background: "#f1f5f9",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#1e293b",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    flexWrap: "wrap"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#fde68a" }}>
                      🖥️ {activePreviewTitle}
                    </span>
                    <select
                      value={activePreviewRoute || "/"}
                      onChange={e => {
                        setActivePreviewRoute(e.target.value);
                        setActivePreviewTitle(`Page: ${e.target.value}`);
                      }}
                      style={{
                        background: "#334155",
                        color: "#fff",
                        border: "1px solid #475569",
                        borderRadius: "5px",
                        padding: "3px 6px",
                        fontSize: "11px"
                      }}
                    >
                      {(pagesDirectory.length > 0
                        ? pagesDirectory
                        : [
                            { title: "Home (/)", route: "/" },
                            { title: "Shop (/shop)", route: "/shop" },
                            { title: "Admin Products", route: "/admin/products" },
                            { title: "Admin Orders", route: "/admin/orders" }
                          ]
                      ).map((p, idx) => (
                        <option key={idx} value={p.route}>
                          {p.title} ({p.route})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("desktop")}
                      style={{
                        background: previewViewport === "desktop" ? "#f59e0b" : "#334155",
                        color: previewViewport === "desktop" ? "#000" : "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 7px",
                        cursor: "pointer"
                      }}
                      title="Desktop View"
                    >
                      <Monitor size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("mobile")}
                      style={{
                        background: previewViewport === "mobile" ? "#f59e0b" : "#334155",
                        color: previewViewport === "mobile" ? "#000" : "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 7px",
                        cursor: "pointer"
                      }}
                      title="Mobile View"
                    >
                      <Smartphone size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewRefreshKey(k => k + 1)}
                      style={{
                        background: "#334155",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 7px",
                        cursor: "pointer"
                      }}
                      title="Reload Live Preview"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSplitPreview(false)}
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 7px",
                        cursor: "pointer"
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "stretch",
                    padding: previewViewport === "mobile" ? "12px" : "0",
                    background: "#cbd5e1",
                    overflow: "hidden"
                  }}
                >
                  <iframe
                    key={`${activePreviewRoute || "/"}_${previewRefreshKey}`}
                    src={activePreviewRoute || "/"}
                    title="Split Screen Live Website Preview"
                    style={{
                      width: previewViewport === "mobile" ? "375px" : "100%",
                      height: "100%",
                      border: previewViewport === "mobile" ? "8px solid #1e293b" : "none",
                      borderRadius: previewViewport === "mobile" ? "24px" : "0",
                      background: "#fff"
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===============================================================
            TAB 2: AUTONOMOUS BACKGROUND TASKS (WORKS EVEN WHEN WEBSITE CLOSED)
            =============================================================== */}
        {subTab === "tasks" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#fcfbf9" }}>
            <div
              style={{
                background: "#fff",
                border: "1px solid #eadecd",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "16px"
              }}
            >
              <h4 style={{ margin: "0 0 6px 0", color: "#7c2d12", fontSize: "15px" }}>
                ⏱️ Assign Autonomous Background Task (Continues Running After Website is Closed)
              </h4>
              <p style={{ margin: "0 0 12px 0", fontSize: "12.5px", color: "#6b5748" }}>
                Yahan se AI Agent ko koi bhi task aur time duration dein. Website band karne ke baad bhi server par AI Agent lagatar kaam karega aur har cycle ka result MongoDB mein save karega.
              </p>

              <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#4b3621", display: "block", marginBottom: "4px" }}>
                      Task Name
                    </label>
                    <input
                      type="text"
                      required
                      value={taskForm.title}
                      onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbb8a5", fontSize: "12.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#4b3621", display: "block", marginBottom: "4px" }}>
                      Kitne Time Chlana Hai (Total Duration)
                    </label>
                    <select
                      value={taskForm.durationMinutes}
                      onChange={e => setTaskForm({ ...taskForm, durationMinutes: Number(e.target.value) })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbb8a5", fontSize: "12.5px" }}
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={60}>1 Hour (60 Mins)</option>
                      <option value={180}>3 Hours</option>
                      <option value={360}>6 Hours</option>
                      <option value={720}>12 Hours</option>
                      <option value={1440}>24 Hours (1 Full Day)</option>
                      <option value={10080}>7 Days Continuous</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#4b3621", display: "block", marginBottom: "4px" }}>
                      Cycle Frequency (Interval)
                    </label>
                    <select
                      value={taskForm.intervalMinutes}
                      onChange={e => setTaskForm({ ...taskForm, intervalMinutes: Number(e.target.value) })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbb8a5", fontSize: "12.5px" }}
                    >
                      <option value={1}>Every 1 Minute</option>
                      <option value={5}>Every 5 Minutes</option>
                      <option value={15}>Every 15 Minutes</option>
                      <option value={30}>Every 30 Minutes</option>
                      <option value={60}>Every 1 Hour</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#4b3621", display: "block", marginBottom: "4px" }}>
                    AI Instructions / Command for Background Execution
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={taskForm.prompt}
                    onChange={e => setTaskForm({ ...taskForm, prompt: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbb8a5", fontSize: "12.5px" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={creatingTask}
                    style={{
                      padding: "9px 18px",
                      background: "#7c2d12",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {creatingTask ? "Starting Task..." : "🚀 Start Background Task in MongoDB"}
                  </button>
                </div>
              </form>
            </div>

            {/* Active & Past Tasks List */}
            <h4 style={{ margin: "0 0 10px 0", color: "#2b170d", fontSize: "14px" }}>
              Active & Saved Background Tasks in MongoDB ({tasks.length})
            </h4>
            {tasks.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", background: "#fff", borderRadius: "10px", border: "1px solid #eadecd", color: "#7a6a5e" }}>
                Abhi koi background task nahi chal raha hai. Upar form se task start karein!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {tasks.map(t => {
                  const taskActions = actionLogs.filter(a => a.taskId === t.taskId);
                  const isRunning = t.status === "running";

                  return (
                    <div
                      key={t.taskId}
                      style={{
                        background: "#fff",
                        border: isRunning ? "1px solid #86efac" : "1px solid #e2d2c1",
                        borderRadius: "10px",
                        padding: "14px",
                        boxShadow: isRunning ? "0 2px 8px rgba(34, 197, 94, 0.08)" : "none"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ fontSize: "14px", color: "#2b170d" }}>{t.title}</strong>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "999px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: isRunning ? "#dcfce7" : "#f1f5f9",
                                color: isRunning ? "#15803d" : "#475569",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: isRunning ? "#22c55e" : "#94a3b8",
                                  display: "inline-block"
                                }}
                              />
                              {String(t.status || "").toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b5748", marginTop: "4px" }}>
                            <strong>Active Command:</strong> {t.prompt}
                          </div>
                          <div style={{ fontSize: "11px", color: "#9a7b6c", marginTop: "4px" }}>
                            Duration: <strong>{t.durationMinutes} mins</strong> • Interval: Every{" "}
                            <strong>{t.intervalMinutes} mins</strong> • Cycles Completed:{" "}
                            <strong>{t.runsCount || 0}</strong> • Next Cycle:{" "}
                            {t.nextRunAt ? new Date(t.nextRunAt).toLocaleTimeString() : "Immediate"} • Expires:{" "}
                            {t.expiresAt ? new Date(t.expiresAt).toLocaleTimeString() : "N/A"}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleTaskControl(t.taskId, "run_now")}
                            style={{
                              padding: "5px 10px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              borderRadius: "6px",
                              cursor: "pointer"
                            }}
                          >
                            ⚡ Run Cycle Now
                          </button>
                          {isRunning ? (
                            <button
                              type="button"
                              onClick={() => handleTaskControl(t.taskId, "pause")}
                              style={{
                                padding: "5px 10px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: "#fef9c3",
                                color: "#854d0e",
                                border: "1px solid #fde047",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <Pause size={11} /> Pause
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTaskControl(t.taskId, "resume")}
                              style={{
                                padding: "5px 10px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: "#dcfce7",
                                color: "#15803d",
                                border: "1px solid #86efac",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <Play size={11} /> Resume
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.taskId)}
                            style={{
                              padding: "5px 10px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: "#fef2f2",
                              color: "#991b1b",
                              border: "1px solid #fecaca",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </div>

                      {/* 1. Send Live Command / Instruction to this Task */}
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "8px 10px",
                          background: "#f8fafc",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          gap: "8px",
                          alignItems: "center"
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Send instruction to running task (e.g. 'Ab stock check karo aur 5 Mukhi ko update karo')..."
                          value={taskCommandInputs[t.taskId] || ""}
                          onChange={e => setTaskCommandInputs({ ...taskCommandInputs, [t.taskId]: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSendTaskCommand(t.taskId);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: "6px 10px",
                            fontSize: "12px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            outline: "none"
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSendTaskCommand(t.taskId)}
                          disabled={!taskCommandInputs[t.taskId]?.trim()}
                          style={{
                            padding: "6px 12px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            background: taskCommandInputs[t.taskId]?.trim() ? "#7c2d12" : "#cbd5e1",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: taskCommandInputs[t.taskId]?.trim() ? "pointer" : "not-allowed",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Send size={11} /> Send Command
                        </button>
                      </div>

                      {/* 2. Changes Made by this Specific Task with 1-Click Undo */}
                      {taskActions.length > 0 && (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "10px",
                            background: "#fffbeb",
                            borderRadius: "8px",
                            border: "1px solid #fde68a"
                          }}
                        >
                          <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#92400e", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>🔄 Changes Made by this Task in MongoDB ({taskActions.length}):</span>
                            <span style={{ fontSize: "10.5px", color: "#b45309" }}>1-Click Rollback Supported</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {taskActions.map(act => (
                              <div
                                key={act.actionId}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  background: "#fff",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #fef3c7",
                                  fontSize: "11.5px",
                                  gap: "8px",
                                  flexWrap: "wrap"
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: 700, color: act.reverted ? "#94a3b8" : "#7c2d12", textDecoration: act.reverted ? "line-through" : "none" }}>
                                    {act.title}
                                  </span>
                                  <span style={{ color: "#78716c", marginLeft: "6px", fontSize: "10.5px" }}>
                                    [{new Date(act.timestamp).toLocaleTimeString()}]
                                  </span>
                                  {act.reverted && (
                                    <span style={{ marginLeft: "6px", color: "#dc2626", fontWeight: 700, fontSize: "10px" }}>
                                      [REVERTED]
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  {act.previewRoute && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActivePreviewRoute(act.previewRoute);
                                        setActivePreviewTitle(`Preview: ${act.title}`);
                                        setShowSplitPreview(true);
                                      }}
                                      style={{
                                        background: "#f1f5f9",
                                        color: "#334155",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "4px",
                                        padding: "3px 8px",
                                        fontSize: "10.5px",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px"
                                      }}
                                    >
                                      <Eye size={10} /> View
                                    </button>
                                  )}
                                  {!act.reverted && (
                                    <button
                                      type="button"
                                      onClick={() => handleUndoAction(act.actionId)}
                                      disabled={undoingId === act.actionId}
                                      style={{
                                        background: "#fee2e2",
                                        color: "#b91c1c",
                                        border: "1px solid #fca5a5",
                                        borderRadius: "4px",
                                        padding: "3px 8px",
                                        fontSize: "10.5px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px"
                                      }}
                                    >
                                      <Undo2 size={10} /> {undoingId === act.actionId ? "Reverting..." : "Revert Change"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Recent Execution Logs of this Task */}
                      {Array.isArray(t.logs) && t.logs.length > 0 && (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "10px",
                            background: "#f8fafc",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            maxHeight: "160px",
                            overflowY: "auto"
                          }}
                        >
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                            Live Execution History ({t.logs.length} cycle entries):
                          </div>
                          {t.logs.slice(0, 6).map((lg, idx) => (
                            <div
                              key={idx}
                              style={{
                                fontSize: "11.5px",
                                padding: "6px 0",
                                borderBottom: idx < t.logs.length - 1 ? "1px dashed #cbd5e1" : "none"
                              }}
                            >
                              <span style={{ color: "#64748b", fontSize: "10.5px" }}>
                                [{new Date(lg.timestamp).toLocaleTimeString()}]
                              </span>{" "}
                              <strong style={{ color: "#0f172a" }}>{lg.summary}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===============================================================
            TAB 3: AI CHANGES & 1-CLICK UNDO / ROLLBACK
            =============================================================== */}
        {subTab === "actions" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#fcfbf9" }}>
            <div style={{ marginBottom: "12px" }}>
              <h4 style={{ margin: 0, color: "#7c2d12", fontSize: "15px" }}>
                ↩️ AI Changes & Rollback Manager (Every Mutation Logged in MongoDB)
              </h4>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b5748" }}>
                AI Agent ne website, products, coupons, orders ya settings mein jo bhi change kiya hai, aap use yahan se 1-click mein **Undo / Revert** ya **Delete** kar sakte hain.
              </p>
            </div>

            {actionLogs.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", background: "#fff", borderRadius: "10px", border: "1px solid #eadecd", color: "#7a6a5e" }}>
                Abhi tak AI Agent se koi database mutation record nahi hua hai.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {actionLogs.map(act => (
                  <div
                    key={act.actionId}
                    style={{
                      background: act.reverted ? "#f8fafc" : "#ffffff",
                      border: `1px solid ${act.reverted ? "#cbd5e1" : "#e2d2c1"}`,
                      borderRadius: "10px",
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                      opacity: act.reverted ? 0.75 : 1
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: act.reverted ? "#e2e8f0" : "#fef3c7",
                            color: act.reverted ? "#475569" : "#92400e"
                          }}
                        >
                          {act.actionType}
                        </span>
                        <strong style={{ fontSize: "13.5px", color: "#2b170d" }}>{act.title}</strong>
                        {act.reverted && (
                          <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: 700 }}>
                            (Reverted / Undone)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b5748", marginTop: "4px" }}>
                        {act.description}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#9a7b6c", marginTop: "3px" }}>
                        Collection: <strong>{act.targetCollection}</strong> • Time:{" "}
                        {new Date(act.timestamp || act.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      {act.previewRoute && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePreviewRoute(act.previewRoute);
                            setActivePreviewTitle(act.title);
                            setShowSplitPreview(true);
                            setSubTab("chat");
                          }}
                          style={{
                            padding: "6px 10px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                            borderRadius: "6px",
                            cursor: "pointer"
                          }}
                        >
                          🖥️ Preview
                        </button>
                      )}
                      {!act.reverted && (
                        <button
                          type="button"
                          onClick={() => handleUndoAction(act.actionId)}
                          disabled={undoingId === act.actionId}
                          style={{
                            padding: "6px 12px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            background: "#7c2d12",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer"
                          }}
                        >
                          {undoingId === act.actionId ? "Reverting..." : "↩️ Undo / Hatao"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteActionLog(act.actionId)}
                        style={{
                          padding: "6px 10px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          background: "#fef2f2",
                          color: "#991b1b",
                          border: "1px solid #fecaca",
                          borderRadius: "6px",
                          cursor: "pointer"
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===============================================================
            TAB 4: WEBSITE BUG SCANNER & 1-CLICK AUTO-FIX
            =============================================================== */}
        {subTab === "bugs" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#fcfbf9" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "14px"
              }}
            >
              <div>
                <h4 style={{ margin: 0, color: "#7c2d12", fontSize: "15px" }}>
                  🐛 Live Website & MongoDB Bug Diagnostic Scanner
                </h4>
                <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#6b5748" }}>
                  Checks product pricing, low stock risks, missing SEO metadata, broken images, expired coupons, and MongoDB connection health.
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleRunBugScan}
                  disabled={scanningBugs}
                  style={{
                    padding: "8px 14px",
                    background: "#fff",
                    color: "#7c2d12",
                    border: "1px solid #7c2d12",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {scanningBugs ? "Scanning..." : "🔄 Re-Scan Website"}
                </button>
                {bugReport?.bugsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoFixBugs}
                    disabled={fixingBugs}
                    style={{
                      padding: "8px 16px",
                      background: "#15803d",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {fixingBugs ? "Repairing..." : "🛠️ Auto-Fix All Bugs with AI"}
                  </button>
                )}
              </div>
            </div>

            {scanningBugs && !bugReport ? (
              <div style={{ padding: "30px", textAlign: "center" }}>
                <Loader2 size={24} className="spin" style={{ color: "#7c2d12" }} />
                <p style={{ fontSize: "13px", color: "#7c2d12", fontWeight: 700 }}>
                  Scanning all Website routes, Products, SEO metadata & MongoDB collections...
                </p>
              </div>
            ) : bugReport ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: bugReport.bugsCount === 0 ? "#dcfce7" : "#fef3c7",
                    color: bugReport.bugsCount === 0 ? "#14532d" : "#78350f",
                    fontWeight: 700,
                    fontSize: "13px"
                  }}
                >
                  {bugReport.bugsCount === 0
                    ? "✅ Zero bugs detected! All products, SEO descriptions, stock levels, and MongoDB collections are 100% healthy."
                    : `⚠️ Found ${bugReport.bugsCount} actionable issue(s) across ${bugReport.metrics?.productsScanned || 0} products.`}
                </div>
                {(bugReport.bugs || []).map(b => (
                  <div
                    key={b.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2d2c1",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px"
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: b.severity === "critical" ? "#fee2e2" : "#fef3c7",
                          color: b.severity === "critical" ? "#991b1b" : "#92400e",
                          marginRight: "8px"
                        }}
                      >
                        {String(b.severity).toUpperCase()} • {b.category}
                      </span>
                      <strong style={{ fontSize: "13px", color: "#2b170d" }}>{b.title}</strong>
                      <div style={{ fontSize: "12px", color: "#6b5748", marginTop: "3px" }}>{b.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* ===============================================================
            TAB 5: PRIVATE AI WORK LOG & MONGODB VAULT INSPECTOR
            =============================================================== */}
        {subTab === "vault" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#fcfbf9" }}>
            {/* MongoDB Health Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
                color: "#fff",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Database size={18} />
                  <strong style={{ fontSize: "15px" }}>
                    MongoDB Live Status: {mongoOk ? "CONNECTED & SYNCED" : "RESILIENT FALLBACK"}
                  </strong>
                </div>
                <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "4px" }}>
                  Engine: <strong>{vaultData?.mongodb?.engine || "MongoDB"}</strong> • Latency:{" "}
                  <strong>{vaultData?.mongodb?.pingMs || 1}ms</strong> • URI:{" "}
                  <code>{vaultData?.mongodb?.maskedUri || "mongodb://127.0.0.1/aurarudraksha"}</code>
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px", fontSize: "11.5px" }}>
                  <span>📦 Products: <strong>{vaultData?.mongodb?.counts?.products ?? 17}</strong></span>
                  <span>🛒 Orders: <strong>{vaultData?.mongodb?.counts?.orders ?? 0}</strong></span>
                  <span>💬 AI Sessions: <strong>{vaultData?.mongodb?.counts?.adminSessions ?? 1}</strong></span>
                  <span>↩️ Action Logs: <strong>{vaultData?.mongodb?.counts?.adminActions ?? 0}</strong></span>
                  <span>⏱️ Background Tasks: <strong>{vaultData?.mongodb?.counts?.adminTasks ?? 0}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  loadSessionAndTelemetry();
                  emitToast("MongoDB connection verified & synced!", "success");
                }}
                style={{
                  padding: "8px 14px",
                  background: "#fff",
                  color: "#064e3b",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                🔄 Verify & Sync MongoDB
              </button>
            </div>

            {/* Private AI Live Work Stream (With Delete Controls) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", color: "#2b170d" }}>
                🔒 Private AI Agent Live Work Log in MongoDB ({vaultData?.workLogs?.length || 0})
              </h4>
              {(vaultData?.workLogs?.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await auraAiClient.deleteAdminWorkLog("all");
                    loadSessionAndTelemetry();
                    emitToast("All work logs cleared from MongoDB.", "info");
                  }}
                  style={{
                    padding: "5px 10px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    background: "#fef2f2",
                    color: "#991b1b",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
                  <Trash2 size={12} /> Clear All Work Logs
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(vaultData?.workLogs || []).map(w => (
                <div
                  key={w.logId}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2d2c1",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "#fef3c7",
                          color: "#92400e"
                        }}
                      >
                        {String(w.category || "agent").toUpperCase()}
                      </span>
                      <strong style={{ fontSize: "12.5px", color: "#2b170d" }}>{w.title}</strong>
                      <span style={{ fontSize: "10.5px", color: "#9a7b6c" }}>
                        {new Date(w.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {w.detail && (
                      <div style={{ fontSize: "11.5px", color: "#6b5748", marginTop: "3px" }}>
                        {w.detail}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await auraAiClient.deleteAdminWorkLog(w.logId);
                      loadSessionAndTelemetry(true);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#b91c1c",
                      cursor: "pointer"
                    }}
                    title="Delete from MongoDB"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
