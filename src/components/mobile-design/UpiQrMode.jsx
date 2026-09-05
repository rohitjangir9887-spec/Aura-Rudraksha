import React, { useState } from "react";
import { Copy } from "lucide-react";

export function UpiQrMode({ amount }) {
  const [copiedVpa, setCopiedVpa] = useState(false);

  const handleCopyVpa = () => {
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "16px",
        padding: "16px",
        textAlign: "center",
        boxShadow: "0 4px 14px rgba(43, 23, 13, 0.04)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px"
      }}
    >
      <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d" }}>
        Scan with Any UPI App
      </div>

      {/* QR Code Container */}
      <div
        style={{
          width: "180px",
          height: "180px",
          padding: "10px",
          background: "#ffffff",
          border: "2px solid #2b170d",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          boxShadow: "0 4px 12px rgba(43, 23, 13, 0.08)"
        }}
      >
        {/* Sacred Center Watermark */}
        <div
          style={{
            position: "absolute",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#2b170d",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            border: "2px solid #ffffff",
            zIndex: 2
          }}
        >
          ॐ
        </div>

        {/* High-fidelity SVG QR representation */}
        <svg width="150" height="150" viewBox="0 0 100 100" style={{ shapeRendering: "crispEdges" }}>
          {/* QR Finder patterns (top-left, top-right, bottom-left) */}
          <rect x="5" y="5" width="26" height="26" fill="#2b170d" />
          <rect x="9" y="9" width="18" height="18" fill="#ffffff" />
          <rect x="13" y="13" width="10" height="10" fill="#2b170d" />

          <rect x="69" y="5" width="26" height="26" fill="#2b170d" />
          <rect x="73" y="9" width="18" height="18" fill="#ffffff" />
          <rect x="77" y="13" width="10" height="10" fill="#2b170d" />

          <rect x="5" y="69" width="26" height="26" fill="#2b170d" />
          <rect x="9" y="73" width="18" height="18" fill="#ffffff" />
          <rect x="13" y="77" width="10" height="10" fill="#2b170d" />

          {/* QR Random Databits */}
          <rect x="36" y="8" width="5" height="5" fill="#2b170d" />
          <rect x="46" y="8" width="5" height="5" fill="#2b170d" />
          <rect x="56" y="8" width="5" height="5" fill="#2b170d" />
          <rect x="36" y="18" width="5" height="5" fill="#2b170d" />
          <rect x="51" y="18" width="5" height="5" fill="#2b170d" />
          <rect x="36" y="28" width="5" height="5" fill="#2b170d" />
          <rect x="46" y="28" width="5" height="5" fill="#2b170d" />
          <rect x="56" y="28" width="5" height="5" fill="#2b170d" />

          <rect x="8" y="36" width="5" height="5" fill="#2b170d" />
          <rect x="18" y="36" width="5" height="5" fill="#2b170d" />
          <rect x="28" y="36" width="5" height="5" fill="#2b170d" />
          <rect x="69" y="36" width="5" height="5" fill="#2b170d" />
          <rect x="79" y="36" width="5" height="5" fill="#2b170d" />
          <rect x="89" y="36" width="5" height="5" fill="#2b170d" />

          <rect x="69" y="46" width="5" height="5" fill="#2b170d" />
          <rect x="79" y="56" width="5" height="5" fill="#2b170d" />
          <rect x="89" y="46" width="5" height="5" fill="#2b170d" />
          <rect x="69" y="66" width="5" height="5" fill="#2b170d" />
          <rect x="79" y="76" width="5" height="5" fill="#2b170d" />
          <rect x="89" y="86" width="5" height="5" fill="#2b170d" />

          <rect x="36" y="69" width="5" height="5" fill="#2b170d" />
          <rect x="46" y="79" width="5" height="5" fill="#2b170d" />
          <rect x="56" y="89" width="5" height="5" fill="#2b170d" />
          <rect x="46" y="69" width="5" height="5" fill="#2b170d" />
          <rect x="36" y="89" width="5" height="5" fill="#2b170d" />
        </svg>
      </div>

      <div style={{ fontSize: "14px", fontWeight: "800", color: "#2b170d" }}>
        Amount: ₹{amount.toLocaleString("en-IN")}
      </div>

      <div
        onClick={handleCopyVpa}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "#f7eee3",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "11px",
          fontWeight: "600",
          color: "#7a4a24",
          cursor: "pointer"
        }}
      >
        <span>VPA: aurarudraksha@payu</span>
        <Copy size={12} />
        {copiedVpa && <span style={{ color: "#16a34a", fontWeight: "700" }}>✓ Copied!</span>}
      </div>
    </div>
  );
}
