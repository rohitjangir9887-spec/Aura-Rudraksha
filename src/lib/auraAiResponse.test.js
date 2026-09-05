import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeCustomerText } from './auraAiResponse.js';

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
