import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert";

const memStorage = {};
vi.stubGlobal("localStorage", {
  getItem: (k) => (k in memStorage ? memStorage[k] : null),
  setItem: (k, v) => { memStorage[k] = String(v); },
  removeItem: (k) => { delete memStorage[k]; }
});

vi.stubGlobal("window", {
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
});

vi.stubGlobal("CustomEvent", class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
});

const { auraChatStore } = await import("../auraChatStore.js");

describe("auraChatStore — multi-chat, panditPreferences & pending trigger", () => {
  beforeEach(() => {
    for (const k of Object.keys(memStorage)) delete memStorage[k];
  });

  test("queues pre-mount trigger and consumes it once", () => {
    auraChatStore.triggerChat("मेरी राशि का रुद्राक्ष बताएं", "panditji", { startNewChat: true });
    assert.strictEqual(auraChatStore.hasPendingTrigger(), true);

    const consumed = auraChatStore.consumePendingTrigger();
    assert.ok(consumed);
    assert.strictEqual(consumed.mode, "panditji");
    assert.strictEqual(consumed.prompt, "मेरी राशि का रुद्राक्ष बताएं");
    assert.strictEqual(consumed.startNewChat, true);
    assert.strictEqual(auraChatStore.hasPendingTrigger(), false);
  });

  test("creates new Pandit Ji chat session, archives old one, and switches back cleanly", () => {
    const firstConvId = auraChatStore.getConversationId();
    auraChatStore.appendMessage({ sender: "user", text: "मेरा करियर उपाय बताएं" }, "panditji");
    auraChatStore.saveMessages(auraChatStore.getMessages("panditji"), "panditji", true);

    const { newConvId } = auraChatStore.startNewSession("panditji");
    assert.notStrictEqual(newConvId, firstConvId);

    const saved = auraChatStore.getSavedSessions("panditji");
    assert.ok(saved.some((s) => s.id === firstConvId));

    const switched = auraChatStore.switchToSession(firstConvId, "panditji");
    assert.ok(switched);
    assert.strictEqual(switched.conversationId, firstConvId);
    assert.ok(switched.messages.some((m) => m.text.includes("मेरा करियर उपाय बताएं")));
  });

  test("persists and validates Pandit Ji responseStyle & chartStyle preferences", () => {
    const initial = auraChatStore.getPanditPreferences();
    assert.deepStrictEqual(initial, { responseStyle: "detailed", chartStyle: "auto" });

    const saved = auraChatStore.savePanditPreferences({ responseStyle: "balanced", chartStyle: "chart" });
    assert.deepStrictEqual(saved, { responseStyle: "balanced", chartStyle: "chart" });

    const reloaded = auraChatStore.getPanditPreferences();
    assert.deepStrictEqual(reloaded, { responseStyle: "balanced", chartStyle: "chart" });

    const sanitized = auraChatStore.savePanditPreferences({ responseStyle: "invalid", chartStyle: "cards" });
    assert.deepStrictEqual(sanitized, { responseStyle: "balanced", chartStyle: "cards" });
  });
});
