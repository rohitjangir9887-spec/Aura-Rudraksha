import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Cpu,
  History,
  Clock,
  Wrench,
  BarChart3,
  Settings as SettingsIcon,
  RefreshCw,
  RotateCcw,
  Trash2,
  Play,
  Pause,
  Square,
  Loader2,
  Check,
  CheckCircle2,
  X,
  TrendingUp,
  Search,
  MessageSquare,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  Database,
  Send,
  Sparkles
} from "lucide-react";
import { AdminLayout } from "../../components/AdminLayout";
import { AdminAIAgentChat, WEBSITE_AI_MODEL_OPTIONS } from "../../components/admin/AdminAIAgentChat";
import { auraAiClient } from "../../lib/auraAiClient";
import { emitToast } from "../../context/ToastContext";
import { db, isPublicProduct, emitStoreUpdate, onStoreUpdate } from "../../lib/db";

const TOP_TABS = [
  { id: "agent", label: "Agent Studio", icon: Bot },
  { id: "models", label: "Website AI Models", icon: Cpu },
  { id: "actions", label: "Action Ledger", icon: History },
  { id: "tasks", label: "Background Tasks", icon: Clock },
  { id: "diagnostics", label: "Diagnostics & Trends", icon: Wrench },
  { id: "customer", label: "Customer Bot", icon: BarChart3 },
  { id: "config", label: "Configuration", icon: SettingsIcon }
];

const VALID_TAB_IDS = new Set(TOP_TABS.map((t) => t.id));

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (_) {
    return String(iso);
  }
}

export function AdminAI() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const initialTab = VALID_TAB_IDS.has(urlTab) ? urlTab : "agent";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const paramTab = searchParams.get("tab");
    const nextTab = VALID_TAB_IDS.has(paramTab) ? paramTab : "agent";
    setActiveTab(nextTab);
  }, [searchParams]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "agent") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: tabId }, { replace: true });
    }
  };

  // Action Ledger state
  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [undoingId, setUndoingId] = useState("");
  const [expandedActionId, setExpandedActionId] = useState("");
  const actionsLoadedRef = useRef(false);

  // Background Tasks state
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskCmdInputs, setTaskCmdInputs] = useState({});
  const [newTask, setNewTask] = useState({
    title: "",
    prompt: "",
    taskType: "growth_audit",
    durationMinutes: 60,
    intervalMinutes: 15
  });
  const tasksLoadedRef = useRef(false);

  // Diagnostics & Public Trends state
  const [diagnostics, setDiagnostics] = useState(null);
  const [growthAudit, setGrowthAudit] = useState(null);
  const [publicTrends, setPublicTrends] = useState(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const diagnosticsLoadedRef = useRef(false);

  // Customer Bot Analytics & Conversations state
  const [analytics, setAnalytics] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [searchConvo, setSearchConvo] = useState("");
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const customerLoadedRef = useRef(false);

  // Customer Bot & Website AI Model Settings state
  const [settings, setSettings] = useState({
    enabled: true,
    showFloatingButton: true,
    showHeaderButton: true,
    language: "auto",
    tone: "polite_spiritual",
    greeting:
      "Namaste Main Aura AI hoon — Aura Rudraksha ka personal shopping aur support assistant. Aaj main aapki kis cheez mein help karun?",
    recommendProducts: true,
    recommendOffers: true,
    cartActions: true,
    orderSupport: true,
    humanSupport: true,
    activeAiModel: "nvidia/llama-3.1-nemotron-70b-instruct",
    nemotronModel: "nvidia/llama-3.1-nemotron-70b-instruct",
    selectedNimModel: "nvidia/llama-3.1-nemotron-70b-instruct",
    nvidiaModel: "nvidia/llama-3.1-nemotron-70b-instruct"
  });
  const [availableModels, setAvailableModels] = useState(WEBSITE_AI_MODEL_OPTIONS);
  const [customModelId, setCustomModelId] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const syncSettingsFromServer = useCallback((s) => {
    if (!s) return;
    const resolved =
      s.activeAiModel || s.selectedNimModel || s.nemotronModel || s.nvidiaModel || "nvidia/llama-3.1-nemotron-70b-instruct";
    setSettings((prev) => ({
      ...prev,
      ...s,
      activeAiModel: resolved,
      selectedNimModel: resolved,
      nemotronModel: resolved,
      nvidiaModel: resolved
    }));
    if (Array.isArray(s.availableModels) && s.availableModels.length > 0) {
      setAvailableModels(s.availableModels);
    }
  }, []);

  useEffect(() => {
    auraAiClient
      .getSettings()
      .then((s) => syncSettingsFromServer(s))
      .catch(() => {});
  }, [syncSettingsFromServer]);

  useEffect(() => {
    if (typeof onStoreUpdate !== "function") return undefined;
    return onStoreUpdate((eventName, payload) => {
      if (eventName === "ai-settings:updated" && payload) {
        syncSettingsFromServer(payload);
      }
    });
  }, [syncSettingsFromServer]);

  const loadActions = useCallback(async () => {
    setLoadingActions(true);
    try {
      const res = await auraAiClient.getAdminActionLogs();
      if (res?.success) setActions(Array.isArray(res.actions) ? res.actions : []);
    } finally {
      setLoadingActions(false);
      actionsLoadedRef.current = true;
    }
  }, []);

  const loadTasks = useCallback(async (silent = false) => {
    if (!silent) setLoadingTasks(true);
    try {
      const res = await auraAiClient.getAdminTasks();
      if (res?.success) setTasks(Array.isArray(res.tasks) ? res.tasks : []);
    } finally {
      if (!silent) setLoadingTasks(false);
      tasksLoadedRef.current = true;
    }
  }, []);

  const loadDiagnostics = useCallback(async (refreshTrends = false) => {
    setLoadingDiagnostics(true);
    try {
      const [diagRes, auditRes, trendsRes] = await Promise.all([
        auraAiClient.getAdminDiagnostics(),
        auraAiClient.getAdminGrowthAudit("all"),
        auraAiClient.getPublicTrends(refreshTrends)
      ]);
      if (diagRes?.success) setDiagnostics(diagRes.report || null);
      if (auditRes?.success) setGrowthAudit(auditRes.audit || null);
      if (trendsRes) setPublicTrends(trendsRes);
    } finally {
      setLoadingDiagnostics(false);
      diagnosticsLoadedRef.current = true;
    }
  }, []);

  const loadCustomerBotData = useCallback(async () => {
    setLoadingCustomer(true);
    try {
      const [analyticsRes, convosRes] = await Promise.all([
        auraAiClient.getAnalytics().catch(() => null),
        auraAiClient.getConversations().catch(() => [])
      ]);
      setAnalytics(analyticsRes || { hasData: false });
      setConversations(Array.isArray(convosRes) ? convosRes : []);

      await Promise.all([
        db.fetchProducts().catch(() => {}),
        db.fetchCoupons ? db.fetchCoupons().catch(() => {}) : Promise.resolve()
      ]);
      setProducts(db.getProducts().filter(isPublicProduct));
      setCoupons(db.getCoupons ? db.getCoupons() : []);
    } finally {
      setLoadingCustomer(false);
      customerLoadedRef.current = true;
    }
  }, []);

  // Lazy load per top-level view
  useEffect(() => {
    if (activeTab === "actions" && !actionsLoadedRef.current) loadActions();
    if (activeTab === "tasks" && !tasksLoadedRef.current) loadTasks();
    if (activeTab === "diagnostics" && !diagnosticsLoadedRef.current) loadDiagnostics(false);
    if (activeTab === "customer" && !customerLoadedRef.current) loadCustomerBotData();
  }, [activeTab, loadActions, loadTasks, loadDiagnostics, loadCustomerBotData]);

  // Conditional 15s polling when viewing Background Tasks and at least one task is running
  const hasRunningTask = tasks.some((t) => t.status === "running");
  useEffect(() => {
    if (activeTab !== "tasks" || !hasRunningTask) return undefined;
    const timer = setInterval(() => {
      loadTasks(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [activeTab, hasRunningTask, loadTasks]);

  const handleGlobalRefresh = () => {
    if (activeTab === "actions") loadActions();
    else if (activeTab === "tasks") loadTasks();
    else if (activeTab === "diagnostics") loadDiagnostics(true);
    else if (activeTab === "customer") loadCustomerBotData();
    else {
      auraAiClient.getSettings().then((s) => {
        syncSettingsFromServer(s);
      });
      emitToast("Live configuration synced.", "success");
    }
  };

  const handleUndo = async (actionId) => {
    if (!actionId || undoingId) return;
    setUndoingId(actionId);
    try {
      const res = await auraAiClient.undoAdminAction(actionId);
      if (res?.success) {
        emitToast(res.message || "Reverted store change.", "success");
        setActions((prev) =>
          prev.map((a) =>
            a.actionId === actionId ? { ...a, reverted: true, revertedAt: new Date().toISOString() } : a
          )
        );
      } else {
        emitToast(res?.message || "Undo failed.", "error");
      }
    } finally {
      setUndoingId("");
    }
  };

  const handleDeleteAction = async (actionId) => {
    setActions((prev) => prev.filter((a) => a.actionId !== actionId));
    await auraAiClient.deleteAdminActionLog(actionId).catch(() => {});
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.prompt.trim() || creatingTask) return;
    setCreatingTask(true);
    try {
      const res = await auraAiClient.createAdminTask(newTask);
      if (res?.success && res.task) {
        setTasks((prev) => [res.task, ...prev]);
        setNewTask({
          title: "",
          prompt: "",
          taskType: "growth_audit",
          durationMinutes: 60,
          intervalMinutes: 15
        });
        emitToast("Autonomous background task started.", "success");
      } else {
        emitToast(res?.message || "Failed to create task.", "error");
      }
    } finally {
      setCreatingTask(false);
    }
  };

  const handleTaskControl = async (taskId, command, extra = {}) => {
    const res = await auraAiClient.controlAdminTask(taskId, command, extra);
    if (res?.success) {
      if (res.task) {
        setTasks((prev) => prev.map((t) => (t.taskId === taskId ? res.task : t)));
      } else {
        loadTasks(true);
      }
      emitToast(res.message || `Task ${command} completed.`, "success");
    } else {
      emitToast(res?.message || "Task command failed.", "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
    await auraAiClient.deleteAdminTask(taskId).catch(() => {});
    emitToast("Task removed.", "success");
  };

  const handleAutoFix = async () => {
    setAutoFixing(true);
    try {
      const res = await auraAiClient.executeAdminAgentAction("AUTO_FIX_BUGS", {});
      if (res?.success) {
        emitToast(res.result?.title || "Detected issues auto-repaired.", "success");
        actionsLoadedRef.current = false;
        await loadDiagnostics(false);
      } else {
        emitToast(res?.message || "Auto-fix failed.", "error");
      }
    } finally {
      setAutoFixing(false);
    }
  };

  const handleRetrainPublicTrends = async () => {
    setRetraining(true);
    try {
      const res = await auraAiClient.executeAdminAgentAction("RETRAIN_AI_KNOWLEDGE", { forceRefresh: true });
      if (res?.success) {
        emitToast("RAG knowledge & public trends retrained.", "success");
        if (res.result?.trends) setPublicTrends(res.result.trends);
        else {
          const fresh = await auraAiClient.getPublicTrends(true);
          if (fresh) setPublicTrends(fresh);
        }
        actionsLoadedRef.current = false;
      } else {
        emitToast(res?.message || "Retrain failed.", "error");
      }
    } finally {
      setRetraining(false);
    }
  };

  const saveWebsiteAiModel = async (chosenModelId) => {
    const cleanModel = String(chosenModelId || "").trim();
    if (!cleanModel) {
      emitToast("Please select or enter a valid AI model ID.", "error");
      return;
    }
    setSavingSettings(true);
    try {
      const payload = {
        ...settings,
        activeAiModel: cleanModel,
        selectedNimModel: cleanModel,
        nemotronModel: cleanModel,
        nvidiaModel: cleanModel
      };
      const res = await auraAiClient.updateSettings(payload);
      if (res?.success) {
        syncSettingsFromServer(res.data || payload);
        if (typeof emitStoreUpdate === "function") {
          emitStoreUpdate("ai-settings:updated", payload);
        }
        setSavedSuccess(true);
        emitToast(`Website-wide AI model saved: ${cleanModel}`, "success");
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        emitToast(res?.message || "Failed to save AI model.", "error");
      }
    } catch (err) {
      emitToast(`Failed to save AI model: ${err?.message || "Unknown error"}`, "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const chosen =
      settings.activeAiModel ||
      settings.nemotronModel ||
      settings.selectedNimModel ||
      "nvidia/llama-3.1-nemotron-70b-instruct";
    await saveWebsiteAiModel(chosen);
  };

  const filteredConvos = conversations.filter((c) => {
    if (!searchConvo.trim()) return true;
    const q = searchConvo.toLowerCase();
    return (
      (c.userName && c.userName.toLowerCase().includes(q)) ||
      (c.userEmail && c.userEmail.toLowerCase().includes(q)) ||
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.lastMessageText && c.lastMessageText.toLowerCase().includes(q))
    );
  });

  const escalations = conversations.filter((c) => c.requiresHumanSupport || c.status === "Escalated");

  return (
    <AdminLayout>
      <div
        className="mx-auto max-w-[1440px] space-y-5 bg-[#F8FAFC] p-4 sm:p-6"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        {/* Top Command Center Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/admin"))}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                Aura AI Command Center
              </h1>
              <p className="truncate text-xs text-slate-500">
                Autonomous Store Agent · Live Diagnostics · Customer Bot Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/ai-chats"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <MessageSquare size={13} />
              <span>All Customer Chats</span>
              <ExternalLink size={11} className="text-slate-400" />
            </Link>
            <button
              type="button"
              onClick={handleGlobalRefresh}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#8C2B10] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#73230c]"
            >
              <RefreshCw size={13} />
              <span>Refresh Live Data</span>
            </button>
          </div>
        </header>

        {/* Single-Level Top Navigation Tabs */}
        <nav
          aria-label="AI Command Center Sections"
          className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5"
        >
          {TOP_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                  active
                    ? "bg-[#8C2B10] font-semibold text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* VIEW 1: AGENT STUDIO (No nested tabs) */}
        {activeTab === "agent" && (
          <AdminAIAgentChat
            embedStudio
            pageContext="/admin/ai"
            onActionExecuted={() => {
              actionsLoadedRef.current = false;
              diagnosticsLoadedRef.current = false;
            }}
          />
        )}

        {/* VIEW 1B: WEBSITE AI MODELS (Global Model Switcher across Customer & Admin Surfaces) */}
        {activeTab === "models" && (
          <section className="space-y-5">
            {/* Current Active Model Banner */}
            {(() => {
              const currentModelId =
                settings.activeAiModel ||
                settings.selectedNimModel ||
                settings.nemotronModel ||
                "nvidia/llama-3.1-nemotron-70b-instruct";
              const currentMeta = availableModels.find((m) => m.id === currentModelId);
              const isGemini = /^gemini-/i.test(currentModelId);
              return (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 size={12} />
                        <span>Active Website-Wide Model</span>
                      </span>
                      <span className="rounded border border-slate-200 bg-[#F8FAFC] px-2 py-0.5 font-mono text-[11px] text-slate-700">
                        {isGemini ? "Google Gemini" : "NVIDIA NIM"}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {currentMeta?.label || currentModelId}
                    </h2>
                    <p className="font-mono text-xs text-slate-500">{currentModelId}</p>
                    <p className="text-xs text-slate-600">
                      Jo model yahan save kiya jayega wahi poori website par (Customer Aura AI Floating Window, AI Pandit Ji, Admin Copilot aur Background Tasks) sabse pehle use hoga.
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {savedSuccess && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <Check size={14} />
                        <span>Saved & Active Website-Wide</span>
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={savingSettings}
                      onClick={() => saveWebsiteAiModel(currentModelId)}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#8C2B10] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#73230c] disabled:opacity-50"
                    >
                      {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      <span>Save Model Website-Wide</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* NVIDIA NIM Models Group */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">NVIDIA NIM Models</h3>
                  <p className="text-xs text-slate-500">
                    High-capacity Nemotron, Llama, Mixtral & DeepSeek models (including NVIDIA Nemotron-3 Ultra 550B).
                  </p>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {availableModels.filter((m) => m.provider === "nvidia").length} models
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {availableModels
                  .filter((m) => m.provider === "nvidia")
                  .map((model) => {
                    const selected =
                      (settings.activeAiModel || settings.selectedNimModel || settings.nemotronModel) === model.id;
                    const isNewUltra = model.id === "nvidia/nemotron-3-ultra-550b-a55b";
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            activeAiModel: model.id,
                            selectedNimModel: model.id,
                            nemotronModel: model.id,
                            nvidiaModel: model.id
                          }))
                        }
                        className={`flex flex-col justify-between rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-[#8C2B10] bg-[#8C2B10]/[0.04] ring-1 ring-[#8C2B10]"
                            : "border-slate-200 bg-[#F8FAFC] hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">{model.label}</span>
                            {selected ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-[#8C2B10] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                <Check size={10} />
                                <span>Selected</span>
                              </span>
                            ) : model.badge ? (
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  isNewUltra
                                    ? "border border-amber-300 bg-amber-50 text-amber-800"
                                    : "border border-slate-200 bg-white text-slate-600"
                                }`}
                              >
                                {model.badge}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 truncate font-mono text-[11px] text-slate-500">{model.id}</div>
                          {model.description && (
                            <p className="mt-2 text-[11.5px] leading-relaxed text-slate-600">{model.description}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Google Gemini Models Group */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Google Gemini Models</h3>
                  <p className="text-xs text-slate-500">
                    Fast Gemini Flash & Tool-Calling models with Google Search grounding support.
                  </p>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {availableModels.filter((m) => m.provider === "gemini").length} models
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                {availableModels
                  .filter((m) => m.provider === "gemini")
                  .map((model) => {
                    const selected =
                      (settings.activeAiModel || settings.selectedNimModel || settings.nemotronModel) === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            activeAiModel: model.id,
                            selectedNimModel: model.id,
                            nemotronModel: model.id,
                            nvidiaModel: model.id
                          }))
                        }
                        className={`flex flex-col justify-between rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-[#8C2B10] bg-[#8C2B10]/[0.04] ring-1 ring-[#8C2B10]"
                            : "border-slate-200 bg-[#F8FAFC] hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">{model.label}</span>
                            {selected ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-[#8C2B10] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                <Check size={10} />
                                <span>Selected</span>
                              </span>
                            ) : model.badge ? (
                              <span className="shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                {model.badge}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 truncate font-mono text-[11px] text-slate-500">{model.id}</div>
                          {model.description && (
                            <p className="mt-2 text-[11.5px] leading-relaxed text-slate-600">{model.description}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Custom Model Slug + Save Action */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const target =
                  customModelId.trim() ||
                  settings.activeAiModel ||
                  settings.selectedNimModel ||
                  settings.nemotronModel;
                saveWebsiteAiModel(target);
              }}
              className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="min-w-[240px] flex-1 space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <Sparkles size={13} className="text-[#8C2B10]" />
                  <span>Custom Model ID (Optional — e.g. nvidia/nemotron-3-ultra-550b-a55b)</span>
                </label>
                <input
                  type="text"
                  value={customModelId}
                  onChange={(e) => setCustomModelId(e.target.value)}
                  placeholder="Leave blank to save the selected card above, or enter any NIM/Gemini model ID"
                  className="w-full rounded-lg border border-slate-300 bg-[#F8FAFC] px-3 py-2 font-mono text-xs text-slate-900 focus:border-[#8C2B10] focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#8C2B10] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#73230c] disabled:opacity-50"
              >
                {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Save Model Website-Wide</span>
              </button>
            </form>
          </section>
        )}

        {/* VIEW 2: ACTION LEDGER */}
        {activeTab === "actions" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Action Ledger & 1-Click Rollback</h2>
                <p className="text-xs text-slate-500">
                  Audit log of all database writes executed by the Admin AI Agent with restore snapshots.
                </p>
              </div>
              <button
                type="button"
                onClick={loadActions}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <RefreshCw size={12} className={loadingActions ? "animate-spin" : ""} />
                <span>Reload Ledger</span>
              </button>
            </div>

            {loadingActions ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
                Loading action history...
              </div>
            ) : actions.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
                No agent actions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {actions.map((act) => {
                  const expanded = expandedActionId === act.actionId;
                  return (
                    <div key={act.actionId} className="p-4 transition hover:bg-slate-50/70">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`rounded px-2 py-0.5 text-[10.5px] font-semibold uppercase ${
                                act.reverted
                                  ? "border border-amber-200 bg-amber-50 text-amber-800"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {act.reverted ? "Reverted" : "Applied"}
                            </span>
                            <h3 className="truncate text-sm font-semibold text-slate-900">{act.title}</h3>
                          </div>
                          {act.description && (
                            <p className="mt-1 text-xs text-slate-600">{act.description}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-500">
                            <span>{act.actionType}</span>
                            <span>·</span>
                            <span>{act.targetCollection}</span>
                            {act.previewRoute && (
                              <>
                                <span>·</span>
                                <span>{act.previewRoute}</span>
                              </>
                            )}
                            <span>·</span>
                            <span className="tabular-nums">{formatDateTime(act.timestamp)}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedActionId(expanded ? "" : act.actionId)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {expanded ? "Hide Diff" : "Snapshot"}
                          </button>
                          {!act.reverted && (
                            <button
                              type="button"
                              disabled={undoingId === act.actionId}
                              onClick={() => handleUndo(act.actionId)}
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                            >
                              {undoingId === act.actionId ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <RotateCcw size={12} />
                              )}
                              <span>Undo</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteAction(act.actionId)}
                            title="Delete action log"
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 md:grid-cols-2">
                          <div>
                            <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">
                              Previous Snapshot
                            </div>
                            <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-[#F8FAFC] p-2.5 font-mono text-[11px] text-slate-700">
                              {JSON.stringify(act.previousData ?? null, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">
                              New State
                            </div>
                            <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-[#F8FAFC] p-2.5 font-mono text-[11px] text-slate-700">
                              {JSON.stringify(act.newData ?? null, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* VIEW 3: BACKGROUND TASKS */}
        {activeTab === "tasks" && (
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Create Task Form */}
            <form
              onSubmit={handleCreateTask}
              className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4 lg:self-start"
            >
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Schedule Autonomous Task</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Runs periodically on the server to monitor bugs, SEO, or growth.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Catalog SEO & Stock Watch"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#8C2B10] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Task Type</label>
                <select
                  value={newTask.taskType}
                  onChange={(e) => setNewTask((p) => ({ ...p, taskType: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-[#8C2B10] focus:outline-none"
                >
                  <option value="growth_audit">Growth & Orders Audit</option>
                  <option value="bug_scanner">Bug & Health Scanner</option>
                  <option value="inventory_guardian">Inventory Guardian</option>
                  <option value="seo_optimizer">SEO Optimizer</option>
                  <option value="product_generator">Product Generator</option>
                  <option value="custom">Custom Instruction</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Execution Prompt</label>
                <textarea
                  rows={3}
                  required
                  value={newTask.prompt}
                  onChange={(e) => setNewTask((p) => ({ ...p, prompt: e.target.value }))}
                  placeholder="Describe what the AI agent should inspect or fix on every interval..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#8C2B10] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Duration (min)</label>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={newTask.durationMinutes}
                    onChange={(e) => setNewTask((p) => ({ ...p, durationMinutes: Number(e.target.value) || 60 }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs tabular-nums focus:border-[#8C2B10] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Interval (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={newTask.intervalMinutes}
                    onChange={(e) => setNewTask((p) => ({ ...p, intervalMinutes: Number(e.target.value) || 15 }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs tabular-nums focus:border-[#8C2B10] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingTask}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#8C2B10] px-4 py-2 text-xs font-semibold text-white hover:bg-[#73230c] disabled:opacity-50"
              >
                {creatingTask ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                <span>Launch Background Task</span>
              </button>
            </form>

            {/* Task Queue */}
            <div className="space-y-3 lg:col-span-8">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-xs font-semibold text-slate-900">
                  Scheduled Tasks ({tasks.length})
                  {hasRunningTask ? " · Auto-refresh 15s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => loadTasks(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <RefreshCw size={12} className={loadingTasks ? "animate-spin" : ""} />
                  <span>Sync</span>
                </button>
              </div>

              {loadingTasks ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  Loading tasks...
                </div>
              ) : tasks.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  No background tasks created yet.
                </div>
              ) : (
                tasks.map((t) => (
                  <div key={t.taskId} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10.5px] font-semibold uppercase ${
                              t.status === "running"
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                : t.status === "paused"
                                ? "border border-amber-200 bg-amber-50 text-amber-800"
                                : "border border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {t.status}
                          </span>
                          <h3 className="truncate text-sm font-semibold text-slate-900">{t.title}</h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{t.prompt}</p>
                        <div className="mt-1.5 font-mono text-[11px] tabular-nums text-slate-500">
                          {t.taskType} · Runs: {t.runsCount || 0} · Every {t.intervalMinutes}m · Updated{" "}
                          {formatDateTime(t.lastRunAt || t.startedAt)}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTaskControl(t.taskId, "run_now")}
                          className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Run Now
                        </button>
                        {t.status === "running" ? (
                          <button
                            type="button"
                            onClick={() => handleTaskControl(t.taskId, "pause")}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                            title="Pause task"
                          >
                            <Pause size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTaskControl(t.taskId, "resume")}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-emerald-700 hover:bg-emerald-50"
                            title="Resume task"
                          >
                            <Play size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleTaskControl(t.taskId, "stop")}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                          title="Stop task"
                        >
                          <Square size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.taskId)}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-red-600"
                          title="Delete task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Dispatch Live Instruction */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={taskCmdInputs[t.taskId] || ""}
                        onChange={(e) => setTaskCmdInputs((p) => ({ ...p, [t.taskId]: e.target.value }))}
                        placeholder="Dispatch new instruction to this background worker..."
                        className="flex-1 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-1.5 text-xs focus:border-[#8C2B10] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const instruction = (taskCmdInputs[t.taskId] || "").trim();
                          if (!instruction) return;
                          handleTaskControl(t.taskId, "send_command", { instruction });
                          setTaskCmdInputs((p) => ({ ...p, [t.taskId]: "" }));
                        }}
                        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#8C2B10] hover:bg-[#8C2B10]/5"
                      >
                        <Send size={11} />
                        <span>Dispatch</span>
                      </button>
                    </div>

                    {/* Latest Logs */}
                    {Array.isArray(t.logs) && t.logs.length > 0 && (
                      <div className="space-y-1.5 border-t border-slate-200 pt-2.5">
                        {t.logs.slice(0, 3).map((lg, idx) => (
                          <div
                            key={lg.runId || idx}
                            className="flex items-start justify-between gap-3 rounded-lg bg-[#F8FAFC] px-3 py-2 text-[11.5px]"
                          >
                            <span className="text-slate-700">{lg.summary || lg.aiOutput}</span>
                            <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-slate-400">
                              {formatDateTime(lg.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* VIEW 4: DIAGNOSTICS & TRENDS */}
        {activeTab === "diagnostics" && (
          <section className="space-y-5">
            {/* Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Store Health, Auto-Fix & Public Trends RAG</h2>
                <p className="text-xs text-slate-500">
                  Live database diagnostics, growth audit insights, and public storefront knowledge retraining.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadDiagnostics(true)}
                  disabled={loadingDiagnostics}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw size={12} className={loadingDiagnostics ? "animate-spin" : ""} />
                  <span>Scan Store</span>
                </button>
                <button
                  type="button"
                  onClick={handleAutoFix}
                  disabled={autoFixing}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#8C2B10] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#73230c] disabled:opacity-50"
                >
                  {autoFixing ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
                  <span>Auto-Fix Detected Issues</span>
                </button>
                <button
                  type="button"
                  onClick={handleRetrainPublicTrends}
                  disabled={retraining}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {retraining ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                  <span>Retrain AI & Public Trends</span>
                </button>
              </div>
            </div>

            {/* 4-Column Flat KPI Bento */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">Store Revenue</div>
                <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  ₹{Number(growthAudit?.metrics?.totalRevenue || 0).toLocaleString("en-IN")}
                </div>
                <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">
                  {growthAudit?.metrics?.activeOrdersCount || 0} active orders · AOV ₹
                  {Number(growthAudit?.metrics?.avgOrderValue || 0).toLocaleString("en-IN")}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">Catalog & Inventory</div>
                <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  {growthAudit?.metrics?.totalProducts || diagnostics?.metrics?.productsScanned || 0}
                </div>
                <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">
                  {growthAudit?.metrics?.lowStockCount || 0} low stock ·{" "}
                  {growthAudit?.metrics?.outOfStockCount || 0} out of stock
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">Orders & Coupons</div>
                <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  {growthAudit?.metrics?.pendingFulfillmentCount || 0} pending
                </div>
                <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">
                  {growthAudit?.metrics?.unpaidOnlineOrdersCount || 0} unpaid online ·{" "}
                  {growthAudit?.metrics?.activeCouponsCount || 0} coupons
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">Public RAG Knowledge Index</div>
                <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  {publicTrends?.indexedDocumentsCount || 0} docs
                </div>
                <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">
                  {publicTrends?.totals?.publishedProducts || 0} published · Zero customer PII
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Detected Bugs */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Website & Database Diagnostic ({diagnostics?.bugsCount || 0} issues)
                  </h3>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                      diagnostics?.metrics?.mongoConnected
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {diagnostics?.metrics?.mongoConnected ? "MongoDB Live" : "Cache Fallback"}
                  </span>
                </div>

                {loadingDiagnostics ? (
                  <div className="py-8 text-center text-xs text-slate-500">Scanning store records...</div>
                ) : !diagnostics?.bugs?.length ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
                    <ShieldCheck size={15} />
                    <span>Zero critical bugs found across products, inventory, images, and coupons.</span>
                  </div>
                ) : (
                  <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                    {diagnostics.bugs.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                b.severity === "critical" || b.severity === "high"
                                  ? "border border-red-200 bg-red-50 text-red-700"
                                  : "border border-amber-200 bg-amber-50 text-amber-800"
                              }`}
                            >
                              {b.severity}
                            </span>
                            <span className="truncate text-xs font-semibold text-slate-900">{b.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">{b.detail}</p>
                        </div>
                        <span className="shrink-0 font-mono text-[10.5px] text-slate-500">{b.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Growth Opportunities & Public Trends */}
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Growth & Recovery Opportunities</h3>
                  {!growthAudit?.opportunities?.length ? (
                    <div className="text-xs text-slate-500">No urgent revenue recovery actions detected.</div>
                  ) : (
                    <div className="space-y-2.5">
                      {growthAudit.opportunities.map((opp, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">{opp.title}</span>
                            <span className="font-mono text-[10.5px] font-semibold uppercase text-[#8C2B10]">
                              {opp.priority}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">{opp.detail}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {publicTrends && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">Live Public Store Trends Feed</h3>
                      <span className="font-mono text-[11px] text-slate-500">Public Safe · No PII</span>
                    </div>
                    {Array.isArray(publicTrends.categories) && publicTrends.categories.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {publicTrends.categories.slice(0, 6).map((cat, idx) => (
                          <div
                            key={idx}
                            className="rounded-md border border-slate-200 bg-[#F8FAFC] px-2.5 py-1 text-xs text-slate-700"
                          >
                            <span className="font-medium">{cat.name || cat.category}</span>
                            {cat.count !== undefined && (
                              <span className="ml-1.5 font-mono text-[11px] tabular-nums text-slate-500">
                                ({cat.count})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {publicTrends.shippingAndPayments && (
                      <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3 font-mono text-[11px] text-slate-600">
                        COD: {publicTrends.shippingAndPayments.codEnabled ? "ON" : "OFF"} · Online:{" "}
                        {publicTrends.shippingAndPayments.onlinePaymentEnabled ? "ON" : "OFF"}
                        {publicTrends.shippingAndPayments.freeShippingAbove
                          ? ` · Free shipping ≥ ₹${publicTrends.shippingAndPayments.freeShippingAbove}`
                          : ""}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* VIEW 5: CUSTOMER BOT ANALYTICS & CONVERSATIONS */}
        {activeTab === "customer" && (
          <section className="space-y-5">
            {loadingCustomer ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
                Loading Customer Aura AI analytics and conversations...
              </div>
            ) : (
              <>
                {/* Real DB KPIs */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Total Chats</div>
                    <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                      {analytics?.totalConvos ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Active Devotees</div>
                    <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                      {analytics?.activeUsers ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Products Suggested</div>
                    <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                      {analytics?.recommendedCount ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Cart Conversions</div>
                    <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                      {analytics?.cartConversions ?? 0}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">
                      Rate {analytics?.conversionRate || "0.0"}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Support Escalations</div>
                    <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                      {analytics?.escalations ?? escalations.length}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {/* Intent Categories */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Customer Intent Distribution</h3>
                    {!analytics?.categoryBreakdown?.length ? (
                      <div className="text-xs text-slate-500">
                        No recorded customer chat intents yet. Live breakdown updates automatically as devotees chat.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {analytics.categoryBreakdown.map((cat) => (
                          <div key={cat.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-800">{cat.label}</span>
                              <span className="font-mono tabular-nums text-slate-500">
                                {cat.count} ({cat.percent}%)
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
                              <div
                                className="h-full rounded bg-[#8C2B10]"
                                style={{ width: `${Math.max(4, Math.min(100, cat.percent))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Real Top Customer Questions */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Top Real Customer Questions</h3>
                    {!analytics?.topQuestions?.length ? (
                      <div className="text-xs text-slate-500">
                        No customer queries logged yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {analytics.topQuestions.map((q, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                            <span className="truncate text-slate-800">{q.query}</span>
                            <span className="shrink-0 font-mono tabular-nums font-semibold text-slate-600">
                              {q.count}x
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Searchable Conversations & Knowledge Context */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Recent Customer Bot Conversations ({filteredConvos.length})
                      </h3>
                      <div className="relative w-full sm:w-64">
                        <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchConvo}
                          onChange={(e) => setSearchConvo(e.target.value)}
                          placeholder="Search user, email, or query..."
                          className="w-full rounded-lg border border-slate-200 bg-[#F8FAFC] py-1.5 pl-8 pr-3 text-xs focus:border-[#8C2B10] focus:outline-none"
                        />
                      </div>
                    </div>

                    {filteredConvos.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        No matching conversations found.
                      </div>
                    ) : (
                      <div className="max-h-96 divide-y divide-slate-200 overflow-y-auto">
                        {filteredConvos.slice(0, 30).map((c) => (
                          <div
                            key={c.conversationId || c.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                                <span className="truncate">{c.userName || "Guest Devotee"}</span>
                                <span className="text-slate-300">·</span>
                                <span className="font-mono text-[11px] font-normal text-slate-500">
                                  {c.mode === "panditji" ? "AI Pandit Ji" : "Shopping Bot"}
                                </span>
                                {c.requiresHumanSupport && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-[11px] font-semibold text-red-600">Escalated</span>
                                  </>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-xs text-slate-600">
                                {c.lastMessageText || c.title || "Conversation session"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedConvo(c)}
                              className="shrink-0 whitespace-nowrap rounded-lg border border-slate-200 bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              View Thread
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 lg:col-span-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Database size={15} className="text-[#8C2B10]" />
                        <span>Bot Grounding Inventory</span>
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Published Products Synced</span>
                          <span className="font-mono font-semibold tabular-nums text-slate-900">
                            {products.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Coupons Synced</span>
                          <span className="font-mono font-semibold tabular-nums text-slate-900">
                            {coupons.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Human Support Escalations ({escalations.length})
                      </h3>
                      {escalations.length === 0 ? (
                        <p className="mt-2 text-xs text-slate-500">All inquiries resolved autonomously.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {escalations.slice(0, 5).map((esc) => (
                            <div
                              key={esc.conversationId || esc.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900">
                                  {esc.userName || "Devotee"}
                                </div>
                                <div className="truncate text-[11px] text-slate-600">
                                  {esc.userEmail || esc.userPhone || "Support Requested"}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedConvo(esc)}
                                className="shrink-0 rounded bg-white px-2 py-1 text-[11px] font-semibold text-[#8C2B10]"
                              >
                                Inspect
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* VIEW 6: CONFIGURATION */}
        {activeTab === "config" && (
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">Storefront Availability & Placement</h2>
                {[
                  {
                    key: "enabled",
                    title: "Enable Customer Aura AI Engine",
                    desc: "Globally enable customer shopping assistant and AI Pandit Ji endpoints."
                  },
                  {
                    key: "showFloatingButton",
                    title: "Show Floating Assistant Launcher",
                    desc: "Display the bottom-right customer AI chat button on storefront pages."
                  },
                  {
                    key: "showHeaderButton",
                    title: "Show Header AI Launcher",
                    desc: "Show the Aura AI entry button in the storefront header bar."
                  }
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center justify-between gap-4 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{item.title}</div>
                      <div className="text-[11.5px] text-slate-500">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings[item.key])}
                      onChange={(e) => setSettings((s) => ({ ...s, [item.key]: e.target.checked }))}
                      className="h-4 w-4 accent-[#8C2B10]"
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">Capabilities & Conversion Controls</h2>
                {[
                  {
                    key: "recommendProducts",
                    title: "Live Product Recommendations",
                    desc: "Recommend matched Rudraksha & Malas from catalog."
                  },
                  {
                    key: "recommendOffers",
                    title: "Active Coupon Suggestions",
                    desc: "Share only verified active Admin coupon codes."
                  },
                  {
                    key: "cartActions",
                    title: "Direct Add-to-Cart Actions",
                    desc: "Enable 1-click cart additions inside bot replies."
                  },
                  {
                    key: "orderSupport",
                    title: "Authenticated Order Tracking",
                    desc: "Allow signed-in users to inspect order status."
                  },
                  {
                    key: "humanSupport",
                    title: "Human WhatsApp Escalation",
                    desc: "Provide official phone/WhatsApp support when requested."
                  }
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center justify-between gap-4 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{item.title}</div>
                      <div className="text-[11.5px] text-slate-500">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings[item.key])}
                      onChange={(e) => setSettings((s) => ({ ...s, [item.key]: e.target.checked }))}
                      className="h-4 w-4 accent-[#8C2B10]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">Language, Persona & Model Engine</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Primary Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-[#8C2B10] focus:outline-none"
                  >
                    <option value="auto">Auto Detect (Hindi, English, Hinglish)</option>
                    <option value="hi">Hindi (Spiritual Natural)</option>
                    <option value="en">English (Professional)</option>
                    <option value="hinglish">Hinglish (Conversational)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Response Persona</label>
                  <select
                    value={settings.tone}
                    onChange={(e) => setSettings((s) => ({ ...s, tone: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-[#8C2B10] focus:outline-none"
                  >
                    <option value="polite_spiritual">Polite & Vedic Spiritual (Recommended)</option>
                    <option value="concise">Concise E-Commerce Guide</option>
                    <option value="friendly">Warm & Conversational</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Active Website-Wide AI Model</label>
                  <select
                    value={settings.activeAiModel || settings.nemotronModel || "nvidia/llama-3.1-nemotron-70b-instruct"}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        activeAiModel: e.target.value,
                        selectedNimModel: e.target.value,
                        nemotronModel: e.target.value,
                        nvidiaModel: e.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-[#8C2B10] focus:outline-none"
                  >
                    <optgroup label="NVIDIA NIM Models">
                      {availableModels
                        .filter((opt) => opt.provider === "nvidia")
                        .map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Google Gemini Models">
                      {availableModels
                        .filter((opt) => opt.provider === "gemini")
                        .map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Default Customer Greeting</label>
                <textarea
                  rows={2}
                  value={settings.greeting}
                  onChange={(e) => setSettings((s) => ({ ...s, greeting: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#8C2B10] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-3">
                {savedSuccess && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <Check size={14} />
                    <span>Saved and deployed live</span>
                  </span>
                )}
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#8C2B10] px-4 py-2 text-xs font-semibold text-white hover:bg-[#73230c] disabled:opacity-50"
                >
                  {savingSettings ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Save AI Configuration</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Conversation Transcript Modal */}
        {selectedConvo && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
            onClick={() => setSelectedConvo(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-900">
                    {selectedConvo.userName || "Guest Devotee"}
                  </h3>
                  <p className="truncate font-mono text-[11px] text-slate-500">
                    {selectedConvo.userEmail || selectedConvo.guestSessionId || selectedConvo.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedConvo(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-[#F8FAFC] p-4">
                {(selectedConvo.messages || []).length === 0 ? (
                  <div className="text-center text-xs text-slate-500">No messages in transcript.</div>
                ) : (
                  (selectedConvo.messages || []).map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className={`rounded-lg border p-3 text-xs ${
                        m.sender === "user"
                          ? "ml-8 border-slate-200 bg-white text-slate-900"
                          : "mr-8 border-slate-200 bg-[#FFFFFF] text-slate-800"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between font-mono text-[10.5px] text-slate-500">
                        <span className="font-sans font-semibold text-slate-700">
                          {m.sender === "user" ? "Customer" : "Aura AI"}
                        </span>
                        <span className="tabular-nums">{formatDateTime(m.timestamp)}</span>
                      </div>
                      <div className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminAI;
