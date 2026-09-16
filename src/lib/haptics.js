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
