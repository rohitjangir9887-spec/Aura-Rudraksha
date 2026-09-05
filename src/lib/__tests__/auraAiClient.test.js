import { test, describe, vi, afterEach } from 'vitest';
import assert from 'node:assert';

vi.mock('../authClient.js', () => ({
    authClient: {
        getToken: vi.fn().mockResolvedValue('test-token')
    }
}));

vi.mock('../auraChatStore.js', () => ({
    auraChatStore: {
        getGuestSessionId: vi.fn().mockReturnValue('test-session')
    }
}));

// Mock the Vite environment variables
vi.stubEnv('VITE_API_BASE_URL', '/api');

import { auraAiClient } from '../auraAiClient.js';

describe('auraAiClient', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('sendMessageStream fetch rejection calls onError and returns fallback', async () => {
        const mockFetch = vi.fn(() => Promise.reject(new Error("Network Error")));
        vi.stubGlobal('fetch', mockFetch);

        let onErrorCalled = false;
        let receivedError = null;

        const result = await auraAiClient.sendMessageStream({
            message: "Hello",
            conversationId: "test-conv",
            onError: (err) => {
                onErrorCalled = true;
                receivedError = err;
            }
        });

        assert.strictEqual(mockFetch.mock.calls.length, 1);
        assert.strictEqual(onErrorCalled, true);
        assert.strictEqual(receivedError.message, "Network Error");
        assert.strictEqual(result.requiresHuman, true);
        assert.ok(result.text.includes("Namaste"));
    });
});
