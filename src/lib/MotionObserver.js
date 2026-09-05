// A lightweight observer for performance-friendly scroll reveals
// Using a singleton IntersectionObserver for the entire app.

let observer = null;

export function getRevealObserver() {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) return null;

  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            // Stop observing once revealed for performance
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -50px 0px",
        threshold: 0.1,
      }
    );
  }
  return observer;
}

// For non-React or simple static initialization
export function initStaticRevealObserver() {
  const obs = getRevealObserver();
  if (!obs) return;

  const elements = document.querySelectorAll(
    ".reveal-up:not(.is-revealed), .reveal-fade:not(.is-revealed), .reveal-stagger:not(.is-revealed)"
  );
  elements.forEach((el) => obs.observe(el));
}
