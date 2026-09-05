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
  isLoading = false,
  errors = {}
}) {
  const [isLookingUp, setIsLookingUp] = React.useState(false);
  const [pinLookupError, setPinLookupError] = React.useState(null);
  const [postOffices, setPostOffices] = React.useState([]);
  const [selectedPostOffice, setSelectedPostOffice] = React.useState(null);
  const pinCache = React.useRef({});
  
  // Track the pincode that we currently have successfully autofilled for
  const [autoFilledPin, setAutoFilledPin] = React.useState("");

  React.useEffect(() => {
    const pin = formData.pincode;
    if (!pin || pin.length !== 6) {
      // Don't lookup if not exactly 6 digits
      return;
    }

    if (pin === autoFilledPin) {
      return; // Already processed this pin
    }

    const lookup = async () => {
      setIsLookingUp(true);
      setPinLookupError(null);
      
      try {
        if (pinCache.current[pin]) {
          processLookupResult(pinCache.current[pin], pin);
          return;
        }

        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        
        pinCache.current[pin] = data;
        processLookupResult(data, pin);

      } catch (err) {
        setPinLookupError("We couldn't connect. Please check your network and try again.");
        setIsLookingUp(false);
      }
    };
    
    const timer = setTimeout(() => {
      lookup();
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.pincode, autoFilledPin]);

  const processLookupResult = (data, pin) => {
    setIsLookingUp(false);
    if (data && data[0] && data[0].Status === "Success") {
      const offices = data[0].PostOffice || [];
      setPostOffices(offices);
      setPinLookupError(null);
      setAutoFilledPin(pin);
      
      if (offices.length > 0) {
        let matchedOffice = null;
        if (formData.locality) {
          matchedOffice = offices.find(o => o.Name === formData.locality);
        }
        
        const officeToUse = matchedOffice || offices[0];
        setSelectedPostOffice(officeToUse.Name);
        
        const city = officeToUse.District || officeToUse.Region || "";
        const state = officeToUse.State || "";
        
        // If this is a brand new lookup triggered by typing (indicated by empty city/state or no matched locality), we overwrite.
        if (!formData.city || !matchedOffice) {
          onInputChange("city", city);
          onInputChange("state", state);
          onInputChange("locality", officeToUse.Name);
        }
      }
    } else {
      setPostOffices([]);
      setSelectedPostOffice(null);
      setAutoFilledPin("");
      setPinLookupError("We couldn't find this PIN code. Please check and try again.");
    }
  };

  if (isLoading) {
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
      ) : (
        /* ADDRESS INPUT FORM */
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

          {/* Row 3.5: Landmark */}
          <div style={{ marginBottom: "12px", width: "100%", boxSizing: "border-box" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#4a3528", marginBottom: "4px" }}>
              Landmark <span style={{ color: "#9ca3af", fontWeight: "400" }}>(Optional)</span>
            </label>
            <input 
              id="input-landmark"
              placeholder="E.g. Near Apollo Hospital"
              value={formData.landmark || ""}
              onChange={(e) => onInputChange("landmark", e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 10px",
                borderRadius: "8px",
                border: "1px solid #d4c5b9",
                background: "#ffffff",
                fontSize: "12.5px",
                color: "#2b170d",
                outline: "none"
              }}
            />
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
