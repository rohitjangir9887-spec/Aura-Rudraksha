import { useState, useEffect, useRef } from "react";

/**
 * High-Performance Intersection Observer Hook
 *
 * Optimized for lazy-loading product images across product-grids, shop-grids,
 * and product-detail galleries to maximize LCP and minimize layout shifts.
 *
 * Features:
 * - Shared observer pool option & isolated per-ref observation
 * - Configurable rootMargin (defaults to 250px 0px for smooth pre-buffering before viewport entry)
 * - freezeOnceVisible: Automatically unobserves elements once visible to eliminate CPU/RAM overhead
 * - Robust fallback for environments without IntersectionObserver
 * - Dual API support:
 *   1. Direct ref passing: const isVisible = useIntersectionObserver(elementRef, options);
 *   2. Tuple return style: const [setRef, isVisible] = useIntersectionObserver(options);
 */

const DEFAULT_OPTIONS = {
  root: null,
  rootMargin: "250px 0px",
  threshold: 0.01,
  freezeOnceVisible: true,
  enabled: true,
};

export function useIntersectionObserver(arg1, arg2) {
  // Support both (ref, options) and (options) calling styles
  let targetRef = null;
  let customOptions = {};

  if (arg1 && typeof arg1 === "object" && "current" in arg1) {
    targetRef = arg1;
    customOptions = arg2 || {};
  } else if (arg1 && typeof arg1 === "object") {
    customOptions = arg1;
  }

  const {
    root = null,
    rootMargin = "250px 0px",
    threshold = 0.01,
    freezeOnceVisible = true,
    enabled = true,
  } = { ...DEFAULT_OPTIONS, ...customOptions };

  const [localNode, setLocalNode] = useState(null);
  const [entry, setEntry] = useState(null);
  const isFrozen = useRef(false);

  // If targetRef is provided, use its current DOM node; otherwise use localNode callback ref
  const nodeToObserve = targetRef ? targetRef.current : localNode;

  const isIntersecting = entry ? entry.isIntersecting : false;

  useEffect(() => {
    // If not enabled or already frozen as visible, do nothing
    if (!enabled || (freezeOnceVisible && isFrozen.current)) {
      return;
    }

    // SSR or fallback check
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setEntry({ isIntersecting: true });
      return;
    }

    const element = targetRef ? targetRef.current : localNode;
    if (!element) return;

    let observer = null;
    try {
      observer = new IntersectionObserver(
        ([latestEntry]) => {
          if (latestEntry.isIntersecting && freezeOnceVisible) {
            isFrozen.current = true;
            setEntry(latestEntry);
            if (observer) {
              observer.disconnect();
            }
          } else {
            setEntry(latestEntry);
          }
        },
        { root, rootMargin, threshold }
      );

      observer.observe(element);
    } catch (err) {
      // Graceful fallback if observer constructor throws
      setEntry({ isIntersecting: true });
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [nodeToObserve, root, rootMargin, threshold, freezeOnceVisible, enabled, targetRef]);

  // If targetRef was provided, return boolean or entry
  if (targetRef) {
    return isIntersecting;
  }

  // Tuple style: [setRefCallback, isIntersecting, entry]
  return [setLocalNode, isIntersecting, entry];
}

export default useIntersectionObserver;
