import React from "react";
import { MapPin } from "lucide-react";
import { CheckoutAddressLoading } from "./CheckoutAddressLoading.jsx";
import { CheckoutAddressSavedView } from "./CheckoutAddressSavedView.jsx";
import { CheckoutAddressForm } from "./CheckoutAddressForm.jsx";

export function CheckoutAddressCard({
  formData,
  onInputChange,
  savedAddress,
  usingSavedAddress,
  onUseSavedAddress,
  onUseDifferentAddress,
  onEditAddress,
  saveAddressCheck,
  onToggleSaveAddressCheck,
  isLoading = false,
  errors = {}
}) {
  if (isLoading) {
    return <CheckoutAddressLoading />;
  }

  return (
    <div 
      id="checkout-address-section"
      style={{
        background: "#ffffff",
        border: "1.5px solid #ebd9c8",
        borderRadius: "16px",
        padding: "18px 16px",
        marginBottom: "0",
        boxShadow: "0 4px 16px rgba(43, 23, 13, 0.04)",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100%"
      }}
    >
      {/* Step Header */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          paddingBottom: "10px",
          borderBottom: "1px solid #f0e6da",
          flexWrap: "wrap",
          gap: "8px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div 
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #b88a58 0%, #8c5d2e 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "800",
              flexShrink: 0
            }}
          >
            1
          </div>
          <div>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: "700", margin: 0, color: "#2b170d", lineHeight: "1.2" }}>
              Delivery Address
            </h2>
            <div style={{ fontSize: "11px", color: "#806f62", marginTop: "1px" }}>
              Enter where your order should be delivered
            </div>
          </div>
        </div>

        {savedAddress && !usingSavedAddress && (
          <button 
            type="button"
            onClick={onUseSavedAddress}
            style={{
              background: "#f7eee3",
              border: "1px solid #e8dac9",
              color: "#b85d25",
              padding: "5px 10px",
              borderRadius: "6px",
              fontSize: "11.5px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <MapPin size={13} /> Use Saved
          </button>
        )}
      </div>

      {/* SAVED ADDRESS CARD IF IN USE */}
      {savedAddress && usingSavedAddress ? (
        <CheckoutAddressSavedView
          savedAddress={savedAddress}
          onEditAddress={onEditAddress}
          onUseDifferentAddress={onUseDifferentAddress}
        />
      ) : (
        /* ADDRESS INPUT FORM */
        <CheckoutAddressForm
          formData={formData}
          onInputChange={onInputChange}
          saveAddressCheck={saveAddressCheck}
          onToggleSaveAddressCheck={onToggleSaveAddressCheck}
          errors={errors}
        />
      )}
    </div>
  );
}
