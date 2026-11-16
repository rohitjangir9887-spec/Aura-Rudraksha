import { test } from 'vitest';
import assert from 'node:assert';
import {
  parseAuraAiPayload,
  customerSafeAiText,
  isAuraResponseIncomplete,
  smartMergeContinuation
} from './auraAiResponse.js';

test('parseAuraAiPayload - handles null and undefined', (t) => {
  const expectedEmpty = {
    text: "",
    products: [],
    coupons: [],
    recommendedProductIds: [],
    couponCodes: [],
    requiresHuman: false,
    quickReplies: [],
    orderInfo: null,
    kundali: null
  };

  assert.deepStrictEqual(parseAuraAiPayload(null), expectedEmpty);
  assert.deepStrictEqual(parseAuraAiPayload(undefined), expectedEmpty);
});

test('parseAuraAiPayload - handles simple string input', (t) => {
  const result = parseAuraAiPayload("Hello World");
  assert.strictEqual(result.text, "Hello World");
  assert.strictEqual(result.products.length, 0);
});

test('parseAuraAiPayload - handles JSON string input', (t) => {
  const jsonStr = JSON.stringify({ text: "JSON test", requiresHuman: true });
  const result = parseAuraAiPayload(jsonStr);
  assert.strictEqual(result.text, "JSON test");
  assert.strictEqual(result.requiresHuman, true);
});

test('parseAuraAiPayload - handles JSON string with markdown formatting', (t) => {
  const jsonStr = `\`\`\`json
{
  "text": "Markdown test",
  "couponCodes": ["DISCOUNT10"]
}
\`\`\``;
  const result = parseAuraAiPayload(jsonStr);
  assert.strictEqual(result.text, "Markdown test");
  assert.deepStrictEqual(result.couponCodes, ["DISCOUNT10"]);
});

test('parseAuraAiPayload - handles nested data object', (t) => {
  const input = {
    success: true,
    data: {
      text: "Nested text",
      products: [{ id: "p1", name: "Product 1" }]
    }
  };
  const result = parseAuraAiPayload(input);
  assert.strictEqual(result.text, "Nested text");
  assert.strictEqual(result.products.length, 1);
  assert.strictEqual(result.products[0].id, "p1");
});

test('parseAuraAiPayload - extracts alternative text sources', (t) => {
  const messageInput = { message: "From message" };
  const contentInput = { content: "From content" };

  assert.strictEqual(parseAuraAiPayload(messageInput).text, "From message");
  assert.strictEqual(parseAuraAiPayload(contentInput).text, "From content");
});

test('parseAuraAiPayload - filters and validates arrays', (t) => {
  const input = {
    products: [
      { id: "1" },
      { name: "Product 2" },
      { invalid: true }, // Should be filtered out
      null // Should be filtered out
    ],
    coupons: [
      { code: "SAVE20" },
      { invalid: "no code" } // Should be filtered out
    ],
    quickReplies: [
      "Reply 1",
      { label: "Reply 2" },
      { text: "Reply 3" },
      { invalid: "yes" }, // empty string after mapping, filtered out
      "Reply 4",
      "Reply 5",
      "Reply 6" // Should be capped at 4
    ]
  };

  const result = parseAuraAiPayload(input);

  assert.strictEqual(result.products.length, 2);
  assert.strictEqual(result.products[0].id, "1");
  assert.strictEqual(result.products[1].name, "Product 2");

  assert.strictEqual(result.coupons.length, 1);
  assert.strictEqual(result.coupons[0].code, "SAVE20");

  assert.strictEqual(result.quickReplies.length, 4);
  assert.deepStrictEqual(result.quickReplies, ["Reply 1", "Reply 2", "Reply 3", "Reply 4"]);
});

test('parseAuraAiPayload - extracts specific scalar fields', (t) => {
  const input = {
    requiresHuman: true,
    orderInfo: { status: "shipped" },
    conversationId: "conv_123"
  };

  const result = parseAuraAiPayload(input);

  assert.strictEqual(result.requiresHuman, true);
  assert.deepStrictEqual(result.orderInfo, { status: "shipped" });
  assert.strictEqual(result.conversationId, "conv_123");
});

test('parseAuraAiPayload - preserves and normalizes kundali payload', (t) => {
  const input = {
    success: true,
    data: {
      text: "Vedic Reading",
      kundali: {
        verifiedBirthData: { name: "Rohit", dob: "1998-05-15", birthTime: "10:30", birthPlace: "Jaipur" },
        astronomicalKundali: {
          lagna: { rashiHindi: "कर्क", rashiEnglish: "Karka", degree: "12°34'" },
          chandraRashi: { rashiHindi: "धनु", rashiEnglish: "Dhanu", rashiSymbol: "♐", degree: "05°12'", nakshatra: "मूल", pada: 1 },
          suryaRashi: { rashiHindi: "वृषभ", rashiEnglish: "Vrishabh", degree: "00°45'" },
          mulank: 6,
          vimshottariDasha: { currentMahadashaHindi: "गुरु", currentAntardashaHindi: "शनि" },
          rudrakshaRecommendations: [{ role: "Lagna", mukhi: "2 Mukhi Rudraksha" }]
        }
      }
    }
  };

  const result = parseAuraAiPayload(input);

  assert.ok(result.kundali);
  assert.strictEqual(result.kundali.devoteeName, "Rohit");
  assert.strictEqual(result.kundali.dob, "1998-05-15");
  assert.strictEqual(result.kundali.rashiHindi, "धनु");
  assert.strictEqual(result.kundali.lagnaRashiHindi, "कर्क");
  assert.strictEqual(result.kundali.recommendedMukhi, "2 Mukhi Rudraksha");
});

test('isAuraResponseIncomplete - no false positive on single Sun mention or markdown/emoji endings', () => {
  const singleSunReply = "सूर्य नमस्कार और 1 मुखी रुद्राक्ष आत्मविश्वास बढ़ाने के लिए अत्यंत शुभ माना जाता है।";
  assert.strictEqual(isAuraResponseIncomplete(singleSunReply, "panditji"), false);

  const boldEnded = "यह आपके जीवन में सुख, शांति और समृद्धि प्रदान करता है। *हर हर महादेव*";
  assert.strictEqual(isAuraResponseIncomplete(boldEnded, "panditji"), false);

  const emojiEnded = "ऑरा रुद्राक्ष के सभी मनके 100% लैब प्रमाणित हैं 🙏";
  assert.strictEqual(isAuraResponseIncomplete(emojiEnded, "standard"), false);
});

test('isAuraResponseIncomplete - flags Navagraha chart missing Rahu/Ketu or mid-sentence cutoff', () => {
  const incompleteChart = "### नवग्रह स्थिति तालिका\n• सूर्य: मेष\n• चंद्र: कर्क\n• मंगल: मकर\n• बुध: मिथुन";
  assert.strictEqual(isAuraResponseIncomplete(incompleteChart, "panditji"), true);

  const midSentence = "आपकी कुंडली में दशम भाव का स्वामी गुरु अत्यंत शुभ स्थिति में होकर करियर में उन्नति प्रदान";
  assert.strictEqual(isAuraResponseIncomplete(midSentence, "panditji"), true);
});

test('smartMergeContinuation - strips repeated heading and preserves markdown paragraph breaks', () => {
  const base = "### 6. नवग्रह फल\n• **सूर्य:** शुभ फल।";
  const cont = "### 6. नवग्रह फल\n### 7. द्वादश भाव फल\n• **प्रथम भाव:** उत्तम स्वास्थ्य।";
  const merged = smartMergeContinuation(base, cont);

  assert.strictEqual(merged.includes("### 6. नवग्रह फल\n### 6. नवग्रह फल"), false);
  assert.ok(merged.includes("\n\n### 7. द्वादश भाव फल"));
  assert.ok(merged.includes("उत्तम स्वास्थ्य।"));
});

test('isAuraResponseIncomplete & customerSafeAiText - catches odd bold markers, dangling bullet headings & trailing <think>', () => {
  const oddBold = "आपकी जन्म कुंडली के अनुसार **मंगल ग्रह सप्तम भाव में स्थित होकर शुभ";
  assert.strictEqual(isAuraResponseIncomplete(oddBold, "panditji"), true);

  const danglingBulletHeading = "आपकी कुंडली के प्रमुख योग:\n• **7. सप्तम भाव (विवाह एवं साझेदारी)**";
  assert.strictEqual(isAuraResponseIncomplete(danglingBulletHeading, "panditji"), true);

  const midStreamThink = "प्रणाम 🙏 5 मुखी रुद्राक्ष अत्यंत शुभ है।\n<think>Let me double check prices";
  assert.strictEqual(customerSafeAiText(midStreamThink), "प्रणाम 🙏 5 मुखी रुद्राक्ष अत्यंत शुभ है।");
});

