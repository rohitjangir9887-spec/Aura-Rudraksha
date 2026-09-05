import React from "react";
import { Check, Edit3, PlusCircle } from "lucide-react";

export function CheckoutAddressSavedView({
  savedAddress,
  onEditAddress,
  onUseDifferentAddress
}) {
  return (
    <div
      id="saved-address-view"
      style={{
        background: "linear-gradient(180deg, #fdfcf9 0%, #fbf8f2 100%)",
        border: "1.5px solid #dfc7af",
        borderRadius: "14px",
        padding: "16px 18px",
        position: "relative",
        boxShadow: "0 2px 8px rgba(43, 23, 13, 0.03)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "#eef9f2",
            border: "1px solid #cce8d4",
            color: "#166534",
            padding: "3px 10px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700"
          }}
        >
          <Check size={12} strokeWidth={3} /> Default Address
        </span>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={onEditAddress}
            style={{
              background: "#f7eee3",
              border: "1px solid #ebd9c8",
              color: "#99582a",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11.5px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <Edit3 size={12} /> Edit
          </button>
        </div>
      </div>

      <div style={{ fontSize: "14.5px", fontWeight: "700", color: "#2b170d", marginBottom: "4px" }}>
        {savedAddress.firstName} {savedAddress.lastName}
      </div>

      <div style={{ fontSize: "13px", color: "#4a3528", lineHeight: "1.5" }}>
        {savedAddress.address}, {savedAddress.city}, {savedAddress.state} - <b>{savedAddress.pincode}</b>
      </div>

      <div style={{ fontSize: "12px", color: "#7a695e", marginTop: "8px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <span>📞 {savedAddress.phone}</span>
        {savedAddress.email ? <span>✉️ {savedAddress.email}</span> : null}
      </div>

      <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px dashed #dfc7af" }}>
        <button
          type="button"
          onClick={onUseDifferentAddress}
          style={{
            background: "transparent",
            border: "1px dashed #b88a58",
            color: "#99582a",
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <PlusCircle size={14} /> Deliver to a Different Address
        </button>
      </div>
    </div>
  );
}
