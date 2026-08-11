"use client";
import { useEffect, useRef } from "react";
import { useInView } from "../hooks";

export function ShyGuy({ onSeen }: { onSeen: () => unknown }) {
  const { ref, inView } = useInView({ rootMargin: "24px" });

  const onSeenPromiseRef = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    if (onSeenPromiseRef.current) return;

    if (
      inView &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
    ) {
      const prom = onSeen();
      if (prom && prom instanceof Promise) {
        onSeenPromiseRef.current = prom.finally(() => {
          onSeenPromiseRef.current = null;
        });
      }
    }
  }, [inView, onSeen]);

  return <div ref={ref} />;
}
