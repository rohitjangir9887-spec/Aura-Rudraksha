import { describe, it, expect } from 'vitest';
import { normalizeText } from '../similarity.js';

describe('normalizeText', () => {
  it('should handle empty, null, undefined, and non-string inputs', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText(123)).toBe('');
    expect(normalizeText({})).toBe('');
  });

  it('should convert strings to lowercase', () => {
    expect(normalizeText('Hello WORLD')).toBe('hello world');
    expect(normalizeText('MixedCASE String')).toBe('mixedcase string');
  });

  it('should replace punctuation and special characters with spaces and collapse spaces', () => {
    expect(normalizeText('hello, world!')).toBe('hello world');
    expect(normalizeText('user@domain.com')).toBe('user domain com');
    expect(normalizeText('price: $99.99')).toBe('price 99 99');
    expect(normalizeText('hyphenated-word')).toBe('hyphenated word');
  });

  it('should trim leading, trailing, and multiple internal spaces', () => {
    expect(normalizeText('  too   many   spaces  ')).toBe('too many spaces');
    expect(normalizeText('\t tabs\tand \nnewlines\n')).toBe('tabs and newlines');
  });

  it('should retain unicode letters and numbers', () => {
    expect(normalizeText('café münchen æøå')).toBe('café münchen æøå');
    expect(normalizeText('русский текст 123')).toBe('русский текст 123');
    expect(normalizeText('emoji 🎉 test')).toBe('emoji test');
  });

  it('should run correctly on a standard sentence', () => {
    expect(normalizeText('This is a "Standard" sentence, meant for testing.')).toBe('this is a standard sentence meant for testing');
  });
});
