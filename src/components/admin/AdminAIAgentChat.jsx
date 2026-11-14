import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Loader2,
  Trash2,
  Cpu,
  Check,
  X,
  Bot,
  RotateCcw,
  Eye,
  Monitor,
  Smartphone,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Wrench,
  TrendingUp,
  Clock,
  Play,
  Pause,
  Square,
  History,
  Copy,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal
} from "lucide-react";
import { auraAiClient } from "../../lib/auraAiClient";
import { AuraAIMessageContent } from "../AuraAIMessageContent";
import { emitToast } from "../../context/ToastContext";

const AVAILABLE_NIM_MODELS = [
  { id: "nvidia/nemotron-3-super-120b-a12b", label: "NVIDIA Nemotron-3 Super 120B (Recommended)" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "NVIDIA Llama-3.1-Nemotron-70B-Instruct" },
  { id: "meta/llama-3.3-70b-instruct", label: "Meta Llama-3.3-70B-Instruct (NVIDIA NIM)" },
  { id: "mistralai/mixtral-8x22b-instruct-v0.1", label: "Mixtral 8x22B Instruct (NVIDIA NIM)" }
];

const QUICK_COMMANDS = [
  {
    label: "Growth & Health Audit",
    prompt: "Poora store revenue, COD vs Online, unpaid orders, low stock aur VIP buyers ka Growth Audit dikhao"
  },
  {
    label: "Scan & Fix Bugs",
    prompt: "Storefront, products aur SEO ke bugs scan karo aur auto-fix kar do"
  },
  {
    label: "10% Bulk Discount",
    prompt: "Sabhi products par 10% bulk discount apply karo (preview ke saath)"
  },
  {
    label: "Create Coupon SHIVA15",
    prompt: "15% off coupon code SHIVA15 create karo minimum order 999 par"
  },
  {
    label: "Pending Orders & Tracking",
    prompt: "Recent pending ya unpaid orders dikhao jinko update karna hai"
  },
  {
    label: "Payment Toggles Check",
    prompt: "Abhi COD aur Online PayU settings kya hain dikhao"
  }
];

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (_) {
    return "";
  }
}

function formatDateTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (_) {
    return "";
  }
}

function normalizeMsg(m) {
  return {
    id: m.id || `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sender: m.sender || (m.role === "user" ? "user" : "ai"),
    text: m.text ?? m.content ?? "",
    modelUsed: m.modelUsed || "",
    actionsExecuted: Array.isArray(m.actionsExecuted) ? m.actionsExecuted : [],
    previewRoute: m.previewRoute || "",
    previewTitle: m.previewTitle || "",
    timestamp: m.timestamp || ""
  };
}

export function AdminAIAgentChat({
  compact = false,
  drawerMode = false,
  pageContext = "",
  onCloseDrawer = null
}) {
  const [subTab, setSubTab] = useState("chat"); // 'chat' | 'actions' | 'tasks' | 'audit'
  const [sessionId] = useState("admin_master_session");

  // Chat state (loads on mount — component itself mounts ONLY on /admin/ai or when drawer opened)
  const [messages, setMessages] = useState([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [pagesDirectory, setPagesDirectory] = useState([
    { title: "Home Storefront", route: "/" },
    { title: "Shop Catalog", route: "/shop" },
    { title: "Categories", route: "/categories" },
    { title: "Checkout", route: "/checkout" },
    { title: "AI Pandit Ji", route: "/panditji" }
  ]);
  const [input, setInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  // Live Preview Split Pane
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRoute, setPreviewRoute] = useState("/");
  const [previewViewport, setPreviewViewport] = useState("desktop"); // 'desktop' | 'mobile'
  const [previewNonce, setPreviewNonce] = useState(0);

  // Action Ledger state (lazy loaded when subTab === 'actions')
  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [undoingId, setUndoingId] = useState("");
  const actionsLoadedRef = useRef(false);

  // Background Tasks state (lazy loaded when subTab === 'tasks')
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const tasksLoadedRef = useRef(false);
  const [newTask, setNewTask] = useState({
    title: "",
    prompt: "",
    taskType: "growth_audit",
    durationMinutes: 60,
    intervalMinutes: 15
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskCmdInputs, setTaskCmdInputs] = useState({});

  // Diagnostics & Growth Audit state (lazy loaded when subTab === 'audit')
  const [diagnostics, setDiagnostics] = useState(null);
  const [growthAudit, setGrowthAudit] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const auditLoadedRef = useRef(false);

  // Model selector modal
  const [showModelModal, setShowModelModal] = useState(false);
  const [selectedNimModel, setSelectedNimModel] = useState("nvidia/nemotron-3-super-120b-a12b");
  const [savingModel, setSavingModel] = useState(false);

  const chatEndRef = useRef(null);

  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    setSessionError("");
    try {
      const [sessionRes, settingsRes] = await Promise.all([
        auraAiClient.getAdminAgentSession(sessionId),
        auraAiClient.getSettings().catch(() => null)
      ]);
      if (sessionRes?.success && sessionRes.session) {
        const list = (sessionRes.session.messages || []).map(normalizeMsg);
        setMessages(list);
        if (Array.isArray(sessionRes.pagesDirectory) && sessionRes.pagesDirectory.length > 0) {
          setPagesDirectory(sessionRes.pagesDirectory);
        }
      } else if (sessionRes?.status === 401 || sessionRes?.status === 403) {
        setSessionError("Admin authentication required. Please re-sign in to unlock autonomous tools.");
      } else {
        setSessionError(sessionRes?.message || "Could not load Admin Agent session.");
      }
      if (settingsRes) {
        const m = settingsRes.nemotronModel || settingsRes.selectedNimModel || settingsRes.nvidiaModel;
        if (m) setSelectedNimModel(m);
      }
    } catch (e) {
      setSessionError(e?.message || "Failed to connect to Admin Agent.");
    } finally {
      setLoadingSession(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (subTab === "chat" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isExecuting, subTab]);

  const loadActions = useCallback(async () => {
    setLoadingActions(true);
    try {
      const res = await auraAiClient.getAdminActionLogs();
      if (res?.success) {
        setActions(res.actions || []);
        actionsLoadedRef.current = true;
      } else if (res?.message) {
        emitToast(res.message, "error");
      }
    } finally {
      setLoadingActions(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await auraAiClient.getAdminTasks();
      if (res?.success) {
        setTasks(res.tasks || []);
        tasksLoadedRef.current = true;
      }
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const loadAuditAndDiagnostics = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const [diagRes, auditRes] = await Promise.all([
        auraAiClient.getAdminDiagnostics(),
        auraAiClient.getAdminGrowthAudit("all")
      ]);
      if (diagRes?.success && diagRes.report) setDiagnostics(diagRes.report);
      if (auditRes?.success && auditRes.audit) setGrowthAudit(auditRes.audit);
      auditLoadedRef.current = true;
    } catch (e) {
      emitToast("Could not run store diagnostics.", "error");
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  // Lazy load sub-tab data only on first activation
  useEffect(() => {
    if (subTab === "actions" && !actionsLoadedRef.current) {
      loadActions();
    } else if (subTab === "tasks" && !tasksLoadedRef.current) {
      loadTasks();
    } else if (subTab === "audit" && !auditLoadedRef.current) {
      loadAuditAndDiagnostics();
    }
  }, [subTab, loadActions, loadTasks, loadAuditAndDiagnostics]);

  // Conditional polling ONLY when subTab === 'tasks' AND at least one task is actively running
  useEffect(() => {
    if (subTab !== "tasks") return undefined;
    const hasRunning = tasks.some((t) => t.status === "running");
    if (!hasRunning) return undefined;
    const timer = setInterval(() => {
      auraAiClient.getAdminTasks().then((res) => {
        if (res?.success) setTasks(res.tasks || []);
      }).catch(() => {});
    }, 6000);
    return () => clearInterval(timer);
  }, [subTab, tasks]);

  const openPreviewRoute = (route) => {
    if (!route) return;
    setPreviewRoute(route.startsWith("/") ? route : `/${route}`);
    setPreviewNonce((n) => n + 1);
    setPreviewOpen(true);
  };

  const handleSend = async (customPrompt = null) => {
    const text = (customPrompt !== null ? customPrompt : input).trim();
    if (!text || isExecuting) return;

    if (subTab !== "chat") setSubTab("chat");

    const optimisticUser = {
      id: "u_" + Date.now(),
      sender: "user",
      text,
      timestamp: new Date().toISOString()
    };

    const nextHistory = [...messages, optimisticUser];
    setMessages(nextHistory);
    if (customPrompt === null) setInput("");
    setIsExecuting(true);

    try {
      const payloadHistory = nextHistory.slice(-12).map((m) => ({
        sender: m.sender === "user" ? "user" : "ai",
        text: m.text
      }));

      const res = await auraAiClient.sendAdminChat(payloadHistory, sessionId, pageContext);

      if (res?.error && !res?.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: "err_" + Date.now(),
            sender: "ai",
            text: `⚠️ ${res.error}`,
            actionsExecuted: [],
            timestamp: new Date().toISOString()
          }
        ]);
        emitToast(res.error, "error");
        return;
      }

      if (Array.isArray(res?.messages) && res.messages.length > 0) {
        setMessages(res.messages.map(normalizeMsg));
      } else {
        const aiMsg = normalizeMsg(
          res?.message || {
            id: "ai_" + Date.now(),
            sender: "ai",
            text: res?.text || "Command processed.",
            modelUsed: res?.modelUsed || "",
            actionsExecuted: res?.actionsExecuted || [],
            previewRoute: res?.previewRoute || "",
            previewTitle: res?.previewTitle || "",
            timestamp: new Date().toISOString()
          }
        );
        setMessages((prev) => [...prev, aiMsg]);
      }

      const acts = res?.actionsExecuted || res?.message?.actionsExecuted || [];
      if (acts.length > 0) {
        actionsLoadedRef.current = false; // Refresh action ledger next time opened
        auditLoadedRef.current = false;
        emitToast(`${acts.length} store action(s) executed cleanly.`, "success");
      }

      const routeFromRes = res?.previewRoute || res?.message?.previewRoute || acts.find((a) => a.previewRoute)?.previewRoute;
      if (routeFromRes && !drawerMode) {
        setPreviewRoute(routeFromRes);
        setPreviewNonce((n) => n + 1);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err_" + Date.now(),
          sender: "ai",
          text: `⚠️ Agent execution error: ${err?.message || "Please retry."}`,
          actionsExecuted: [],
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleUndoAction = async (actionId) => {
    if (!actionId || undoingId) return;
    setUndoingId(actionId);
    try {
      const res = await auraAiClient.undoAdminAction(actionId);
      if (res?.success) {
        emitToast(res.message || "Action rolled back cleanly.", "success");
        setActions((prev) =>
          prev.map((a) => (a.actionId === actionId ? { ...a, reverted: true, revertedAt: new Date().toISOString() } : a))
        );
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            actionsExecuted: (m.actionsExecuted || []).map((act) =>
              act.actionId === actionId ? { ...act, reverted: true } : act
            )
          }))
        );
        auditLoadedRef.current = false;
        if (previewOpen) setPreviewNonce((n) => n + 1);
      } else {
        emitToast(res?.message || "Could not undo action.", "error");
      }
    } finally {
      setUndoingId("");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    const res = await auraAiClient.deleteAdminAgentMessage(messageId, sessionId);
    if (res?.success && res.session?.messages) {
      setMessages(res.session.messages.map(normalizeMsg));
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  const handleClearChat = async () => {
    const res = await auraAiClient.clearAdminAgentSession(sessionId);
    if (res?.success && res.session?.messages) {
      setMessages(res.session.messages.map(normalizeMsg));
    } else {
      setMessages([]);
    }
    emitToast("Admin Agent session reset.", "info");
  };

  const handleAutoFixAllBugs = async () => {
    if (autoFixing) return;
    setAutoFixing(true);
    try {
      const res = await auraAiClient.executeAdminAgentAction("AUTO_FIX_BUGS", {}, sessionId);
      if (res?.success) {
        emitToast(res.result?.title || "Auto-fix completed!", "success");
        actionsLoadedRef.current = false;
        await loadAuditAndDiagnostics();
      } else {
        emitToast(res?.message || "Auto-fix failed.", "error");
      }
    } finally {
      setAutoFixing(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.prompt.trim() || creatingTask) return;
    setCreatingTask(true);
    try {
      const res = await auraAiClient.createAdminTask({
        title: newTask.title.trim() || "Scheduled Store Task",
        prompt: newTask.prompt.trim(),
        taskType: newTask.taskType,
        durationMinutes: Number(newTask.durationMinutes) || 60,
        intervalMinutes: Number(newTask.intervalMinutes) || 15
      });
      if (res?.success && res.task) {
        setTasks((prev) => [res.task, ...prev]);
        setNewTask({
          title: "",
          prompt: "",
          taskType: "growth_audit",
          durationMinutes: 60,
          intervalMinutes: 15
        });
        emitToast("Background task scheduled and first cycle triggered.", "success");
      } else {
        emitToast(res?.message || "Could not schedule task.", "error");
      }
    } finally {
      setCreatingTask(false);
    }
  };

  const handleControlTask = async (taskId, command, extra = {}) => {
    const res = await auraAiClient.controlAdminTask(taskId, command, extra);
    if (res?.success) {
      if (res.task) {
        setTasks((prev) => prev.map((t) => (t.taskId === taskId ? res.task : t)));
      } else {
        loadTasks();
      }
      emitToast(res.message || `Task ${command} applied.`, "success");
    } else {
      emitToast(res?.message || "Task command failed.", "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    const res = await auraAiClient.deleteAdminTask(taskId);
    if (res?.success) {
      setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
      emitToast("Task removed.", "info");
    }
  };

  const handleSaveModelConfig = async (e) => {
    e.preventDefault();
    setSavingModel(true);
    try {
      await auraAiClient.updateSettings({
        selectedNimModel,
        nvidiaModel: selectedNimModel,
        nemotronModel: selectedNimModel
      });
      emitToast("Fallback AI model preference saved.", "success");
      setShowModelModal(false);
    } catch (_) {
      emitToast("Could not update model preference.", "error");
    } finally {
      setSavingModel(false);
    }
  };

  const containerHeight = drawerMode ? "100%" : compact ? "540px" : "700px";

  return (
    <div
      className="flex flex-col bg-white border border-[#e5dccb] rounded-xl overflow-hidden shadow-sm"
      style={{ height: containerHeight, minHeight: drawerMode ? "100%" : "520px" }}
    >
      {/* Header Bar */}
      <div className="bg-[#2a160d] text-white px-4 py-3 flex items-center justify-between gap-2 flex-wrap border-b border-[#4a2715]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#8c2b10] border border-[#fbbf24]/40 flex items-center justify-center text-[#fbbf24] shrink-0">
            <Bot size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white tracking-tight truncate">
                Aura Autonomous Admin Agent
              </span>
              <span className="text-[11px] font-semibold text-[#fde68a]">
                · Full DB & Store Control
              </span>
            </div>
            <div className="text-[11px] text-[#d6c7b2] truncate">
              {pageContext ? `Context: ${pageContext} · ` : ""}Tool-Calling + 1-Click Undo + Live Preview
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {!drawerMode && subTab === "chat" && (
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border cursor-pointer transition-colors ${
                previewOpen
                  ? "bg-[#fbbf24] text-[#2a160d] border-[#fbbf24]"
                  : "bg-white/10 text-[#fde68a] border-white/20 hover:bg-white/15"
              }`}
              title="Toggle Split-View Live Store Preview"
            >
              <Eye size={13} />
              <span>{previewOpen ? "Hide Preview" : "Live Preview"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowModelModal(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-[#fde68a] border border-white/20 hover:bg-white/15 inline-flex items-center gap-1.5 cursor-pointer"
            title="Configure Fallback Reasoning Model"
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Model</span>
          </button>

          <button
            type="button"
            onClick={handleClearChat}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-[#fca5a5] border border-white/15 hover:bg-white/15 inline-flex items-center gap-1 cursor-pointer"
            title="Reset Chat Session"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer"
              aria-label="Close Agent Drawer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="bg-[#fdfbf7] border-b border-[#e8dccd] px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: "chat", label: "Command Chat", icon: Bot },
          { id: "actions", label: `Action Ledger${actions.length ? ` (${actions.length})` : ""}`, icon: History },
          { id: "tasks", label: `Tasks${tasks.length ? ` (${tasks.length})` : ""}`, icon: Clock },
          { id: "audit", label: "Health & Growth Audit", icon: TrendingUp }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer border transition-colors ${
                active
                  ? "bg-[#7c2d12] text-white border-[#7c2d12]"
                  : "bg-white text-[#5c2b09] border-[#e5d5c0] hover:bg-[#fef6ec]"
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: COMMAND CHAT (+ OPTIONAL SPLIT LIVE PREVIEW) */}
      {subTab === "chat" && (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left / Main Chat Column */}
          <div className={`flex-1 min-w-0 flex flex-col min-h-0 ${previewOpen && !drawerMode ? "lg:border-r lg:border-[#e8dccd]" : ""}`}>
            {/* Quick Action Starters */}
            <div className="px-3 py-2 bg-[#faf6f0] border-b border-[#efe6d8] flex items-center gap-2 overflow-x-auto">
              {QUICK_COMMANDS.map((cmd, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isExecuting}
                  onClick={() => handleSend(cmd.prompt)}
                  className="px-2.5 py-1 rounded-md bg-white border border-[#e2d3bf] text-[11.5px] font-semibold text-[#5c2b09] hover:border-[#8c2b10] hover:bg-[#fffaf3] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {cmd.label}
                </button>
              ))}
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#faf7f2] space-y-3">
              {loadingSession ? (
                <div className="flex items-center justify-center py-12 text-sm text-[#7c2d12] gap-2 font-medium">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Loading persistent Agent session...</span>
                </div>
              ) : sessionError ? (
                <div className="p-4 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-xs flex items-center justify-between gap-3">
                  <span>{sessionError}</span>
                  <button
                    type="button"
                    onClick={loadSession}
                    className="px-2.5 py-1 rounded bg-white border border-[#fca5a5] font-semibold cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.sender === "user";
                  const msgPreviewRoute = m.previewRoute || (m.actionsExecuted || []).find((a) => a.previewRoute)?.previewRoute || "";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[92%] sm:max-w-[86%] rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-xs ${
                          isUser
                            ? "bg-[#7c2d12] text-white rounded-br-xs"
                            : "bg-white text-[#1f1a17] border border-[#e7dac9] rounded-bl-xs"
                        }`}
                      >
                        {isUser ? (
                          <div className="whitespace-pre-wrap">{m.text}</div>
                        ) : (
                          <AuraAIMessageContent text={m.text} />
                        )}

                        {/* Executed Tool Receipts */}
                        {!isUser && Array.isArray(m.actionsExecuted) && m.actionsExecuted.length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-[#efe4d6] space-y-1.5">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-[#7c2d12]">
                              Executed Database Actions ({m.actionsExecuted.length})
                            </div>
                            {m.actionsExecuted.map((act, aIdx) => (
                              <div
                                key={act.actionId || aIdx}
                                className="flex items-center justify-between gap-2 bg-[#fdfaf5] border border-[#eadcc9] rounded-lg px-2.5 py-1.5 text-xs flex-wrap"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-[#2a160d]">
                                    {act.title || act.actionType || act.type}
                                  </span>
                                  {(act.targetCollection || act.collection) && (
                                    <span className="text-[#806f62] ml-1.5 text-[11px]">
                                      · {act.targetCollection || act.collection}
                                    </span>
                                  )}
                                  {act.reverted && (
                                    <span className="ml-2 text-[11px] font-semibold text-[#b45309]">
                                      (Reverted)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {act.previewRoute && !drawerMode && (
                                    <button
                                      type="button"
                                      onClick={() => openPreviewRoute(act.previewRoute)}
                                      className="px-2 py-0.5 rounded bg-white border border-[#d6c4b0] text-[#5c2b09] font-semibold text-[11px] inline-flex items-center gap-1 hover:bg-[#fef6ec] cursor-pointer"
                                    >
                                      <Eye size={11} /> Preview
                                    </button>
                                  )}
                                  {act.actionId && !act.reverted && (act.actionType || act.type) !== "SHOW_PAGE" && (act.actionType || act.type) !== "CREATE_TASK" && (act.actionType || act.type) !== "UNDO" && (
                                    <button
                                      type="button"
                                      disabled={undoingId === act.actionId}
                                      onClick={() => handleUndoAction(act.actionId)}
                                      className="px-2 py-0.5 rounded bg-[#fff7ed] border border-[#fdba74] text-[#9a3412] font-semibold text-[11px] inline-flex items-center gap-1 hover:bg-[#ffedd5] cursor-pointer disabled:opacity-50"
                                    >
                                      <RotateCcw size={11} />
                                      <span>{undoingId === act.actionId ? "Undoing..." : "Undo"}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Metadata & Preview shortcut */}
                        <div
                          className={`mt-1.5 flex items-center justify-between gap-3 text-[10.5px] ${
                            isUser ? "text-white/75" : "text-[#806f62]"
                          }`}
                        >
                          <div className="flex items-center gap-2 tabular-nums">
                            {m.timestamp && <span>{formatTime(m.timestamp)}</span>}
                            {!isUser && m.modelUsed && (
                              <span className="truncate max-w-[180px]">· {m.modelUsed}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!isUser && msgPreviewRoute && !drawerMode && (
                              <button
                                type="button"
                                onClick={() => openPreviewRoute(msgPreviewRoute)}
                                className="text-[#8c2b10] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye size={11} /> Open {msgPreviewRoute}
                              </button>
                            )}
                            {m.id !== "amsg_welcome" && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(m.id)}
                                className={`${isUser ? "text-white/70 hover:text-white" : "text-[#9a8c82] hover:text-[#c62828]"} cursor-pointer`}
                                title="Delete message"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {isExecuting && (
                <div className="flex items-center gap-2 bg-white border border-[#e7dac9] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#7c2d12] w-fit shadow-xs">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Executing agent reasoning & live database tools...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Command Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white border-t border-[#e8dccd] flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Agent: discount lagao, order track/update karo, coupon banao, bug fix karo..."
                className="flex-1 min-w-0 border border-[#d6c4b0] rounded-lg px-3 py-2 text-[13.5px] bg-[#fdfbf7] text-[#1f1a17] focus:outline-none focus:border-[#7c2d12]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isExecuting}
                className="px-4 py-2 rounded-lg bg-[#7c2d12] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#5c1c0a] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={14} />
                <span>Execute</span>
              </button>
            </form>
          </div>

          {/* Right Split Pane: Live Storefront / Admin Page Preview */}
          {previewOpen && !drawerMode && (
            <div className="w-full lg:w-[46%] flex flex-col bg-[#f5efe6] min-h-[360px] lg:min-h-0">
              <div className="px-3 py-2 bg-[#fdfbf7] border-b border-[#e5d8c8] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                  <select
                    value={previewRoute}
                    onChange={(e) => openPreviewRoute(e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1 rounded border border-[#d6c4b0] bg-white text-xs font-semibold text-[#2a160d]"
                  >
                    {pagesDirectory.map((p) => (
                      <option key={p.route} value={p.route}>
                        {p.title} ({p.route})
                      </option>
                    ))}
                    {!pagesDirectory.some((p) => p.route === previewRoute) && (
                      <option value={previewRoute}>{previewRoute}</option>
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewViewport("desktop")}
                    className={`p-1.5 rounded border text-xs cursor-pointer ${
                      previewViewport === "desktop"
                        ? "bg-[#7c2d12] text-white border-[#7c2d12]"
                        : "bg-white text-[#5c2b09] border-[#d6c4b0]"
                    }`}
                    title="Desktop View"
                  >
                    <Monitor size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport("mobile")}
                    className={`p-1.5 rounded border text-xs cursor-pointer ${
                      previewViewport === "mobile"
                        ? "bg-[#7c2d12] text-white border-[#7c2d12]"
                        : "bg-white text-[#5c2b09] border-[#d6c4b0]"
                    }`}
                    title="Mobile View (390px)"
                  >
                    <Smartphone size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewNonce((n) => n + 1)}
                    className="p-1.5 rounded border border-[#d6c4b0] bg-white text-[#5c2b09] hover:bg-[#fef6ec] cursor-pointer"
                    title="Reload Preview"
                  >
                    <RefreshCw size={13} />
                  </button>
                  <a
                    href={previewRoute}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded border border-[#d6c4b0] bg-white text-[#5c2b09] hover:bg-[#fef6ec]"
                    title="Open in New Tab"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    className="p-1.5 rounded border border-[#d6c4b0] bg-white text-[#5c2b09] hover:bg-[#fef2f2] cursor-pointer"
                    title="Close Preview"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-3 flex justify-center items-start bg-[#ece4d8]">
                <iframe
                  key={`${previewRoute}_${previewNonce}`}
                  src={previewRoute}
                  title="Live Store Preview"
                  className="bg-white border border-[#d6c4b0] rounded-lg shadow-sm"
                  style={{
                    width: previewViewport === "mobile" ? "390px" : "100%",
                    height: "100%",
                    minHeight: "420px"
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: ACTION LEDGER & 1-CLICK ROLLBACK */}
      {subTab === "actions" && (
        <div className="flex-1 overflow-y-auto p-4 bg-[#faf7f2] space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-[#2a160d] m-0">
                Action Ledger & 1-Click Rollback
              </h3>
              <p className="text-xs text-[#6b5e55] m-0">
                Every database mutation executed by the Agent stores an exact pre-change snapshot for instant undo.
              </p>
            </div>
            <button
              type="button"
              onClick={loadActions}
              disabled={loadingActions}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#d6c4b0] text-xs font-semibold text-[#5c2b09] inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#fef6ec]"
            >
              <RefreshCw size={12} className={loadingActions ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingActions ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs font-semibold text-[#7c2d12]">
              <Loader2 size={15} className="animate-spin" /> Loading action ledger...
            </div>
          ) : actions.length === 0 ? (
            <div className="p-6 rounded-xl bg-white border border-dashed border-[#dccbb5] text-center text-xs text-[#6b5e55]">
              No autonomous mutations logged yet. Give the Agent a command like "Sabhi products par 10% discount lagao" or "Create coupon SHIVA15".
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((act) => (
                <div
                  key={act.actionId}
                  className="bg-white border border-[#e5d8c8] rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#2a160d]">
                        {act.title || act.actionType || act.type}
                      </span>
                      <span className="text-[11px] font-semibold text-[#7c2d12]">
                        · {act.actionType || act.type}
                      </span>
                      {act.targetCollection && (
                        <span className="text-[11px] text-[#6b5e55]">
                          · {act.targetCollection}
                        </span>
                      )}
                      {act.reverted && (
                        <span className="text-[11px] font-bold text-[#b45309]">
                          · Reverted
                        </span>
                      )}
                    </div>
                    {act.description && (
                      <div className="text-xs text-[#57493f]">{act.description}</div>
                    )}
                    <div className="text-[11px] text-[#8a796b] tabular-nums">
                      {formatDateTime(act.createdAt || act.timestamp)} · Source: {act.source || "admin_chat"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!act.reverted && (act.actionType || act.type) !== "SHOW_PAGE" && (act.actionType || act.type) !== "CREATE_TASK" && (
                      <button
                        type="button"
                        disabled={undoingId === act.actionId}
                        onClick={() => handleUndoAction(act.actionId)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#fff7ed] border border-[#fdba74] text-[#9a3412] text-xs font-semibold inline-flex items-center gap-1 hover:bg-[#ffedd5] cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        <span>{undoingId === act.actionId ? "Reverting..." : "Undo Change"}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        await auraAiClient.deleteAdminActionLog(act.actionId);
                        setActions((prev) => prev.filter((x) => x.actionId !== act.actionId));
                      }}
                      className="p-1.5 rounded-lg border border-[#e5d8c8] text-[#8a796b] hover:text-[#c62828] cursor-pointer"
                      title="Delete Log"
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

      {/* SUB-VIEW 3: AUTONOMOUS BACKGROUND TASKS */}
      {subTab === "tasks" && (
        <div className="flex-1 overflow-y-auto p-4 bg-[#faf7f2] space-y-4">
          <form
            onSubmit={handleCreateTask}
            className="bg-white border border-[#e5d8c8] rounded-xl p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#2a160d] m-0">
                Schedule Autonomous Agent Task
              </h3>
              <span className="text-[11px] text-[#6b5e55]">
                Auto-pauses when idle · Zero storefront overhead
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask((s) => ({ ...s, title: e.target.value }))}
                placeholder="Task title (e.g. SEO & Bug Watch)"
                className="px-2.5 py-2 rounded-lg border border-[#d6c4b0] text-xs bg-[#fdfbf7]"
              />
              <select
                value={newTask.taskType}
                onChange={(e) => setNewTask((s) => ({ ...s, taskType: e.target.value }))}
                className="px-2.5 py-2 rounded-lg border border-[#d6c4b0] text-xs bg-[#fdfbf7]"
              >
                <option value="growth_audit">Growth & Revenue Audit</option>
                <option value="bug_scan">Bug Scan & Auto-Repair</option>
                <option value="seo_sync">Catalog SEO Optimization</option>
                <option value="inventory_watch">Low-Stock Inventory Watch</option>
                <option value="custom">Custom Autonomous Prompt</option>
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={newTask.intervalMinutes}
                  onChange={(e) => setNewTask((s) => ({ ...s, intervalMinutes: e.target.value }))}
                  className="w-20 px-2 py-2 rounded-lg border border-[#d6c4b0] text-xs bg-[#fdfbf7] tabular-nums"
                  title="Interval (mins)"
                />
                <span className="text-[11px] text-[#6b5e55] whitespace-nowrap">min cycle</span>
                <input
                  type="number"
                  min={10}
                  max={4320}
                  value={newTask.durationMinutes}
                  onChange={(e) => setNewTask((s) => ({ ...s, durationMinutes: e.target.value }))}
                  className="w-20 px-2 py-2 rounded-lg border border-[#d6c4b0] text-xs bg-[#fdfbf7] tabular-nums"
                  title="Duration (mins)"
                />
                <span className="text-[11px] text-[#6b5e55] whitespace-nowrap">min total</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={newTask.prompt}
                onChange={(e) => setNewTask((s) => ({ ...s, prompt: e.target.value }))}
                placeholder="Instruction: e.g. Scan all products for missing SEO keywords and unpaid orders..."
                className="flex-1 px-2.5 py-2 rounded-lg border border-[#d6c4b0] text-xs bg-[#fdfbf7]"
              />
              <button
                type="submit"
                disabled={creatingTask || !newTask.prompt.trim()}
                className="px-3.5 py-2 rounded-lg bg-[#7c2d12] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {creatingTask ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                <span>Start Task</span>
              </button>
            </div>
          </form>

          {loadingTasks ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs font-semibold text-[#7c2d12]">
              <Loader2 size={15} className="animate-spin" /> Loading background tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-6 rounded-xl bg-white border border-dashed border-[#dccbb5] text-center text-xs text-[#6b5e55]">
              No scheduled background tasks active.
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((t) => (
                <div
                  key={t.taskId}
                  className="bg-white border border-[#e5d8c8] rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#2a160d]">{t.title}</span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            t.status === "running"
                              ? "bg-[#ecfdf5] text-[#047857]"
                              : t.status === "paused"
                              ? "bg-[#fef3c7] text-[#92400e]"
                              : "bg-[#f3f4f6] text-[#4b5563]"
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="text-[11px] text-[#6b5e55] tabular-nums">
                          · {(t.cyclesCompleted ?? t.runsCount) || 0} cycles · every {t.intervalMinutes}m
                        </span>
                      </div>
                      <p className="text-xs text-[#57493f] mt-1 mb-0">{t.prompt}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleControlTask(t.taskId, "run_now")}
                        className="px-2 py-1 rounded border border-[#d6c4b0] bg-[#fdfbf7] text-xs font-semibold text-[#5c2b09] inline-flex items-center gap-1 cursor-pointer"
                        title="Run Cycle Now"
                      >
                        <Play size={11} /> Run
                      </button>
                      {t.status === "running" ? (
                        <button
                          type="button"
                          onClick={() => handleControlTask(t.taskId, "pause")}
                          className="px-2 py-1 rounded border border-[#fde68a] bg-[#fffbeb] text-xs font-semibold text-[#92400e] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Pause size={11} /> Pause
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleControlTask(t.taskId, "resume")}
                          className="px-2 py-1 rounded border border-[#bbf7d0] bg-[#f0fdf4] text-xs font-semibold text-[#166534] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Play size={11} /> Resume
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleControlTask(t.taskId, "stop")}
                        className="px-2 py-1 rounded border border-[#e5d8c8] bg-white text-xs font-semibold text-[#57493f] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Square size={11} /> Stop
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.taskId)}
                        className="p-1.5 rounded border border-[#e5d8c8] text-[#8a796b] hover:text-[#c62828] cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Send live instruction to task */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={taskCmdInputs[t.taskId] || ""}
                      onChange={(e) =>
                        setTaskCmdInputs((prev) => ({ ...prev, [t.taskId]: e.target.value }))
                      }
                      placeholder="Update instruction and execute immediately..."
                      className="flex-1 px-2.5 py-1.5 rounded border border-[#e5d8c8] text-xs bg-[#fdfbf7]"
                    />
                    <button
                      type="button"
                      disabled={!(taskCmdInputs[t.taskId] || "").trim()}
                      onClick={() => {
                        const val = taskCmdInputs[t.taskId];
                        handleControlTask(t.taskId, "send_command", { instruction: val });
                        setTaskCmdInputs((prev) => ({ ...prev, [t.taskId]: "" }));
                      }}
                      className="px-2.5 py-1.5 rounded bg-[#5c2b09] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                    >
                      Dispatch
                    </button>
                  </div>

                  {Array.isArray(t.logs) && t.logs.length > 0 && (
                    <div className="bg-[#faf7f2] border border-[#efe4d6] rounded-lg p-2 space-y-1 max-h-36 overflow-y-auto">
                      {t.logs.slice(0, 4).map((l, idx) => (
                        <div key={l.runId || idx} className="text-[11px] text-[#4a3c32] flex justify-between gap-2">
                          <span className="truncate">{l.summary || l.aiOutput}</span>
                          <span className="text-[#8a796b] tabular-nums shrink-0">{formatTime(l.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 4: HEALTH, BUG AUTO-FIX & GROWTH COPILOT */}
      {subTab === "audit" && (
        <div className="flex-1 overflow-y-auto p-4 bg-[#faf7f2] space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-[#2a160d] m-0">
                Store Health, Bug Repair & Growth Copilot
              </h3>
              <p className="text-xs text-[#6b5e55] m-0">
                Live telemetry from MongoDB: unpaid order recovery, inventory risks, VIP buyers & auto-fixable bugs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadAuditAndDiagnostics}
                disabled={loadingAudit}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#d6c4b0] text-xs font-semibold text-[#5c2b09] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={12} className={loadingAudit ? "animate-spin" : ""} />
                <span>Re-Scan Live DB</span>
              </button>
              <button
                type="button"
                onClick={handleAutoFixAllBugs}
                disabled={autoFixing || loadingAudit}
                className="px-3 py-1.5 rounded-lg bg-[#7c2d12] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#5c1c0a] disabled:opacity-50"
              >
                {autoFixing ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
                <span>1-Click Auto-Fix Bugs</span>
              </button>
            </div>
          </div>

          {loadingAudit ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs font-semibold text-[#7c2d12]">
              <Loader2 size={16} className="animate-spin" /> Running full store health & growth audit...
            </div>
          ) : (
            <>
              {/* Revenue & Operational KPIs */}
              {growthAudit && (() => {
                const gm = growthAudit.metrics || growthAudit;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white border border-[#e5d8c8] rounded-xl p-3">
                      <div className="text-[11px] font-semibold text-[#6b5e55]">Total Revenue</div>
                      <div className="text-lg font-extrabold text-[#2a160d] tabular-nums mt-0.5">
                        ₹{Number(gm.totalRevenue || 0).toLocaleString("en-IN")}
                      </div>
                      <div className="text-[11px] text-[#7c2d12] tabular-nums">
                        AOV: ₹{Number(gm.avgOrderValue ?? gm.averageOrderValue ?? 0).toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div className="bg-white border border-[#e5d8c8] rounded-xl p-3">
                      <div className="text-[11px] font-semibold text-[#6b5e55]">Payment Split</div>
                      <div className="text-lg font-extrabold text-[#2a160d] tabular-nums mt-0.5">
                        {gm.onlineOrdersCount ?? gm.onlinePaidCount ?? 0} Online · {gm.codOrdersCount ?? gm.codCount ?? 0} COD
                      </div>
                      <div className="text-[11px] text-[#b45309] tabular-nums">
                        Unpaid Online: {gm.unpaidOnlineOrdersCount ?? gm.unpaidOnlineCount ?? 0}
                      </div>
                    </div>

                    <div className="bg-white border border-[#e5d8c8] rounded-xl p-3">
                      <div className="text-[11px] font-semibold text-[#6b5e55]">Catalog Risks</div>
                      <div className="text-lg font-extrabold text-[#2a160d] tabular-nums mt-0.5">
                        {gm.outOfStockCount || 0} OOS · {gm.lowStockCount || 0} Low
                      </div>
                      <div className="text-[11px] text-[#6b5e55] tabular-nums">
                        Missing SEO: {gm.missingSeoCount || 0}
                      </div>
                    </div>

                    <div className="bg-white border border-[#e5d8c8] rounded-xl p-3">
                      <div className="text-[11px] font-semibold text-[#6b5e55]">Support & Coupons</div>
                      <div className="text-lg font-extrabold text-[#2a160d] tabular-nums mt-0.5">
                        {gm.openTicketsCount || 0} Tickets · {gm.pendingReviewsCount || 0} Rev
                      </div>
                      <div className="text-[11px] text-[#6b5e55] tabular-nums">
                        Active Coupons: {gm.activeCouponsCount || 0}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Priority Growth Opportunities */}
              {growthAudit?.opportunities?.length > 0 && (
                <div className="bg-white border border-[#e5d8c8] rounded-xl p-3.5 space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#7c2d12]">
                    Proactive Agent Opportunities
                  </div>
                  <div className="space-y-2">
                    {growthAudit.opportunities.map((opp, idx) => {
                      const promptToRun = opp.suggestedPrompt || opp.suggestedCommand;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 bg-[#fdfbf7] border border-[#eadcc9] rounded-lg p-2.5 flex-wrap"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-[#2a160d]">
                              {opp.title}
                              <span className="ml-2 text-[10.5px] font-semibold text-[#b45309] uppercase">
                                · {opp.priority}
                              </span>
                            </div>
                            <div className="text-xs text-[#57493f] mt-0.5">{opp.detail}</div>
                          </div>
                          {promptToRun && (
                            <button
                              type="button"
                              onClick={() => handleSend(promptToRun)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#7c2d12] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0 hover:bg-[#5c1c0a]"
                            >
                              <span>Run Agent Fix</span>
                              <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bug Diagnostic Scanner */}
              {diagnostics && (() => {
                const bugs = diagnostics.bugs || diagnostics.issues || [];
                const bugsCount = diagnostics.bugsCount ?? diagnostics.issuesFound ?? bugs.length;
                const isHealthy = diagnostics.healthy !== undefined ? diagnostics.healthy : bugsCount === 0;
                return (
                  <div className="bg-white border border-[#e5d8c8] rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#2a160d] flex items-center gap-1.5">
                        {isHealthy ? (
                          <CheckCircle2 size={14} className="text-[#047857]" />
                        ) : (
                          <ShieldAlert size={14} className="text-[#c62828]" />
                        )}
                        <span>
                          System Diagnostic: {isHealthy ? "Healthy" : "Issues Detected"} ({bugsCount} issue{bugsCount === 1 ? "" : "s"})
                        </span>
                      </div>
                    </div>

                    {bugs.length > 0 ? (
                      <div className="space-y-1.5">
                        {bugs.map((iss, idx) => (
                          <div
                            key={iss.id || idx}
                            className="p-2.5 rounded-lg bg-[#fffbeb] border border-[#fde68a] text-xs text-[#78350f] flex items-start gap-2"
                          >
                            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[#d97706]" />
                            <div>
                              <div className="font-bold">
                                [{String(iss.severity || "medium").toUpperCase()}] {iss.category} {iss.title ? `· ${iss.title}` : ""}
                              </div>
                              <div>{iss.detail || iss.message}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-[#047857] font-medium">
                        All MongoDB collections, product slugs, images, and SEO metadata verified healthy.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* VIP Buyers & Top Sellers */}
              {growthAudit && (growthAudit.vipBuyers?.length > 0 || (growthAudit.topSellers || growthAudit.topProducts)?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {growthAudit.vipBuyers?.length > 0 && (
                    <div className="bg-white border border-[#e5d8c8] rounded-xl p-3.5 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#7c2d12]">
                        Top VIP Devotees
                      </div>
                      <div className="space-y-2">
                        {growthAudit.vipBuyers.slice(0, 5).map((vip, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs border-b border-[#f3ebe0] pb-1.5 last:border-b-0">
                            <div className="min-w-0">
                              <div className="font-bold text-[#2a160d] truncate">{vip.name}</div>
                              <div className="text-[11px] text-[#6b5e55] tabular-nums">
                                {vip.ordersCount} orders · ₹{Number(vip.totalSpent || 0).toLocaleString("en-IN")}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const msg = `Namaste ${vip.name} ji, Aura Rudraksha par aapke vishwas ke liye dhanyavaad! Special VIP blessing code: SHIVA15`;
                                navigator.clipboard?.writeText(msg);
                                emitToast("VIP WhatsApp message copied.", "success");
                              }}
                              className="px-2 py-1 rounded border border-[#d6c4b0] bg-[#fdfbf7] text-[11px] font-semibold text-[#5c2b09] inline-flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Copy size={11} /> Copy WA
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(growthAudit.topSellers || growthAudit.topProducts)?.length > 0 && (
                    <div className="bg-white border border-[#e5d8c8] rounded-xl p-3.5 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#7c2d12]">
                        Top Selling Catalog Items
                      </div>
                      <div className="space-y-2">
                        {(growthAudit.topSellers || growthAudit.topProducts).slice(0, 5).map((tp, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs border-b border-[#f3ebe0] pb-1.5 last:border-b-0">
                            <span className="font-semibold text-[#2a160d] truncate">{tp.name}</span>
                            <span className="text-[#57493f] tabular-nums shrink-0">
                              {tp.units ?? tp.unitsSold ?? 0} sold{tp.revenue ? ` · ₹${Number(tp.revenue).toLocaleString("en-IN")}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Model Selector Modal (Fallback Reasoning Preference — Server-Managed Auth) */}
      {showModelModal && (
        <div className="fixed inset-0 bg-black/50 z-[10050] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-[#e5dccb] shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#2a160d] flex items-center gap-2 m-0">
                <Cpu size={17} className="text-[#7c2d12]" />
                <span>Agent Fallback Model Preference</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="text-[#6b5e55] hover:text-[#2a160d] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-[#6b5e55] mb-3">
              Primary tool-calling runs server-side automatically. Choose which NVIDIA NIM model acts as the backup reasoning engine.
            </p>
            <form onSubmit={handleSaveModelConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4a2715] mb-1.5">
                  Backup Reasoning Model:
                </label>
                <select
                  value={selectedNimModel}
                  onChange={(e) => setSelectedNimModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#d6c4b0] text-xs bg-[#fdfbf7]"
                >
                  {AVAILABLE_NIM_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModelModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#d6c4b0] bg-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingModel}
                  className="px-4 py-2 rounded-lg bg-[#7c2d12] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{savingModel ? "Saving..." : "Save Model"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAIAgentChat;
