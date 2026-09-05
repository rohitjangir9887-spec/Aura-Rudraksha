import test from 'node:test';
import assert from 'node:assert';
import { jaccardSimilarity } from './similarity.js';

test('jaccardSimilarity functionality', async (t) => {
  await t.test('returns 0 for missing arguments', () => {
    assert.strictEqual(jaccardSimilarity(), 0);
    assert.strictEqual(jaccardSimilarity(new Set()), 0);
    assert.strictEqual(jaccardSimilarity(undefined, new Set()), 0);
    assert.strictEqual(jaccardSimilarity(null, null), 0);
  });

  await t.test('returns 1 for two empty sets', () => {
    assert.strictEqual(jaccardSimilarity(new Set(), new Set()), 1);
  });

  await t.test('returns 0 if one set is empty', () => {
    assert.strictEqual(jaccardSimilarity(new Set([1, 2]), new Set()), 0);
    assert.strictEqual(jaccardSimilarity(new Set(), new Set([1, 2])), 0);
  });

  await t.test('returns 1 for identical sets', () => {
    assert.strictEqual(jaccardSimilarity(new Set([1, 2, 3]), new Set([1, 2, 3])), 1);
    assert.strictEqual(jaccardSimilarity(new Set(['a', 'b']), new Set(['a', 'b'])), 1);
  });

  await t.test('returns correct ratio for partially overlapping sets', () => {
    // A: {1, 2, 3}, B: {2, 3, 4} -> Intersection: {2, 3} (size 2), Union: {1, 2, 3, 4} (size 4) -> 2/4 = 0.5
    assert.strictEqual(jaccardSimilarity(new Set([1, 2, 3]), new Set([2, 3, 4])), 0.5);

    // A: {'apple', 'banana'}, B: {'banana', 'orange', 'grape'}
    // Intersection: {'banana'} (size 1), Union: {'apple', 'banana', 'orange', 'grape'} (size 4) -> 1/4 = 0.25
    assert.strictEqual(jaccardSimilarity(new Set(['apple', 'banana']), new Set(['banana', 'orange', 'grape'])), 0.25);
  });

  await t.test('returns 0 for disjoint sets', () => {
    assert.strictEqual(jaccardSimilarity(new Set([1, 2]), new Set([3, 4])), 0);
    assert.strictEqual(jaccardSimilarity(new Set(['a']), new Set(['b', 'c'])), 0);
  });
});
