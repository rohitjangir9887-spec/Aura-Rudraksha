import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useCart } from "../hooks/useCart";
import { verifyCashfreePaymentStatus } from "../lib/cashfreeClient";
import { emitToast } from "../context/ToastContext";
import { money } from "../data";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Truck, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  RotateCcw, 
  Package, 
  ExternalLink,
  MessageCircle,
  Copy,
  Check
} from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

export function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clear } = useCart();

  const orderId = searchParams.get("orderId") || searchParams.get("order_id") || searchParams.get("id");
  const cfOrderId = searchParams.get("cf_order_id") || searchParams.get("cfOrderId");

  const [loading, setLoading] = useState(true);
  const [verificationState, setVerificationState] = useState("verifying"); // 'verifying' | 'paid' | 'failed' | 'pending'
  const [orderData, setOrderData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  const pollAttemptsRef = useRef(0);
  const maxPollAttempts = 8;
  const pollTimerRef = useRef(null);

  useEffect(() => {
    if (!orderId) {
      setVerificationState("not_found");
      setLoading(false);
      return;
    }

    async function checkPayment() {
      try {
        pollAttemptsRef.current += 1;
        const res = await verifyCashfreePaymentStatus(orderId);

        if (res.isPaid || res.paymentStatus === "Paid") {
          setOrderData(res.data || res.order);
          setVerificationState("paid");
          setLoading(false);
          clear(); // Authoritative server payment confirmed -> safely clear cart

          // Celebratory confetti burst
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
              colors: ["#8c2b10", "#166534", "#eab308", "#d97706", "#f59e0b"]
            });
          } catch (_) {}
          return;
        }

        if (res.paymentStatus === "Failed" || res.cashfreePaymentStatus === "FAILED" || res.cashfreePaymentStatus === "USER_DROPPED") {
          setOrderData(res.data || res.order);
          setVerificationState("failed");
          setErrorMessage(res.reason || "Payment was cancelled or could not be completed with your bank.");
          setLoading(false);
          return;
        }

        // Still pending - retry a few times to allow webhook / bank capture synchronization
        if (pollAttemptsRef.current < maxPollAttempts) {
          pollTimerRef.current = setTimeout(checkPayment, 2500);
        } else {
          setOrderData(res.data || res.order);
          setVerificationState("pending");
          setLoading(false);
        }
      } catch (err) {
        console.error("Verification poll error:", err);
        if (pollAttemptsRef.current < maxPollAttempts) {
          pollTimerRef.current = setTimeout(checkPayment, 3000);
        } else {
          setVerificationState("pending");
          setErrorMessage(err.message || "Could not confirm final status with payment gateway.");
          setLoading(false);
        }
      }
    }

    checkPayment();

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [orderId, clear]);

  const handleCopyOrder = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      setCopiedId(true);
      emitToast("Order ID copied to clipboard!", "success");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <Shell>
      <main className="page" style={{ paddingBottom: "100px", maxWidth: "720px", margin: "0 auto" }}>
        {/* VERIFYING STATE */}
        {loading && verificationState === "verifying" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "#fffdf9",
              border: "1px solid #e8dac9",
              borderRadius: "16px",
              marginTop: "40px"
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                border: "3px solid #eadecd",
                borderTopColor: "#b85d25",
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px"
              }}
            />
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "28px", color: "#2b170d", margin: "0 0 8px" }}>
              Verifying Payment with Cashfree...
            </h2>
            <p style={{ fontSize: "14px", color: "#806f62", maxWidth: "450px", margin: "0 auto 16px", lineHeight: "1.6" }}>
              Please wait while our server securely confirms your transaction with Cashfree Payment Gateway and your bank.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#166534", background: "#eef6f0", padding: "6px 14px", borderRadius: "20px" }}>
              <Lock size={13} /> Encrypted 256-Bit SSL Verification
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        )}

        {/* PAID & CONFIRMED STATE */}
        {verificationState === "paid" && (
          <motion.div
            id="order-success-view"
            className="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center", padding: "40px 16px" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#eef6f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <CheckCircle2 size={48} color="#20a95a" />
            </motion.div>

            <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534", background: "#eef6f0", border: "1px solid #c7e3ce", padding: "4px 12px", borderRadius: "20px", display: "inline-block", marginBottom: "12px" }}>
              ✓ Payment Verified via Cashfree PG
            </span>

            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "36px", fontWeight: "700", color: "#2b170d", margin: "0 0 8px" }}>
              Sacred Order Confirmed!
            </h1>
            <p style={{ fontSize: "15px", color: "#2b170d", margin: "0 0 6px" }}>
              Thank you! Your payment of <b>₹{Number(orderData?.finalAmount || orderData?.amount || 0).toLocaleString("en-IN")}</b> was successful.
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", margin: "0 0 24px" }}>
              <span style={{ fontSize: "13px", color: "#806f62" }}>
                Order ID: <strong style={{ color: "#2b170d", fontFamily: "monospace" }}>#{orderId}</strong>
              </span>
              <button
                type="button"
                onClick={handleCopyOrder}
                style={{
                  background: "#f7f2eb",
                  border: "1px solid #ebdccb",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "11px",
                  color: "#5c483b",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                {copiedId ? <Check size={12} color="#166534" /> : <Copy size={12} />}
                {copiedId ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Payment & Consecration Card */}
            <div
              style={{
                background: "#fffdf9",
                border: "1px solid #e8dac9",
                borderRadius: "14px",
                padding: "20px",
                textAlign: "left",
                marginBottom: "20px",
                boxShadow: "0 2px 10px rgba(43, 23, 13, 0.04)"
              }}
            >
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f0e6da", paddingBottom: "10px" }}>
                <ShieldCheck size={18} color="#b85d25" /> Next Steps: Vedic Consecration & Dispatch
              </h3>
              <div style={{ fontSize: "13px", color: "#5c483b", lineHeight: "1.7" }}>
                <p style={{ margin: "0 0 8px" }}>
                  🕉️ <b>Prana Pratishtha:</b> Your sacred Rudraksha beads are being sanctified and energized according to traditional Vedic rituals.
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  📦 <b>Sacred Packaging:</b> Packed in velvet pouches with Ganga Jal & Lab Authenticity Certificate.
                </p>
                <p style={{ margin: 0 }}>
                  🚚 <b>Express Dispatch:</b> Handed over to our courier partner within 24-48 business hours with live AWB tracking.
                </p>
              </div>
            </div>

            {/* Delivery Destination */}
            {orderData?.shippingAddress && (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e8dac9",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  textAlign: "left",
                  marginBottom: "24px",
                  fontSize: "13px"
                }}
              >
                <div style={{ fontWeight: "700", color: "#2b170d", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <Truck size={16} color="#b85d25" /> Delivery Address:
                </div>
                <div style={{ color: "#4a3528", lineHeight: "1.6" }}>
                  <b>{orderData.shippingAddress.name || `${orderData.shippingAddress.firstName || ''} ${orderData.shippingAddress.lastName || ''}`.trim() || orderData.customerName}</b><br />
                  {orderData.shippingAddress.address || orderData.address}, {orderData.shippingAddress.city || orderData.city}, {orderData.shippingAddress.state || orderData.state} - <b>{orderData.shippingAddress.pincode || orderData.pincode}</b><br />
                  📞 Phone: {orderData.shippingAddress.phone || orderData.phone || orderData.customerPhone}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                to={`/account/orders/${encodeURIComponent(orderId)}`}
                className="primary-btn"
                style={{ padding: "12px 24px", textDecoration: "none", fontSize: "14px", fontWeight: "700" }}
              >
                View Order Details →
              </Link>
              <Link
                to={`/track-order?id=${encodeURIComponent(orderId)}`}
                className="outline-btn"
                style={{ padding: "12px 24px", textDecoration: "none", fontSize: "14px", fontWeight: "600", background: "#ffffff" }}
              >
                Track Shipment
              </Link>
              <Link
                to="/shop"
                style={{ padding: "12px 20px", textDecoration: "none", fontSize: "13px", color: "#806f62", alignSelf: "center" }}
              >
                Continue Shopping
              </Link>
            </div>
          </motion.div>
        )}

        {/* FAILED PAYMENT STATE */}
        {verificationState === "failed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "#fffdf9",
              border: "1px solid #f2d2cb",
              borderRadius: "16px",
              marginTop: "30px"
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <XCircle size={44} color="#dc2626" />
            </div>

            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", fontWeight: "700", color: "#2b170d", margin: "0 0 8px" }}>
              Payment Incomplete or Cancelled
            </h1>
            <p style={{ fontSize: "14px", color: "#991b1b", maxWidth: "500px", margin: "0 auto 16px", lineHeight: "1.6" }}>
              {errorMessage || "The transaction was cancelled or declined by your bank/UPI provider."}
            </p>
            <p style={{ fontSize: "12.5px", color: "#806f62", margin: "0 0 24px" }}>
              No money has been debited. If your account was charged, it will be automatically refunded by Cashfree / your bank within 2-4 business days.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                to="/checkout"
                className="primary-btn"
                style={{ padding: "12px 24px", textDecoration: "none", fontSize: "14px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <RotateCcw size={16} /> Retry Payment
              </Link>
              <a
                href={`https://wa.me/919672996531?text=Hello, my payment failed for order ${orderId}. Can you help?`}
                target="_blank"
                rel="noreferrer"
                className="outline-btn"
                style={{ padding: "12px 24px", textDecoration: "none", fontSize: "14px", fontWeight: "600", background: "#ffffff", display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <MessageCircle size={16} color="#166534" /> Contact Support via WhatsApp
              </a>
            </div>
          </motion.div>
        )}

        {/* PENDING STATE */}
        {verificationState === "pending" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "#fffdf9",
              border: "1px solid #fef3c7",
              borderRadius: "16px",
              marginTop: "30px"
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <Clock size={44} color="#d97706" />
            </div>

            <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "32px", fontWeight: "700", color: "#2b170d", margin: "0 0 8px" }}>
              Payment Processing with Bank
            </h1>
            <p style={{ fontSize: "14px", color: "#92400e", maxWidth: "500px", margin: "0 auto 16px", lineHeight: "1.6" }}>
              Your bank or UPI app is currently confirming the transaction for Order <b>#{orderId}</b>.
            </p>
            <p style={{ fontSize: "12.5px", color: "#806f62", margin: "0 0 24px" }}>
              You will receive confirmation via WhatsApp / SMS once Cashfree notifies us. You can also view real-time status under My Orders.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                to={`/account/orders/${encodeURIComponent(orderId)}`}
                className="primary-btn"
                style={{ padding: "12px 24px", textDecoration: "none", fontSize: "14px", fontWeight: "700" }}
              >
                View Order in Account →
              </Link>
              <Link
                to="/shop"
                className="outline-btn"
                style={{ padding: "12px 24px", textDecoration: "none", fontSize: "14px", fontWeight: "600", background: "#ffffff" }}
              >
                Continue Shopping
              </Link>
            </div>
          </motion.div>
        )}

        {/* NOT FOUND */}
        {verificationState === "not_found" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Package size={48} color="#806f62" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "28px", color: "#2b170d" }}>
              No Order Specified
            </h2>
            <p style={{ fontSize: "14px", color: "#806f62", marginBottom: "20px" }}>
              Please check your order confirmation link or browse your order history.
            </p>
            <Link to="/account/orders" className="primary-btn" style={{ textDecoration: "none", padding: "10px 20px" }}>
              View My Orders
            </Link>
          </div>
        )}
      </main>
    </Shell>
  );
}
