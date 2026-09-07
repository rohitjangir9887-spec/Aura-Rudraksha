import React, { useState, useEffect } from "react";

/**
 * AnimatedSalesCounter
 * Renders individual digits rolling from top to bottom in a staggered sequence:
 * e.g., for 456 -> 4 settles first, then 5, then 6, followed by a glowing lock effect!
 */
export function AnimatedSalesCounter({ salesText, salesCount }) {
  const [isReady, setIsReady] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Extract the numeric part and suffix
  const rawString = String(salesText || salesCount || "180");
  const numberMatch = rawString.match(/[\d,]+/);
  const numericString = numberMatch ? numberMatch[0].replace(/,/g, "") : "180";
  const suffix = rawString.replace(/[\d,]+/, "").trim() || "+ Sold";

  const digits = numericString.split("");

  useEffect(() => {
    setIsReady(false);
    setIsCompleted(false);

    const startTimer = setTimeout(() => {
      setIsReady(true);
    }, 150);

    // Total animation time based on number of digits
    const totalDuration = 300 + digits.length * 280 + 400;
    const completeTimer = setTimeout(() => {
      setIsCompleted(true);
    }, totalDuration);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(completeTimer);
    };
  }, [salesText, salesCount]);

  return (
    <div 
      className={`aura-sales-counter-badge ${isCompleted ? "aura-sales-locked" : ""}`}
      title={`${rawString} authentic beads blessed & delivered`}
      id="product-sales-counter-badge"
    >
      <span className="aura-sales-flame-icon">🔥</span>
      
      <span className="aura-sales-digits-wrapper">
        {digits.map((digit, idx) => {
          const targetNum = parseInt(digit, 10);
          const safeNum = isNaN(targetNum) ? 0 : targetNum;
          // Stagger delays: digit 0 at 0.1s, digit 1 at 0.38s, digit 2 at 0.66s, etc.
          const delaySec = 0.1 + idx * 0.28;
          const durationSec = 0.85;

          // Strip of numbers for rolling downward through 0-9 to target
          const strip = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, safeNum];
          const targetIndex = isReady ? strip.length - 1 : 0;

          return (
            <span 
              key={`${idx}-${digit}`} 
              className="aura-sales-digit-slot"
              style={{
                display: "inline-block",
                height: "1.25em",
                lineHeight: "1.25em",
                overflow: "hidden",
                verticalAlign: "middle",
                position: "relative",
                width: "0.65em",
                textAlign: "center"
              }}
            >
              <span
                className="aura-sales-digit-strip"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  transform: `translateY(-${targetIndex * 1.25}em)`,
                  transition: isReady 
                    ? `transform ${durationSec}s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${delaySec}s` 
                    : "none"
                }}
              >
                {strip.map((num, sIdx) => (
                  <span 
                    key={sIdx} 
                    style={{ 
                      height: "1.25em", 
                      lineHeight: "1.25em",
                      fontWeight: "900",
                      fontSize: "13px",
                      color: "#9a3412"
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

      <span className="aura-sales-live-dot" />
    </div>
  );
}
