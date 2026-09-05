import React from "react";
import { Check } from "lucide-react";

export function WalletPayment({
  selectedWallet,
  setSelectedWallet
}) {
  return (
    <div>
      <div style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d", marginBottom: "6px" }}>
        Digital Wallets
      </div>
      <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "14px" }}>
        Pay quickly using your pre-funded wallet balance via PayU:
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
        {/* Paytm Wallet */}
        <div
          onClick={() => setSelectedWallet("paytm")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            border: selectedWallet === "paytm" ? "2px solid #b88a58" : "1px solid #ebd9c8",
            borderRadius: "10px",
            background: selectedWallet === "paytm" ? "#fbf6f0" : "#ffffff",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontWeight: "900", fontSize: "14px" }}>
              <span style={{ color: "#002e6e" }}>pay</span><span style={{ color: "#00b9f5" }}>tm</span>
            </span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>Paytm Wallet</span>
          </div>
          {selectedWallet === "paytm" && <Check size={16} color="#b88a58" strokeWidth={3} />}
        </div>

        {/* PhonePe Wallet */}
        <div
          onClick={() => setSelectedWallet("phonepe")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            border: selectedWallet === "phonepe" ? "2px solid #b88a58" : "1px solid #ebd9c8",
            borderRadius: "10px",
            background: selectedWallet === "phonepe" ? "#fbf6f0" : "#ffffff",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#5f259f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>
              पे
            </div>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>PhonePe Wallet</span>
          </div>
          {selectedWallet === "phonepe" && <Check size={16} color="#b88a58" strokeWidth={3} />}
        </div>

        {/* Mobikwik */}
        <div
          onClick={() => setSelectedWallet("mobikwik")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            border: selectedWallet === "mobikwik" ? "2px solid #b88a58" : "1px solid #ebd9c8",
            borderRadius: "10px",
            background: selectedWallet === "mobikwik" ? "#fbf6f0" : "#ffffff",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#0073e6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>
              M
            </div>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#2b170d" }}>MobiKwik / ZIP</span>
          </div>
          {selectedWallet === "mobikwik" && <Check size={16} color="#b88a58" strokeWidth={3} />}
        </div>
      </div>
    </div>
  );
}
