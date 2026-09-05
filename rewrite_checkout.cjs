const fs = require('fs');

let code = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');

// Add cancelledParam
code = code.replace(
  /const failedParam = searchParams\.get\("failed"\);/,
  'const failedParam = searchParams.get("failed");\n  const cancelledParam = searchParams.get("cancelled");'
);

// Add state machine variables
code = code.replace(
  /const \[payuModalOpen, setPayuModalOpen\] = useState\(false\);/,
  `const [payuModalOpen, setPayuModalOpen] = useState(false);
  const [paymentState, setPaymentState] = useState("IDLE"); // IDLE, INITIATING, REDIRECTING, PAYU_ACTIVE, PENDING
  const [pendingTxnid, setPendingTxnid] = useState(() => typeof sessionStorage !== "undefined" ? sessionStorage.getItem("aura_pending_txnid") : null);
  const [pendingOrderId, setPendingOrderId] = useState(() => typeof sessionStorage !== "undefined" ? sessionStorage.getItem("aura_pending_orderId") : null);
  const [isStatusPolling, setIsStatusPolling] = useState(false);`
);

// Replace popstate/beforeunload effect completely
const oldPopStateHookStr = `  // Intercept browser Back button and tab close during active checkout / payment
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
  }, [successParam, confirmedOrder]);`;

const newPopStateHookStr = `  // Detect Unresolved Payment Attempt (Back from PayU)
  useEffect(() => {
    // If URL has callback parameters, don't treat it as a back button interrupt
    const hasCallbackParam = successParam || failedParam || cancelledParam;

    if (pendingTxnid && pendingOrderId && !hasCallbackParam && !confirmedOrder) {
      // User pressed back from PayU or refreshed during active payment
      setPaymentState("PENDING");
      if (!isStatusPolling) {
        setIsStatusPolling(true);
        // Clean up session storage immediately so a refresh clears it out after we handle it
        sessionStorage.removeItem("aura_pending_txnid");
        sessionStorage.removeItem("aura_pending_orderId");

        // Start checking backend
        checkPendingStatus(pendingTxnid, pendingOrderId);
      }
    }
  }, [searchParams, confirmedOrder, pendingTxnid, pendingOrderId]);

  const checkPendingStatus = async (txnid, orderId) => {
    try {
      const res = await db.verifyPayment(orderId, txnid);
      if (res?.success && res.data) {
        if (res.data.paymentStatus === "Paid" || res.data.status === "Confirmed") {
          setConfirmedOrder(res.data);
          setPaymentState("SUCCESS");
          if (!buyNowLines) clear(); // clear cart only on success
        } else if (res.data.paymentStatus === "Failed") {
          setPaymentState("FAILED");
          navigate(\`/checkout?failed=\${orderId}&txnid=\${txnid}&reason=Payment failed or was cancelled.\`, { replace: true });
        } else if (res.data.paymentStatus === "Cancelled") {
          setPaymentState("CANCELLED");
          navigate(\`/checkout?cancelled=\${orderId}&txnid=\${txnid}\`, { replace: true });
        } else {
          // Keep polling while PENDING
          setTimeout(() => checkPendingStatus(txnid, orderId), 4000);
        }
      } else {
         setTimeout(() => checkPendingStatus(txnid, orderId), 4000);
      }
    } catch (e) {
      setTimeout(() => checkPendingStatus(txnid, orderId), 5000);
    }
  };

  // Safe popstate/beforeunload strictly for unresolved transactions
  useEffect(() => {
    const isPaymentActive = ["INITIATING", "REDIRECTING", "PAYU_ACTIVE"].includes(paymentState);
    if (!isPaymentActive) return;

    try {
      window.history.pushState({ checkoutActive: true }, "", window.location.href);
    } catch (_) {}

    const handlePopState = (e) => {
      try {
        window.history.pushState({ checkoutActive: true }, "", window.location.href);
      } catch (_) {}
      setShowLeaveModal(true);
    };

    const handleBeforeUnload = (e) => {
      if (isRedirectingRef.current) return;
      e.preventDefault();
      e.returnValue = "Payment may still be in progress. Are you sure you want to leave?";
      return e.returnValue;
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [paymentState]);`;

code = code.replace(oldPopStateHookStr, newPopStateHookStr);

// Update postToPayuGateway
code = code.replace(
  /const postToPayuGateway = \(paymentUrl, params\) => \{/,
  `const postToPayuGateway = (paymentUrl, params) => {
    setPaymentState("PAYU_ACTIVE");
    sessionStorage.setItem("aura_pending_txnid", params.txnid);
    sessionStorage.setItem("aura_pending_orderId", params.udf1);`
);

// Update executeOrderSubmission
code = code.replace(
  /setPayuModalOpen\(true\);/,
  `setPayuModalOpen(true);\n    setPaymentState("INITIATING");`
);
code = code.replace(
  /setPayuTimeout\(true\);/,
  `setPayuTimeout(true);\n      setPaymentState("IDLE");`
);
code = code.replace(
  /setPayuError\(err\.message \|\| "Payment gateway connection failed\. Please verify your details and try again\."\);/,
  `setPayuError(err.message || "Payment gateway connection failed. Please verify your details and try again.");\n      setPaymentState("IDLE");`
);

// Update Retry Payment
code = code.replace(
  /setRetrying\(true\);/,
  `setRetrying(true);\n    setPaymentState("INITIATING");`
);
code = code.replace(
  /setPayuError\(err\.message \|\| "Failed to retry payment\. Please try again or create a fresh order\."\);/,
  `setPayuError(err.message || "Failed to retry payment. Please try again or create a fresh order.");\n      setPaymentState("IDLE");`
);

// Create the Pending View block
const pendingViewStr = `
  // PENDING / PROCESSING VIEW (When returning from PayU via Back button)
  if (paymentState === "PENDING" && !confirmedOrder && !failedParam && !cancelledParam && !successParam) {
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "80px", maxWidth: "600px", margin: "0 auto", textAlign: "center", paddingTop: "60px" }}>
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: "40px 24px", background: "#fffdf9", border: "1.5px solid #e8dac9", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}
          >
            <div className="spinner" style={{ width: "40px", height: "40px", border: "3px solid #f5ece2", borderTopColor: "#b85d25", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "28px", color: "#2b170d", margin: "0 0 10px" }}>
              Payment Processing
            </h2>
            <p style={{ color: "#806f62", fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px" }}>
              Your payment is currently being confirmed. We are securely checking your transaction status. Please do not start another payment yet.
            </p>
            <div style={{ background: "#faf5ef", padding: "16px", borderRadius: "12px", border: "1px solid #f0e2d3", marginBottom: "24px", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", color: "#6b584c", fontWeight: "600" }}>Order ID</span>
                <span style={{ fontSize: "13px", color: "#2b170d", fontWeight: "700" }}>{pendingOrderId}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "#6b584c", fontWeight: "600" }}>Status</span>
                <span style={{ fontSize: "13px", color: "#d97706", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#d97706", display: "inline-block" }} />
                  Processing
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => checkPendingStatus(pendingTxnid, pendingOrderId)}
                style={{
                  background: "linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <RefreshCw size={16} /> Check Status
              </button>
            </div>
          </motion.div>
        </main>
      </Shell>
    );
  }
`;

// Insert pending view right before `if (verifyingPayment)`
code = code.replace(/  \/\/ VERIFYING PAYMENT LOADER/, pendingViewStr + '\n  // VERIFYING PAYMENT LOADER');

// Add Cancelled view
const cancelledViewStr = `
  // CANCELLED PAYMENT VIEW
  if (cancelledParam) {
    return (
      <Shell>
        <main className="page" style={{ paddingBottom: "80px", maxWidth: "680px", margin: "0 auto", paddingTop: "30px" }}>
          <motion.div
            className="card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: "#fffdf9",
              border: "1.5px solid #fecaca",
              borderRadius: "16px",
              padding: "36px 20px",
              textAlign: "center"
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#fef2f2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <AlertCircle size={36} />
            </div>
            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", fontWeight: "700", color: "#991b1b", margin: "0 0 8px" }}>
              Payment Cancelled
            </h1>
            <p style={{ fontSize: "14px", color: "#4a3528", margin: "0 0 10px", lineHeight: "1.5" }}>
              Your payment was cancelled. Your order is still saved and you can try again whenever you're ready.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "24px" }}>
              <button
                type="button"
                disabled={retrying}
                onClick={() => handleRetryPayment(cancelledParam)}
                style={{
                  background: retrying ? "#a05b38" : "linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px 26px",
                  fontSize: "14.5px",
                  fontWeight: "700",
                  cursor: retrying ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(165, 77, 43, 0.3)"
                }}
              >
                {retrying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Connecting to PayU...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Retry Payment</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="outline-btn"
                style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9" }}
              >
                Back to Cart
              </button>
            </div>
          </motion.div>
        </main>
      </Shell>
    );
  }
`;

code = code.replace(/  \/\/ FAILED PAYMENT VIEW/, cancelledViewStr + '\n  // FAILED PAYMENT VIEW');

fs.writeFileSync('src/pages/Checkout.jsx', code);
console.log("Patched Checkout.jsx");
