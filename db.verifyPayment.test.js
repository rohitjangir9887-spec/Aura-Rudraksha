import assert from "node:assert";
import test from "node:test";

test("verifyPayment handles network errors correctly by returning an error object", async (t) => {
    const originalFetch = global.fetch;

    global.fetch = async () => {
        throw new Error("Simulated network failure");
    };

    const { db } = await import("./src/lib/db.js");

    try {
        const res = await db.verifyPayment("TEST_ORDER_123", "TEST_TXN_456");
        assert.deepStrictEqual(res.success, false);
        assert.deepStrictEqual(res.status, 503);
        assert.deepStrictEqual(res.message, 'Simulated network failure');
    } finally {
        global.fetch = originalFetch;
    }
});

test("verifyPayment handles missing orderId gracefully", async (t) => {
    const { db } = await import("./src/lib/db.js");
    const res = await db.verifyPayment();
    assert.deepStrictEqual(res, { success: false });
});

test("verifyPayment returns success true on valid verification", async (t) => {
    const originalFetch = global.fetch;

    global.fetch = async () => {
        return new Response(JSON.stringify({ success: true, data: { status: "success" } }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
        });
    };

    const { db } = await import("./src/lib/db.js");

    try {
        const res = await db.verifyPayment("TEST_ORDER_123", "TEST_TXN_456");
        assert.deepStrictEqual(res.success, true);
        assert.deepStrictEqual(res.data.status, 'success');
    } finally {
        global.fetch = originalFetch;
    }
});
