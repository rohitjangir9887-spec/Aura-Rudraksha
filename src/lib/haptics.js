/**
 * Modern Web Haptic Feedback Utility for Aura Rudraksha
 * 
 * Provides subtle, non-intrusive tactile vibration feedback on supported mobile devices
 * (Chrome, Android, Edge, iOS 17.4+ WebKit touch). Falls back gracefully and silently
 * on unsupported browsers and desktop platforms.
 */

export function triggerHaptic(type = "light") {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  try {
    switch (type) {
      case "selection":
        // Ultra-subtle tick (8ms) when tapping variant chips, mukhi pills, tabs, origin switches
        navigator.vibrate(8);
        break;

      case "light":
        // Crisp gentle tap (12ms) when toggling search, opening drawers, floating launcher
        navigator.vibrate(12);
        break;

      case "medium":
        // Noticeable tactile confirmation (20ms) when adding to cart, sending a chat message, clicking Buy Now
        navigator.vibrate(20);
        break;

      case "success":
        // Rhythmic double-pulse [15ms, 40ms pause, 20ms] on successful order confirmation, coupon applied, wishlist added
        navigator.vibrate([15, 40, 20]);
        break;

      case "warning":
      case "error":
        // Distinct alert pattern [30ms, 50ms pause, 20ms, 50ms pause, 30ms] for coupon error or form validation
        navigator.vibrate([30, 50, 20, 50, 30]);
        break;

      default:
        navigator.vibrate(10);
    }
  } catch (_) {
    // Silent fail-safe: never throw or block UI
  }
}

/**
 * Attaches a lightweight, battery-friendly global touch listener that provides
 * subtle native tactile feedback on interactive buttons, cards, pills, and links.
 */
let globalTouchInitialized = false;
export function setupGlobalTouchFeedback() {
  if (typeof window === "undefined" || globalTouchInitialized) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

  globalTouchInitialized = true;
  let lastHapticTimestamp = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let isScrolling = false;

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isScrolling = false;
  };

  const handleTouchMove = (e) => {
    if (isScrolling || !e.touches || e.touches.length !== 1) return;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
    // Movement over 8px indicates a scroll gesture, not a stationary tap
    if (deltaX > 8 || deltaY > 8) {
      isScrolling = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (isScrolling) return; // Strict zero vibration when scrolling
    try {
      const target = e.target?.closest?.(
        'button, [role="button"], .primary-btn, .outline-btn, .pill, .chip, .tab-btn, input[type="radio"], input[type="checkbox"], .aura-card-wish-btn'
      );
      if (!target) return;

      const now = Date.now();
      // Throttle to 180ms to prevent duplicate vibrations on rapid consecutive taps
      if (now - lastHapticTimestamp < 180) return;
      lastHapticTimestamp = now;

      triggerHaptic("selection");
    } catch (_) {}
  };

  window.addEventListener("touchstart", handleTouchStart, { passive: true });
  window.addEventListener("touchmove", handleTouchMove, { passive: true });
  window.addEventListener("touchend", handleTouchEnd, { passive: true });
}

