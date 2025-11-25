"use client";
import { useEffect, useRef } from "react";

export function ScrollToMe() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }, []);

  return <div ref={ref} className="relative -top-18" />;
}
