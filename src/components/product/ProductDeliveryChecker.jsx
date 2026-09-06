import React, { useState } from "react";
import { Truck, CheckCircle2, MapPin, Clock, ShieldCheck } from "lucide-react";

export function ProductDeliveryChecker({ freeShippingThreshold = 0, productShippingFee = 0 }) {
  const [pincode, setPincode] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const getEstimatedDate = (daysToAdd = 3) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short"
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
      // Determine delivery window based on pincode prefix
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
    }, 400);
  };

  return (
    <div className="aura-delivery-checker-card">
      <div className="aura-delivery-header">
        <div className="delivery-icon-box">
          <Truck size={17} />
        </div>
        <div>
          <h4 className="delivery-title">Estimated Delivery &amp; Pincode Check</h4>
          <span className="delivery-sub">Enter your Indian delivery pincode to check dispatch speed</span>
        </div>
      </div>

      <form onSubmit={handleCheck} className="aura-pincode-form">
        <div className="aura-pincode-input-wrap">
          <MapPin size={15} className="pincode-pin-icon" />
          <input
            type="text"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit pincode"
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
          <Clock size={13} />
          <span>Ships in 24-48h</span>
        </div>
        <div className="delivery-assurance-item">
          <Truck size={13} />
          <span>Pan-India Tracked</span>
        </div>
        <div className="delivery-assurance-item">
          <ShieldCheck size={13} />
          <span>Tamper-Proof Box</span>
        </div>
      </div>
    </div>
  );
}
