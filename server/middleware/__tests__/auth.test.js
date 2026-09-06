import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireAdmin, devFallbackAllowed } from '../auth.js';

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.unstubAllEnvs();
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    vi.resetModules();
  });

  describe('devFallbackAllowed', () => {
    it('returns false in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('VERCEL_ENV', 'production');
      expect(devFallbackAllowed()).toBe(false);
    });

    it('returns false in preview', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('VERCEL_ENV', 'preview');
      expect(devFallbackAllowed()).toBe(false);
    });

    it('returns true only in test with ALLOW_DEV_AUTH_FALLBACK=true', () => {
      vi.stubEnv('NODE_ENV', 'test');
      vi.stubEnv('ALLOW_DEV_AUTH_FALLBACK', 'true');
      expect(devFallbackAllowed()).toBe(true);
    });

    it('returns false in test with ALLOW_DEV_AUTH_FALLBACK=false', () => {
      vi.stubEnv('NODE_ENV', 'test');
      vi.stubEnv('ALLOW_DEV_AUTH_FALLBACK', 'false');
      expect(devFallbackAllowed()).toBe(false);
    });
  });

  describe('requireAuth', () => {
    it('rejects unauthenticated requests in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Authentication required' });
    });

    it('rejects dev tokens in production', async () => {
      vi.stubEnv('ALLOW_DEV_AUTH_FALLBACK', 'true');
      vi.stubEnv('NODE_ENV', 'production');
      req.headers.authorization = 'Bearer demo-token-123';

      // We don't have mock getAuth here, so it will fail verification and then fall through to 401
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
