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
  Play,
  Pause,
  Square,
  History,
  Copy,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  PanelRightOpen,
  PanelRightClose
} from "lucide-react";
import { auraAiClient } from "../../lib/auraAiClient";
import { db, emitStoreUpdate } from "../../lib/db";
import { AuraAIMessageContent } from "../AuraAIMessageContent";
import { emitToast } from "../../context/ToastContext";

export const NIM_MODEL_OPTIONS = [
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "NVIDIA Llama-3.1-Nemotron-70B-Instruct (Primary)" },
  { id: "nvidia/nemotron-3-super-120b-a12b", label: "NVIDIA Nemotron-3 Super 120B" },
  { id: "meta/llama-3.3-70b-instruct", label: "Meta Llama-3.3-70B-Instruct (NIM)" },
  { id: "mistralai/mixtral-8x22b-instruct-v0.1", label: "Mixtral 8x22B Instruct (NIM)" },
  { id: "deepseek-ai/deepseek-r1", label: "DeepSeek-R1 Reasoning (NIM)" }
];

const QUICK_COMMANDS = [
  {
    label: "+ Add Product",
    prompt: "Naya product \"8 Mukhi Nepali Rudraksha\" price 2499 stock 15 add karo"
  },
  {
    label: "Auto SEO Keywords",
    prompt: "Sabhi products ke liye Hindi aur English SEO keywords generate karke save karo"
  },
  {
    label: "GitHub Public Tools",
    prompt: "GitHub par ecommerce SEO schema aur WhatsApp store tools search karke dikhao"
  },
  {
    label: "Google Market Trends",
    prompt: "Google par India Rudraksha online market trends research karke dikhao"
  },
  {
    label: "Growth & Health Audit",
    prompt: "Poora store revenue, COD vs Online, unpaid orders, low stock aur VIP buyers ka Growth Audit dikhao"
  },
  {
    label: "Scan & Fix Bugs",
    prompt: "Storefront, products aur SEO ke bugs scan karo aur auto-fix kar do"
  },
  {
    label: "Train AI & Trends",
    prompt: "Aura AI aur Admin AI ko live store data aur public trends par retrain karo aur trending products dikhao"
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
  embedStudio = false,
  pageContext = "",
  onCloseDrawer = null,
  onActionExecuted = null
}) {
  const showInternalTabs = drawerMode && !embedStudio;
  const [subTab, setSubTab] = useState("chat");
  const [sessionId] = useState("admin_master_session");

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
  const [confirmReset, setConfirmReset] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRoute, setPreviewRoute] = useState("/");
  const [previewViewport, setPreviewViewport] = useState("desktop");
  const [previewNonce, setPreviewNonce] = useState(0);

  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [undoingId, setUndoingId] = useState("");
  const actionsLoadedRef = useRef(false);

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

  const [diagnostics, setDiagnostics] = useState(null);
  const [growthAudit, setGrowthAudit] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const auditLoadedRef = useRef(false);

  const [showModelModal, setShowModelModal] = useState(false);
  const [selectedNimModel, setSelectedNimModel] = useState("nvidia/llama-3.1-nemotron-70b-instruct");
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
        setSessionError("Admin authentication required. Please re-sign in to unlock autonomous store tools.");
      } else {
        setSessionError(sessionRes?.message || "Could not load Admin Agent session.");
      }
      if (settingsRes) {
        const m = settingsRes.selectedNimModel || settingsRes.nemotronModel || settingsRes.nvidiaModel;
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
  }, [messages, subTab]);

  const fetchActions = useCallback(async () => {
    setLoadingActions(true);
    try {
      const res = await auraAiClient.getAdminActionLogs();
      if (res?.success) {
        setActions(Array.isArray(res.actions) ? res.actions : []);
      }
    } finally {
      setLoadingActions(false);
      actionsLoadedRef.current = true;
    }
  }, []);

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoadingTasks(true);
    try {
      const res = await auraAiClient.getAdminTasks();
      if (res?.success) {
        setTasks(Array.isArray(res.tasks) ? res.tasks : []);
      }
    } finally {
      if (!silent) setLoadingTasks(false);
      tasksLoadedRef.current = true;
    }
  }, []);

  const fetchDiagnosticsAndAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const [diagRes, auditRes] = await Promise.all([
        auraAiClient.getAdminDiagnostics(),
        auraAiClient.getAdminGrowthAudit("all")
      ]);
      if (diagRes?.success) setDiagnostics(diagRes.report || null);
      if (auditRes?.success) setGrowthAudit(auditRes.audit || null);
    } finally {
      setLoadingAudit(false);
      auditLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!showInternalTabs) return;
    if (subTab === "actions" && !actionsLoadedRef.current) {
      fetchActions();
    } else if (subTab === "tasks" && !tasksLoadedRef.current) {
      fetchTasks();
    } else if (subTab === "audit" && !auditLoadedRef.current) {
      fetchDiagnosticsAndAudit();
    }
  }, [subTab, showInternalTabs, fetchActions, fetchTasks, fetchDiagnosticsAndAudit]);

  const hasRunningTask = tasks.some(t => t.status === "running");
  useEffect(() => {
    if (!showInternalTabs || subTab !== "tasks" || !hasRunningTask) return undefined;
    const timer = setInterval(() => {
      fetchTasks(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [showInternalTabs, subTab, hasRunningTask, fetchTasks]);

  const syncFrontendStoreAfterAgentActions = useCallback(async (executedList = []) => {
    try {
      // Remove any newly created/restored IDs from local deleted-product blocklist
      if (typeof window !== "undefined" && Array.isArray(executedList)) {
        try {
          const rawDel = localStorage.getItem("aura_deleted_product_ids");
          if (rawDel) {
            const delSet = new Set(JSON.parse(rawDel));
            let changed = false;
            for (const act of executedList) {
              if (act?.product?.id && delSet.delete(String(act.product.id))) changed = true;
              if (act?.product?.slug && delSet.delete(String(act.product.slug))) changed = true;
            }
            if (changed) {
              localStorage.setItem("aura_deleted_product_ids", JSON.stringify(Array.from(delSet)));
            }
          }
        } catch (_) {}
      }

      if (typeof db.invalidateLocalProductCache === "function") {
        db.invalidateLocalProductCache();
      }
      await Promise.all([
        db.revalidateProducts ? db.revalidateProducts(true).catch(() => {}) : Promise.resolve(),
        db.fetchHomeData ? db.fetchHomeData(true).catch(() => {}) : Promise.resolve()
      ]);
      const freshProducts = db.getProducts ? db.getProducts() : [];
      if (typeof emitStoreUpdate === "function") {
        emitStoreUpdate("products:synced", freshProducts);
      }
    } catch (err) {
      console.warn("[AdminAIAgentChat] Store cache sync notice:", err?.message || err);
    }
  }, []);

  const openLivePreview = (route) => {
    const cleanRoute = route && String(route).startsWith("/") ? route : "/";
    setPreviewRoute(cleanRoute);
    setPreviewOpen(true);
    setPreviewNonce(n => n + 1);
  };

  const handleSend = async (overridePrompt = null) => {
    const textToSend = (overridePrompt !== null ? overridePrompt : input).trim();
    if (!textToSend || isExecuting) return;

    const tempUserMsg = {
      id: `temp_u_${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    const nextMessages = [...messages, tempUserMsg];
    setMessages(nextMessages);
    if (overridePrompt === null) setInput("");
    setIsExecuting(true);
    if (showInternalTabs && subTab !== "chat") setSubTab("chat");

    try {
      const payloadMsgs = nextMessages.map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));
      const res = await auraAiClient.sendAdminChat(payloadMsgs, sessionId, pageContext);

      if (res?.error) {
        setMessages(prev => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "ai",
            text: `Execution notice: ${res.error}`,
            timestamp: new Date().toISOString()
          }
        ]);
      } else if (Array.isArray(res?.messages) && res.messages.length > 0) {
        setMessages(res.messages.map(normalizeMsg));
        if (res.previewRoute && Array.isArray(res.actionsExecuted) && res.actionsExecuted.length > 0) {
          setPreviewRoute(res.previewRoute);
          setPreviewNonce(n => n + 1);
        }
        if (Array.isArray(res.actionsExecuted) && res.actionsExecuted.length > 0) {
          actionsLoadedRef.current = false;
          await syncFrontendStoreAfterAgentActions(res.actionsExecuted);
          emitToast(`${res.actionsExecuted.length} store action(s) executed & synced.`, "success");
          if (typeof onActionExecuted === "function") onActionExecuted(res.actionsExecuted);
        }
      } else {
        setMessages(prev => [
          ...prev,
          normalizeMsg({
            sender: "ai",
            text: res?.text || "Command processed.",
            modelUsed: res?.modelUsed,
            actionsExecuted: res?.actionsExecuted || [],
            previewRoute: res?.previewRoute || ""
          })
        ]);
        if (Array.isArray(res?.actionsExecuted) && res.actionsExecuted.length > 0) {
          actionsLoadedRef.current = false;
          await syncFrontendStoreAfterAgentActions(res.actionsExecuted);
          if (typeof onActionExecuted === "function") onActionExecuted(res.actionsExecuted);
        }
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "ai",
          text: `Failed to reach AI Agent: ${e?.message || "Unknown error"}`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = async (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await auraAiClient.deleteAdminAgentMessage(msgId, sessionId).catch(() => {});
  };

  const handleConfirmClearSession = async () => {
    setConfirmReset(false);
    const res = await auraAiClient.clearAdminAgentSession(sessionId);
    if (res?.success && res.session) {
      setMessages((res.session.messages || []).map(normalizeMsg));
      emitToast("Agent session reset cleanly.", "success");
    } else {
      emitToast("Could not reset session.", "error");
    }
  };

  const handleUndoAction = async (actionId) => {
    if (!actionId || undoingId) return;
    setUndoingId(actionId);
    try {
      const res = await auraAiClient.undoAdminAction(actionId);
      if (res?.success) {
        emitToast(res.message || "Reverted change cleanly.", "success");
        setActions(prev =>
          prev.map(a =>
            a.actionId === actionId ? { ...a, reverted: true, revertedAt: new Date().toISOString() } : a
          )
        );
        setMessages(prev =>
          prev.map(m => ({
            ...m,
            actionsExecuted: (m.actionsExecuted || []).map(act =>
              act.actionId === actionId ? { ...act, reverted: true } : act
            )
          }))
        );
        setPreviewNonce(n => n + 1);
        await syncFrontendStoreAfterAgentActions([]);
        if (typeof onActionExecuted === "function") onActionExecuted([]);
      } else {
        emitToast(res?.message || "Could not undo action.", "error");
      }
    } finally {
      setUndoingId("");
    }
  };

  const handleDeleteActionLog = async (actionId) => {
    setActions(prev => prev.filter(a => a.actionId !== actionId));
    await auraAiClient.deleteAdminActionLog(actionId).catch(() => {});
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.prompt.trim() || creatingTask) return;
    setCreatingTask(true);
    try {
      const res = await auraAiClient.createAdminTask(newTask);
      if (res?.success && res.task) {
        setTasks(prev => [res.task, ...prev]);
        setNewTask({
          title: "",
          prompt: "",
          taskType: "growth_audit",
          durationMinutes: 60,
          intervalMinutes: 15
        });
        emitToast("Autonomous background task started.", "success");
      } else {
        emitToast(res?.message || "Could not create task.", "error");
      }
    } finally {
      setCreatingTask(false);
    }
  };

  const handleControlTask = async (taskId, command, extra = {}) => {
    const res = await auraAiClient.controlAdminTask(taskId, command, extra);
    if (res?.success) {
      if (res.task) {
        setTasks(prev => prev.map(t => (t.taskId === taskId ? res.task : t)));
      } else {
        fetchTasks(true);
      }
      emitToast(res.message || `Task ${command} completed.`, "success");
    } else {
      emitToast(res?.message || "Task action failed.", "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    setTasks(prev => prev.filter(t => t.taskId !== taskId));
    await auraAiClient.deleteAdminTask(taskId).catch(() => {});
    emitToast("Task removed.", "success");
  };

  const handleAutoFixBugs = async () => {
    setAutoFixing(true);
    try {
      const res = await auraAiClient.executeAdminAgentAction("AUTO_FIX_BUGS", {}, sessionId);
      if (res?.success) {
        emitToast(res.result?.title || "Storefront issues repaired.", "success");
        await syncFrontendStoreAfterAgentActions(res.result ? [res.result] : []);
        await fetchDiagnosticsAndAudit();
        actionsLoadedRef.current = false;
      } else {
        emitToast(res?.message || "Auto-fix could not complete.", "error");
      }
    } finally {
      setAutoFixing(false);
    }
  };

  const handleRetrainKnowledge = async () => {
    setRetraining(true);
    try {
      const res = await auraAiClient.executeAdminAgentAction("RETRAIN_AI_KNOWLEDGE", { forceRefresh: true }, sessionId);
      if (res?.success) {
        emitToast("Public trends & RAG knowledge index updated.", "success");
        await syncFrontendStoreAfterAgentActions([]);
        actionsLoadedRef.current = false;
      } else {
        emitToast(res?.message || "Retrain failed.", "error");
      }
    } finally {
      setRetraining(false);
    }
  };

  const handleSaveModel = async (e) => {
    e.preventDefault();
    setSavingModel(true);
    try {
      const res = await auraAiClient.updateSettings({
        nemotronModel: selectedNimModel,
        selectedNimModel
      });
      if (res?.success !== false) {
        emitToast(`Active model updated to ${selectedNimModel}`, "success");
        setShowModelModal(false);
      } else {
        emitToast(res?.message || "Could not update model setting.", "error");
      }
    } finally {
      setSavingModel(false);
    }
  };

  const handleCopyText = (txt) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).then(() => emitToast("Copied to clipboard.", "success")).catch(() => {});
    }
  };

  const containerHeightClass = drawerMode
    ? "h-full"
    : compact
    ? "h-[600px]"
    : "h-[calc(100vh-205px)] min-h-[620px]";

  const activeModelShort = selectedNimModel.split("/").pop() || "nemotron-70b";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 ${containerHeightClass}`}
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Top Studio Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8C2B10] text-white">
            <Bot size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-slate-900">
                Autonomous Admin Copilot
              </h2>
              <span className="hidden font-mono text-[11px] font-medium text-emerald-700 sm:inline">
                Online · Live Read/Write
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-500">
              <span className="font-mono">{activeModelShort}</span>
              {pageContext ? (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="font-mono">{pageContext}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowModelModal(true)}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <SlidersHorizontal size={13} />
            <span>Model</span>
          </button>

          {subTab === "chat" && (
            <button
              type="button"
              onClick={() => (previewOpen ? setPreviewOpen(false) : openLivePreview(previewRoute))}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                previewOpen
                  ? "border-[#8C2B10] bg-[#8C2B10] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {previewOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
              <span>{previewOpen ? "Close Preview" : "Live Preview"}</span>
            </button>
          )}

          {subTab === "chat" && !confirmReset && (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              title="Reset chat history"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          {subTab === "chat" && confirmReset && (
            <div className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1">
              <span className="text-[11px] font-medium text-red-700">Clear chat?</span>
              <button
                type="button"
                onClick={handleConfirmClearSession}
                className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
            </div>
          )}

          {drawerMode && onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              aria-label="Close Copilot Drawer"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Drawer-Only Sub-Navigation (Omitted inside dedicated Command Center to prevent nested tabs) */}
      {showInternalTabs && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-[#F8FAFC] px-3 py-1.5">
          {[
            { id: "chat", label: "Copilot Chat", icon: Bot },
            { id: "actions", label: "Action Ledger", icon: History },
            { id: "tasks", label: "Tasks", icon: RefreshCw },
            { id: "audit", label: "Diagnostics", icon: Wrench }
          ].map(t => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border border-slate-200 bg-white font-semibold text-[#8C2B10]"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                }`}
              >
                <Icon size={13} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-[#F8FAFC]">
        {/* CHAT WORKSPACE */}
        {(subTab === "chat" || !showInternalTabs) && (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Conversation Pane */}
            <div
              className={`flex min-w-0 flex-1 flex-col overflow-hidden ${
                previewOpen && !drawerMode ? "border-r border-slate-200" : ""
              } ${previewOpen && drawerMode ? "hidden" : ""}`}
            >
              {/* Quick Prompts Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2">
                <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Run:
                </span>
                {QUICK_COMMANDS.map((cmd, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isExecuting}
                    onClick={() => handleSend(cmd.prompt)}
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-[#8C2B10]/40 hover:bg-[#8C2B10]/5 hover:text-[#8C2B10] disabled:opacity-50"
                  >
                    <Sparkles size={11} className="text-[#8C2B10]" />
                    <span>{cmd.label}</span>
                  </button>
                ))}
              </div>

              {/* Message Thread */}
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {loadingSession ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-xs font-medium text-slate-600">
                    <Loader2 size={15} className="animate-spin text-[#8C2B10]" />
                    <span>Loading persistent Admin AI session...</span>
                  </div>
                ) : sessionError ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} />
                      <span>{sessionError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={loadSession}
                      className="shrink-0 whitespace-nowrap rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isUser = msg.sender === "user";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[92%] rounded-xl px-4 py-3 text-[13.5px] leading-relaxed ${
                            isUser
                              ? "bg-[#8C2B10] text-white"
                              : "border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          {/* Inline Header Metadata (Zero Pills) */}
                          <div
                            className={`mb-1.5 flex items-center justify-between gap-4 text-[11px] ${
                              isUser ? "text-amber-100/80" : "text-slate-500"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-1.5 font-medium">
                              <span className={isUser ? "text-white" : "font-semibold text-slate-900"}>
                                {isUser ? "Admin" : "Aura Copilot"}
                              </span>
                              {!isUser && msg.modelUsed && (
                                <>
                                  <span>·</span>
                                  <span className="truncate font-mono text-[10.5px]">
                                    {msg.modelUsed.split("/").pop()}
                                  </span>
                                </>
                              )}
                              {msg.timestamp && (
                                <>
                                  <span>·</span>
                                  <span className="font-mono tabular-nums">{formatTime(msg.timestamp)}</span>
                                </>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopyText(msg.text)}
                                title="Copy text"
                                className={`rounded p-1 transition ${
                                  isUser ? "hover:bg-white/15" : "hover:bg-slate-100"
                                }`}
                              >
                                <Copy size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                title="Delete message"
                                className={`rounded p-1 transition ${
                                  isUser ? "hover:bg-white/15" : "hover:bg-slate-100 hover:text-red-600"
                                }`}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          {/* Body */}
                          {isUser ? (
                            <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                          ) : (
                            <div className="prose-sm max-w-none break-words text-slate-800">
                              <AuraAIMessageContent text={msg.text} />
                            </div>
                          )}

                          {/* Execution Receipts + 1-Click Undo */}
                          {!isUser && Array.isArray(msg.actionsExecuted) && msg.actionsExecuted.length > 0 && (
                            <div className="mt-3 space-y-2 border-t border-slate-200 pt-2.5">
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Executed Actions ({msg.actionsExecuted.length})
                              </div>
                              {msg.actionsExecuted.map((act, idx) => (
                                <div
                                  key={act.actionId || idx}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                      <CheckCircle2
                                        size={13}
                                        className={act.reverted ? "text-amber-600" : "text-emerald-600"}
                                      />
                                      <span className="truncate">{act.title || act.actionType}</span>
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] text-slate-500">
                                      <span>{act.actionType}</span>
                                      {act.previewRoute && (
                                        <>
                                          <span>·</span>
                                          <span>{act.previewRoute}</span>
                                        </>
                                      )}
                                      {act.reverted && (
                                        <>
                                          <span>·</span>
                                          <span className="font-sans font-semibold text-amber-700">Reverted</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1.5">
                                    {act.previewRoute && (
                                      <button
                                        type="button"
                                        onClick={() => openLivePreview(act.previewRoute)}
                                        className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                      >
                                        <Eye size={11} />
                                        <span>Preview</span>
                                      </button>
                                    )}
                                    {act.actionId && !act.reverted && (
                                      <button
                                        type="button"
                                        disabled={undoingId === act.actionId}
                                        onClick={() => handleUndoAction(act.actionId)}
                                        className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                                      >
                                        {undoingId === act.actionId ? (
                                          <Loader2 size={11} className="animate-spin" />
                                        ) : (
                                          <RotateCcw size={11} />
                                        )}
                                        <span>Undo</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Page Preview Link Button */}
                          {!isUser && msg.previewRoute && (
                            <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2">
                              <button
                                type="button"
                                onClick={() => openLivePreview(msg.previewRoute)}
                                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#8C2B10] hover:bg-[#8C2B10]/5"
                              >
                                <Eye size={12} />
                                <span>Inspect {msg.previewTitle || msg.previewRoute}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {isExecuting && (
                  <div className="flex items-start">
                    <div className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-700">
                      <Loader2 size={14} className="animate-spin text-[#8C2B10]" />
                      <span>Agent running tool execution on store database...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Composer Bar */}
              <div className="border-t border-slate-200 bg-white p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={drawerMode ? 2 : 2}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isExecuting}
                    placeholder="Command Admin AI in Hindi/Hinglish/English (e.g., '8 Mukhi product price 1899 add karo', '7 Mukhi delete karo', 'GitHub public SEO tools dikhao')..."
                    className="min-h-[46px] max-h-32 flex-1 resize-none rounded-lg border border-slate-300 bg-[#F8FAFC] px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:border-[#8C2B10] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isExecuting}
                    className="inline-flex h-[46px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#8C2B10] px-4 text-xs font-semibold text-white transition hover:bg-[#73230c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>Execute</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Docked Live Preview Pane */}
            {previewOpen && (
              <div
                className={`flex flex-col bg-white ${
                  drawerMode ? "w-full" : "w-[44%] min-w-[340px] max-w-[580px]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-[#F8FAFC] px-3 py-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <select
                      value={previewRoute}
                      onChange={(e) => openLivePreview(e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11.5px] text-slate-800 focus:border-[#8C2B10] focus:outline-none"
                    >
                      {pagesDirectory.map(p => (
                        <option key={p.route} value={p.route}>
                          {p.title} ({p.route})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("desktop")}
                      title="Desktop preview"
                      className={`rounded p-1.5 ${
                        previewViewport === "desktop" ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <Monitor size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("mobile")}
                      title="Mobile preview"
                      className={`rounded p-1.5 ${
                        previewViewport === "mobile" ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <Smartphone size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewNonce(n => n + 1)}
                      title="Reload preview"
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <a
                      href={previewRoute}
                      target="_blank"
                      rel="noreferrer"
                      title="Open route in new tab"
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                      <ExternalLink size={13} />
                    </a>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(false)}
                      title="Close preview"
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-2">
                  <iframe
                    key={`${previewRoute}-${previewNonce}`}
                    src={previewRoute}
                    title="Live Website Preview"
                    className={`h-full rounded-lg border border-slate-200 bg-white ${
                      previewViewport === "mobile" ? "w-[390px] max-w-full" : "w-full"
                    }`}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* DRAWER ACTION LEDGER TAB */}
        {showInternalTabs && subTab === "actions" && (
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Action Ledger & 1-Click Undo</h3>
                <p className="text-xs text-slate-500">Every database mutation records a full previous snapshot.</p>
              </div>
              <button
                type="button"
                onClick={fetchActions}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={12} className={loadingActions ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingActions ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                Loading action history...
              </div>
            ) : actions.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                No agent mutations recorded yet. Run a command in Copilot Chat to begin.
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map(act => (
                  <div
                    key={act.actionId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            act.reverted
                              ? "border border-amber-200 bg-amber-50 text-amber-800"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {act.reverted ? "Reverted" : "Applied"}
                        </span>
                        <span className="truncate text-xs font-semibold text-slate-900">{act.title}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-500">
                        <span>{act.actionType}</span>
                        <span>·</span>
                        <span>{act.targetCollection}</span>
                        <span>·</span>
                        <span className="tabular-nums">{formatDateTime(act.timestamp)}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {!act.reverted && (
                        <button
                          type="button"
                          disabled={undoingId === act.actionId}
                          onClick={() => handleUndoAction(act.actionId)}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                        >
                          <RotateCcw size={11} />
                          <span>Undo</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteActionLog(act.actionId)}
                        className="rounded border border-slate-200 bg-white p-1 text-slate-400 hover:text-red-600"
                        title="Remove log entry"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DRAWER TASKS TAB */}
        {showInternalTabs && subTab === "tasks" && (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <form onSubmit={handleCreateTask} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="text-xs font-semibold text-slate-900">Launch Autonomous Background Task</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                  placeholder="Task title (e.g., Hourly Bug Guard)"
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs focus:border-[#8C2B10] focus:outline-none"
                />
                <select
                  value={newTask.taskType}
                  onChange={e => setNewTask(p => ({ ...p, taskType: e.target.value }))}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-[#8C2B10] focus:outline-none"
                >
                  <option value="growth_audit">Growth & Orders Audit</option>
                  <option value="bug_scanner">Bug & SEO Auto-Scanner</option>
                  <option value="inventory_guardian">Low Stock Guardian</option>
                  <option value="seo_optimizer">SEO Optimizer</option>
                  <option value="custom">Custom Instruction</option>
                </select>
              </div>
              <textarea
                rows={2}
                required
                value={newTask.prompt}
                onChange={e => setNewTask(p => ({ ...p, prompt: e.target.value }))}
                placeholder="Instruction for autonomous runs..."
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs focus:border-[#8C2B10] focus:outline-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <span>Duration (min):</span>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={newTask.durationMinutes}
                    onChange={e => setNewTask(p => ({ ...p, durationMinutes: Number(e.target.value) || 60 }))}
                    className="w-16 rounded border border-slate-300 px-2 py-1 font-mono text-xs tabular-nums"
                  />
                  <span>Interval (min):</span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={newTask.intervalMinutes}
                    onChange={e => setNewTask(p => ({ ...p, intervalMinutes: Number(e.target.value) || 15 }))}
                    className="w-16 rounded border border-slate-300 px-2 py-1 font-mono text-xs tabular-nums"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#8C2B10] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#73230c] disabled:opacity-50"
                >
                  {creatingTask ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  <span>Start Task</span>
                </button>
              </div>
            </form>

            {loadingTasks ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                Loading background tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                No scheduled tasks running.
              </div>
            ) : (
              <div className="space-y-2.5">
                {tasks.map(t => (
                  <div key={t.taskId} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              t.status === "running"
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                : t.status === "paused"
                                ? "border border-amber-200 bg-amber-50 text-amber-800"
                                : "border border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {t.status}
                          </span>
                          <span className="truncate text-xs font-semibold text-slate-900">{t.title}</span>
                        </div>
                        <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">
                          Runs: {t.runsCount || 0} · Every {t.intervalMinutes}m · {t.taskType}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleControlTask(t.taskId, "run_now")}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Run Now
                        </button>
                        {t.status === "running" ? (
                          <button
                            type="button"
                            onClick={() => handleControlTask(t.taskId, "pause")}
                            className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50"
                            title="Pause"
                          >
                            <Pause size={12} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleControlTask(t.taskId, "resume")}
                            className="rounded border border-slate-200 bg-white p-1 text-emerald-700 hover:bg-emerald-50"
                            title="Resume"
                          >
                            <Play size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleControlTask(t.taskId, "stop")}
                          className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50"
                          title="Stop"
                        >
                          <Square size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.taskId)}
                          className="rounded border border-slate-200 bg-white p-1 text-slate-400 hover:text-red-600"
                          title="Delete task"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={taskCmdInputs[t.taskId] || ""}
                        onChange={e => setTaskCmdInputs(p => ({ ...p, [t.taskId]: e.target.value }))}
                        placeholder="Send updated instruction..."
                        className="flex-1 rounded border border-slate-200 bg-[#F8FAFC] px-2 py-1 text-[11.5px] focus:border-[#8C2B10] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const cmd = (taskCmdInputs[t.taskId] || "").trim();
                          if (!cmd) return;
                          handleControlTask(t.taskId, "send_command", { instruction: cmd });
                          setTaskCmdInputs(p => ({ ...p, [t.taskId]: "" }));
                        }}
                        className="shrink-0 whitespace-nowrap rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#8C2B10] hover:bg-[#8C2B10]/5"
                      >
                        Dispatch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DRAWER DIAGNOSTICS TAB */}
        {showInternalTabs && subTab === "audit" && (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchDiagnosticsAndAudit}
                disabled={loadingAudit}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={12} className={loadingAudit ? "animate-spin" : ""} />
                <span>Run Live Scan</span>
              </button>
              <button
                type="button"
                onClick={handleAutoFixBugs}
                disabled={autoFixing}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#8C2B10] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#73230c] disabled:opacity-50"
              >
                {autoFixing ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
                <span>Auto-Fix All</span>
              </button>
              <button
                type="button"
                onClick={handleRetrainKnowledge}
                disabled={retraining}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <TrendingUp size={12} />
                <span>{retraining ? "Retraining..." : "Train Public Trends"}</span>
              </button>
            </div>

            {growthAudit?.metrics && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-[11px] font-medium text-slate-500">Revenue</div>
                  <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-slate-900">
                    ₹{Number(growthAudit.metrics.totalRevenue || 0).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-[11px] font-medium text-slate-500">Low / OOS Products</div>
                  <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-slate-900">
                    {growthAudit.metrics.lowStockCount || 0} / {growthAudit.metrics.outOfStockCount || 0}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  Detected Issues ({diagnostics?.bugsCount || 0})
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {diagnostics?.metrics?.productsScanned || 0} products scanned
                </span>
              </div>
              {loadingAudit ? (
                <div className="py-4 text-center text-xs text-slate-500">Scanning store...</div>
              ) : !diagnostics?.bugs?.length ? (
                <div className="flex items-center gap-2 py-2 text-xs font-medium text-emerald-700">
                  <Check size={14} />
                  <span>All scanned products, images, stock levels, and coupons look healthy.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {diagnostics.bugs.slice(0, 12).map(b => (
                    <div
                      key={b.id}
                      className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-[#F8FAFC] px-2.5 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{b.title}</div>
                        <div className="mt-0.5 text-[11px] text-slate-600">{b.detail}</div>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] font-semibold uppercase text-amber-700">
                        {b.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* NIM Model Selector Modal */}
      {showModelModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowModelModal(false)}
        >
          <form
            onSubmit={handleSaveModel}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-[#8C2B10]" />
                <h3 className="text-sm font-semibold text-slate-900">Select Active LLM Engine</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                NVIDIA NIM Primary Model (Automatic Gemini Fallback Active)
              </label>
              <select
                value={selectedNimModel}
                onChange={(e) => setSelectedNimModel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#8C2B10] focus:outline-none"
              >
                {NIM_MODEL_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingModel}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#8C2B10] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#73230c] disabled:opacity-50"
              >
                {savingModel ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                <span>Save Model</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminAIAgentChat;
