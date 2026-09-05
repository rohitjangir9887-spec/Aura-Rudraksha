import React from "react";
import { QrCode, Check } from "lucide-react";
import { money } from "../../../data";

export function UPIPayment({
  finalTotal,
  upiMode,
  setUpiMode,
  selectedUpiApp,
  setSelectedUpiApp,
  upiIdInput,
  setUpiIdInput
}) {
  return (
    <div>
      {/* Category Subhead */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d" }}>
            UPI Payment
          </span>
          <span style={{ fontSize: "10.5px", color: "#166534", background: "#eef9f2", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>
            Zero Transaction Fees
          </span>
        </div>

        {/* UPI Mode Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "#f5eee6", padding: "3px", borderRadius: "8px" }}>
          <button
            type="button"
            onClick={() => setUpiMode("apps")}
            style={{
              background: upiMode === "apps" ? "#ffffff" : "transparent",
              border: "none",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: upiMode === "apps" ? "700" : "500",
              color: upiMode === "apps" ? "#2b170d" : "#6e5d50",
              cursor: "pointer"
            }}
          >
            UPI Apps
          </button>
          <button
            type="button"
            onClick={() => setUpiMode("qr")}
            style={{
              background: upiMode === "qr" ? "#ffffff" : "transparent",
              border: "none",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: upiMode === "qr" ? "700" : "500",
              color: upiMode === "qr" ? "#2b170d" : "#6e5d50",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px"
            }}
          >
            <QrCode size={11} /> Scan QR
          </button>
          <button
            type="button"
            onClick={() => setUpiMode("id")}
            style={{
              background: upiMode === "id" ? "#ffffff" : "transparent",
              border: "none",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: upiMode === "id" ? "700" : "500",
              color: upiMode === "id" ? "#2b170d" : "#6e5d50",
              cursor: "pointer"
            }}
          >
            UPI ID
          </button>
        </div>
      </div>

      {/* Submode A: UPI Apps Selection */}
      {upiMode === "apps" && (
        <div>
          <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "10px" }}>
            Select your preferred UPI app for direct, instant authentication:
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            {/* Google Pay */}
            <div
              onClick={() => setSelectedUpiApp("gpay")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                border: selectedUpiApp === "gpay" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                borderRadius: "10px",
                background: selectedUpiApp === "gpay" ? "#fbf6f0" : "#ffffff",
                cursor: "pointer"
              }}
            >
              <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>Google Pay</div>
                <div style={{ fontSize: "10px", color: "#806f62" }}>Instant UPI Intent</div>
              </div>
              {selectedUpiApp === "gpay" && <Check size={14} color="#b88a58" strokeWidth={3} />}
            </div>

            {/* PhonePe */}
            <div
              onClick={() => setSelectedUpiApp("phonepe")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                border: selectedUpiApp === "phonepe" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                borderRadius: "10px",
                background: selectedUpiApp === "phonepe" ? "#fbf6f0" : "#ffffff",
                cursor: "pointer"
              }}
            >
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#5f259f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "900" }}>
                पे
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>PhonePe</div>
                <div style={{ fontSize: "10px", color: "#806f62" }}>Fast Approval</div>
              </div>
              {selectedUpiApp === "phonepe" && <Check size={14} color="#b88a58" strokeWidth={3} />}
            </div>

            {/* Paytm */}
            <div
              onClick={() => setSelectedUpiApp("paytm")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                border: selectedUpiApp === "paytm" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                borderRadius: "10px",
                background: selectedUpiApp === "paytm" ? "#fbf6f0" : "#ffffff",
                cursor: "pointer"
              }}
            >
              <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontWeight: "900", fontSize: "11px" }}>
                  <span style={{ color: "#002e6e" }}>pay</span><span style={{ color: "#00b9f5" }}>tm</span>
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>Paytm UPI</div>
                <div style={{ fontSize: "10px", color: "#806f62" }}>Seamless UPI</div>
              </div>
              {selectedUpiApp === "paytm" && <Check size={14} color="#b88a58" strokeWidth={3} />}
            </div>

            {/* BHIM / Other UPI */}
            <div
              onClick={() => setSelectedUpiApp("bhim")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                border: selectedUpiApp === "bhim" ? "2px solid #b88a58" : "1px solid #ebd9c8",
                borderRadius: "10px",
                background: selectedUpiApp === "bhim" ? "#fbf6f0" : "#ffffff",
                cursor: "pointer"
              }}
            >
              <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="16" viewBox="0 0 40 32" fill="none">
                  <path d="M18 4L32 16L18 28L24 16L18 4Z" fill="#00833F" />
                  <path d="M8 4L22 16L8 28L14 16L8 4Z" fill="#F37021" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>BHIM / Any UPI</div>
                <div style={{ fontSize: "10px", color: "#806f62" }}>All Banks Supported</div>
              </div>
              {selectedUpiApp === "bhim" && <Check size={14} color="#b88a58" strokeWidth={3} />}
            </div>
          </div>
        </div>
      )}

      {/* Submode B: Instant QR Code Scan */}
      {upiMode === "qr" && (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div
            style={{
              width: "140px",
              height: "140px",
              background: "#ffffff",
              border: "2px solid #b88a58",
              borderRadius: "12px",
              margin: "0 auto 12px",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative"
            }}
          >
            <QrCode size={110} color="#2b170d" />
            <div
              style={{
                position: "absolute",
                background: "#166534",
                color: "#fff",
                fontSize: "8px",
                fontWeight: "800",
                padding: "1px 6px",
                borderRadius: "10px",
                bottom: "6px"
              }}
            >
              LIVE PAYU QR
            </div>
          </div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>
            Scan QR with Any UPI App
          </div>
          <div style={{ fontSize: "11px", color: "#806f62", marginTop: "2px" }}>
            Open Google Pay, PhonePe, Paytm, or BHIM and scan to pay {money(finalTotal)}
          </div>
        </div>
      )}

      {/* Submode C: Manual UPI ID */}
      {upiMode === "id" && (
        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#2b170d", marginBottom: "6px" }}>
            Enter Virtual Payment Address (VPA / UPI ID)
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="e.g. devotee@okhdfcbank"
              value={upiIdInput}
              onChange={(e) => setUpiIdInput(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #d4c5b9",
                fontSize: "13px",
                outline: "none"
              }}
            />
            <button
              type="button"
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                background: "#f7eee3",
                border: "1px solid #e8dac9",
                color: "#99582a",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Verify
            </button>
          </div>
          <div style={{ fontSize: "11px", color: "#806f62", marginTop: "6px" }}>
            A payment collect request will be sent to your UPI app via PayU.
          </div>
        </div>
      )}
    </div>
  );
}
