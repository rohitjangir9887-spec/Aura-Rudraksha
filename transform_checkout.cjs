const fs = require('fs');

let code = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');

// 1. We replace the current state variables with paymentState
code = code.replace(
  /const \[payuModalOpen.*?const isRedirectingRef = useRef\(false\);/s,
  `const [paymentState, setPaymentState] = useState({
    status: "IDLE",
    txnid: null,
    orderId: null,
    error: null,
    timeout: false
  });
  const isRedirectingRef = useRef(false);`
);

// 2. We replace the useEffect for beforeunload/popstate
const popstateHook = `
  // Intercept browser Back button and tab close during active checkout / payment
  useEffect(() => {
    if (successParam || confirmedOrder) return; // Allow normal navigation after confirmed payment

    // Push state to trap browser back button
    try {
      window.history.pushState({ checkoutActive: true }, "", window.location.href);
    } catch (_) {}

    const handlePopState = (e) => {
      // Re-push state so URL doesn't leave immediately
      try {
        window.history.pushState({ checkoutActive: true }, "", window.location.href);
      } catch (_) {}
      setShowLeaveModal(true);
    };

    const handleBeforeUnload = (e) => {
      if (isRedirectingRef.current) return;
      e.preventDefault();
      e.returnValue = "Your payment is in progress. Are you sure you want to leave?";
      return e.returnValue;
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [successParam, confirmedOrder]);
`;

const newHooks = `
  // Detect Unresolved Payment Attempt (Back from PayU)
  useEffect(() => {
    const pendingTxnid = sessionStorage.getItem("aura_pending_txnid");
    const pendingOrderId = sessionStorage.getItem("aura_pending_orderId");

    // If URL has success/failed/cancelled, it's a callback, handle it normally
    const urlHasCallback = searchParams.get("success") || searchParams.get("failed") || searchParams.get("cancelled");

    if (pendingTxnid && pendingOrderId && !urlHasCallback && !confirmedOrder) {
      // User pressed back button from PayU!
      setPaymentState({
        status: "PENDING",
        txnid: pendingTxnid,
        orderId: pendingOrderId,
        error: null,
        timeout: false
      });
      verifyPendingPayment(pendingTxnid, pendingOrderId);
    }
  }, [searchParams, confirmedOrder]);

  const verifyPendingPayment = async (txnid, orderId) => {
    try {
      const res = await db.verifyPayment(orderId, txnid);
      if (res?.success && res.data) {
         if (res.data.paymentStatus === "Paid" || res.data.status === "Confirmed") {
            sessionStorage.removeItem("aura_pending_txnid");
            sessionStorage.removeItem("aura_pending_orderId");
            setConfirmedOrder(res.data);
            setPaymentState({ status: "SUCCESS", txnid, orderId, error: null, timeout: false });
         } else if (res.data.paymentStatus === "Failed") {
            sessionStorage.removeItem("aura_pending_txnid");
            sessionStorage.removeItem("aura_pending_orderId");
            setPaymentState({ status: "FAILED", txnid, orderId, error: "Payment failed during verification.", timeout: false });
         } else if (res.data.paymentStatus === "Cancelled") {
            sessionStorage.removeItem("aura_pending_txnid");
            sessionStorage.removeItem("aura_pending_orderId");
            setPaymentState({ status: "CANCELLED", txnid, orderId, error: "Payment was cancelled.", timeout: false });
         } else {
            // Still pending
            setTimeout(() => {
              verifyPendingPayment(txnid, orderId);
            }, 3000);
         }
      }
    } catch (e) {
      console.error(e);
      // Stop polling on error to avoid infinite loop
    }
  };

  // Safe BeforeUnload Hook
  useEffect(() => {
    const isPaymentActive = ["INITIATING", "REDIRECTING", "PAYU_ACTIVE", "PENDING"].includes(paymentState.status);

    const handleBeforeUnload = (e) => {
      if (!isPaymentActive || isRedirectingRef.current) return;
      e.preventDefault();
      e.returnValue = "Payment may still be in progress. Are you sure you want to leave?";
      return e.returnValue;
    };

    if (isPaymentActive) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [paymentState.status]);

  // Back Button (PopState) Hook during Checkout
  useEffect(() => {
    const handlePopState = (e) => {
      const isPaymentActive = ["INITIATING", "REDIRECTING", "PAYU_ACTIVE", "PENDING"].includes(paymentState.status);
      if (isPaymentActive) {
        try {
          window.history.pushState({ checkoutActive: true }, "", window.location.href);
        } catch (_) {}
        setShowLeaveModal(true); // Open the Leave Checkout confirmation
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [paymentState.status]);
`;

code = code.replace(popstateHook, newHooks);

// 3. Update postToPayuGateway
code = code.replace(
  /const postToPayuGateway = \(paymentUrl, params\) => \{/g,
  `const postToPayuGateway = (paymentUrl, params) => {
    sessionStorage.setItem("aura_pending_txnid", params.txnid);
    sessionStorage.setItem("aura_pending_orderId", params.udf1);
    setPaymentState(prev => ({ ...prev, status: "PAYU_ACTIVE" }));`
);

// 4. Update executeOrderSubmission and retry payment references
code = code.replace(/setPayuModalOpen\(true\);/g, 'setPaymentState(prev => ({ ...prev, status: "INITIATING" }));');
code = code.replace(/setPayuTimeout\(false\);/g, '');
code = code.replace(/setPayuError\(null\);/g, '');
code = code.replace(/setPayuTimeout\(true\);/g, 'setPaymentState(prev => ({ ...prev, timeout: true }));');
code = code.replace(/setPayuError\(err\.message.*?\);/g, 'setPaymentState(prev => ({ ...prev, status: "FAILED", error: err.message }));');

// 5. Update PayuRedirectModal usage
code = code.replace(
  /<PayuRedirectModal\s+isOpen=\{payuModalOpen\}\s+onClose=\{\(\) => \{\s+setPayuModalOpen\(false\);\s+setLoading\(false\);\s+setRetrying\(false\);\s+setPayuTimeout\(false\);\s+setPayuError\(null\);\s+\}\}\s+onRetry=\{\(\) => \{\s+executeOrderSubmission\(\);\s+\}\}\s+errorMsg=\{payuError\}\s+timeoutOccurred=\{payuTimeout\}\s+\/>/,
  `<PayuRedirectModal
          isOpen={["INITIATING", "REDIRECTING"].includes(paymentState.status)}
          onClose={() => {
            setPaymentState({ status: "IDLE", txnid: null, orderId: null, error: null, timeout: false });
            setLoading(false);
            setRetrying(false);
          }}
          onRetry={() => {
            executeOrderSubmission();
          }}
          errorMsg={paymentState.error}
          timeoutOccurred={paymentState.timeout}
        />`
);

// We should also replace the failed and success views inside Checkout.jsx.
// Wait, I should write the full transform script to handle failedParam, cancelledParam, pending states properly.
fs.writeFileSync('transform_checkout_tmp.cjs', code);
