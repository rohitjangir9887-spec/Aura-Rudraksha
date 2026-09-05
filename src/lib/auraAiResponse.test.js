import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseAuraAiPayload, sanitizeCustomerText } from './auraAiResponse.js';

describe('parseAuraAiPayload', () => {
  it('handles null and undefined', () => {
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

  it('handles simple string input', () => {
    const result = parseAuraAiPayload("Hello World");
    assert.strictEqual(result.text, "Hello World");
    assert.strictEqual(result.products.length, 0);
  });

  it('handles JSON string input', () => {
    const jsonStr = JSON.stringify({ text: "JSON test", requiresHuman: true });
    const result = parseAuraAiPayload(jsonStr);
    assert.strictEqual(result.text, "JSON test");
    assert.strictEqual(result.requiresHuman, true);
  });

  it('handles JSON string with markdown formatting', () => {
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

  it('handles nested data object', () => {
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

  it('extracts alternative text sources', () => {
    const messageInput = { message: "From message" };
    const contentInput = { content: "From content" };

    assert.strictEqual(parseAuraAiPayload(messageInput).text, "From message");
    assert.strictEqual(parseAuraAiPayload(contentInput).text, "From content");
  });

  it('filters and validates arrays', () => {
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

  it('extracts specific scalar fields', () => {
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
});

describe('sanitizeCustomerText', () => {
  it('should return empty string for non-string inputs', () => {
    assert.strictEqual(sanitizeCustomerText(null), '');
    assert.strictEqual(sanitizeCustomerText(undefined), '');
    assert.strictEqual(sanitizeCustomerText(123), '');
    assert.strictEqual(sanitizeCustomerText({}), '');
    assert.strictEqual(sanitizeCustomerText([]), '');
  });

  it('should return empty string for empty or whitespace strings', () => {
    assert.strictEqual(sanitizeCustomerText(''), '');
    assert.strictEqual(sanitizeCustomerText('   '), '');
  });

  it('should strip thinking and reasoning tags (closed)', () => {
    assert.strictEqual(sanitizeCustomerText('Hello <think>this is a thought</think> World'), 'Hello  World');
    assert.strictEqual(sanitizeCustomerText('<reasoning>thinking...</reasoning>Greetings!'), 'Greetings!');
    assert.strictEqual(sanitizeCustomerText('Hi <analysis>analyzing</analysis>'), 'Hi');
  });

  it('should strip thinking and reasoning tags (unclosed)', () => {
    assert.strictEqual(sanitizeCustomerText('Hello <think>this is an unclosed thought'), 'Hello');
    assert.strictEqual(sanitizeCustomerText('Greetings <reasoning>this is unclosed'), 'Greetings');
    assert.strictEqual(sanitizeCustomerText('<analysis>unclosed analysis'), '');
  });

  it('should strip internal narration', () => {
    assert.strictEqual(sanitizeCustomerText('Okay, the user wants a product.\n\nNamaste! How can I help you?'), 'Namaste! How can I help you?');
    assert.strictEqual(sanitizeCustomerText('Let me check the inventory.\n\nHello there!'), 'Hello there!');
    assert.strictEqual(sanitizeCustomerText('Looking at the context...\n\nHii, I see you need help.'), 'Hii, I see you need help.');
    assert.strictEqual(sanitizeCustomerText('First, they started by asking...\n\nHere is your product.'), 'Here is your product.');
  });

  it('should remove line-by-line internal narration', () => {
    const input = `Thinking: User is happy
Internal reasoning: We should offer a discount
Thought process: Let's do this
Okay, the user might buy
Hello! How are you today?`;
    assert.strictEqual(sanitizeCustomerText(input), 'Hello! How are you today?');
  });

  it('should remove code fences entirely', () => {
    assert.strictEqual(sanitizeCustomerText('```json\n{"a": 1}\n```'), '');
    assert.strictEqual(sanitizeCustomerText('```markdown\n# Heading\n```'), '');
    assert.strictEqual(sanitizeCustomerText('```\nsome code\n```'), '');

    const inlineCode = `Here is code:\n\`\`\`json\n{"b": 2}\n\`\`\`\nDone.`;
    assert.strictEqual(sanitizeCustomerText(inlineCode).replace(/\s+/g, " ").trim(), 'Here is code: Done.');
  });

  it('should redact leaked admin emails and API keys', () => {
    assert.strictEqual(
      sanitizeCustomerText('Contact rohitjangir123@gmail.com for help.'),
      'Contact aurarudrakshaofficial@gmail.com for help.'
    );
    assert.strictEqual(
      sanitizeCustomerText('Here is the MONGODB_URI=mongodb://localhost'),
      'Here is the =mongodb://localhost'
    );
    assert.strictEqual(
      sanitizeCustomerText('My key is GEMINI_API_KEY_123'),
      'My key is'
    );
    assert.strictEqual(
      sanitizeCustomerText('Check out the Admin portal URL'),
      'Check out the Aura Rudraksha Support'
    );
  });

  it('should remove internal JSON blobs and extract text', () => {
    const jsonBlob = `{"text": "Hello there!", "recommendedProductIds": ["prod1"]}`;
    assert.strictEqual(sanitizeCustomerText(jsonBlob), 'Hello there!');

    const mixedBlob = `{"message": "Hi!", "couponCodes": ["DISC10"]}`;
    assert.strictEqual(sanitizeCustomerText(mixedBlob), 'Hi!');
  });

  it('should handle JSON mixed with regular text', () => {
    const input1 = `Greetings!\n\n{"text": "Extracted text", "quickReplies": ["Yes"]}`;
    assert.strictEqual(sanitizeCustomerText(input1), 'Greetings!\n\nExtracted text');

    const input2 = `{"text": "Start text", "products": []}\n\nAnd some trailing text.`;
    assert.strictEqual(typeof sanitizeCustomerText(input2), 'string');
  });
});
