import React from "react";
import { Check } from "lucide-react";

export function CheckoutAddressForm({
  formData,
  onInputChange,
  saveAddressCheck,
  onToggleSaveAddressCheck,
  errors = {},
  isLookingUp = false,
  pinLookupError = null,
  postOffices = [],
  selectedPostOffice = null,
  setSelectedPostOffice = () => {},
  autoFilledPin = "",
  setAutoFilledPin = () => {},
  setPostOffices = () => {},
  setPinLookupError = () => {}
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
      <div className="checkout-form-row-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: pinLookupError ? "6px" : "14px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ minWidth: 0 }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
            Pincode <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
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
                if (autoFilledPin && val !== autoFilledPin) {
                  setAutoFilledPin("");
                  setPostOffices([]);
                  setSelectedPostOffice(null);
                  onInputChange("city", "");
                  onInputChange("state", "");
                  onInputChange("locality", "");
                  setPinLookupError(null);
                }
              }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 10px",
                paddingRight: autoFilledPin === formData.pincode ? "28px" : "10px",
                borderRadius: "8px",
                border: errors.pincode ? "1.5px solid #dc2626" : "1px solid #d4c5b9",
                background: "#ffffff",
                fontSize: "12.5px",
                color: "#2b170d",
                outline: "none"
              }}
            />
            {isLookingUp && (
              <div className="animate-spin" style={{ position: "absolute", right: "8px", top: "50%", marginTop: "-7px", width: "14px", height: "14px", border: "2px solid #e8dac9", borderTopColor: "#b85d25", borderRadius: "50%" }} />
            )}
            {!isLookingUp && autoFilledPin === formData.pincode && formData.pincode.length === 6 && (
              <Check size={14} color="#16a34a" style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)" }} />
            )}
          </div>
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
              border: errors.city ? "1.5px solid #dc2626" : (autoFilledPin === formData.pincode ? "1px solid #86efac" : "1px solid #d4c5b9"),
              background: autoFilledPin === formData.pincode ? "#f0fdf4" : "#ffffff",
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
              border: errors.state ? "1.5px solid #dc2626" : (autoFilledPin === formData.pincode ? "1px solid #86efac" : "1px solid #d4c5b9"),
              background: autoFilledPin === formData.pincode ? "#f0fdf4" : "#ffffff",
              fontSize: "12.5px",
              color: "#2b170d",
              outline: "none"
            }}
          />
          {errors.state && <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "2px" }}>{errors.state}</div>}
        </div>
      </div>

      {pinLookupError && (
        <div style={{ fontSize: "11px", color: "#dc2626", marginBottom: "14px", marginTop: "-4px", padding: "4px 8px", background: "#fef2f2", borderRadius: "4px", border: "1px solid #fecaca" }}>
          {pinLookupError}
        </div>
      )}

      {postOffices.length > 1 && (
        <div style={{ marginBottom: "14px", width: "100%", boxSizing: "border-box" }}>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
            Select your area / Locality <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <select
            value={selectedPostOffice || ""}
            onChange={(e) => {
              const officeName = e.target.value;
              setSelectedPostOffice(officeName);
              const office = postOffices.find(o => o.Name === officeName);
              if (office) {
                onInputChange("city", office.District || office.Region || "");
                onInputChange("state", office.State || "");
                onInputChange("locality", office.Name);
              }
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 10px",
              borderRadius: "8px",
              border: "1px solid #86efac",
              background: "#f0fdf4",
              fontSize: "12.5px",
              color: "#2b170d",
              outline: "none"
            }}
          >
            {postOffices.map((office, idx) => (
              <option key={idx} value={office.Name}>{office.Name}</option>
            ))}
          </select>
        </div>
      )}

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
