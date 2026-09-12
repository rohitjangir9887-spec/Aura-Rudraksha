import { test, describe } from 'vitest';
import assert from 'node:assert';
import { 
  normalizeAuthEmail, 
  isValidAuthEmail, 
  getPasswordResetActionSettings, 
  getEmailVerificationActionSettings, 
  getAppOrigin,
  CANONICAL_APP_ORIGIN,
  authClient 
} from '../authClient.js';

describe('Auth Client Utilities', () => {
  describe('normalizeAuthEmail', () => {
    test('normalizes standard email to lowercase and trims spaces', () => {
      assert.strictEqual(
        normalizeAuthEmail('  rohitjangir9887@gmail.com  '),
        'rohitjangir9887@gmail.com'
      );
      assert.strictEqual(
        normalizeAuthEmail('ROHITJANGIR9887@GMAIL.COM'),
        'rohitjangir9887@gmail.com'
      );
    });

    test('strips zero-width and invisible unicode characters', () => {
      const emailWithZeroWidth = 'rohit\u200Bjangir9887@gmail.com';
      assert.strictEqual(
        normalizeAuthEmail(emailWithZeroWidth),
        'rohitjangir9887@gmail.com'
      );
    });

    test('handles empty or non-string gracefully', () => {
      assert.strictEqual(normalizeAuthEmail(''), '');
      assert.strictEqual(normalizeAuthEmail(null), '');
      assert.strictEqual(normalizeAuthEmail(undefined), '');
    });

    test('does not mutate or malform valid domains', () => {
      const email = 'user.name+tag@gmail.com';
      assert.strictEqual(normalizeAuthEmail(email), 'user.name+tag@gmail.com');
    });
  });

  describe('isValidAuthEmail', () => {
    test('validates standard email addresses', () => {
      assert.strictEqual(isValidAuthEmail('rohitjangir9887@gmail.com'), true);
      assert.strictEqual(isValidAuthEmail('admin@aurarudraksha.bond'), true);
      assert.strictEqual(isValidAuthEmail('test.dev+extra@sub.example.co.in'), true);
    });

    test('rejects invalid email formats', () => {
      assert.strictEqual(isValidAuthEmail('plainaddress'), false);
      assert.strictEqual(isValidAuthEmail('@missinguser.com'), false);
      assert.strictEqual(isValidAuthEmail('user@gmailcom'), false); // missing dot in domain
      assert.strictEqual(isValidAuthEmail('user@.gmail.com'), false); // leading dot in domain
      assert.strictEqual(isValidAuthEmail('user@gmail..com'), false); // consecutive dots
      assert.strictEqual(isValidAuthEmail(''), false);
      assert.strictEqual(isValidAuthEmail(null), false);
    });
  });

  describe('ActionCodeSettings', () => {
    test('canonical origin defaults to www.aurarudraksha.bond', () => {
      assert.strictEqual(CANONICAL_APP_ORIGIN, 'https://www.aurarudraksha.bond');
      assert.strictEqual(getAppOrigin(), 'https://www.aurarudraksha.bond');
    });

    test('password reset settings include verified url and handleCodeInApp: false', () => {
      const settings = getPasswordResetActionSettings();
      assert.strictEqual(settings.handleCodeInApp, false);
      assert.strictEqual(
        settings.url,
        'https://www.aurarudraksha.bond/login?mode=resetPassword'
      );
    });

    test('email verification settings include verified url and handleCodeInApp: false', () => {
      const settings = getEmailVerificationActionSettings();
      assert.strictEqual(settings.handleCodeInApp, false);
      assert.strictEqual(
        settings.url,
        'https://www.aurarudraksha.bond/login?mode=verifyEmail'
      );
    });
  });

  describe('maskEmail', () => {
    test('masks standard email addresses safely', () => {
      assert.strictEqual(
        authClient.maskEmail('rohitjangir9887@gmail.com'),
        'ro****7@gmail.com'
      );
    });

    test('masks short handles appropriately', () => {
      assert.strictEqual(
        authClient.maskEmail('ab@gmail.com'),
        'a***@gmail.com'
      );
    });
  });

  describe('formatAuthError', () => {
    test('maps common Firebase codes to user friendly messages', () => {
      assert.strictEqual(
        authClient.formatAuthError({ code: 'auth/invalid-email' }),
        'Please enter a valid email address.'
      );
      assert.strictEqual(
        authClient.formatAuthError({ code: 'auth/expired-action-code' }),
        'This link has expired. Please request a new verification or password reset email.'
      );
    });
  });
});
