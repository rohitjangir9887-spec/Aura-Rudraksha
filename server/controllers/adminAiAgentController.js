import {
  AdminAIChatSession,
  AdminAIActionLog,
  AdminAITask,
  AdminAIWorkLog,
  AuraAIConversation,
  AuraAISetting
} from "../models/AuraAI.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Coupon } from "../models/Coupon.js";
import { Customer } from "../models/Customer.js";
import { Setting } from "../models/Setting.js";
import { isDbConnected, getMongoUri, getLastDbSync, connectDB } from "../config/db.js";
import { PRIMARY_NIM_MODEL, setCachedNvidiaKey } from "./auraAiController.js";
import {
  WEBSITE_PAGES_DIRECTORY,
  memChatSessions,
  memActionLogs,
  memTasks,
  memWorkLogs,
  recordPrivateWorkLog,
  invokeAdminLLM,
  getCompleteWebsiteSnapshot,
  runWebsiteBugDiagnostic,
  runStoreGrowthAndHealthAudit,
  executeAdminAgentAction,
  undoAdminAgentAction,
  detectAndExecuteAdminIntents,
  createAdminBackgroundTask,
  executeSingleTaskCycle,
  startAdminAgentBackgroundLoop
} from "../services/adminAiAgentService.js";

const DEFAULT_SESSION_ID = "admin_master_session";

const WELCOME_MSG = {
  id: "amsg_welcome",
  sender: "ai",
  text: "**Aura Autonomous Admin Copilot** active (Google Search + GitHub Public Tools + Live Store DB).\n\nMain aapke poore Aura Rudraksha Store par Hindi, Hinglish ya English mein har Read/Write action execute kar sakta hoon:\n- **Products Add / Edit / Delete**: Naye products upload karo (e.g. *'8 Mukhi Indonesian Rudraksha price 1899 stock 12 add karo'*), price/stock/status badlo, ya kisi product ko delete karo (1-click Undo ke saath)\n- **Google Search & Live Trends**: Live Google public web search, Rudraksha market trends, keyword ideas, aur Customer AI RAG retraining\n- **GitHub Public Tools Finder**: GitHub ke top open-source e-commerce/SEO/WhatsApp tools & repos search karo aur storefront widgets install karo\n- **Auto Hindi + English SEO**: Sabhi products ke search keywords, meta tags aur Vedic descriptions 1 command mein generate karo\n- **Orders, Coupons, Offers & Settings**: Orders/tracking update karo, coupons/banners banao, COD/PayU/shipping toggle karo\n- **Bug Auto-Fix & Growth Audit**: Storefront bugs scan/fix karo aur revenue/VIP insights dekho",
  status: "completed",
  modelUsed: PRIMARY_NIM_MODEL,
  actionsExecuted: [],
  previewRoute: "",
  previewTitle: "",
  timestamp: new Date().toISOString()
};

async function getOrCreateSessionDoc(sessionId = DEFAULT_SESSION_ID) {
  if (isDbConnected()) {
    try {
      let doc = await AdminAIChatSession.findOne({ sessionId }).lean();
      if (!doc) {
        const created = await AdminAIChatSession.create({
          sessionId,
          title: "Admin Command Center Chat",
          status: "idle",
          messages: [WELCOME_MSG],
          lastUpdatedAt: new Date().toISOString()
        });
        doc = created.toObject ? created.toObject() : created;
      }
      memChatSessions.set(sessionId, doc);
      return doc;
    } catch (_) {}
  }
  if (!memChatSessions.has(sessionId)) {
    memChatSessions.set(sessionId, {
      sessionId,
      title: "Admin Command Center Chat",
      status: "idle",
      messages: [WELCOME_MSG],
      lastUpdatedAt: new Date().toISOString()
    });
  }
  return memChatSessions.get(sessionId);
}

/**
 * Main Autonomous Admin AI Chat Handler
 * Saves user message to MongoDB immediately, executes Gemini/NIM + Autonomous Tools in background/foreground,
 * and persists the full reply, executed actions, and live preview route in MongoDB.
 */
export async function handleAdminAgentChat(req, res) {
  try {
    const { messages = [], sessionId = DEFAULT_SESSION_ID, prompt: directPrompt, pageContext = "" } = req.body || {};

    let userText = directPrompt ? String(directPrompt).trim() : "";
    if (!userText && Array.isArray(messages) && messages.length > 0) {
      const lastUser = [...messages].reverse().find(m => m.sender === "user" || m.role === "user");
      userText = String(lastUser?.text || lastUser?.content || "").trim();
    }

    if (!userText) {
      return res.status(400).json({ error: "Please enter a command or question for the Admin AI Agent." });
    }

    const userMsgObj = {
      id: "amsg_u_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      sender: "user",
      text: userText,
      status: "completed",
      timestamp: new Date().toISOString()
    };

    // 1. Immediately persist user message into memory + MongoDB
    let sessionDoc = await getOrCreateSessionDoc(sessionId);
    const updatedMessagesWithUser = [...(sessionDoc.messages || []), userMsgObj];
    memChatSessions.set(sessionId, {
      ...sessionDoc,
      status: "processing",
      lastPrompt: userText,
      messages: updatedMessagesWithUser,
      lastUpdatedAt: new Date().toISOString()
    });

    if (isDbConnected()) {
      await AdminAIChatSession.findOneAndUpdate(
        { sessionId },
        {
          $set: {
            status: "processing",
            lastPrompt: userText,
            messages: updatedMessagesWithUser,
            lastUpdatedAt: new Date().toISOString()
          }
        },
        { upsert: true }
      ).catch(() => {});
    }

    await recordPrivateWorkLog({
      category: "chat",
      status: "active",
      title: `Admin Prompt Received`,
      detail: userText
    });

    // 2. Gather complete live website data from MongoDB
    const snapshot = await getCompleteWebsiteSnapshot();
    const pagesSummary = WEBSITE_PAGES_DIRECTORY.map(p => `${p.title}: ${p.route}`).join(" | ");
    const catalogLines = snapshot.products.slice(0, 35).map(p =>
      `- [ID: ${p.id}] ${p.name} | Slug: ${p.slug} | Price: ₹${p.price} (MRP: ₹${p.comparePrice || p.mrp || p.price}) | Stock: ${p.stock ?? 0} | Cat: ${p.category}`
    ).join("\n");

    const ordersLines = snapshot.recentOrders.slice(0, 10).map(o =>
      `- Order #${o.orderId || o.id} | Status: ${o.orderStatus || o.status} | Pay: ${o.paymentStatus || "Pending"} | Total: ₹${o.finalAmount || o.total || o.amount || 0} | Customer: ${o.customerName || "Guest"}`
    ).join("\n") || "No recent orders.";

    const couponsLines = snapshot.coupons.slice(0, 10).map(c =>
      `- Code: ${c.code} | Discount: ${c.discountValue}${c.discountType === "percentage" ? "%" : "₹"} | Active: ${c.isActive !== false}`
    ).join("\n") || "No coupons.";

    const systemPrompt = `You are Aura AI Autonomous Admin Copilot with FULL Read/Write control over the Aura Rudraksha Store & MongoDB Database, plus live Google Search Grounding and GitHub Public Open-Source Tools Search.
Communicate clearly in Hindi, Hinglish, or English matching the Admin. Understand natural Hinglish & typing errors effortlessly (e.g. "produced" = product, "htana"/"nikalo" = delete, "ad"/"dalo"/"bnao" = add/create, "fichar" = feature). Always execute real tool actions instead of making up fake confirmations.
${pageContext ? `CURRENT ADMIN PAGE CONTEXT: Admin currently has "${pageContext}" open.` : ""}

LIVE STORE & DATABASE SNAPSHOT:
- MongoDB: ${snapshot.mongoConnected ? "CONNECTED" : "Cache Fallback"}
- Products: ${snapshot.productsCount} (Low/Out-of-Stock: ${snapshot.lowStockCount})
- Orders: ${snapshot.ordersCount} (Revenue: ₹${snapshot.totalRevenue})
- Coupons: ${snapshot.couponsCount} · Customers: ${snapshot.customersCount} · Reviews: ${snapshot.reviewsCount} · Open Tickets: ${snapshot.openTicketsCount || 0}
- Payment Controls: COD=${snapshot.settings?.enableCod !== false ? "ON" : "OFF"}, Online PayU=${snapshot.settings?.enableOnlinePayment !== false ? "ON" : "OFF"}
- Central Active Offer: ${snapshot.activeOffer?.enabled ? `ACTIVE (${snapshot.activeOffer.title})` : "Disabled"}

AVAILABLE PAGES FOR LIVE PREVIEW: ${pagesSummary}

LIVE PRODUCT CATALOG (Top 35):
${catalogLines}

RECENT ORDERS:
${ordersLines}

ACTIVE COUPONS:
${couponsLines}

EXECUTION RULES:
- Use your attached function tools (create_product, update_product, delete_product, generate_product_seo, search_github_tools, google_public_search, install_public_tool_feature, etc.) whenever available!
- If falling back to text-only mode, emit [ADMIN_ACTION: {"type": "...", "data": {...}}] tags (CREATE_PRODUCT, UPDATE_PRODUCT, BULK_UPDATE_PRODUCTS, DELETE_PRODUCT, GENERATE_PRODUCT_SEO, INSTALL_PUBLIC_TOOL, CREATE_COUPON, UPDATE_COUPON, DELETE_COUPON, UPDATE_ACTIVE_OFFER, MANAGE_BANNER, ADD_WEBSITE_FEATURE, UPDATE_STORE_SETTINGS, UPDATE_ORDER, MANAGE_REVIEW, RESOLVE_TICKET, AUTO_FIX_BUGS, RETRAIN_AI_KNOWLEDGE, SHOW_PAGE, CREATE_TASK) and/or [NAVIGATE_PREVIEW: "/route"].
- Every mutation creates an Undo snapshot in AdminAIActionLog so Admin can roll back in 1 click.`;

    const conversationHistoryForLLM = (updatedMessagesWithUser || []).slice(-12);
    const llmResult = await invokeAdminLLM(systemPrompt, conversationHistoryForLLM, 2800, {
      sessionId,
      source: "admin_chat"
    });

    // 3. Parse any additional [ADMIN_ACTION] tags and merge native function tool executions
    const {
      cleanedResponse,
      executedActions,
      previewRoute,
      previewTitle
    } = await detectAndExecuteAdminIntents(userText, llmResult.text, {
      sessionId,
      source: "admin_chat",
      preExecutedActions: llmResult.executedViaTools || [],
      prePreviewRoute: llmResult.previewRoute || "",
      prePreviewTitle: llmResult.previewTitle || ""
    });

    const aiMsgObj = {
      id: "amsg_ai_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      sender: "ai",
      text: cleanedResponse || "Action completed successfully.",
      status: "completed",
      modelUsed: llmResult.modelUsed,
      actionsExecuted: executedActions,
      previewRoute: previewRoute || "",
      previewTitle: previewTitle || "",
      timestamp: new Date().toISOString()
    };

    const finalMessages = [...updatedMessagesWithUser, aiMsgObj];

    // 4. Save completed AI response to memory + MongoDB
    memChatSessions.set(sessionId, {
      ...sessionDoc,
      status: "completed",
      lastPrompt: userText,
      messages: finalMessages,
      lastUpdatedAt: new Date().toISOString()
    });
    if (isDbConnected()) {
      await AdminAIChatSession.findOneAndUpdate(
        { sessionId },
        {
          $set: {
            status: "completed",
            messages: finalMessages,
            lastUpdatedAt: new Date().toISOString()
          }
        },
        { upsert: true }
      ).catch(() => {});
    }

    await recordPrivateWorkLog({
      category: "chat",
      status: "completed",
      title: `AI Response Saved to MongoDB (${executedActions.length} actions executed)`,
      detail: cleanedResponse.slice(0, 180),
      modelUsed: llmResult.modelUsed
    });

    return res.json({
      success: true,
      sessionId,
      text: aiMsgObj.text,
      modelUsed: llmResult.modelUsed,
      actionsExecuted: executedActions,
      previewRoute: aiMsgObj.previewRoute,
      previewTitle: aiMsgObj.previewTitle,
      message: aiMsgObj,
      messages: finalMessages
    });
  } catch (error) {
    console.error("[handleAdminAgentChat] Error:", error?.message || error);
    return res.status(500).json({
      error: `AI Agent execution notice: ${error?.message || "Please retry."}`
    });
  }
}

/**
 * Get persistent Admin AI Chat Session from MongoDB (loads messages even after browser was closed)
 */
export async function getAdminAgentSession(req, res) {
  try {
    const sessionId = req.query.sessionId || DEFAULT_SESSION_ID;
    const session = await getOrCreateSessionDoc(sessionId);
    // Lazily check & wake background task runner only if running tasks exist when Admin opens session
    if (isDbConnected()) {
      const hasRunning = await AdminAITask.countDocuments({ status: "running" }).catch(() => 0);
      if (hasRunning > 0) startAdminAgentBackgroundLoop();
    }
    return res.json({
      success: true,
      session,
      pagesDirectory: WEBSITE_PAGES_DIRECTORY
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Delete a single message from Admin AI Chat Session in MongoDB
 */
export async function deleteAdminAgentMessage(req, res) {
  try {
    const { messageId } = req.params;
    const sessionId = req.query.sessionId || DEFAULT_SESSION_ID;
    if (memChatSessions.has(sessionId)) {
      const existing = memChatSessions.get(sessionId);
      memChatSessions.set(sessionId, {
        ...existing,
        messages: (existing.messages || []).filter(m => m.id !== messageId),
        lastUpdatedAt: new Date().toISOString()
      });
    }
    if (isDbConnected()) {
      await AdminAIChatSession.updateOne(
        { sessionId },
        { $pull: { messages: { id: messageId } } }
      );
    }
    const updated = await getOrCreateSessionDoc(sessionId);
    return res.json({ success: true, session: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Clear / Reset Admin AI Chat Session in MongoDB
 */
export async function clearAdminAgentSession(req, res) {
  try {
    const sessionId = req.query.sessionId || req.body?.sessionId || DEFAULT_SESSION_ID;
    const freshSession = {
      sessionId,
      title: "Admin Command Center Chat",
      status: "idle",
      messages: [WELCOME_MSG],
      lastUpdatedAt: new Date().toISOString()
    };
    memChatSessions.set(sessionId, freshSession);
    if (isDbConnected()) {
      await AdminAIChatSession.findOneAndUpdate(
        { sessionId },
        {
          $set: {
            status: "idle",
            messages: [WELCOME_MSG],
            lastUpdatedAt: freshSession.lastUpdatedAt
          }
        },
        { upsert: true }
      );
    }
    const updated = await getOrCreateSessionDoc(sessionId);
    return res.json({ success: true, session: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Execute a direct Admin Action from UI (Quick Product Upload, Add Website Feature, Bug Scan, Auto-Fix)
 */
export async function executeDirectAdminActionEndpoint(req, res) {
  try {
    const { type, data = {}, sessionId = DEFAULT_SESSION_ID } = req.body || {};
    if (type === "SCAN_BUGS") {
      const report = await runWebsiteBugDiagnostic();
      return res.json({ success: true, report });
    }
    if (type === "RUN_GROWTH_AUDIT") {
      const audit = await runStoreGrowthAndHealthAudit(data.focus || "all");
      return res.json({ success: true, audit });
    }
    if (type === "SAVE_NVIDIA_KEY" && data.nvidiaApiKey) {
      const cleanKey = String(data.nvidiaApiKey).trim();
      setCachedNvidiaKey(cleanKey);
      if (isDbConnected()) {
        await AuraAISetting.findOneAndUpdate(
          { id: "AURA_AI_SETTINGS" },
          { $set: { nvidiaApiKey: cleanKey, nemotronApiKey: cleanKey } },
          { upsert: true }
        );
      }
      return res.json({ success: true, message: "NVIDIA NIM API Key saved & activated in MongoDB!" });
    }

    const result = await executeAdminAgentAction({ type, data }, { sessionId, source: "admin_ui" });
    if (!result || result.error) {
      return res.status(400).json({ success: false, message: result?.error || "Could not execute action." });
    }

    const sysMsg = {
      id: "amsg_act_" + Date.now(),
      sender: "ai",
      text: `**Action Executed:** ${result.title}\n\nAap iska live preview dekh sakte hain ya **Undo** button se kabhi bhi rollback kar sakte hain.`,
      status: "completed",
      modelUsed: PRIMARY_NIM_MODEL,
      actionsExecuted: [result],
      previewRoute: result.previewRoute || "/",
      previewTitle: result.previewTitle || result.title,
      timestamp: new Date().toISOString()
    };
    const currSess = await getOrCreateSessionDoc(sessionId);
    memChatSessions.set(sessionId, {
      ...currSess,
      messages: [...(currSess.messages || []), sysMsg],
      lastUpdatedAt: new Date().toISOString()
    });
    if (isDbConnected()) {
      await AdminAIChatSession.updateOne(
        { sessionId },
        { $push: { messages: sysMsg }, $set: { lastUpdatedAt: new Date().toISOString() } }
      ).catch(() => {});
    }

    return res.json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAdminActionLogsEndpoint(req, res) {
  try {
    let logs = [];
    if (isDbConnected()) {
      logs = await AdminAIActionLog.find().sort({ createdAt: -1 }).limit(100).lean();
    } else {
      logs = Array.from(memActionLogs.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    return res.json({ success: true, actions: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function undoAdminActionEndpoint(req, res) {
  try {
    const { actionId } = req.params;
    const result = await undoAdminAgentAction(actionId);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteAdminActionLogEndpoint(req, res) {
  try {
    const { actionId } = req.params;
    memActionLogs.delete(actionId);
    if (isDbConnected()) {
      await AdminAIActionLog.deleteOne({ actionId });
    }
    return res.json({ success: true, message: "Action log removed." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAdminTasksEndpoint(req, res) {
  try {
    let tasks = [];
    if (isDbConnected()) {
      tasks = await AdminAITask.find().sort({ createdAt: -1 }).limit(50).lean();
    } else {
      tasks = Array.from(memTasks.values()).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    }
    if (tasks.some(t => t.status === "running")) {
      startAdminAgentBackgroundLoop();
    }
    return res.json({ success: true, tasks });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createAdminTaskEndpoint(req, res) {
  try {
    const { title, prompt, taskType, durationMinutes, intervalMinutes } = req.body || {};
    const task = await createAdminBackgroundTask({
      title,
      prompt,
      taskType,
      durationMinutes,
      intervalMinutes
    });
    return res.json({ success: true, task });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Control Background Task (pause, resume, stop, run_now, send_command)
 */
export async function controlAdminTaskEndpoint(req, res) {
  try {
    const { taskId } = req.params;
    const { command, instruction, prompt } = req.body || {};

    if (command === "send_command" || command === "update_instruction") {
      const newPrompt = (instruction || prompt || "").trim();
      if (newPrompt) {
        const memT = memTasks.get(taskId);
        if (memT) {
          memTasks.set(taskId, {
            ...memT,
            prompt: newPrompt,
            status: "running",
            logs: [
              {
                runId: "cmd_" + Date.now(),
                timestamp: new Date().toISOString(),
                status: "command_received",
                summary: `Admin dispatched instruction: "${newPrompt.slice(0, 120)}"`,
                aiOutput: `Task instruction updated to: "${newPrompt}"`
              },
              ...(memT.logs || [])
            ]
          });
        }
        if (isDbConnected()) {
          await AdminAITask.updateOne({ taskId }, {
            $set: { prompt: newPrompt, status: "running" },
            $push: {
              logs: {
                $each: [{
                  runId: "cmd_" + Date.now(),
                  timestamp: new Date().toISOString(),
                  status: "command_received",
                  summary: `Admin dispatched instruction: "${newPrompt.slice(0, 120)}"`,
                  aiOutput: `Task instruction updated to: "${newPrompt}"`
                }],
                $position: 0
              }
            }
          });
        }
        await recordPrivateWorkLog({
          category: "task",
          status: "active",
          title: `Command Sent to Task: ${taskId}`,
          detail: newPrompt
        });
        const runLog = await executeSingleTaskCycle(taskId, { forceRun: true });
        const updated = isDbConnected() ? await AdminAITask.findOne({ taskId }).lean() : memTasks.get(taskId) || null;
        return res.json({ success: true, runLog, task: updated, message: "Command dispatched and cycle executed!" });
      }
    }

    if (command === "run_now") {
      const runLog = await executeSingleTaskCycle(taskId, { forceRun: true });
      const updated = isDbConnected() ? await AdminAITask.findOne({ taskId }).lean() : memTasks.get(taskId) || null;
      return res.json({ success: true, runLog, task: updated });
    }

    const newStatus =
      command === "pause" ? "paused" :
      command === "resume" ? "running" :
      command === "stop" ? "stopped" : "running";

    if (memTasks.has(taskId)) {
      memTasks.set(taskId, { ...memTasks.get(taskId), status: newStatus });
    }
    if (isDbConnected()) {
      await AdminAITask.updateOne({ taskId }, { $set: { status: newStatus } });
    }
    if (newStatus === "running") startAdminAgentBackgroundLoop();
    const updated = isDbConnected() ? await AdminAITask.findOne({ taskId }).lean() : memTasks.get(taskId) || null;
    return res.json({ success: true, task: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Delete Background Task
 */
export async function deleteAdminTaskEndpoint(req, res) {
  try {
    const { taskId } = req.params;
    memTasks.delete(taskId);
    if (isDbConnected()) {
      await AdminAITask.deleteOne({ taskId });
    }
    return res.json({ success: true, message: "Task deleted." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get Private AI Work Logs & Complete MongoDB Vault Summary
 */
export async function getAdminVaultAndWorkLogs(req, res) {
  try {
    let connected = isDbConnected();
    if (!connected) {
      await connectDB().catch(() => {});
      connected = isDbConnected();
    }

    const startPing = Date.now();
    let workLogs = [...memWorkLogs];
    let chatSessions = Array.from(memChatSessions.values());
    let actionLogs = Array.from(memActionLogs.values());
    let tasks = Array.from(memTasks.values());
    let counts = {
      products: 0,
      orders: 0,
      customers: 0,
      coupons: 0,
      adminSessions: chatSessions.length,
      adminActions: actionLogs.length,
      adminTasks: tasks.length,
      workLogs: workLogs.length
    };

    if (connected) {
      const [
        wLogs,
        cSessions,
        aLogs,
        tList,
        prodCount,
        ordCount,
        custCount,
        cpnCount
      ] = await Promise.all([
        AdminAIWorkLog.find().sort({ createdAt: -1 }).limit(80).lean().catch(() => []),
        AdminAIChatSession.find().sort({ updatedAt: -1 }).limit(20).lean().catch(() => []),
        AdminAIActionLog.find().sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
        AdminAITask.find().sort({ createdAt: -1 }).limit(30).lean().catch(() => []),
        Product.countDocuments().catch(() => 0),
        Order.countDocuments().catch(() => 0),
        Customer.countDocuments().catch(() => 0),
        Coupon.countDocuments().catch(() => 0)
      ]);
      workLogs = wLogs;
      chatSessions = cSessions;
      actionLogs = aLogs;
      tasks = tList;
      counts = {
        products: prodCount,
        orders: ordCount,
        customers: custCount,
        coupons: cpnCount,
        adminSessions: cSessions.length,
        adminActions: aLogs.length,
        adminTasks: tList.length,
        workLogs: wLogs.length
      };
    }

    const pingMs = Math.max(1, Date.now() - startPing);
    const rawUri = getMongoUri();
    const maskedUri = rawUri
      ? rawUri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")
      : "mongodb://127.0.0.1/aurarudraksha (Resilient Local MongoDB Engine)";

    return res.json({
      success: true,
      mongodb: {
        connected,
        pingMs,
        maskedUri,
        lastSync: getLastDbSync() || new Date().toISOString(),
        engine: rawUri ? "MongoDB Atlas Cloud Cluster" : "Active Local MongoDB Engine",
        counts
      },
      workLogs,
      chatSessions,
      actionLogs,
      tasks
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Delete Private Work Log(s)
 */
export async function deleteAdminWorkLogEndpoint(req, res) {
  try {
    const { logId } = req.params;
    if (logId === "all") {
      memWorkLogs.length = 0;
    } else {
      const idx = memWorkLogs.findIndex(w => w.logId === logId);
      if (idx !== -1) memWorkLogs.splice(idx, 1);
    }
    if (isDbConnected()) {
      if (logId === "all") {
        await AdminAIWorkLog.deleteMany({});
      } else {
        await AdminAIWorkLog.deleteOne({ logId });
      }
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAdminDiagnosticsEndpoint(req, res) {
  try {
    const report = await runWebsiteBugDiagnostic();
    return res.json({ success: true, report });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAdminGrowthAuditEndpoint(req, res) {
  try {
    const focus = req.query.focus || "all";
    const audit = await runStoreGrowthAndHealthAudit(focus);
    return res.json({ success: true, audit });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
