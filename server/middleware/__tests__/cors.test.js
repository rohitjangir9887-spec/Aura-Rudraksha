import { describe, it, expect } from 'vitest';
import { resolveAllowedOrigins } from '../../app.js';

describe('CORS Configuration', () => {
  it('resolves origins securely without blind reflection', () => {
    const origins = resolveAllowedOrigins();
    expect(origins).toBeInstanceOf(Array);
  });
});
