import test from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";
import { auraChatStore, formatMessageTime, getDateDividerLabel } from "../lib/auraChatStore.js";

const dom = new JSDOM('', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = value.toString();
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};
global.CustomEvent = dom.window.CustomEvent;

test("auraChatStore tests", async (t) => {
  await t.test("formatMessageTime handles invalid and valid dates", () => {
    assert.strictEqual(formatMessageTime(null), "");
    assert.strictEqual(formatMessageTime("invalid-date"), "");

    // Test exact output format for a specific timezone? Or just assert type
    const res = formatMessageTime("2023-10-10T12:00:00Z");
    assert.ok(typeof res === "string" && res.length > 0);
  });

  await t.test("getDateDividerLabel works correctly", () => {
    assert.strictEqual(getDateDividerLabel(null), "Today");
    assert.strictEqual(getDateDividerLabel("invalid"), "Today");

    const today = new Date();
    assert.strictEqual(getDateDividerLabel(today.toISOString()), "Today");

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    assert.strictEqual(getDateDividerLabel(yesterday.toISOString()), "Yesterday");

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    assert.strictEqual(getDateDividerLabel(twoDaysAgo.toISOString()), twoDaysAgo.toLocaleDateString("en-US", { weekday: "long" }));

    const tenDaysAgo = new Date(today);
    tenDaysAgo.setDate(today.getDate() - 10);
    assert.strictEqual(getDateDividerLabel(tenDaysAgo.toISOString()), tenDaysAgo.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));
  });

  await t.test("auraChatStore.getGuestSessionId creates and retrieves ID", () => {
    global.localStorage.clear();
    const gid = auraChatStore.getGuestSessionId();
    assert.ok(gid.startsWith("guest_"));
    const sameGid = auraChatStore.getGuestSessionId();
    assert.strictEqual(gid, sameGid);
  });

  await t.test("auraChatStore.getCurrentUserUid gets guest or user", () => {
    global.localStorage.clear();
    assert.strictEqual(auraChatStore.getCurrentUserUid(), "guest");

    global.localStorage.setItem("auth_user", JSON.stringify({ uid: "user123" }));
    assert.strictEqual(auraChatStore.getCurrentUserUid(), "user123");

    global.localStorage.setItem("auth_user", JSON.stringify({ email: "test@example.com" }));
    assert.strictEqual(auraChatStore.getCurrentUserUid(), "email_test_example_com");
  });

  await t.test("auraChatStore.getStorageKey uses uid", () => {
    global.localStorage.clear();
    assert.strictEqual(auraChatStore.getStorageKey("standard"), "aura_ai_chat_standard_guest");
    assert.strictEqual(auraChatStore.getStorageKey("panditji"), "aura_ai_chat_panditji_guest");
  });

  await t.test("auraChatStore.getDefaultInitialMessage returns initial messages", () => {
    assert.ok(auraChatStore.getDefaultInitialMessage("standard").text.includes("Aura AI"));
    assert.ok(auraChatStore.getDefaultInitialMessage("panditji").text.includes("AI Panditji"));
  });

  await t.test("auraChatStore.getMessages / saveMessages", () => {
    global.localStorage.clear();
    const initMsgs = auraChatStore.getMessages("standard");
    assert.strictEqual(initMsgs.length, 1);
    assert.strictEqual(initMsgs[0].id, "init_welcome_standard");

    const newMsgs = [...initMsgs, { id: "msg1", text: "Hello", sender: "user" }];
    auraChatStore.saveMessages(newMsgs, "standard");

    const saved = auraChatStore.getMessages("standard");
    assert.strictEqual(saved.length, 2);
    assert.strictEqual(saved[1].text, "Hello");
  });

  await t.test("auraChatStore.hasUserMessages", () => {
    global.localStorage.clear();
    assert.strictEqual(auraChatStore.hasUserMessages("standard"), false);

    auraChatStore.saveMessages([
      auraChatStore.getDefaultInitialMessage("standard"),
      { id: "msg1", text: "Hello", sender: "user" }
    ], "standard");
    assert.strictEqual(auraChatStore.hasUserMessages("standard"), true);
  });

  await t.test("auraChatStore.syncAuthSession", () => {
    global.localStorage.clear();

    // First time
    let syncRes = auraChatStore.syncAuthSession({ uid: "user1" }, "standard");
    assert.strictEqual(syncRes.accountSwitched, true);

    // Add message
    auraChatStore.saveMessages([...syncRes.messages, { id: "u1msg", sender: "user" }], "standard");

    // Same user again
    syncRes = auraChatStore.syncAuthSession({ uid: "user1" }, "standard");
    assert.strictEqual(syncRes.accountSwitched, false);
    assert.strictEqual(syncRes.messages.length, 2);

    // Account switch
    syncRes = auraChatStore.syncAuthSession({ uid: "user2" }, "standard");
    assert.strictEqual(syncRes.accountSwitched, true);
    assert.strictEqual(syncRes.messages.length, 1); // Cleared and reset to init
  });

  await t.test("auraChatStore.appendMessage / upsertMessage", () => {
    global.localStorage.clear();
    const initial = auraChatStore.getMessages("standard");

    const appended = auraChatStore.appendMessage({ text: "Hello", sender: "user" }, "standard");
    assert.strictEqual(appended.length, 2);
    const newMsgId = appended[1].id;

    const upserted = auraChatStore.upsertMessage({ id: newMsgId, text: "Updated Hello" }, "standard");
    assert.strictEqual(upserted.length, 2);
    assert.strictEqual(upserted[1].text, "Updated Hello");
  });

  await t.test("auraChatStore.startNewSession", () => {
    global.localStorage.clear();
    const res = auraChatStore.startNewSession("standard");
    assert.ok(res.newConvId.startsWith("conv_"));
    // Init message (1), divider (2), new welcome (3)
    assert.strictEqual(res.messages.length, 3);
    assert.strictEqual(res.messages[1].type, "session_divider");
  });

  await t.test("auraChatStore floating window state", () => {
    auraChatStore.setFloatingOpen(true);
    assert.strictEqual(auraChatStore.isFloatingOpen(), true);
    auraChatStore.setFloatingOpen(false);
    assert.strictEqual(auraChatStore.isFloatingOpen(), false);

    auraChatStore.setFloatingDismissed(true);
    assert.strictEqual(auraChatStore.isFloatingDismissed(), true);
    auraChatStore.setFloatingDismissed(false);
    assert.strictEqual(auraChatStore.isFloatingDismissed(), false);
  });
});
