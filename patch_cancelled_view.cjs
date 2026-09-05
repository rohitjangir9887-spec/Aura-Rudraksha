const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.jsx', 'utf8');

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
                style={{ padding: "12px 20px", fontSize: "14px", background: "#fffdf9", border: "1px solid #d1d5db", borderRadius: "10px" }}
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

code = code.replace(/  \/\/ PAYMENT FAILED VIEW/, cancelledViewStr + '\n  // PAYMENT FAILED VIEW');
fs.writeFileSync('src/pages/Checkout.jsx', code);
