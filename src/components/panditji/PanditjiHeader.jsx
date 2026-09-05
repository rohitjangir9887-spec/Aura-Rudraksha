import React from "react";
import { Sparkles, MessageCircle } from "lucide-react";

export function PanditjiHeader({ handleAskInChat }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 18,
      paddingBottom: 14,
      borderBottom: '1px solid rgba(200, 155, 60, 0.25)',
      position: 'relative',
      zIndex: 4
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {/* Pandit Ji Photo / Avatar with Divine Halo */}
        <div style={{
          position: 'relative',
          width: 64,
          height: 64,
          borderRadius: '50%',
          padding: 2,
          background: 'linear-gradient(135deg, #D4AF37 0%, #8A6014 50%, #E5C158 100%)',
          boxShadow: '0 3px 12px rgba(138, 96, 20, 0.35)',
          flexShrink: 0
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'radial-gradient(circle, #ffe8cc 0%, #fbd5a5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {/* PNG Image Source with fallback to SVG */}
            <img
              src="https://i.ibb.co/XxDccpPX/file-0000000089808211b252c5213cf8063e.png"
              alt="Aura Panditji"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement.querySelector('svg');
                if (fallback) fallback.style.display = 'block';
              }}
              referrerPolicy="no-referrer"
            />
            {/* High Definition Vedic Acharya Icon (Fallback) */}
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'none' }}>
              <defs>
                <radialGradient id="headerHalo" cx="50%" cy="40%" r="50%">
                  <stop offset="0%" stopColor="#FFF9E6" />
                  <stop offset="60%" stopColor="#FFD54F" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#FF8F00" stopOpacity="0.2" />
                </radialGradient>
                <linearGradient id="headerSkin" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F9D7B7" />
                  <stop offset="100%" stopColor="#E0AC7E" />
                </linearGradient>
                <linearGradient id="headerRobe" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF8A00" />
                  <stop offset="50%" stopColor="#E65100" />
                  <stop offset="100%" stopColor="#BF360C" />
                </linearGradient>
                <linearGradient id="headerTurban" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFA000" />
                  <stop offset="70%" stopColor="#E65100" />
                  <stop offset="100%" stopColor="#D84315" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="42" r="38" fill="url(#headerHalo)" />
              <path d="M12 92 C14 74 30 68 50 68 C70 68 86 74 88 92 Z" fill="url(#headerRobe)" />
              <path d="M22 92 C28 78 45 74 50 74 C55 74 72 78 78 92" stroke="#FFD54F" strokeWidth="2.2" fill="none" />
              <circle cx="36" cy="72" r="2.2" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
              <circle cx="43" cy="77" r="2.4" fill="#6E371C" stroke="#DAA520" strokeWidth="0.6" />
              <circle cx="50" cy="79" r="2.8" fill="#8B4513" stroke="#FFD700" strokeWidth="0.8" />
              <circle cx="57" cy="77" r="2.4" fill="#6E371C" stroke="#DAA520" strokeWidth="0.6" />
              <circle cx="64" cy="72" r="2.2" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
              <path d="M43 56 L43 68 C43 71 57 71 57 68 L57 56 Z" fill="url(#headerSkin)" />
              <ellipse cx="50" cy="46" rx="14" ry="16" fill="url(#headerSkin)" />
              <circle cx="35" cy="47" r="3.2" fill="#E0AC7E" />
              <circle cx="65" cy="47" r="3.2" fill="#E0AC7E" />
              <path d="M38 52 C38 64 45 68 50 68 C55 68 62 64 62 52 C58 58 42 58 38 52 Z" fill="#F5F5F5" />
              <ellipse cx="44" cy="44" rx="2.5" ry="1.4" fill="#3D2314" />
              <ellipse cx="56" cy="44" rx="2.5" ry="1.4" fill="#3D2314" />
              <path d="M41 41 Q44 39.5 47 41" stroke="#424242" strokeWidth="1.1" strokeLinecap="round" fill="none" />
              <path d="M53 41 Q56 39.5 59 41" stroke="#424242" strokeWidth="1.1" strokeLinecap="round" fill="none" />
              <path d="M50 42 L48.8 48.5 Q50 50 51.2 48.5" stroke="#BF8050" strokeWidth="0.9" fill="none" />
              <path d="M46 53 Q50 55.5 54 53" stroke="#8D4528" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              <path d="M44 35.5 L56 35.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
              <path d="M43.5 37 L56.5 37" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
              <path d="M44 38.5 L56 38.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
              <circle cx="50" cy="37" r="1.1" fill="#C62828" />
              <path d="M33 34 C33 22 40 18 50 18 C60 18 67 22 67 34 C63 31 37 31 33 34 Z" fill="url(#headerTurban)" />
              <circle cx="50" cy="23" r="2.2" fill="#C62828" stroke="#FFD700" strokeWidth="0.8" />
            </svg>
          </div>
          {/* Online indicator */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#16a34a',
            border: '2.5px solid #FFFDF9',
            boxShadow: '0 0 6px rgba(22, 163, 74, 0.7)'
          }} />
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="aura-panditji-badge" style={{ margin: 0, padding: '2px 8px', fontSize: '9.5px', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(74, 14, 23, 0.08) 100%)', border: '1px solid rgba(200, 155, 60, 0.45)' }}>
              <Sparkles size={11} className="aura-panditji-badge-icon" />
              AURA VEDIC AI ASTROLOGER
            </span>
            <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 700, background: '#dcfce7', border: '1px solid #bbf7d0', padding: '1px 7px', borderRadius: 10 }}>
              ● लाइव निशुल्क परामर्श
            </span>
          </div>
          <h2 style={{
            color: '#4A0E17',
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 'clamp(18px, 3.5vw, 22px)',
            fontWeight: 700,
            margin: '3px 0 0 0',
            lineHeight: 1.25,
            wordBreak: 'break-word'
          }}>
            अपनी जन्म कुंडली अनुसार जानिए सही रुद्राक्ष
          </h2>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#665548', maxWidth: '380px', lineHeight: 1.35 }}>
          नाम, जन्म तिथि (DOB) और जन्म स्थान दर्ज करें — वैदिक ज्योतिष के आधार पर पंडित जी बताएंगे सर्वोत्तम रुद्राक्ष।
        </p>
        <button
          type="button"
          onClick={() => handleAskInChat("नमस्ते पंडित जी 🙏 मुझे रुद्राक्ष चयन और कुंडली विश्लेषण के बारे में मार्गदर्शन दीजिए।")}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'linear-gradient(135deg, #FFF8EC 0%, #FEEFD8 100%)',
            border: '1px solid #d4af37',
            color: '#78350f',
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(212, 175, 55, 0.2)',
            transition: 'all 0.2s'
          }}
        >
          <MessageCircle size={13} color="#a54d2b" />
          <span>पंडित जी से चैट करें</span>
        </button>
      </div>
    </div>
  );
}
