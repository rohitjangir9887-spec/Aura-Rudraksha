import { test, describe } from 'node:test';
import assert from 'node:assert';
import { jaccardSimilarity } from './similarity.js';

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
