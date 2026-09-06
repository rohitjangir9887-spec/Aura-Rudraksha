import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, AlertCircle, Clock, X, RefreshCw, ExternalLink, MessageCircle, Package, ShieldAlert } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "../lib/authClient";
import { db } from "../lib/db";

export function PaymentFailureAlert() {
  const [alertData, setAlertData] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const navigate = useNavigate();
  const pollIntervalRef = useRef(null);

  const fetchAlert = async () => {
    const user = authClient.getUser();
    if (!user || user.isAnonymous) {
      setAlertData(null);
      return;
    }

    const token = localStorage.getItem("aura_token");
    if (!token) {
      setAlertData(null);
      return;
    }

    try {
      const res = await fetch("/api/orders/my/payment-alert", {
        headers: {
          "Authorization": "Bearer " + token
        }
      });
      const result = await res.json();
      if (result.success && result.hasNotification && result.data) {
        const dismissKey = `aura_dismiss_payment_alert_${result.data.orderNumber}_${result.data.failedAt}`;
        if (sessionStorage.getItem(dismissKey) === "true") {
          setAlertData(null);
        } else {
          setAlertData(result.data);
          setIsDismissed(false);
        }
      } else {
        setAlertData(null);
      }
    } catch (err) {
      console.error("Failed to fetch payment alert", err);
    }
  };

  useEffect(() => {
    fetchAlert();

    pollIntervalRef.current = setInterval(() => {
      fetchAlert();
    }, 15000);

    return () => clearInterval(pollIntervalRef.current);
  }, []);

  useEffect(() => {
    if (!alertData) return;

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(alertData.expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setAlertData(null);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [alertData]);

  if (!alertData || isDismissed) return null;

  const handleDismiss = () => {
    if (alertData) {
      const dismissKey = `aura_dismiss_payment_alert_${alertData.orderNumber}_${alertData.failedAt}`;
      sessionStorage.setItem(dismissKey, "true");
    }
    setIsDismissed(true);
  };

  const handleRetry = async () => {
    if (!alertData?.orderNumber) return;
    setIsRetrying(true);
    try {
      const res = await db.retryPayment(alertData.orderNumber);
      if (res?.success && res.data?.paymentUrl && res.data?.params) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = res.data.paymentUrl;
        form.style.display = "none";
        Object.entries(res.data.params).forEach(([k, v]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = v;
          form.appendChild(input);
        });
        document.body.appendChild(form);

        if (res.data.params.txnid && res.data.params.udf1) {
          sessionStorage.setItem("aura_pending_txnid", res.data.params.txnid);
          sessionStorage.setItem("aura_pending_orderId", res.data.params.udf1);
        }

        form.submit();
      } else {
        alert(res?.message || "Unable to connect to PayU Gateway.");
      }
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to initiate payment retry.");
    } finally {
      setIsRetrying(false);
    }
  };

  const pStatus = alertData.paymentStatus || "Failed";
  const isFailed = pStatus === "Failed";
  const isCancelled = pStatus === "Cancelled";
  const isPending = pStatus === "Pending";

  const bannerBg = isFailed ? "#fff5f5" : isCancelled ? "#fffdf0" : "#f0f9ff";
  const borderColor = isFailed ? "#fecaca" : isCancelled ? "#fef08a" : "#bae6fd";
  const statusColor = isFailed ? "#991b1b" : isCancelled ? "#854d0e" : "#0369a1";
  const titleText = isFailed ? "Payment Failed" : isCancelled ? "Payment Cancelled" : "Payment Processing";

  return (
    <div className="w-full px-3 my-3 box-border flex justify-center md:hidden">
      <div
        style={{
          background: bannerBg,
          border: `1px solid ${borderColor}`,
          borderRadius: "14px",
          padding: "14px 14px 12px 14px",
          boxShadow: "0 4px 16px rgba(43, 23, 13, 0.08)",
          position: "relative",
          width: "100%",
          maxWidth: "440px",
          boxSizing: "border-box"
        }}
      >
        {/* Close / Dismiss Button */}
        <button 
          onClick={handleDismiss}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "rgba(255,255,255,0.8)",
            border: "1px solid #ebdccb",
            borderRadius: "50%",
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#806f62"
          }}
          aria-label="Dismiss payment alert"
        >
          <X size={13} />
        </button>

        {/* Top Header Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", paddingRight: "26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {isFailed ? (
              <ShieldAlert size={17} color="#a54d2b" />
            ) : isCancelled ? (
              <AlertCircle size={17} color="#854d0e" />
            ) : (
              <Clock size={17} color="#0369a1" />
            )}
            <span style={{ fontWeight: "800", fontSize: "14px", color: statusColor, letterSpacing: "-0.2px" }}>
              {titleText}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.7)", padding: "2px 8px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.06)", fontSize: "11px", fontWeight: "700", color: "#6b594b" }}>
            <Clock size={11} />
            <span>{timeLeft || "Active"}</span>
          </div>
        </div>

        {/* Product & Order Summary Info */}
        <div style={{ 
          background: "#ffffff",
          borderRadius: "10px",
          padding: "10px 12px",
          border: "1px solid #ebdccb",
          marginBottom: "10px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {alertData.productImage ? (
              <img
                src={alertData.productImage}
                alt={alertData.productName}
                style={{ width: "42px", height: "42px", borderRadius: "8px", objectFit: "cover", border: "1px solid #f0ebe4", flexShrink: 0 }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "#fbf8f3", border: "1px solid #f0ebe4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Package size={20} color="#a54d2b" />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#806f62" }}>
                  #{alertData.orderNumber}
                </span>
                <span style={{ fontSize: "14px", fontWeight: "800", color: "#2b170d" }}>
                  ₹{Number(alertData.amount || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {alertData.productName} {alertData.itemsCount > 1 ? `(+${alertData.itemsCount - 1} item${alertData.itemsCount > 2 ? "s" : ""})` : ""}
              </div>
            </div>
          </div>

          {/* Audit Details Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px 12px",
            marginTop: "8px",
            paddingTop: "8px",
            borderTop: "1px dashed #f0ebe4",
            fontSize: "10.5px"
          }}>
            <div>
              <span style={{ color: "#8c7d72", display: "block", fontSize: "9.5px", textTransform: "uppercase", fontWeight: "700" }}>Merchant Txn ID</span>
              <code style={{ fontFamily: "monospace", color: "#2b170d", fontWeight: "600", fontSize: "10px", wordBreak: "break-all" }}>{alertData.transactionId || "N/A"}</code>
            </div>
            <div>
              <span style={{ color: "#8c7d72", display: "block", fontSize: "9.5px", textTransform: "uppercase", fontWeight: "700" }}>PayU Payment ID</span>
              <code style={{ fontFamily: "monospace", color: alertData.payuPaymentId ? "#0369a1" : "#8c7d72", fontWeight: "700", fontSize: "10px", wordBreak: "break-all" }}>
                {alertData.payuPaymentId || "Pending Capture"}
              </code>
            </div>
            <div>
              <span style={{ color: "#8c7d72", display: "block", fontSize: "9.5px", textTransform: "uppercase", fontWeight: "700" }}>Gateway Status</span>
              <span style={{ fontWeight: "800", color: statusColor }}>
                {alertData.payuStatus || alertData.paymentStatus}
              </span>
            </div>
            <div>
              <span style={{ color: "#8c7d72", display: "block", fontSize: "9.5px", textTransform: "uppercase", fontWeight: "700" }}>Attempted</span>
              <span style={{ color: "#4a3f35", fontWeight: "600" }}>
                {alertData.failedAt ? new Date(alertData.failedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Recent"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "6px", width: "100%" }}>
          {!isPending && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              style={{
                flex: "1.3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "9px 10px",
                background: "linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: isRetrying ? "wait" : "pointer",
                boxShadow: "0 2px 6px rgba(165, 77, 43, 0.25)"
              }}
            >
              <RefreshCw size={13} className={isRetrying ? "animate-spin" : ""} />
              {isRetrying ? "Retrying..." : "Retry Payment"}
            </button>
          )}

          <Link 
            to={`/account/orders/${alertData.orderNumber}`}
            style={{
              flex: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              padding: "9px 10px",
              background: "#ffffff",
              color: "#2b170d",
              border: "1px solid #ebdccb",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              textDecoration: "none"
            }}
          >
            <ExternalLink size={13} />
            View Order
          </Link>

          <Link 
            to="/support"
            style={{
              padding: "9px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              background: "rgba(255,255,255,0.6)",
              color: "#4a3f35",
              border: "1px solid #ebdccb",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              textDecoration: "none"
            }}
          >
            <MessageCircle size={13} />
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
