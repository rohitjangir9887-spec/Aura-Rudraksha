import { test, describe } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { getOauthSecret, generateOauthState, verifyOauthState, pendingOauthStates } from '../upload.js';

describe('OAuth State Tests (HMAC Implementation)', () => {
  test('verifyOauthState should return true for a valid state', () => {
    const userId = 'user_123';
    const state = generateOauthState(userId);

    assert.strictEqual(verifyOauthState(state), true, 'State should be valid');

    // Verifying state should remove it from pendingOauthStates
    assert.strictEqual(verifyOauthState(state), false, 'State should be invalidated after first use');
  });

  test('verifyOauthState should return false for invalid states', () => {
    assert.strictEqual(verifyOauthState(), false, 'Missing state should be invalid');
    assert.strictEqual(verifyOauthState(null), false, 'Null state should be invalid');
    assert.strictEqual(verifyOauthState({}), false, 'Object state should be invalid');
    assert.strictEqual(verifyOauthState('invalid.state'), false, 'State with wrong number of parts should be invalid');
    assert.strictEqual(verifyOauthState('part1.part2.part3.part4'), false, 'State with wrong number of parts should be invalid');
  });

  test('verifyOauthState should return false for tampered state', () => {
    const userId = 'user_123';
    const state = generateOauthState(userId);
    const parts = state.split('.');

    const tamperedNonce = '00000000000000000000000000000000';
    const tamperedState = `${tamperedNonce}.${parts[1]}.${parts[2]}`;

    assert.strictEqual(verifyOauthState(tamperedState), false, 'Tampered state should be invalid');
  });

  test('verifyOauthState should return false for expired state', () => {
    const userId = 'user_123';
    const nonce = crypto.randomBytes(16).toString("hex");
    const secret = getOauthSecret();

    // Create a timestamp older than 15 minutes (15 * 60 * 1000 = 900000 ms)
    const expiredTimestamp = Date.now() - 900001;

    const signature = crypto.createHmac("sha256", secret).update(`${userId}:${expiredTimestamp}:${nonce}`).digest("hex");
    const state = `${nonce}.${expiredTimestamp}.${signature}`;

    // Add to pendingOauthStates as generateOauthState would
    pendingOauthStates.set(state, { userId, timestamp: expiredTimestamp });

    assert.strictEqual(verifyOauthState(state), false, 'Expired state should be invalid');
  });
});
