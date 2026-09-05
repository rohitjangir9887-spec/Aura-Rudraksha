import React from "react";

export function CheckoutAddressForm({
  formData,
  onInputChange,
  saveAddressCheck,
  onToggleSaveAddressCheck,
  errors = {}
}) {
  return (
    <div id="address-input-form" style={{ width: "100%", boxSizing: "border-box" }}>
      {/* Row 1: Name */}
      <div className="checkout-form-row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ minWidth: 0 }}>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
            First Name <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="input-firstName"
            placeholder="e.g. Ramesh"
            required
            value={formData.firstName}
            onChange={(e) => onInputChange("firstName", e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: "8px",
              border: errors.firstName ? "1.5px solid #dc2626" : "1px solid #d4c5b9",
              background: "#ffffff",
              fontSize: "13px",
              color: "#2b170d",
              outline: "none"
            }}
          />
          {errors.firstName && <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "2px" }}>{errors.firstName}</div>}
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
            Last Name <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="input-lastName"
            placeholder="e.g. Sharma"
            required
            value={formData.lastName}
            onChange={(e) => onInputChange("lastName", e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: "8px",
              border: errors.lastName ? "1.5px solid #dc2626" : "1px solid #d4c5b9",
              background: "#ffffff",
              fontSize: "13px",
              color: "#2b170d",
              outline: "none"
            }}
          />
          {errors.lastName && <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "2px" }}>{errors.lastName}</div>}
        </div>
      </div>

      {/* Row 2: Phone & Email */}
      <div className="checkout-form-row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ minWidth: 0 }}>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
            WhatsApp / Phone <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="input-phone"
            placeholder="10-digit mobile number"
            required
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={formData.phone}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              onInputChange("phone", val);
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: "8px",
              border: errors.phone ? "1.5px solid #dc2626" : "1px solid #d4c5b9",
              background: "#ffffff",
              fontSize: "13px",
              color: "#2b170d",
              outline: "none"
            }}
          />
          {errors.phone && <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "2px" }}>{errors.phone}</div>}
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
            Email <span style={{ color: "#806f62", fontWeight: "400", fontSize: "10px" }}>(Optional)</span>
          </label>
          <input
            id="input-email"
            placeholder="For order receipt"
            type="email"
            value={formData.email}
            onChange={(e) => onInputChange("email", e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d4c5b9",
              background: "#ffffff",
              fontSize: "13px",
              color: "#2b170d",
              outline: "none"
            }}
          />
        </div>
      </div>

      {/* Row 3: Street Address */}
      <div style={{ marginBottom: "12px", width: "100%", boxSizing: "border-box" }}>
        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
          Full Delivery Address <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <textarea
          id="input-address"
          placeholder="House/Flat No., Building Name, Street / Colony, Area Landmark"
          required
          rows={2}
          value={formData.address}
          onChange={(e) => onInputChange("address", e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px",
            borderRadius: "8px",
            border: errors.address ? "1.5px solid #dc2626" : "1px solid #d4c5b9",
            background: "#ffffff",
            fontSize: "13px",
            color: "#2b170d",
            outline: "none",
            resize: "vertical"
          }}
        />
        {errors.address && <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "2px" }}>{errors.address}</div>}
      </div>

      {/* Row 4: Pincode, City, State */}
      <div className="checkout-form-row-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ minWidth: 0 }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
            Pincode <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="input-pincode"
            placeholder="6 digits"
            required
            maxLength={6}
            inputMode="numeric"
            value={formData.pincode}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              onInputChange("pincode", val);
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 10px",
              borderRadius: "8px",
              border: errors.pincode ? "1.5px solid #dc2626" : "1px solid #d4c5b9",
              background: "#ffffff",
              fontSize: "12.5px",
              color: "#2b170d",
              outline: "none"
            }}
          />
          {errors.pincode && <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "2px" }}>{errors.pincode}</div>}
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
            City <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="input-city"
            placeholder="City"
            required
            value={formData.city}
            onChange={(e) => onInputChange("city", e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 10px",
              borderRadius: "8px",
              border: errors.city ? "1.5px solid #dc2626" : "1px solid #d4c5b9",
              background: "#ffffff",
              fontSize: "12.5px",
              color: "#2b170d",
              outline: "none"
            }}
          />
          {errors.city && <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "2px" }}>{errors.city}</div>}
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
            State <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="input-state"
            placeholder="State"
            required
            value={formData.state}
            onChange={(e) => onInputChange("state", e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 10px",
              borderRadius: "8px",
              border: errors.state ? "1.5px solid #dc2626" : "1px solid #d4c5b9",
              background: "#ffffff",
              fontSize: "12.5px",
              color: "#2b170d",
              outline: "none"
            }}
          />
          {errors.state && <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "2px" }}>{errors.state}</div>}
        </div>
      </div>

      {/* Save Address Checkbox */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          fontSize: "12px",
          color: "#352015"
        }}
      >
        <input
          id="checkbox-save-address"
          type="checkbox"
          checked={saveAddressCheck}
          onChange={(e) => onToggleSaveAddressCheck(e.target.checked)}
          style={{ width: "16px", height: "16px", accentColor: "#b85d25", cursor: "pointer" }}
        />
        <span>Save this address for fast future checkouts</span>
      </label>
    </div>
  );
}
