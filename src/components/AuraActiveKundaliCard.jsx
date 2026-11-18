import React from "react";
import { Calendar, Clock, MapPin, Pencil, Trash2, User } from "lucide-react";

export function AuraActiveKundaliCard({
  activeBirthDetails,
  onEdit,
  onDelete
}) {
  if (!activeBirthDetails || !activeBirthDetails.dob) {
    return null;
  }

  const name = activeBirthDetails.name || activeBirthDetails.devoteeName || "Devotee";
  const dob = activeBirthDetails.dob || "—";
  const time = activeBirthDetails.birthTime || activeBirthDetails.time || "—";
  const place = activeBirthDetails.birthPlace || activeBirthDetails.place || "—";

  return (
    <div
      className="aura-active-kundali-card aura-gpu-slide-in"
      role="region"
      aria-label="Active Kundli Profile"
    >
      <div className="aura-active-kundali-header">
        <div className="aura-active-kundali-badge-wrap">
          <span className="aura-active-kundali-om" aria-hidden="true">ॐ</span>
          <span className="aura-active-kundali-label">ॐ Active Kundli</span>
        </div>

        <div className="aura-active-kundali-actions">
          <button
            type="button"
            onClick={onEdit}
            className="aura-active-kundali-btn aura-active-kundali-btn-edit"
            title="जन्म विवरण बदलें (Change)"
          >
            <Pencil size={11} strokeWidth={2.2} aria-hidden="true" />
            <span>बदलें</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="aura-active-kundali-btn aura-active-kundali-btn-del"
            title="सक्रिय कुंडली हटाएं (Delete)"
          >
            <Trash2 size={11} strokeWidth={2.2} aria-hidden="true" />
            <span>हटाएं</span>
          </button>
        </div>
      </div>

      <div className="aura-active-kundali-grid">
        <div className="aura-active-kundali-item">
          <User size={12} strokeWidth={2.1} className="aura-active-kundali-ico" aria-hidden="true" />
          <span className="aura-active-kundali-key">नाम:</span>
          <span className="aura-active-kundali-val" title={name}>{name}</span>
        </div>
        <div className="aura-active-kundali-item">
          <Calendar size={12} strokeWidth={2.1} className="aura-active-kundali-ico" aria-hidden="true" />
          <span className="aura-active-kundali-key">तिथि:</span>
          <span className="aura-active-kundali-val tabular-nums">{dob}</span>
        </div>
        <div className="aura-active-kundali-item">
          <Clock size={12} strokeWidth={2.1} className="aura-active-kundali-ico" aria-hidden="true" />
          <span className="aura-active-kundali-key">समय:</span>
          <span className="aura-active-kundali-val tabular-nums">{time}</span>
        </div>
        <div className="aura-active-kundali-item">
          <MapPin size={12} strokeWidth={2.1} className="aura-active-kundali-ico" aria-hidden="true" />
          <span className="aura-active-kundali-key">स्थान:</span>
          <span className="aura-active-kundali-val" title={place}>{place}</span>
        </div>
      </div>
    </div>
  );
}
