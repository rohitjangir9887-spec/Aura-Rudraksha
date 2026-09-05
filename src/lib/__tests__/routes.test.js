import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getSafeReturnPath } from '../routes.js';

describe('getSafeReturnPath', () => {
  const defaultFallback = '/account';

  describe('Invalid inputs', () => {
    test('returns default fallback for undefined', () => {
      assert.strictEqual(getSafeReturnPath(undefined), defaultFallback);
    });

    test('returns default fallback for null', () => {
      assert.strictEqual(getSafeReturnPath(null), defaultFallback);
    });

    test('returns default fallback for empty string', () => {
      assert.strictEqual(getSafeReturnPath(''), defaultFallback);
    });

    test('returns default fallback for non-string inputs', () => {
      assert.strictEqual(getSafeReturnPath(123), defaultFallback);
      assert.strictEqual(getSafeReturnPath({ path: '/cart' }), defaultFallback);
      assert.strictEqual(getSafeReturnPath(['/cart']), defaultFallback);
      assert.strictEqual(getSafeReturnPath(true), defaultFallback);
    });
  });

  describe('Valid internal paths', () => {
    test('returns the provided path if it is a valid internal path', () => {
      assert.strictEqual(getSafeReturnPath('/cart'), '/cart');
      assert.strictEqual(getSafeReturnPath('/product/123'), '/product/123');
      assert.strictEqual(getSafeReturnPath('/categories?sort=asc'), '/categories?sort=asc');
      assert.strictEqual(getSafeReturnPath('/account/orders'), '/account/orders');
    });

    test('trims whitespace from valid paths', () => {
      assert.strictEqual(getSafeReturnPath('  /cart  '), '/cart');
    });
  });

  describe('Unsafe paths and external URLs', () => {
    test('rejects paths not starting with /', () => {
      assert.strictEqual(getSafeReturnPath('cart'), defaultFallback);
      assert.strictEqual(getSafeReturnPath('example.com/cart'), defaultFallback);
    });

    test('rejects protocol-relative URLs (//)', () => {
      assert.strictEqual(getSafeReturnPath('//example.com'), defaultFallback);
      assert.strictEqual(getSafeReturnPath('//malicious.site/path'), defaultFallback);
    });

    test('rejects paths starting with /\\', () => {
      assert.strictEqual(getSafeReturnPath('/\\example.com'), defaultFallback);
    });

    test('rejects paths with http:// or https://', () => {
      assert.strictEqual(getSafeReturnPath('http://example.com'), defaultFallback);
      assert.strictEqual(getSafeReturnPath('https://example.com'), defaultFallback);
      // Even if prefixed with space
      assert.strictEqual(getSafeReturnPath('  https://example.com'), defaultFallback);
    });

    test('rejects malicious schemes', () => {
      assert.strictEqual(getSafeReturnPath('javascript:alert(1)'), defaultFallback);
      assert.strictEqual(getSafeReturnPath('  javascript:alert(1)'), defaultFallback);
      assert.strictEqual(getSafeReturnPath('data:text/html,<script>alert(1)</script>'), defaultFallback);
      assert.strictEqual(getSafeReturnPath('vbscript:msgbox(1)'), defaultFallback);
    });
  });

  describe('Login loop prevention', () => {
    test('rejects /login path', () => {
      assert.strictEqual(getSafeReturnPath('/login'), defaultFallback);
      assert.strictEqual(getSafeReturnPath('/login?redirect=/cart'), defaultFallback);
      assert.strictEqual(getSafeReturnPath('/LOGIN'), defaultFallback); // case insensitive check
    });

    test('rejects /admin/login path', () => {
      assert.strictEqual(getSafeReturnPath('/admin/login'), defaultFallback);
      assert.strictEqual(getSafeReturnPath('/admin/login?redirect=/admin'), defaultFallback);
      assert.strictEqual(getSafeReturnPath('/ADMIN/LOGIN'), defaultFallback); // case insensitive check
    });
  });

  describe('Custom fallback', () => {
    test('uses custom fallback when provided and path is invalid', () => {
      const customFallback = '/home';
      assert.strictEqual(getSafeReturnPath(null, customFallback), customFallback);
      assert.strictEqual(getSafeReturnPath('http://example.com', customFallback), customFallback);
      assert.strictEqual(getSafeReturnPath('javascript:alert(1)', customFallback), customFallback);
      assert.strictEqual(getSafeReturnPath('/login', customFallback), customFallback);
    });

    test('returns valid path even when custom fallback is provided', () => {
      const customFallback = '/home';
      assert.strictEqual(getSafeReturnPath('/cart', customFallback), '/cart');
    });
  });
});
