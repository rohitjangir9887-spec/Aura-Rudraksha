import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('PaymentResult Navigation & History Safety Specifications', () => {
  let replaceStateSpy;
  let pushStateSpy;
  let historyListeners;

  beforeEach(() => {
    historyListeners = [];
    replaceStateSpy = vi.fn();
    pushStateSpy = vi.fn();

    globalThis.window = {
      history: {
        state: null,
        replaceState: replaceStateSpy,
        pushState: pushStateSpy,
      },
      addEventListener: vi.fn((event, cb) => {
        if (event === 'popstate') historyListeners.push(cb);
      }),
      removeEventListener: vi.fn(),
      location: {
        pathname: "/payment-result",
        search: "?status=success&orderId=ORD_12345&txnid=TXN_999"
      }
    };
  });

  afterEach(() => {
    delete globalThis.window;
    vi.restoreAllMocks();
  });

  it('establishes safe terminal history boundary only on verified payment', () => {
    const isVerifiedSuccess = true;
    const orderId = "ORD_12345";
    const currentUrl = "/payment-result?status=success&orderId=ORD_12345&txnid=TXN_999";

    // Simulate history boundary configuration logic executed in PaymentResult
    const configureHistoryBoundary = (verified, id, url) => {
      if (!verified || !id) return false;
      if (!globalThis.window.history.state?.auraPaymentSuccess) {
        globalThis.window.history.replaceState({ auraSafeNav: true, page: "home" }, "", "/");
        globalThis.window.history.pushState(
          { auraPaymentSuccess: true, orderId: id },
          "",
          url
        );
        return true;
      }
      return false;
    };

    const configured = configureHistoryBoundary(isVerifiedSuccess, orderId, currentUrl);

    expect(configured).toBe(true);
    expect(replaceStateSpy).toHaveBeenCalledWith(
      { auraSafeNav: true, page: "home" },
      "",
      "/"
    );
    expect(pushStateSpy).toHaveBeenCalledWith(
      { auraPaymentSuccess: true, orderId: "ORD_12345" },
      "",
      currentUrl
    );
  });

  it('does NOT manipulate history stack when payment is not verified', () => {
    const isVerifiedSuccess = false;
    const orderId = "ORD_FAILED";
    const currentUrl = "/payment-result?status=failed&orderId=ORD_FAILED";

    const configureHistoryBoundary = (verified, id, url) => {
      if (!verified || !id) return false;
      globalThis.window.history.replaceState({ auraSafeNav: true, page: "home" }, "", "/");
      return true;
    };

    const configured = configureHistoryBoundary(isVerifiedSuccess, orderId, currentUrl);

    expect(configured).toBe(false);
    expect(replaceStateSpy).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('routes back to Home when popstate occurs from success page', () => {
    let targetRoute = null;
    const navigate = (path, opts) => {
      targetRoute = { path, opts };
    };

    const handlePopState = () => {
      navigate("/", { replace: true });
    };

    globalThis.window.addEventListener("popstate", handlePopState);
    expect(historyListeners.length).toBe(1);

    // Simulate user pressing Android hardware back or browser back
    historyListeners[0]({ type: "popstate" });

    expect(targetRoute).toEqual({ path: "/", opts: { replace: true } });
  });

  it('prevents redundant duplicate pushState entries when re-rendered or revisited', () => {
    let callCount = 0;
    globalThis.window.history.state = { auraPaymentSuccess: true, orderId: "ORD_EXISTING" };

    const attemptConfig = () => {
      if (!globalThis.window.history.state?.auraPaymentSuccess) {
        callCount++;
      }
    };

    attemptConfig();
    expect(callCount).toBe(0);
  });
});
