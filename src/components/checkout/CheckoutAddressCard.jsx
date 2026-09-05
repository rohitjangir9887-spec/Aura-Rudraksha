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
          isLookingUp={isLookingUp}
          pinLookupError={pinLookupError}
          postOffices={postOffices}
          selectedPostOffice={selectedPostOffice}
          setSelectedPostOffice={setSelectedPostOffice}
          autoFilledPin={autoFilledPin}
          setAutoFilledPin={setAutoFilledPin}
          setPostOffices={setPostOffices}
          setPinLookupError={setPinLookupError}
        />
      )}
    </div>
  );
}
