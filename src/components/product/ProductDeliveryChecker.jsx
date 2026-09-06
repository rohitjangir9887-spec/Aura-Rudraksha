import React, { useState, useEffect } from "react";
import { Truck, CheckCircle2, MapPin, Clock, ShieldCheck, Edit3, ArrowRight, User } from "lucide-react";
import { db } from "../../lib/db";
import { authClient } from "../../lib/authClient";

export function ProductDeliveryChecker({ freeShippingThreshold = 0, productShippingFee = 0 }) {
  const [pincode, setPincode] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [savedAddress, setSavedAddress] = useState(null);
  const [isEditingPin, setIsEditingPin] = useState(false);

  // Load saved user address if available
  useEffect(() => {
    let isMounted = true;

    async function loadAddress() {
      try {
        // 1. Check local cached addresses or me profile
        const cachedAddrs = db.getCachedAddresses?.() || [];
        const cachedMe = db.getCachedCustomerMe?.() || null;

        let foundAddr = null;
        if (Array.isArray(cachedAddrs) && cachedAddrs.length > 0) {
          foundAddr = cachedAddrs.find(a => a.isDefault) || cachedAddrs[0];
        } else if (cachedMe?.address || cachedMe?.pincode) {
          foundAddr = cachedMe;
        }

        // 2. Check localStorage session checkout address
        if (!foundAddr && typeof window !== "undefined") {
          try {
            const rawStored = localStorage.getItem("aura_saved_shipping_address") || localStorage.getItem("aura_checkout_form");
            if (rawStored) {
              const parsed = JSON.parse(rawStored);
              if (parsed?.pincode || parsed?.city) {
                foundAddr = parsed;
              }
            }
          } catch (_) {}
        }

        // 3. If still not found and user logged in, fetch from DB
        const user = authClient.getUser();
        if (!foundAddr && user && !user.isAnonymous) {
          const res = await db.getAddresses?.().catch(() => null);
          if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
            foundAddr = res.data.find(a => a.isDefault) || res.data[0];
          }
        }

        if (isMounted && foundAddr && (foundAddr.pincode || foundAddr.city)) {
          setSavedAddress(foundAddr);
          const pin = String(foundAddr.pincode || "").replace(/\D/g, "");
          if (pin.length === 6) {
            setPincode(pin);
            // Auto calculate delivery date for saved address
            calculateDelivery(pin);
          }
        }
      } catch (_) {}
    }

    loadAddress();
    return () => { isMounted = false; };
  }, []);

  const getEstimatedDate = (daysToAdd = 3) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  };

  const calculateDelivery = (cleanPin) => {
    const isMetro = ["11", "12", "40", "56", "60", "70", "50", "30", "38"].some(p => cleanPin.startsWith(p));
    const minDays = isMetro ? 2 : 3;
    const maxDays = isMetro ? 4 : 5;

    setCheckResult({
      valid: true,
      pincode: cleanPin,
      deliveryDate: `${getEstimatedDate(minDays)} – ${getEstimatedDate(maxDays)}`,
      isFree: true,
      courier: "Bluedart / Delhivery Express Air"
    });
  };

  const handleCheck = (e) => {
    e.preventDefault();
    const cleanPin = pincode.replace(/\D/g, "");
    if (cleanPin.length !== 6) {
      setCheckResult({
        valid: false,
        message: "Please enter a valid 6-digit Indian pincode."
      });
      return;
    }

    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      calculateDelivery(cleanPin);
      setIsEditingPin(false);
    }, 300);
  };

  // If user has a saved address and is not currently in edit mode
  if (savedAddress && !isEditingPin && (savedAddress.pincode || savedAddress.city)) {
    const displayName = savedAddress.name || savedAddress.firstName || "Saved Address";
    const displayLocation = [savedAddress.city, savedAddress.state, savedAddress.pincode].filter(Boolean).join(", ");

    return (
      <div className="aura-delivery-checker-card saved-address-view" style={{ marginTop: "12px" }}>
        <div className="aura-saved-addr-top">
          <div className="aura-saved-addr-info">
            <div className="aura-saved-pin-icon">
              <MapPin size={16} />
            </div>
            <div className="aura-saved-addr-text">
              <div className="aura-saved-addr-title-row">
                <span className="aura-saved-addr-label">Deliver to:</span>
                <strong className="aura-saved-addr-name">{displayName}</strong>
                {savedAddress.pincode && (
                  <span className="aura-saved-addr-pin-badge">{savedAddress.pincode}</span>
                )}
              </div>
              <span className="aura-saved-addr-sub">
                {displayLocation || savedAddress.address}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="aura-saved-addr-change-btn"
            onClick={() => setIsEditingPin(true)}
            title="Change pincode"
          >
            <Edit3 size={12} />
            <span>Change</span>
          </button>
        </div>

        {checkResult?.valid && (
          <div className="aura-saved-addr-estimate">
            <div className="result-main-line">
              <Truck size={14} className="green-check" />
              <span>
                Expected Delivery by <strong>{checkResult.deliveryDate}</strong>
              </span>
            </div>
            <div className="result-meta-line">
              <span className="aura-free-tag">✓ FREE Express Air Shipping</span>
              <span>•</span>
              <span>Consecrated &amp; Dispatched in 24–48h</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pincode input mode
  return (
    <div className="aura-delivery-checker-card" style={{ marginTop: "12px" }}>
      <div className="aura-delivery-header">
        <div className="delivery-icon-box">
          <Truck size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 className="delivery-title">Delivery &amp; Pincode Check</h4>
            {savedAddress && (
              <button
                type="button"
                className="aura-use-saved-btn"
                onClick={() => setIsEditingPin(false)}
              >
                Use Saved Address
              </button>
            )}
          </div>
          <span className="delivery-sub">Enter pincode to verify express delivery date</span>
        </div>
      </div>

      <form onSubmit={handleCheck} className="aura-pincode-form">
        <div className="aura-pincode-input-wrap">
          <MapPin size={14} className="pincode-pin-icon" />
          <input
            type="text"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit Pincode"
            className="aura-pincode-input"
            aria-label="Delivery pincode"
          />
        </div>
        <button
          type="submit"
          className="aura-pincode-submit-btn"
          disabled={isChecking || pincode.length !== 6}
        >
          {isChecking ? "Checking..." : "Check"}
        </button>
      </form>

      {checkResult && (
        <div className={`aura-pincode-result ${checkResult.valid ? "success" : "error"}`}>
          {checkResult.valid ? (
            <div>
              <div className="result-main-line">
                <CheckCircle2 size={14} className="green-check" />
                <span>
                  Delivery by <strong>{checkResult.deliveryDate}</strong> to <strong>{checkResult.pincode}</strong>
                </span>
              </div>
              <div className="result-meta-line">
                <span>🚚 FREE Express Insured Shipping</span>
                <span>•</span>
                <span>Dispatch in 24–48 hrs after Consecration</span>
              </div>
            </div>
          ) : (
            <span>{checkResult.message}</span>
          )}
        </div>
      )}

      {/* Trust micro assurances */}
      <div className="aura-delivery-assurances">
        <div className="delivery-assurance-item">
          <Clock size={12} />
          <span>Ships in 24-48h</span>
        </div>
        <div className="delivery-assurance-item">
          <Truck size={12} />
          <span>Pan-India Tracked</span>
        </div>
        <div className="delivery-assurance-item">
          <ShieldCheck size={12} />
          <span>Insured Transit</span>
        </div>
      </div>
    </div>
  );
}
