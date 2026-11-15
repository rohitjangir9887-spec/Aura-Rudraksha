import { describe, test } from "vitest";
import assert from "node:assert";
import { extractRemainingContinuationSection, chatAuraAI } from "../auraAiController.js";

describe("Aura AI Controller — Zero-Failure & Smart Continuation", () => {
  test("extractRemainingContinuationSection omits already-seen headings and returns remaining sections", () => {
    const fullRef = [
      "### 1. पंचांग व अवकहड़ा चक्र\n• तिथि: शुक्ल पंचमी",
      "### 2. अभी क्या-क्या परेशानी चल रही है\n• कार्य में अस्थिरता",
      "### 3. लाल किताब उपाय व सिद्ध रुद्राक्ष\n• 7 मुखी व 8 मुखी रुद्राक्ष धारण करें"
    ].join("\n\n---\n\n");

    const alreadySeen = "### 1. पंचांग व अवकहड़ा चक्र\n• तिथि: शुक्ल पंचमी\n\n---\n\n### 2. अभी क्या-क्या परेशानी चल रही है";
    const remainder = extractRemainingContinuationSection(fullRef, alreadySeen.slice(-200), alreadySeen);

    assert.strictEqual(remainder.includes("पंचांग व अवकहड़ा चक्र"), false);
    assert.ok(remainder.includes("लाल किताब उपाय व सिद्ध रुद्राक्ष"));
  });

  test("extractRemainingContinuationSection gives graceful completion notice when all sections were seen", () => {
    const fullRef = "### 1. पंचांग व अवकहड़ा चक्र\n• तिथि: शुक्ल पंचमी\n\n---\n\n### 2. उपाय\n• 5 मुखी";
    const remainder = extractRemainingContinuationSection(fullRef, fullRef, fullRef);

    assert.ok(remainder.includes("पूर्ण हो चुका है"));
  });

  test("chatAuraAI recovers with HTTP 200 JSON payload if internal processing hits unexpected error", async () => {
    // Pass a body with getter throwing inside deep access after message is read or normal request with no DB
    const req = {
      body: {
        message: "5 mukhi rudraksha price aur benefits",
        mode: "panditji",
        panditPreferences: { responseStyle: "balanced", chartStyle: "chart" }
      },
      headers: {},
      query: {},
      ip: "127.0.0.1"
    };

    let statusCode = 200;
    let jsonBody = null;
    const res = {
      headersSent: false,
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        jsonBody = payload;
        return this;
      }
    };

    let nextCalled = false;
    await chatAuraAI(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonBody?.success, true);
    assert.ok(typeof jsonBody?.data?.text === "string" && jsonBody.data.text.length > 20);
  });
});
