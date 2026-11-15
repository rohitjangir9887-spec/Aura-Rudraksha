import { describe, test } from "vitest";
import assert from "node:assert";
import {
  NAKSHATRA_27_KNOWLEDGE,
  RASHI_12_KNOWLEDGE,
  BHAVA_12_KNOWLEDGE,
  GRAHA_9_REMEDIES,
  DOSHA_YOGA_ENCYCLOPEDIA,
  CHAKRA_RUDRAKSHA_MAP,
  RUDRAKSHA_AUTHENTICITY_AND_CARE,
  NUMEROLOGY_MULANK_GUIDE
} from "../vedicKnowledgeService.js";
import {
  calculateKundaliMilan,
  calculateVedicNumerology,
  getDailyVedicPanchang,
  generateNonKundaliPanditJiGuidance
} from "../vedicAstrologyService.js";
import { retrieveRagContext } from "../ragService.js";
import {
  WEBSITE_AI_MODELS,
  GEMINI_TEXT_MODELS,
  buildFastNimCandidateList,
  buildGeminiCandidateList,
  calculateKundaliMilanEndpoint,
  calculateNumerologyEndpoint,
  getDailyPanchangEndpoint
} from "../../controllers/auraAiController.js";

describe("AI Pandit Ji Shastra Training, Calculators & Zero-Failure Model Hardening", () => {
  test("vedicKnowledgeService exports complete 27 Nakshatras, 12 Rashis, 12 Bhavas, 9 Grahas, Chakras & Numerology", () => {
    assert.strictEqual(NAKSHATRA_27_KNOWLEDGE.length, 27);
    assert.strictEqual(RASHI_12_KNOWLEDGE.length, 12);
    assert.strictEqual(BHAVA_12_KNOWLEDGE.length, 12);
    assert.strictEqual(Object.keys(GRAHA_9_REMEDIES).length, 9);
    assert.strictEqual(CHAKRA_RUDRAKSHA_MAP.length, 7);
    assert.strictEqual(Object.keys(NUMEROLOGY_MULANK_GUIDE).length, 9);
    assert.ok(DOSHA_YOGA_ENCYCLOPEDIA.doshas.kaalSarp.rule.includes("12. शेषनाग"));
    assert.ok(DOSHA_YOGA_ENCYCLOPEDIA.rajayogas.length >= 5);
    assert.ok(RUDRAKSHA_AUTHENTICITY_AND_CARE.sacredCombinations.length >= 5);
  });

  test("calculateKundaliMilan computes 36-point Ashtakoota breakdown accurately", () => {
    const milan = calculateKundaliMilan({
      boy: { name: "Rohan", dob: "1995-08-15", birthTime: "10:30 AM", birthPlace: "Jaipur, India" },
      girl: { name: "Priya", dob: "1997-04-20", birthTime: "02:15 PM", birthPlace: "Delhi, India" }
    });
    assert.ok(milan.totalScore >= 0 && milan.totalScore <= 36);
    assert.strictEqual(milan.maxScore, 36);
    assert.strictEqual(milan.kootas.length, 8);
    const maxSum = milan.kootas.reduce((acc, k) => acc + k.max, 0);
    assert.strictEqual(maxSum, 36);
    assert.ok(milan.manglikStatus.length > 5);
    assert.ok(milan.recommendedRemedies.length >= 2);
  });

  test("calculateVedicNumerology computes Mulank, Bhagyank, and Chaldean Namank", () => {
    const num = calculateVedicNumerology({ dob: "1995-08-15", name: "Rahul Sharma" });
    assert.strictEqual(num.mulank, 6); // 1 + 5 = 6
    assert.strictEqual(num.bhagyank, 2); // 1+9+9+5+0+8+1+5 = 38 -> 11 -> 2
    assert.ok(num.namank >= 1 && num.namank <= 9);
    assert.ok(num.primaryRudraksha.includes("Mukhi"));
    assert.ok(num.beejMantra.length > 3);
  });

  test("getDailyVedicPanchang returns Sidereal Tithi, Vara, Nakshatra, Muhurat & Rahu Kaal", () => {
    const panchang = getDailyVedicPanchang({ date: "2025-02-26", place: "Varanasi, India" });
    assert.strictEqual(panchang.dateIso, "2025-02-26");
    assert.ok(panchang.panchanga?.tithi);
    assert.ok(panchang.panchanga?.vaar);
    assert.ok(panchang.nakshatra?.name);
    assert.ok(panchang.abhijitMuhurat.includes("AM") || panchang.abhijitMuhurat.includes("PM"));
    assert.ok(panchang.rahuKaal.includes("-"));
    assert.ok(panchang.dailyRudraksha.length > 5);
  });

  test("generateNonKundaliPanditJiGuidance responds richly to Shastra, Chakras, Doshas & Authenticity queries", () => {
    const kaalSarpReply = generateNonKundaliPanditJiGuidance("कालसर्प दोष और मांगलिक दोष क्या होता है?", []);
    assert.ok(kaalSarpReply.includes("कालसर्प") || kaalSarpReply.includes("मांगलिक"));

    const nepalReply = generateNonKundaliPanditJiGuidance("Nepali aur Indonesian Rudraksha me difference aur X-Ray test batao", []);
    assert.ok(nepalReply.includes("नेपाली") && nepalReply.includes("X-Ray"));

    const chakraReply = generateNonKundaliPanditJiGuidance("7 चक्र और कुंडलिनी रुद्राक्ष बताइए", []);
    assert.ok(chakraReply.includes("मूलाधार") && chakraReply.includes("सहस्रार"));
  });

  test("ragService retrieves Kundali Gyan & Rudraksha Gyan docs for Hindi & Hinglish queries", async () => {
    const nakDocs = await retrieveRagContext("27 नक्षत्र अश्विनी रोहिणी पुष्य रुद्राक्ष", 5);
    assert.ok(nakDocs.some(d => (d.docId || "").includes("nakshatra") || (d.title || "").includes("Nakshatra")));

    const authDocs = await retrieveRagContext("Nepal vs Indonesia X-Ray authentic Rudraksha care", 5);
    assert.ok(authDocs.some(d => (d.docId || "").includes("authenticity") || (d.title || "").includes("Nepal")));
  });

  test("Model catalogs and resilient fallback cascades use only active models with zero deprecated Gemini IDs", () => {
    assert.ok(WEBSITE_AI_MODELS.some(m => m.id === "nvidia/nemotron-3-ultra-550b-a55b"));
    assert.ok(WEBSITE_AI_MODELS.some(m => m.id === "gemini-4-hydrogen"));

    for (const gModel of GEMINI_TEXT_MODELS) {
      assert.strictEqual(/gemini-(1\.|2\.0|2\.5)/i.test(gModel), false, `Unexpected deprecated model: ${gModel}`);
    }

    const nimList = buildFastNimCandidateList("nvidia/nemotron-3-ultra-550b-a55b", 4);
    assert.strictEqual(nimList[0], "nvidia/nemotron-3-ultra-550b-a55b");
    assert.strictEqual(nimList.length, 4);
    assert.strictEqual(nimList.some(m => /^gemini-/i.test(m)), false);

    const gemList = buildGeminiCandidateList("gemini-3.8-flash", 3);
    assert.strictEqual(gemList[0], "gemini-3.8-flash");
    assert.ok(gemList.includes("gemini-4-hydrogen"));
    assert.ok(gemList.includes("gemini-3.1-flash-lite"));
  });

  test("Controller endpoints return 200 JSON for Milan, Numerology & Panchang", async () => {
    const createMockRes = () => {
      let status = 200;
      let body = null;
      return {
        status(code) { status = code; return this; },
        json(payload) { body = payload; return this; },
        get result() { return { status, body }; }
      };
    };

    const milanRes = createMockRes();
    await calculateKundaliMilanEndpoint({
      body: {
        boy: { name: "Amit", dob: "1994-03-10", birthTime: "08:00", birthPlace: "Jaipur" },
        girl: { name: "Neha", dob: "1996-07-18", birthTime: "10:15", birthPlace: "Lucknow" }
      }
    }, milanRes, () => {});
    assert.strictEqual(milanRes.result.status, 200);
    assert.strictEqual(milanRes.result.body?.success, true);
    assert.strictEqual(milanRes.result.body?.data?.maxScore, 36);

    const numRes = createMockRes();
    await calculateNumerologyEndpoint({ body: { dob: "1994-03-10", name: "Amit" } }, numRes, () => {});
    assert.strictEqual(numRes.result.status, 200);
    assert.strictEqual(numRes.result.body?.data?.mulank, 1);

    const panchangRes = createMockRes();
    await getDailyPanchangEndpoint({ query: { date: "2025-05-01", place: "Varanasi" } }, panchangRes, () => {});
    assert.strictEqual(panchangRes.result.status, 200);
    assert.strictEqual(panchangRes.result.body?.data?.dateIso, "2025-05-01");
  });
});
