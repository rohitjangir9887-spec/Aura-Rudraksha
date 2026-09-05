import { test, describe } from 'node:test';
import assert from 'node:assert';
import { jaccardSimilarity, evaluateDraftSimilarity } from './similarity.js';

describe('jaccardSimilarity', () => {
  test('returns 1 for identical sets', () => {
    const setA = new Set(['a', 'b', 'c']);
    const setB = new Set(['a', 'b', 'c']);
    assert.strictEqual(jaccardSimilarity(setA, setB), 1);
  });

  test('returns 0 for completely disjoint sets', () => {
    const setA = new Set(['a', 'b']);
    const setB = new Set(['c', 'd']);
    assert.strictEqual(jaccardSimilarity(setA, setB), 0);
  });

  test('returns correct fraction for overlapping sets', () => {
    const setA = new Set(['a', 'b', 'c']);
    const setB = new Set(['b', 'c', 'd']);
    // Intersection: ['b', 'c'] -> size 2
    // Union: ['a', 'b', 'c', 'd'] -> size 4
    // Similarity: 2 / 4 = 0.5
    assert.strictEqual(jaccardSimilarity(setA, setB), 0.5);
  });

  test('returns 1 when both sets are empty', () => {
    const setA = new Set();
    const setB = new Set();
    assert.strictEqual(jaccardSimilarity(setA, setB), 1);
  });

  test('returns 0 when only first set is empty', () => {
    const setA = new Set();
    const setB = new Set(['a']);
    assert.strictEqual(jaccardSimilarity(setA, setB), 0);
  });

  test('returns 0 when only second set is empty', () => {
    const setA = new Set(['a']);
    const setB = new Set();
    assert.strictEqual(jaccardSimilarity(setA, setB), 0);
  });

  test('returns 0 when sets are null or undefined', () => {
    assert.strictEqual(jaccardSimilarity(null, null), 0);
    assert.strictEqual(jaccardSimilarity(undefined, undefined), 0);
    assert.strictEqual(jaccardSimilarity(new Set(['a']), null), 0);
    assert.strictEqual(jaccardSimilarity(null, new Set(['a'])), 0);
  });
});

describe('evaluateDraftSimilarity', () => {
  test('handles very long text efficiently and correctly', () => {
    // Generate a very long text with many distinct words
    // We generate 5000 distinct words, and then another version with 1 different word at the end
    const distinctWords = Array.from({ length: 5000 }, (_, i) => `word${i}`);
    const longText = distinctWords.join(' ');

    // Copy the array, change the last word to make it slightly different
    const similarDistinctWords = [...distinctWords];
    similarDistinctWords[similarDistinctWords.length - 1] = 'differentword';
    const similarText = similarDistinctWords.join(' ');

    // Existing corpus with the very long text
    const existingCorpus = [
      { text: longText, title: 'Very Long Review' }
    ];

    // Test with exactly the same text
    const resultExact = evaluateDraftSimilarity(longText, existingCorpus);
    assert.strictEqual(resultExact.similarityStatus, 'Duplicate');
    assert.strictEqual(resultExact.similarityScore, 100);
    assert.strictEqual(resultExact.semanticScore, 100);
    assert.strictEqual(resultExact.matchedReview, '"Very Long Review"');

    // Test with slightly different but very long text
    const resultSimilar = evaluateDraftSimilarity(similarText, existingCorpus);
    assert.strictEqual(resultSimilar.similarityStatus, 'Duplicate');
    // Scores should be very high due to length of match
    assert.ok(resultSimilar.similarityScore > 90);
    assert.ok(resultSimilar.semanticScore > 90);
    assert.strictEqual(resultSimilar.matchedReview, '"Very Long Review"');

    // Test empty text
    const resultEmpty = evaluateDraftSimilarity('', existingCorpus);
    assert.strictEqual(resultEmpty.similarityStatus, 'Unique');
    assert.strictEqual(resultEmpty.similarityScore, 0);
    assert.strictEqual(resultEmpty.semanticScore, 0);
    assert.strictEqual(resultEmpty.matchedReview, null);
  });
});
