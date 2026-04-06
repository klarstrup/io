"use client";
import { useEffect } from "react";
import { useInView } from "../hooks";

export function ShyGuy({ onSeen }: { onSeen: () => void }) {
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView) onSeen();
  }, [inView, onSeen]);

  return <div ref={ref} />;
}
