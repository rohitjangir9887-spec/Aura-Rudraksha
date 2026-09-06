
import { test } from 'node:test';
import assert from 'node:assert';
import { evaluateDraftSimilarity, getExactTextHash, getNormalizedTextHash, checkDuplicateReview } from '../server/utils/similarity.js';

test('AI Review Similarity - Exact duplicate detection', () => {
    const candidate = { text: "This is a wonderful product, highly recommended.", id: "draft-1" };
    const corpus = [
        { id: "rev-1", text: "This is a wonderful product, highly recommended." }
    ];

    const result = evaluateDraftSimilarity(candidate.text, corpus);
    assert.strictEqual(result.similarityStatus, "Duplicate");
});

test('AI Review Similarity - Normalized duplicate detection', () => {
    const candidate = { text: "  THIS is a wonderful product, highly recommended!!!  ", id: "draft-1" };
    const corpus = [
        { id: "rev-1", text: "this is a wonderful product highly recommended" }
    ];

    const result = evaluateDraftSimilarity(candidate.text, corpus);
    assert.strictEqual(result.similarityStatus, "Duplicate");
});

test('AI Review Similarity - Semantic/near duplicate detection', () => {
    const candidate = { text: "I bought this wonderful item, highly recommend it to everyone.", id: "draft-1" };
    const corpus = [
        { id: "rev-1", text: "I bought this wonderful item, highly recommend it to everyone." }
    ];

    const result = evaluateDraftSimilarity(candidate.text, corpus);
    assert.strictEqual(result.similarityStatus, "Duplicate");
});

test('AI Review Similarity - Unique text', () => {
    const candidate = { text: "The quality of the rudraksha is pristine and energetic.", id: "draft-1" };
    const corpus = [
        { id: "rev-1", text: "This is a wonderful product, highly recommended to everyone." },
        { id: "rev-2", text: "Delivery was fast and packaging was secure." }
    ];

    const result = evaluateDraftSimilarity(candidate.text, corpus);
    assert.strictEqual(result.similarityStatus, "Unique");
});
