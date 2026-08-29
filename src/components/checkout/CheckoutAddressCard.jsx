import React from "react";
import { MapPin, Check, Edit3, PlusCircle } from "lucide-react";

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
  errors = {}
}) {
  return (
    <div 
      id="checkout-address-section"
      style={{
        background: "#fffdf9",
        border: "1px solid #e8dac9",
        borderRadius: "14px",
        padding: "18px 16px",
        marginBottom: "16px",
        boxShadow: "0 2px 10px rgba(43, 23, 13, 0.03)"
      }}
    >
      {/* Step Header */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
          paddingBottom: "10px",
          borderBottom: "1px solid #f0e6da"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div 
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "#b85d25",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "700"
            }}
          >
            1
          </div>
          <div>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: "700", margin: 0, color: "#2b170d" }}>
              Shipping Address
            </h2>
            <div style={{ fontSize: "11px", color: "#806f62" }}>
              Where should we dispatch your sacred order?
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
        <div 
          id="saved-address-view"
          style={{
            background: "#fdfbf7",
            border: "1.5px solid #d4c5b9",
            borderRadius: "10px",
            padding: "14px",
            position: "relative"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span 
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "#eef6f0",
                color: "#166534",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "700"
              }}
            >
              <Check size={13} /> Default Address
            </span>

            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                type="button"
                onClick={onEditAddress}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#b85d25",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px"
                }}
              >
                <Edit3 size={13} /> Edit
              </button>
            </div>
          </div>

          <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#2b170d", marginBottom: "4px" }}>
            {savedAddress.firstName} {savedAddress.lastName}
          </div>
          
          <div style={{ fontSize: "12.5px", color: "#4a3528", lineHeight: "1.5" }}>
            {savedAddress.address}, {savedAddress.city}, {savedAddress.state} - <b>{savedAddress.pincode}</b>
          </div>

          <div style={{ fontSize: "11.5px", color: "#7a695e", marginTop: "6px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <span>📞 {savedAddress.phone}</span>
            {savedAddress.email ? <span>✉️ {savedAddress.email}</span> : null}
          </div>

          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #e8dac9" }}>
            <button 
              type="button"
              onClick={onUseDifferentAddress}
              style={{
                background: "transparent",
                border: "1px dashed #b85d25",
                color: "#b85d25",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "11.5px",
                fontWeight: "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <PlusCircle size={13} /> Deliver to a Different Address
            </button>
          </div>
        </div>
      ) : (
        /* ADDRESS INPUT FORM */
        <div id="address-input-form">
          {/* Row 1: Name */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
            <div>
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

            <div>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
            <div>
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

            <div>
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
          <div style={{ marginBottom: "12px" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
            <div>
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

            <div>
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

            <div>
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
      )}
    </div>
  );
}
