"use client";
import { useEffect, useRef } from "react";
import { useInView } from "../hooks";

export function ShyGuy({
  onSeen,
  requireScroll,
}: {
  onSeen: () => unknown;
  requireScroll?: boolean;
}) {
  const { ref, inView } = useInView({ rootMargin: "24px" });

  const onSeenPromiseRef = useRef<Promise<unknown> | null>(null);
  const lastScrolledTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      lastScrolledTimestampRef.current = Date.now();
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (onSeenPromiseRef.current) return;

    if (
      inView &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      (!requireScroll ||
        !lastScrolledTimestampRef.current ||
        // The user must have scrolled within the last 100ms to consider the element "seen",
        // this is to avoid onSeen happening because of changes to the page unrelated to interaction with the user
        Date.now() - lastScrolledTimestampRef.current < 100)
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
