import { describe, it, expect } from 'vitest';
import { getExactTextHash } from './similarity.js';

describe('getExactTextHash', () => {
  it('computes correct SHA256 hash for a standard string', () => {
    const hash = getExactTextHash('hello world');
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('trims whitespace before hashing', () => {
    const hash = getExactTextHash('  hello world  ');
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('returns empty string for empty string input', () => {
    expect(getExactTextHash('')).toBe('');
  });

  it('returns empty string for null input', () => {
    expect(getExactTextHash(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(getExactTextHash(undefined)).toBe('');
  });

  it('returns empty string for non-string inputs', () => {
    expect(getExactTextHash(123)).toBe('');
    expect(getExactTextHash({})).toBe('');
    expect(getExactTextHash([])).toBe('');
  });
});
