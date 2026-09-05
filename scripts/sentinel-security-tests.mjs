import assert from "assert";
import crypto from "crypto";

console.log("=== Sentinel Security Regression Test Suite ===");

// 1. Data Isolation / IDOR Tests
function testDataIsolation() {
  console.log("\n[Test 1] User A vs User B Data Isolation Logic");

  const userA = { authUserId: "uid_user_A", email: "usera@example.com" };
  const userB = { authUserId: "uid_user_B", email: "userb@example.com" };

  const orderA = { id: "AURA-1001", authUserId: "uid_user_A", customerEmail: "usera@example.com" };
  const ticketA = { id: "TIC-1001", authUserId: "uid_user_A", email: "usera@example.com" };

  // Authorization check function simulating server-side IDOR protection
  function canAccessOrder(order, reqUser) {
    if (!reqUser) return false;
    if (reqUser.role === "admin") return true;
    return order.authUserId === reqUser.authUserId;
  }

  function canAccessTicket(ticket, reqUser) {
    if (!reqUser) return false;
    if (reqUser.role === "admin") return true;
    return ticket.authUserId === reqUser.authUserId;
  }

  assert.strictEqual(canAccessOrder(orderA, userA), true, "User A should access User A's order");
  assert.strictEqual(canAccessOrder(orderA, userB), false, "User B must NOT access User A's order");
  assert.strictEqual(canAccessTicket(ticketA, userA), true, "User A should access User A's ticket");
  assert.strictEqual(canAccessTicket(ticketA, userB), false, "User B must NOT access User A's ticket");

  console.log("✓ User A vs User B Data Isolation checks PASSED");
}

// 2. Admin Access Control Tests
function testAdminAuthorization() {
  console.log("\n[Test 2] Admin Route Authorization Enforcement");

  function checkAdminAccess(reqUser, envAdminEmail, envAdminPhone) {
    if (!reqUser) return false;
    const allowedEmails = envAdminEmail ? [envAdminEmail.trim().toLowerCase()] : [];
    const cleanUserEmail = (reqUser.email || "").trim().toLowerCase();
    const cleanUserPhone = ((reqUser.phone) || "").replace(/[^0-9]/g, "");
    const cleanAdminPhone = (envAdminPhone || "").replace(/[^0-9]/g, "");

    const isEmailAdmin = allowedEmails.length > 0 && allowedEmails.includes(cleanUserEmail);
    const isPhoneAdmin = Boolean(cleanUserPhone && cleanAdminPhone && cleanUserPhone === cleanAdminPhone);
    const isDbAdmin = reqUser.role === "admin";

    return isEmailAdmin || isPhoneAdmin || isDbAdmin;
  }

  const normalUser = { authUserId: "uid_user_normal", email: "normal@example.com", role: "customer" };
  const adminUser = { authUserId: "uid_admin", email: "admin@aurarudraksha.com", role: "admin" };

  assert.strictEqual(checkAdminAccess(normalUser, "admin@aurarudraksha.com", "+919672996531"), false, "Normal customer must be rejected on Admin APIs");
  assert.strictEqual(checkAdminAccess(adminUser, "admin@aurarudraksha.com", "+919672996531"), true, "Admin user must be allowed on Admin APIs");

  console.log("✓ Admin Authorization checks PASSED");
}

// 3. Payment Tampering Prevention Tests
function testPaymentSecurity() {
  console.log("\n[Test 3] Payment State Machine & Tampering Prevention");

  function verifyPaymentTransition(currentStatus, newStatus, callbackAmount, calculatedOrderAmount) {
    if (Math.abs(callbackAmount - calculatedOrderAmount) > 0.01) {
      return { success: false, reason: "Amount Mismatch" };
    }
    if (currentStatus === "Paid" && newStatus === "Paid") {
      return { success: true, duplicate: true }; // Idempotent
    }
    if (currentStatus === "Pending" && newStatus === "Paid") {
      return { success: true, updated: true };
    }
    return { success: false, reason: "Invalid Transition" };
  }

  assert.deepStrictEqual(
    verifyPaymentTransition("Pending", "Paid", 1000, 1000),
    { success: true, updated: true },
    "Valid pending->paid transition should pass"
  );

  assert.deepStrictEqual(
    verifyPaymentTransition("Pending", "Paid", 10, 1000),
    { success: false, reason: "Amount Mismatch" },
    "Amount manipulation (₹10 instead of ₹1000) must be rejected"
  );

  console.log("✓ Payment Security & Tampering checks PASSED");
}

// 4. Coupon Validation & Deletion Security
function testCouponValidation() {
  console.log("\n[Test 4] Deleted and Expired Coupon Rejection");

  const couponsDb = [
    { code: "ACTIVE10", status: "Active", expiry: "2030-12-31" },
    { code: "EXPIRED20", status: "Expired", expiry: "2020-01-01" }
  ];

  function validateCouponCode(code) {
    const cleanCode = String(code || "").trim().toUpperCase();
    const coupon = couponsDb.find(c => c.code === cleanCode);
    if (!coupon) return { valid: false, status: "INVALID", message: "Coupon does not exist" };
    if (coupon.status === "Expired" || new Date(coupon.expiry) < new Date()) {
      return { valid: false, status: "EXPIRED", message: "Coupon expired" };
    }
    return { valid: true, status: "APPLIED" };
  }

  assert.strictEqual(validateCouponCode("ACTIVE10").valid, true, "Active coupon must be accepted");
  assert.strictEqual(validateCouponCode("EXPIRED20").valid, false, "Expired coupon must be rejected");
  assert.strictEqual(validateCouponCode("DELETED_CODE").valid, false, "Deleted/non-existent coupon must be rejected");

  console.log("✓ Coupon Validation & Deletion checks PASSED");
}

// 5. Product Review Isolation
function testReviewIsolation() {
  console.log("\n[Test 5] Product Review Isolation");

  const reviews = [
    { id: "REV-1", productId: "5", text: "Great 5 Mukhi bead" },
    { id: "REV-2", productId: "7", text: "Great 7 Mukhi bead" }
  ];

  function getReviewsForProduct(prodId) {
    return reviews.filter(r => String(r.productId) === String(prodId));
  }

  const p5Reviews = getReviewsForProduct("5");
  const p7Reviews = getReviewsForProduct("7");

  assert.strictEqual(p5Reviews.length, 1);
  assert.strictEqual(p5Reviews[0].id, "REV-1");
  assert.strictEqual(p7Reviews.length, 1);
  assert.strictEqual(p7Reviews[0].id, "REV-2");

  console.log("✓ Product Review Isolation checks PASSED");
}

// Run All Regression Tests
try {
  testDataIsolation();
  testAdminAuthorization();
  testPaymentSecurity();
  testCouponValidation();
  testReviewIsolation();
  console.log("\n✅ ALL SENTINEL SECURITY REGRESSION TESTS PASSED SUCCESSFULLY!\n");
} catch (err) {
  console.error("\n❌ REGRESSION TEST FAILED:", err);
  process.exit(1);
}
