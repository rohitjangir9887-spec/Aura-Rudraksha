import { verifyOauthState } from '../server/routes/upload.js';
import assert from 'node:assert';

console.log("🔒 Running Sentinel Security Tests...");

try {
  // Edge Case: Non-string inputs
  console.log("  - Testing non-string inputs for verifyOauthState...");

  assert.strictEqual(verifyOauthState(null), false, "verifyOauthState(null) should return false");
  assert.strictEqual(verifyOauthState(undefined), false, "verifyOauthState(undefined) should return false");
  assert.strictEqual(verifyOauthState({}), false, "verifyOauthState({}) should return false");
  assert.strictEqual(verifyOauthState([]), false, "verifyOauthState([]) should return false");
  assert.strictEqual(verifyOauthState(123), false, "verifyOauthState(123) should return false");

  console.log("✅ All Sentinel Security Tests Passed.");
  process.exit(0);
} catch (error) {
  console.error("❌ Sentinel Security Tests Failed:", error);
  process.exit(1);
}
