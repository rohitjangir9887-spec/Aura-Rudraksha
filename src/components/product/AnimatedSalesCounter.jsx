import React, { useState, useEffect, useMemo } from "react";

const SLOT_HEIGHT = 20; // Exact pixel height for slot and digits to prevent any clipping or font drift
const FONT_SIZE = 13;   // Clean bold monospace digit size

/**
 * AnimatedSalesCounter
 * Renders individual digits rolling from top to bottom in a staggered slot-reel sequence:
 * e.g., for 456 -> 4 settles first, then 5, then 6, followed by an amber lock glow.
 * Supports any number of digits (e.g. 12,344 or 456) with dynamic badge auto-expansion and zero clipping.
 */
export function AnimatedSalesCounter({ salesText, salesCount }) {
  const [isReady, setIsReady] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Extract raw string and separate numeric digits from suffix
  const rawString = String(salesText || (salesCount ? `${salesCount}+ Sold` : "180+ Sold")).trim();
  
  // Extract all contiguous digits or digits with commas
  const numberMatch = rawString.match(/[\d,]+/);
  const numericString = numberMatch 
    ? numberMatch[0].replace(/,/g, "") 
    : (salesCount ? String(salesCount) : "180");
  
  // Extract remaining suffix (e.g. "+ Sold", "Sold", "orders")
  const suffix = rawString.replace(/[\d,]+/, "").trim() || "+ Sold";

  // Individual digit characters
  const digits = useMemo(() => {
    const arr = numericString.split("").filter(ch => /\d/.test(ch));
    return arr.length > 0 ? arr : ["1", "8", "0"];
  }, [numericString]);

  useEffect(() => {
    setIsReady(false);
    setIsCompleted(false);

    // Short mount delay before trigger roll
    const startTimer = setTimeout(() => {
      setIsReady(true);
    }, 120);

    // Calculate total duration based on digit count (staggered delay + transition)
    const totalDuration = 200 + digits.length * 200 + 750;
    const completeTimer = setTimeout(() => {
      setIsCompleted(true);
    }, totalDuration);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(completeTimer);
    };
  }, [salesText, salesCount, numericString, digits.length]);

  return (
    <div 
      className={`aura-sales-counter-badge ${isCompleted ? "aura-sales-locked" : ""}`}
      title={`${numericString} authentic items blessed & delivered`}
      id="product-sales-counter-badge"
    >
      <span className="aura-sales-flame-icon" aria-hidden="true">🔥</span>
      
      <span className="aura-sales-digits-wrapper" aria-label={`${numericString} sold`}>
        {digits.map((digit, idx) => {
          const targetNum = parseInt(digit, 10);
          const safeNum = isNaN(targetNum) ? 0 : targetNum;

          // Staggered roll delay: digit 0 at 0.08s, digit 1 at 0.24s, digit 2 at 0.40s, etc.
          const delaySec = 0.08 + idx * 0.16;
          const durationSec = 0.75;

          // The strip begins at 0 and rolls sequentially through numbers ending on safeNum
          // [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, safeNum] has safeNum strictly at index 10 (length - 1)
          const strip = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, safeNum];
          const targetIndex = isReady ? strip.length - 1 : 0;

          return (
            <span 
              key={`${idx}-${digit}-${numericString}`} 
              className="aura-sales-digit-slot"
              style={{
                display: "inline-block",
                height: `${SLOT_HEIGHT}px`,
                lineHeight: `${SLOT_HEIGHT}px`,
                overflow: "hidden",
                verticalAlign: "middle",
                position: "relative",
                width: "auto",
                minWidth: "9.5px",
                textAlign: "center",
                boxSizing: "border-box",
                margin: "0 0.5px"
              }}
            >
              <span
                className="aura-sales-digit-strip"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  transform: `translateY(-${targetIndex * SLOT_HEIGHT}px)`,
                  transition: isReady 
                    ? `transform ${durationSec}s cubic-bezier(0.18, 0.89, 0.32, 1.15) ${delaySec}s` 
                    : "none",
                  willChange: "transform"
                }}
              >
                {strip.map((num, sIdx) => (
                  <span 
                    key={sIdx} 
                    style={{ 
                      height: `${SLOT_HEIGHT}px`, 
                      lineHeight: `${SLOT_HEIGHT}px`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "900",
                      fontSize: `${FONT_SIZE}px`,
                      color: "#9a3412",
                      boxSizing: "border-box",
                      margin: 0,
                      padding: 0
                    }}
                  >
                    {num}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>

      <span className="aura-sales-badge-suffix">
        {suffix.startsWith("+") ? suffix : ` ${suffix}`}
      </span>

      <span className="aura-sales-live-dot" aria-hidden="true" />
    </div>
  );
}

