import React from "react";
import { User, Calendar, MapPin, Clock, Compass, Sparkles, ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { CONCERN_OPTIONS } from "./utils";

export function PanditjiForm({
  name, setName,
  dob, setDob,
  birthPlace, setBirthPlace,
  birthTime, setBirthTime,
  concern, setConcern,
  isCalculating,
  handleCalculate
}) {
  return (
    <motion.form
      key="form"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      onSubmit={handleCalculate}
      style={{
        background: 'rgba(255, 253, 249, 0.94)',
        border: '1px solid rgba(200, 155, 60, 0.45)',
        borderRadius: 12,
        padding: '16px 18px',
        boxShadow: '0 4px 16px rgba(74, 14, 23, 0.04)',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px 14px',
        marginBottom: '12px'
      }}>

        {/* 1. NAME FIELD */}
        <div style={{ minWidth: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#4A0E17', marginBottom: '4px', overflowWrap: 'break-word' }}>
            <span style={{ display: 'inline-flex', padding: 2, background: 'rgba(212, 175, 55, 0.15)', borderRadius: 4 }}>
              <User size={12} color="#8A6014" style={{ flexShrink: 0 }} />
            </span>
            <span>आपका पूरा नाम (Name) *</span>
          </label>
          <input
            type="text"
            required
            placeholder="उदा. राहुल शर्मा / Rahul"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="aura-input-field"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1.5px solid #E2D2BC',
              borderRadius: 7,
              background: '#FFFFFF',
              fontSize: '13px',
              color: '#2b170d',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
          />
        </div>

        {/* 2. DATE OF BIRTH FIELD */}
        <div style={{ minWidth: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#4A0E17', marginBottom: '4px', overflowWrap: 'break-word' }}>
            <span style={{ display: 'inline-flex', padding: 2, background: 'rgba(212, 175, 55, 0.15)', borderRadius: 4 }}>
              <Calendar size={12} color="#8A6014" style={{ flexShrink: 0 }} />
            </span>
            <span>जन्म तिथि (DOB) *</span>
          </label>
          <input
            type="date"
            required
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="aura-input-field"
            style={{
              width: '100%',
              padding: '7px 12px',
              border: '1.5px solid #E2D2BC',
              borderRadius: 7,
              background: '#FFFFFF',
              fontSize: '13px',
              color: '#2b170d',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
          />
        </div>

        {/* 3. BIRTH PLACE FIELD */}
        <div style={{ minWidth: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#4A0E17', marginBottom: '4px', overflowWrap: 'break-word' }}>
            <span style={{ display: 'inline-flex', padding: 2, background: 'rgba(212, 175, 55, 0.15)', borderRadius: 4 }}>
              <MapPin size={12} color="#8A6014" style={{ flexShrink: 0 }} />
            </span>
            <span>जन्म स्थान (City / Place) *</span>
          </label>
          <input
            type="text"
            required
            placeholder="उदा. जयपुर / Mumbai"
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            className="aura-input-field"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1.5px solid #E2D2BC',
              borderRadius: 7,
              background: '#FFFFFF',
              fontSize: '13px',
              color: '#2b170d',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
          />
        </div>

        {/* 4. BIRTH TIME (OPTIONAL) */}
        <div style={{ minWidth: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#4A0E17', marginBottom: '4px', overflowWrap: 'break-word' }}>
            <span style={{ display: 'inline-flex', padding: 2, background: 'rgba(212, 175, 55, 0.15)', borderRadius: 4 }}>
              <Clock size={12} color="#8A6014" style={{ flexShrink: 0 }} />
            </span>
            <span>जन्म समय (Time - Optional)</span>
          </label>
          <input
            type="time"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            className="aura-input-field"
            style={{
              width: '100%',
              padding: '7px 12px',
              border: '1.5px solid #E2D2BC',
              borderRadius: 7,
              background: '#FFFFFF',
              fontSize: '13px',
              color: '#2b170d',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
          />
        </div>

      </div>

      {/* 5. PRIMARY GOAL / CONCERN SELECTION */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#4A0E17', marginBottom: '6px' }}>
          <span style={{ display: 'inline-flex', padding: 2, background: 'rgba(212, 175, 55, 0.15)', borderRadius: 4 }}>
            <Compass size={12} color="#8A6014" style={{ flexShrink: 0 }} />
          </span>
          <span>आप किस उद्देश्य / समस्या हेतु रुद्राक्ष धारण करना चाहते हैं?</span>
        </label>
        <select
          value={concern}
          onChange={(e) => setConcern(e.target.value)}
          className="aura-input-field"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1.5px solid #E2D2BC',
            borderRadius: 7,
            background: '#FFFFFF',
            fontSize: '13px',
            color: '#2b170d',
            outline: 'none',
            boxSizing: 'border-box',
            cursor: 'pointer',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease'
          }}
        >
          {CONCERN_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* SUBMIT BUTTON */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <button
          type="submit"
          disabled={isCalculating}
          className="aura-panditji-cta-btn"
          style={{
            width: '100%',
            maxWidth: '340px',
            padding: '11px 20px',
            fontSize: '13px',
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg, #60121D 0%, #4A0E17 50%, #781827 100%)',
            boxShadow: '0 4px 14px rgba(74, 14, 23, 0.28)',
            border: '1px solid #E5C158',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {isCalculating ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>ग्रह नक्षत्रों का विश्लेषण हो रहा है...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>पंडित जी से रुद्राक्ष परामर्श प्राप्त करें</span>
              <ArrowRight size={15} className="aura-cta-arrow" />
            </>
          )}
        </button>

        <span style={{ fontSize: '11px', color: '#7a685b', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(22, 163, 74, 0.07)', border: '1px solid rgba(22, 163, 74, 0.2)', padding: '3px 8px', borderRadius: 6 }}>
          <ShieldCheck size={13} color="#16a34a" /> 100% गोपनीय व प्रामाणिक गणना
        </span>
      </div>
    </motion.form>
  );
}
