import test from 'node:test';
import assert from 'node:assert';
import { parseAuraAiPayload } from './auraAiResponse.js';

test('parseAuraAiPayload - handles null and undefined', (t) => {
  const expectedEmpty = {
    text: "",
    products: [],
    coupons: [],
    recommendedProductIds: [],
    couponCodes: [],
    requiresHuman: false,
    quickReplies: [],
    orderInfo: null
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
