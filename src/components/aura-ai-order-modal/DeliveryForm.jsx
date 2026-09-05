import React from "react";
import { MapPin } from "lucide-react";

export function DeliveryForm({ name, setName, phone, setPhone, address, setAddress, city, setCity, pincode, setPincode }) {
  return (
    <div className="aura-ai-order-section">
      <div className="aura-ai-order-section-title">
        <MapPin size={13} /> Delivery Details
      </div>
      <div className="aura-ai-order-grid-2">
        <div className="aura-ai-order-field">
          <input
            type="text"
            required
            placeholder="Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="aura-ai-order-field">
          <input
            type="tel"
            required
            placeholder="10-digit Mobile *"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>
      <div className="aura-ai-order-field" style={{ marginTop: 6 }}>
        <input
          type="text"
          required
          placeholder="House / Flat / Street Address *"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="aura-ai-order-grid-2" style={{ marginTop: 6 }}>
        <div className="aura-ai-order-field">
          <input
            type="text"
            placeholder="City / Town"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div className="aura-ai-order-field">
          <input
            type="text"
            required
            placeholder="PIN Code *"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
