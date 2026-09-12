import React, { useState, useEffect, lazy, Suspense } from "react";
import { auraChatStore } from "../lib/auraChatStore";

const AuraAIFloatingLazy = lazy(() =>
  import("./AuraAIFloating").then((m) => ({ default: m.AuraAIFloating }))
);

/**
 * DeferredAuraAIFloating
 * Defers loading and mounting the heavy Aura AI chat assistant until after initial
 * page hydration and idle callback (or on user interaction), maximizing mobile LCP & TBT.
 */
export function DeferredAuraAIFloating() {
  const [shouldMount, setShouldMount] = useState(() => {
    // If the chat was already opened in a previous navigation or state, mount immediately
    return Boolean(auraChatStore.isFloatingOpen());
  });

  useEffect(() => {
    if (shouldMount) return;

    let timerId;
    let idleId;

    const triggerMount = () => {
      setShouldMount(true);
      cleanup();
    };

    // Trigger on any user interaction or custom event
    const handleInteraction = () => {
      triggerMount();
    };

    const cleanup = () => {
      if (timerId) clearTimeout(timerId);
      if (idleId && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("aura_ai_trigger_chat", handleInteraction);
      window.removeEventListener("aura_ai_trigger_chat_preload", handleInteraction);
    };

    window.addEventListener("aura_ai_trigger_chat", handleInteraction, { once: true });
    window.addEventListener("aura_ai_trigger_chat_preload", handleInteraction, { once: true });
    window.addEventListener("scroll", handleInteraction, { passive: true, once: true });
    window.addEventListener("touchstart", handleInteraction, { passive: true, once: true });
    window.addEventListener("mousemove", handleInteraction, { passive: true, once: true });

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => {
        timerId = setTimeout(triggerMount, 2000);
      }, { timeout: 4000 });
    } else {
      timerId = setTimeout(triggerMount, 2500);
    }

    return cleanup;
  }, [shouldMount]);

  if (!shouldMount) return null;

  return (
    <Suspense fallback={null}>
      <AuraAIFloatingLazy />
    </Suspense>
  );
}
