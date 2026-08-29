import React, { useState, useEffect } from "react";

export function Countdown({ targetDate, onExpire = null, showDays = true, compact = false, colorScheme = "dark" }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!targetDate) return { d: 0, h: 0, m: 0, s: 0, expired: true };
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0 || isNaN(diff)) return { d: 0, h: 0, m: 0, s: 0, expired: true };
    return {
      d: Math.floor(diff / (1000 * 60 * 60 * 24)),
      h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      m: Math.floor((diff % (1000 * 60)) / (1000 * 60)),
      s: Math.floor((diff % (1000 * 60)) / 1000),
      expired: false
    };
  });

  useEffect(() => {
    if (!targetDate) return;

    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0 || isNaN(diff)) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, expired: true });
        if (onExpire) onExpire();
        return;
      }

      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (timeLeft.expired) {
    return null;
  }

  const pad = (n) => String(n).padStart(2, "0");

  const isLight = colorScheme === "light";
  const bgBox = isLight ? "rgba(255, 255, 255, 0.2)" : "#2b170d";
  const textColor = isLight ? "#ffffff" : "#fbf5ef";
  const labelColor = isLight ? "#f5c382" : "#c89b3c";

  if (compact) {
    return (
      <div className="aura-countdown-compact" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 700 }}>
        {timeLeft.d > 0 && <span>{pad(timeLeft.d)}d : </span>}
        <span>{pad(timeLeft.h)}h : {pad(timeLeft.m)}m : {pad(timeLeft.s)}s</span>
      </div>
    );
  }

  return (
    <div className="aura-live-countdown" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span style={{ fontSize: "11px", color: labelColor, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
        Ends In:
      </span>
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        {(showDays || timeLeft.d > 0) && (
          <>
            <div style={{ background: bgBox, color: textColor, padding: "3px 6px", borderRadius: "5px", textAlign: "center", minWidth: "26px", border: "1px solid rgba(200, 155, 60, 0.3)" }}>
              <b style={{ fontSize: "12px", display: "block", lineHeight: 1.1 }}>{pad(timeLeft.d)}</b>
              <span style={{ fontSize: "7px", color: labelColor, textTransform: "uppercase", display: "block" }}>DAYS</span>
            </div>
            <span style={{ color: labelColor, fontWeight: 700, fontSize: "12px" }}>:</span>
          </>
        )}

        <div style={{ background: bgBox, color: textColor, padding: "3px 6px", borderRadius: "5px", textAlign: "center", minWidth: "26px", border: "1px solid rgba(200, 155, 60, 0.3)" }}>
          <b style={{ fontSize: "12px", display: "block", lineHeight: 1.1 }}>{pad(timeLeft.h)}</b>
          <span style={{ fontSize: "7px", color: labelColor, textTransform: "uppercase", display: "block" }}>HRS</span>
        </div>
        <span style={{ color: labelColor, fontWeight: 700, fontSize: "12px" }}>:</span>

        <div style={{ background: bgBox, color: textColor, padding: "3px 6px", borderRadius: "5px", textAlign: "center", minWidth: "26px", border: "1px solid rgba(200, 155, 60, 0.3)" }}>
          <b style={{ fontSize: "12px", display: "block", lineHeight: 1.1 }}>{pad(timeLeft.m)}</b>
          <span style={{ fontSize: "7px", color: labelColor, textTransform: "uppercase", display: "block" }}>MIN</span>
        </div>
        <span style={{ color: labelColor, fontWeight: 700, fontSize: "12px" }}>:</span>

        <div style={{ background: bgBox, color: textColor, padding: "3px 6px", borderRadius: "5px", textAlign: "center", minWidth: "26px", border: "1px solid rgba(200, 155, 60, 0.3)" }}>
          <b style={{ fontSize: "12px", display: "block", lineHeight: 1.1 }}>{pad(timeLeft.s)}</b>
          <span style={{ fontSize: "7px", color: labelColor, textTransform: "uppercase", display: "block" }}>SEC</span>
        </div>
      </div>
    </div>
  );
}
