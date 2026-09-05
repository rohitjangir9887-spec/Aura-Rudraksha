import React from 'react';

export function CheckoutAddressLoading() {
  return (
    <div
      id="checkout-address-section-loading"
      style={{
        background: "#fffdf9",
        border: "1px solid #e8dac9",
        borderRadius: "14px",
        padding: "18px 16px",
        marginBottom: "16px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#f0e6da" }} />
        <div style={{ width: "160px", height: "18px", background: "#f0e6da", borderRadius: "4px" }} />
      </div>
      <div style={{ width: "100%", height: "80px", background: "#f7eee3", borderRadius: "8px" }} />
    </div>
  );
}
