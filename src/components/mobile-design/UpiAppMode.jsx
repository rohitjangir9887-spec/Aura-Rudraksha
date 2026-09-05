import React from "react";
import { Check, Smartphone } from "lucide-react";

const upiApps = [
  { id: "gpay", name: "Google Pay", note: "Instant UPI Intent", color: "#1a73e8", bg: "#f0f6ff" },
  { id: "phonepe", name: "PhonePe", note: "Fast Auto-Approval", color: "#5f259f", bg: "#f7f0fc" },
  { id: "paytm", name: "Paytm UPI", note: "Direct Bank Link", color: "#002e6e", bg: "#f0f4fa" },
  { id: "bhim", name: "BHIM UPI", note: "Govt. NPCI Protocol", color: "#008542", bg: "#f0f9f3" },
  { id: "other", name: "Other UPI Apps", note: "Cred, Amazon Pay, etc.", color: "#7a4a24", bg: "#faf5f0" }
];

export function UpiAppMode({ selectedApp, setSelectedApp }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#6e5d50" }}>
        Select your UPI application:
      </div>

      {upiApps.map((app) => {
        const isSelected = selectedApp === app.id;

        return (
          <div
            key={app.id}
            onClick={() => setSelectedApp(app.id)}
            style={{
              background: isSelected ? "#fffdfa" : "#ffffff",
              border: isSelected ? "2px solid #b88a58" : "1px solid #ebd9c8",
              borderRadius: "14px",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              boxShadow: isSelected ? "0 3px 10px rgba(184, 138, 88, 0.15)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: app.bg,
                  color: app.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "800"
                }}
              >
                <Smartphone size={18} color={app.color} />
              </div>
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d" }}>
                  {app.name}
                </div>
                <div style={{ fontSize: "10px", color: "#806f62" }}>
                  {app.note}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {isSelected && (
                <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#b88a58", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
