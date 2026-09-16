/**
 * Safe, zero-dependency celebratory confetti utility.
 * If canvas-confetti is globally available, it uses it;
 * otherwise it creates a lightweight, beautiful DOM-based celebration
 * that automatically cleans itself up. Never crashes the application.
 */
export function fireConfetti(options = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  try {
    if (typeof window.confetti === "function") {
      window.confetti(options);
      return;
    }
  } catch (_) {}

  try {
    const particleCount = options.particleCount || 60;
    const colors = options.colors || ["#b85d25", "#d97706", "#22c55e", "#166534", "#f59e0b", "#ec4899", "#8b5cf6"];
    
    // Inject animation keyframes if not already present
    const styleId = "aura-confetti-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes auraConfettiFall {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--x-end), var(--y-end), 0) rotate(var(--rot-end)) scale(0.6);
          }
        }
      `;
      document.head.appendChild(style);
    }

    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    Object.assign(container.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "99999",
      overflow: "hidden"
    });

    const startX = window.innerWidth * 0.5;
    const startY = window.innerHeight * (options.origin?.y ?? 0.5);

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div");
      const color = colors[i % colors.length];
      const size = 6 + Math.random() * 6;
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.4 - 0.2);
      const velocity = 80 + Math.random() * 220;
      const xEnd = Math.cos(angle) * velocity;
      const yEnd = Math.sin(angle) * velocity + 150;
      const rotEnd = (Math.random() * 720 - 360) + "deg";
      const duration = 1.2 + Math.random() * 1.4;

      p.style.setProperty("--x-end", `${xEnd}px`);
      p.style.setProperty("--y-end", `${yEnd}px`);
      p.style.setProperty("--rot-end", rotEnd);

      Object.assign(p.style, {
        position: "absolute",
        left: `${startX}px`,
        top: `${startY}px`,
        width: `${size}px`,
        height: `${size * (Math.random() > 0.5 ? 1 : 1.6)}px`,
        backgroundColor: color,
        borderRadius: Math.random() > 0.6 ? "50%" : "2px",
        opacity: "1",
        animation: `auraConfettiFall ${duration}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
        animationDelay: `${Math.random() * 0.15}s`
      });

      container.appendChild(p);
    }

    document.body.appendChild(container);

    setTimeout(() => {
      try {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      } catch (_) {}
    }, 3200);
  } catch (_) {
    // Fail-safe
  }
}

export default fireConfetti;
