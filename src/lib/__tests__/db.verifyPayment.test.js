import { describe, it, expect, vi } from 'vitest';
import { db } from '../db.js';

describe('verifyPayment', () => {
    it('handles missing orderId gracefully', async () => {
        const res = await db.verifyPayment();
        expect(res).toEqual({ success: false });
    });

    it('returns success true on valid verification', async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { status: "success" } }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
        }));

        try {
            const res = await db.verifyPayment("TEST_ORDER_123", "TEST_TXN_456");
            expect(res.success).toBe(true);
            expect(res.data.status).toBe('success');
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('catches exception and returns error object', async () => {
        const originalEncode = global.encodeURIComponent;
        global.encodeURIComponent = vi.fn().mockImplementation(() => {
            throw new Error("Simulated encode error");
        });

        const originalConsoleError = console.error;
        let errorLogged = false;
        console.error = vi.fn(() => { errorLogged = true; });

        try {
            const res = await db.verifyPayment("TEST_ORDER_123", "TEST_TXN_456");

            expect(res.success).toBe(false);
            expect(res.error).toBe("Simulated encode error");
            expect(errorLogged).toBe(true);
        } finally {
            global.encodeURIComponent = originalEncode;
            console.error = originalConsoleError;
        }
    });
});
