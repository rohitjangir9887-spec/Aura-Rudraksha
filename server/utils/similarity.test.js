import test from "node:test";
import assert from "node:assert";
import { checkDuplicateReview } from "./similarity.js";

test("checkDuplicateReview", async (t) => {
  await t.test("should return not duplicate if candidate is empty or lacks text", () => {
    assert.deepStrictEqual(checkDuplicateReview(null), { isDuplicate: false, reason: "", matchedReview: null });
    assert.deepStrictEqual(checkDuplicateReview({}), { isDuplicate: false, reason: "", matchedReview: null });
    assert.deepStrictEqual(checkDuplicateReview({ text: "" }), { isDuplicate: false, reason: "", matchedReview: null });
  });

  await t.test("should skip checking against itself based on id", () => {
    const candidate = { id: "123", text: "This is a great product!" };
    const corpus = [{ id: "123", text: "This is a great product!" }];
    assert.deepStrictEqual(checkDuplicateReview(candidate, corpus), { isDuplicate: false, reason: "", matchedReview: null });
  });

  await t.test("should detect duplicate by sourceReviewId", () => {
    const candidate = { sourceReviewId: "ext-456", text: "Great!" };
    const corpus = [{ sourceReviewId: "ext-456", text: "Different text", title: "Review Title" }];
    const result = checkDuplicateReview(candidate, corpus);
    assert.strictEqual(result.isDuplicate, true);
    assert.strictEqual(result.reason, "Same external review ID already imported (sourceReviewId match)");
    assert.strictEqual(result.matchedReview, '"Review Title"');
  });

  await t.test("should detect exact match dynamically", () => {
    const candidate = { text: "This is an exact match." };
    const corpus = [{ text: "This is an exact match.", title: "Exact Title" }];
    const result = checkDuplicateReview(candidate, corpus);
    assert.strictEqual(result.isDuplicate, true);
    assert.strictEqual(result.reason, "Exact review text match detected (exactTextHash match)");
    assert.strictEqual(result.matchedReview, '"Exact Title"');
  });

  await t.test("should detect normalized match dynamically", () => {
    // Differing only by case and punctuation
    const candidate = { text: "This is an exact MATCH!" };
    const corpus = [{ text: "this is an exact match.", title: "Norm Title" }];
    const result = checkDuplicateReview(candidate, corpus);
    assert.strictEqual(result.isDuplicate, true);
    assert.strictEqual(result.reason, "Normalized review text match detected (normalizedTextHash match)");
    assert.strictEqual(result.matchedReview, '"Norm Title"');
  });

  await t.test("should detect similarity fallback duplicate", () => {
    // Very similar, should cross duplicate threshold (>= 70 similarity)
    const candidate = { text: "The quick brown fox jumps over the lazy dog perfectly." };
    const corpus = [{ text: "The quick brown fox jumped over a lazy dog perfectly.", title: "Similar Title" }];
    const result = checkDuplicateReview(candidate, corpus);
    assert.strictEqual(result.isDuplicate, true);
    assert.ok(result.reason.includes("similarity threshold exceeded"));
    assert.strictEqual(result.matchedReview, '"Similar Title"');
  });

  await t.test("should return false for unique/similar text below duplicate threshold", () => {
    const candidate = { text: "This is a completely different review." };
    const corpus = [{ text: "I bought this item and it was amazing." }];
    const result = checkDuplicateReview(candidate, corpus);
    assert.strictEqual(result.isDuplicate, false);
  });

  await t.test("should format matchedReview with truncated text if title is missing", () => {
    const candidate = { text: "Exact match without title." };
    const longText = "Exact match without title. ".repeat(4); // Ensure it's longer than 70 chars
    const corpus = [{ text: longText }];
    const candidateLong = { text: longText };

    const result = checkDuplicateReview(candidateLong, corpus);
    assert.strictEqual(result.isDuplicate, true);
    assert.strictEqual(result.matchedReview, longText.slice(0, 70) + "...");
  });
});
