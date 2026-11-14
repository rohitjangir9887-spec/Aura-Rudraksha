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
  text: "**Aura Autonomous Admin Agent** active.\n\nMain aapke poore Aura Rudraksha Store aur MongoDB Database par direct Read/Write actions execute kar sakta hoon:\n- **Catalog & Pricing**: Naye products (Nepali/Indonesian) upload karo, price/stock badlo, ya sabhi items par **bulk % discount** lagao\n- **Orders & Tracking**: Pending/unpaid orders inspect karo, status update karo, tracking AWB & courier set karo\n- **Coupons, Active Offer & Banners**: Coupons create/pause/delete karo, Central Active Offer & Hero Banners control karo\n- **Payment & Store Settings**: Cash on Delivery (COD), Online PayU, shipping fee, ya announcement bar ON/OFF karo\n- **Bug Auto-Fix & Growth Copilot**: Store bugs scan/repair karo, VIP repeat buyers list, aur conversion insights dekho\n- **1-Click Undo & Live Preview**: Har change ke sath 1-click Undo backup aur live split-view preview",
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
      return doc;
    } catch (_) {}
  }
  return {
    sessionId,
    title: "Admin Command Center Chat",
    status: "idle",
    messages: [WELCOME_MSG],
    lastUpdatedAt: new Date().toISOString()
  };
}

/**
 * Main Autonomous Admin AI Chat Handler
 * Saves user message to MongoDB immediately, executes NVIDIA NIM + Autonomous Tools in background/foreground,
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

    // 1. Immediately persist user message into MongoDB
    let sessionDoc = await getOrCreateSessionDoc(sessionId);
    const updatedMessagesWithUser = [...(sessionDoc.messages || []), userMsgObj];

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

    const systemPrompt = `You are Aura AI Autonomous Admin Agent with FULL Read/Write control over the entire Aura Rudraksha Store & MongoDB Database.
Communicate clearly in Hindi, Hinglish, or English matching the Admin. Always execute real tool actions instead of making up fake confirmations.
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
- Use your attached function tools whenever available!
- If falling back to text-only mode, emit [ADMIN_ACTION: {"type": "...", "data": {...}}] tags (CREATE_PRODUCT, UPDATE_PRODUCT, BULK_UPDATE_PRODUCTS, DELETE_PRODUCT, CREATE_COUPON, UPDATE_COUPON, DELETE_COUPON, UPDATE_ACTIVE_OFFER, MANAGE_BANNER, ADD_WEBSITE_FEATURE, UPDATE_STORE_SETTINGS, UPDATE_ORDER, MANAGE_REVIEW, RESOLVE_TICKET, AUTO_FIX_BUGS, SHOW_PAGE, CREATE_TASK) and/or [NAVIGATE_PREVIEW: "/route"].
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

    // 4. Save completed AI response to MongoDB
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
    if (isDbConnected()) {
      await AdminAIChatSession.findOneAndUpdate(
        { sessionId },
        {
          $set: {
            status: "idle",
            messages: [WELCOME_MSG],
            lastUpdatedAt: new Date().toISOString()
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

    // Also append a confirmation message in the Admin Chat Session in MongoDB
    if (isDbConnected()) {
      const sysMsg = {
        id: "amsg_act_" + Date.now(),
        sender: "ai",
        text: `✅ **Action Executed:** ${result.title}\n\nAap iska live preview dekh sakte hain ya **Undo** button se kabhi bhi rollback kar sakte hain.`,
        status: "completed",
        modelUsed: PRIMARY_NIM_MODEL,
        actionsExecuted: [result],
        previewRoute: result.previewRoute || "/",
        previewTitle: result.previewTitle || result.title,
        timestamp: new Date().toISOString()
      };
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
    if (isDbConnected()) {
      await AdminAIActionLog.deleteOne({ actionId });
    }
    return res.json({ success: true, message: "Action log deleted from MongoDB." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAdminTasksEndpoint(req, res) {
  try {
    let tasks = [];
    if (isDbConnected()) {
      tasks = await AdminAITask.find().sort({ createdAt: -1 }).limit(50).lean();
      if (tasks.some(t => t.status === "running")) {
        startAdminAgentBackgroundLoop();
      }
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
 * Control Background Task (pause, resume, stop, run_now)
 */
export async function controlAdminTaskEndpoint(req, res) {
  try {
    const { taskId } = req.params;
    const { command, instruction, prompt } = req.body || {}; // 'pause' | 'resume' | 'stop' | 'run_now' | 'send_command'

    if (command === "send_command" || command === "update_instruction") {
      const newPrompt = (instruction || prompt || "").trim();
      if (newPrompt) {
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
        const runLog = await executeSingleTaskCycle(taskId);
        const updated = isDbConnected() ? await AdminAITask.findOne({ taskId }).lean() : null;
        return res.json({ success: true, runLog, task: updated, message: "Command dispatched and cycle executed!" });
      }
    }

    if (command === "run_now") {
      const runLog = await executeSingleTaskCycle(taskId);
      const updated = isDbConnected() ? await AdminAITask.findOne({ taskId }).lean() : null;
      return res.json({ success: true, runLog, task: updated });
    }

    const newStatus =
      command === "pause" ? "paused" :
      command === "resume" ? "running" :
      command === "stop" ? "stopped" : "running";

    if (isDbConnected()) {
      await AdminAITask.updateOne({ taskId }, { $set: { status: newStatus } });
    }
    const updated = isDbConnected() ? await AdminAITask.findOne({ taskId }).lean() : null;
    return res.json({ success: true, task: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Delete Background Task from MongoDB
 */
export async function deleteAdminTaskEndpoint(req, res) {
  try {
    const { taskId } = req.params;
    if (isDbConnected()) {
      await AdminAITask.deleteOne({ taskId });
    }
    return res.json({ success: true, message: "Task deleted from MongoDB." });
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
    let workLogs = [];
    let chatSessions = [];
    let actionLogs = [];
    let tasks = [];
    let counts = {
      products: 0,
      orders: 0,
      customers: 0,
      coupons: 0,
      adminSessions: 0,
      adminActions: 0,
      adminTasks: 0,
      workLogs: 0
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
 * Delete Private Work Log(s) from MongoDB
 */
export async function deleteAdminWorkLogEndpoint(req, res) {
  try {
    const { logId } = req.params;
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
