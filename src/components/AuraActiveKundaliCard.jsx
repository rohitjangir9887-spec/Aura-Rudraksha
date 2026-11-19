import React from "react";
import { Calendar, ChevronDown, ChevronUp, Clock, MapPin, Pencil, Trash2, User } from "lucide-react";

export function AuraActiveKundaliCard({
  activeBirthDetails,
  onEdit,
  onDelete,
  collapsed = false,
  onToggleCollapse
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
      className={`aura-active-kundali-card aura-gpu-slide-in ${collapsed ? "is-collapsed" : ""}`}
      role="region"
      aria-label="Active Kundli Profile"
    >
      <div className="aura-active-kundali-header">
        <div
          className="aura-active-kundali-badge-wrap"
          onClick={onToggleCollapse}
          style={onToggleCollapse ? { cursor: "pointer" } : undefined}
        >
          <span className="aura-active-kundali-om" aria-hidden="true">ॐ</span>
          <span className="aura-active-kundali-label">
            ॐ Active Kundli
            {collapsed && (
              <span className="aura-active-kundali-mini-meta">
                {" "}· {name} ({dob})
              </span>
            )}
          </span>
        </div>

        <div className="aura-active-kundali-actions">
          {typeof onToggleCollapse === "function" && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="aura-active-kundali-btn"
              title={collapsed ? "विवरण देखें (Expand)" : "छोटा करें (Minimize)"}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand Active Kundli" : "Collapse Active Kundli"}
            >
              {collapsed ? (
                <>
                  <ChevronDown size={11} strokeWidth={2.3} aria-hidden="true" />
                  <span>देखें</span>
                </>
              ) : (
                <>
                  <ChevronUp size={11} strokeWidth={2.3} aria-hidden="true" />
                  <span>छोटा करें</span>
                </>
              )}
            </button>
          )}
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

      {!collapsed && (
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
      )}
    </div>
  );
}

