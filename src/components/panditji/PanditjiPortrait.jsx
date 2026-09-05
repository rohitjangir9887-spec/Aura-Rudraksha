import React from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";

export function PanditjiPortrait({ handleAskInChat }) {
  return (
    <div className="aura-panditji-content" style={{ padding: 0, minWidth: 0 }}>
      {/* TRADITIONAL PANDITJI PORTRAIT CARD */}
      <div className="aura-panditji-portrait-card" style={{
        background: 'linear-gradient(135deg, #FFFDF8 0%, #FAF2E6 100%)',
        border: '1.5px solid #D4AF37',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: '0 4px 18px rgba(74, 14, 23, 0.06)',
        marginBottom: 10,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background sacred geometric watermarks */}
        <div style={{
          position: 'absolute',
          top: -15,
          right: -15,
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Auspicious Sacred Sanskrit Header Ribbon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '9.5px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: '#8A6014',
          borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
          paddingBottom: 6,
          marginBottom: 8
        }}>
          <span>॥ ॐ नमः शिवाय ॥</span>
          <span style={{ color: '#C89B3C' }}>★ वैदिक पीठ परंपरा ★</span>
          <span>॥ शुभम् करोति ॥</span>
        </div>

        {/* Portrait & Title Header */}
        <div className="aura-panditji-portrait-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          {/* Traditional Panditji Portrait Artwork */}
          <div className="aura-panditji-portrait-circle" style={{
            position: 'relative',
            width: 64,
            height: 64,
            borderRadius: '50%',
            padding: 2,
            background: 'linear-gradient(135deg, #D4AF37 0%, #996515 50%, #F3E5AB 100%)',
            boxShadow: '0 4px 14px rgba(153, 101, 21, 0.35)',
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
                 alt="Acharya Panditji"
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
              {/* High Quality Traditional Panditji Vector Portrait (Fallback) */}
              <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'none' }}>
                <defs>
                  {/* Divine Golden Halo Gradient */}
                  <radialGradient id="divineHalo" cx="50%" cy="40%" r="50%">
                    <stop offset="0%" stopColor="#FFF9E6" />
                    <stop offset="60%" stopColor="#FFD54F" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#FF8F00" stopOpacity="0.1" />
                  </radialGradient>
                  {/* Skin Tone Gradient */}
                  <linearGradient id="skinTone" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F9D7B7" />
                    <stop offset="100%" stopColor="#E0AC7E" />
                  </linearGradient>
                  {/* Saffron Robe Gradient */}
                  <linearGradient id="saffronRobe" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF8A00" />
                    <stop offset="50%" stopColor="#E65100" />
                    <stop offset="100%" stopColor="#BF360C" />
                  </linearGradient>
                  {/* Saffron Turban Gradient */}
                  <linearGradient id="saffronTurban" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFA000" />
                    <stop offset="70%" stopColor="#E65100" />
                    <stop offset="100%" stopColor="#D84315" />
                  </linearGradient>
                </defs>

                {/* 1. Divine Golden Halo */}
                <circle cx="50" cy="42" r="38" fill="url(#divineHalo)" />

                {/* 2. Temple Arch & Rays */}
                <path d="M25 45 Q50 20 75 45" stroke="#FFE082" strokeWidth="1" fill="none" opacity="0.6" />
                <circle cx="50" cy="18" r="1.5" fill="#FFA000" />

                {/* 3. Shoulders & Saffron Angavastram (Vedic Robes) */}
                <path d="M12 92 C14 74 30 68 50 68 C70 68 86 74 88 92 Z" fill="url(#saffronRobe)" />
                {/* Golden border on shawl */}
                <path d="M22 92 C28 78 45 74 50 74 C55 74 72 78 78 92" stroke="#FFD54F" strokeWidth="2.5" fill="none" />
                <path d="M22 92 C28 78 45 74 50 74 C55 74 72 78 78 92" stroke="#B8860B" strokeWidth="0.8" strokeDasharray="2,2" fill="none" />

                {/* 4. Sacred Nepal Rudraksha Kantha Mala (Necklace) */}
                <path d="M34 72 Q50 84 66 72" stroke="none" fill="none" id="malaPath" />
                <circle cx="36" cy="72" r="2.2" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
                <circle cx="41" cy="76" r="2.3" fill="#6E371C" stroke="#DAA520" strokeWidth="0.6" />
                <circle cx="46" cy="78" r="2.4" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
                <circle cx="50" cy="79" r="2.8" fill="#8B4513" stroke="#FFD700" strokeWidth="0.8" />
                <circle cx="54" cy="78" r="2.4" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
                <circle cx="59" cy="76" r="2.3" fill="#6E371C" stroke="#DAA520" strokeWidth="0.6" />
                <circle cx="64" cy="72" r="2.2" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
                {/* Mala Gold Guru Bead Tassel */}
                <path d="M50 81.8 L50 87" stroke="#FFD700" strokeWidth="1.2" />
                <circle cx="50" cy="87.5" r="1.2" fill="#E65100" />

                {/* 5. Neck */}
                <path d="M43 56 L43 68 C43 71 57 71 57 68 L57 56 Z" fill="url(#skinTone)" />

                {/* 6. Face Contour */}
                <ellipse cx="50" cy="46" rx="14" ry="16" fill="url(#skinTone)" />

                {/* 7. Ears with Golden Kundal (Earrings) */}
                <circle cx="35" cy="47" r="3.2" fill="#E0AC7E" />
                <circle cx="65" cy="47" r="3.2" fill="#E0AC7E" />
                <circle cx="35" cy="49" r="1.4" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
                <circle cx="65" cy="49" r="1.4" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />

                {/* 8. White/Grey Beard & Moustache (Wise Vedic Acharya) */}
                <path d="M42 54 Q50 56 58 54 Q50 51 42 54 Z" fill="#E8E8E8" opacity="0.9" />
                <path d="M38 52 C38 64 45 68 50 68 C55 68 62 64 62 52 C58 58 42 58 38 52 Z" fill="#F5F5F5" />
                <path d="M40 54 Q50 65 60 54" stroke="#D6D6D6" strokeWidth="0.8" fill="none" />

                {/* 9. Peaceful Gentle Facial Features */}
                {/* Eyes - Serene & Compassionate */}
                <ellipse cx="44" cy="44" rx="2.5" ry="1.4" fill="#3D2314" />
                <ellipse cx="56" cy="44" rx="2.5" ry="1.4" fill="#3D2314" />
                <circle cx="44.6" cy="43.6" r="0.6" fill="#FFFFFF" />
                <circle cx="56.6" cy="43.6" r="0.6" fill="#FFFFFF" />
                {/* Eyebrows */}
                <path d="M41 41 Q44 39.5 47 41" stroke="#424242" strokeWidth="1.1" strokeLinecap="round" fill="none" />
                <path d="M53 41 Q56 39.5 59 41" stroke="#424242" strokeWidth="1.1" strokeLinecap="round" fill="none" />
                {/* Nose */}
                <path d="M50 42 L48.8 48.5 Q50 50 51.2 48.5" stroke="#BF8050" strokeWidth="0.9" fill="none" />
                {/* Serene Smile */}
                <path d="M46 53 Q50 55.5 54 53" stroke="#8D4528" strokeWidth="1.2" strokeLinecap="round" fill="none" />

                {/* 10. Sacred Chandan-Kumkum Tripundra Tilak on Forehead */}
                {/* White Tripundra lines */}
                <path d="M44 35.5 L56 35.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
                <path d="M43.5 37 L56.5 37" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
                <path d="M44 38.5 L56 38.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
                {/* Red Kumkum / Roli Bindi in center */}
                <circle cx="50" cy="37" r="1.1" fill="#C62828" />

                {/* 11. Traditional Saffron Turban (साफा / Pagri) */}
                <path d="M33 34 C33 22 40 18 50 18 C60 18 67 22 67 34 C63 31 37 31 33 34 Z" fill="url(#saffronTurban)" />
                <path d="M32 33 Q50 25 68 33 Q50 29 32 33 Z" fill="#FFA000" />
                <path d="M35 28 Q50 21 65 28" stroke="#FFD54F" strokeWidth="1.5" fill="none" />
                {/* Turban Ruby/Gold Brooch (कलंगी / शिरोमणि) */}
                <circle cx="50" cy="23" r="2.2" fill="#C62828" stroke="#FFD700" strokeWidth="0.8" />
                <circle cx="50" cy="23" r="0.8" fill="#FFF" />
              </svg>

              {/* Auspicious Online Green Pulse */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#16a34a',
                border: '2.5px solid #FFFFFF',
                boxShadow: '0 0 5px rgba(22, 163, 74, 0.7)'
              }} />
            </div>
          </div>

          {/* Acharya Details */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
              <b style={{ fontSize: '13.5px', color: '#4A0E17', fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 700 }}>
                आचार्य श्री विद्याधर शास्त्री
              </b>
              <span style={{ fontSize: '9px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>
                ● वैदिक ज्योतिषाचार्य
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#7a6850', lineHeight: 1.3 }}>
              काशी-हरिद्वार वैदिक पीठ परंपरा • 30+ वर्ष ज्योतिषीय अनुभव
            </div>
          </div>
        </div>

        {/* Welcoming Panditji Quote */}
        <div className="aura-panditji-quote-box" style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderLeft: '3px solid #D4AF37',
          borderRadius: '0 6px 6px 0',
          padding: '6px 10px',
          marginBottom: 10,
          fontSize: '11.5px',
          color: '#523c2d',
          lineHeight: 1.4,
          fontStyle: 'italic'
        }}>
          "शुभम् करोति कल्याणम्! अपनी जन्म तिथि व संकल्प अनुसार सही रुद्राक्ष धारण करने से ग्रह दोष शांत होते हैं और मनोकामनाएं पूर्ण होती हैं।"
        </div>

        {/* 3 Core Vedic Promises */}
        <div className="aura-panditji-promises-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10.5px', color: '#4A0E17', fontWeight: 600 }}>
            <CheckCircle2 size={13} color="#C89B3C" style={{ flexShrink: 0 }} />
            <span>वैदिक कुंडली गणना</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10.5px', color: '#4A0E17', fontWeight: 600 }}>
            <CheckCircle2 size={13} color="#C89B3C" style={{ flexShrink: 0 }} />
            <span>100% प्राण-प्रतिष्ठित</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10.5px', color: '#4A0E17', fontWeight: 600 }}>
            <CheckCircle2 size={13} color="#C89B3C" style={{ flexShrink: 0 }} />
            <span>शुभ मुहूर्त व विधि</span>
          </div>
        </div>

        {/* Direct Interactive Panditji AI Chat Button */}
        <button
          className="aura-panditji-portrait-btn"
          type="button"
          onClick={() => handleAskInChat("नमस्ते पंडित जी 🙏 मुझे रुद्राक्ष चयन और कुंडली विश्लेषण के बारे में पूर्ण मार्गदर्शन दीजिए।")}
          style={{
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'linear-gradient(135deg, #a54d2b 0%, #7d3318 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 7,
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(165, 77, 43, 0.25)',
            transition: 'all 0.2s'
          }}
        >
          <MessageCircle size={14} />
          <span>पंडित जी से AI चैट करें (निःशुल्क)</span>
        </button>
      </div>

      {/* QUICK 1-ON-1 WHATSAPP LINK */}
      <div className="aura-panditji-whatsapp-card" style={{
        background: '#f7fee7',
        border: '1px solid #bef264',
        borderRadius: 8,
        padding: '8px 12px',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 6
      }}>
        <div style={{ minWidth: 0 }}>
          <b style={{ fontSize: '11.5px', color: '#365314', display: 'block' }}>
            व्यक्तिगत आचार्य से बात करें?
          </b>
          <span style={{ fontSize: '10.5px', color: '#4d7c0f' }}>
            WhatsApp पर 1-on-1 वैदिक परामर्श
          </span>
        </div>
        <a
          href="https://wa.me/919672996531?text=Namaste%20Panditji%2C%20mujhe%20apne%20liye%20sahi%20Rudraksha%20chahiye.%20Kripya%20guidance%20dein."
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#16a34a',
            color: '#ffffff',
            padding: '5px 10px',
            borderRadius: 6,
            fontSize: '11px',
            fontWeight: 700,
            textDecoration: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <MessageCircle size={12} /> WhatsApp
        </a>
      </div>
    </div>
  );
}
