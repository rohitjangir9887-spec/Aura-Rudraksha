import { useEffect, useRef } from "react";
import { getRevealObserver } from "../lib/MotionObserver";

export function useRevealObserver() {
  const ref = useRef(null);

  useEffect(() => {
    const observer = getRevealObserver();
    const currentRef = ref.current;

    if (observer && currentRef && !currentRef.classList.contains("is-revealed")) {
      observer.observe(currentRef);
    }

    return () => {
      if (observer && currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return ref;
}
