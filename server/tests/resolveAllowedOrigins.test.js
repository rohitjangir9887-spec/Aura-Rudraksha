import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { resolveAllowedOrigins } from '../app.js';

describe('resolveAllowedOrigins', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return dev origins when environment is not production and CORS_ORIGINS is empty', () => {
    process.env.NODE_ENV = 'development';
    process.env.CORS_ORIGINS = '';

    const result = resolveAllowedOrigins();
    assert.deepStrictEqual(result, [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ]);
  });

  it('should parse CORS_ORIGINS correctly and trim whitespace', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'http://example.com ,  https://another.com';

    const result = resolveAllowedOrigins();
    assert.deepStrictEqual(result, [
      'http://example.com',
      'https://another.com'
    ]);
  });

  it('should merge parsed CORS_ORIGINS and dev origins in non-production environments without duplicates', () => {
    process.env.NODE_ENV = 'development';
    process.env.CORS_ORIGINS = 'http://example.com, http://localhost:5173';

    const result = resolveAllowedOrigins();
    assert.deepStrictEqual(result, [
      'http://example.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ]);
  });

  it('should return empty array in production if CORS_ORIGINS is empty', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = '';

    const result = resolveAllowedOrigins();
    assert.deepStrictEqual(result, []);
  });
});
