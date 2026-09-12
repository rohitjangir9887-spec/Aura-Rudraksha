import React from "react";

export function PanditjiPortraitSVG() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block" }}>
      <defs>
        <radialGradient id="bioHalo" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FFF9E6" />
          <stop offset="60%" stopColor="#FFD54F" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FF8F00" stopOpacity="0.1" />
        </radialGradient>
        <linearGradient id="bioSkinTone" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F9D7B7" />
          <stop offset="100%" stopColor="#E0AC7E" />
        </linearGradient>
        <linearGradient id="bioSaffronRobe" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF8A00" />
          <stop offset="50%" stopColor="#E65100" />
          <stop offset="100%" stopColor="#BF360C" />
        </linearGradient>
        <linearGradient id="bioSaffronTurban" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFA000" />
          <stop offset="70%" stopColor="#E65100" />
          <stop offset="100%" stopColor="#D84315" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="42" r="38" fill="url(#bioHalo)" />
      <path d="M25 45 Q50 20 75 45" stroke="#FFE082" strokeWidth="1" fill="none" opacity="0.6" />

      <path d="M12 92 C14 74 30 68 50 68 C70 68 86 74 88 92 Z" fill="url(#bioSaffronRobe)" />
      <path d="M22 92 C28 78 45 74 50 74 C55 74 72 78 78 92" stroke="#FFD54F" strokeWidth="2.5" fill="none" />

      <circle cx="36" cy="72" r="2.2" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
      <circle cx="41" cy="76" r="2.3" fill="#6E371C" stroke="#DAA520" strokeWidth="0.6" />
      <circle cx="46" cy="78" r="2.4" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
      <circle cx="50" cy="79" r="2.8" fill="#8B4513" stroke="#FFD700" strokeWidth="0.8" />
      <circle cx="54" cy="78" r="2.4" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />
      <circle cx="59" cy="76" r="2.3" fill="#6E371C" stroke="#DAA520" strokeWidth="0.6" />
      <circle cx="64" cy="72" r="2.2" fill="#5D2E16" stroke="#DAA520" strokeWidth="0.6" />

      <path d="M43 56 L43 68 C43 71 57 71 57 68 L57 56 Z" fill="url(#bioSkinTone)" />
      <ellipse cx="50" cy="46" rx="14" ry="16" fill="url(#bioSkinTone)" />

      <circle cx="35" cy="47" r="3.2" fill="#E0AC7E" />
      <circle cx="65" cy="47" r="3.2" fill="#E0AC7E" />
      <circle cx="35" cy="49" r="1.4" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
      <circle cx="65" cy="49" r="1.4" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />

      <path d="M42 54 Q50 56 58 54 Q50 51 42 54 Z" fill="#E8E8E8" opacity="0.9" />
      <path d="M38 52 C38 64 45 68 50 68 C55 68 62 64 62 52 C58 58 42 58 38 52 Z" fill="#F5F5F5" />

      <ellipse cx="44" cy="44" rx="2.5" ry="1.4" fill="#3D2314" />
      <ellipse cx="56" cy="44" rx="2.5" ry="1.4" fill="#3D2314" />
      <circle cx="44.6" cy="43.6" r="0.6" fill="#FFFFFF" />
      <circle cx="56.6" cy="43.6" r="0.6" fill="#FFFFFF" />

      <path d="M41 41 Q44 39.5 47 41" stroke="#424242" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <path d="M53 41 Q56 39.5 59 41" stroke="#424242" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <path d="M50 42 L48.8 48.5 Q50 50 51.2 48.5" stroke="#BF8050" strokeWidth="0.9" fill="none" />
      <path d="M46 53 Q50 55.5 54 53" stroke="#8D4528" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      <path d="M44 35.5 L56 35.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M43.5 37 L56.5 37" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M44 38.5 L56 38.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="50" cy="37" r="1.1" fill="#C62828" />

      <path d="M33 34 C33 22 40 18 50 18 C60 18 67 22 67 34 C63 31 37 31 33 34 Z" fill="url(#bioSaffronTurban)" />
      <path d="M35 28 Q50 21 65 28" stroke="#FFD54F" strokeWidth="1.5" fill="none" />
      <circle cx="50" cy="23" r="2.2" fill="#C62828" stroke="#FFD700" strokeWidth="0.8" />
    </svg>
  );
}
