"use client";
import { useState } from "react";

export function DiaryAgendaDayCreateExpander({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isActive, setIsActive] = useState(false);

  return (
    <div
      className={
        "relative flex items-center gap-1 " +
        (isActive ? "rounded-b-none" : "cursor-pointer")
      }
    >
      <button
        className={
          "cursor-pointer rounded-md px-1 py-0.5 pr-1 text-xs font-semibold shadow-sm " +
          (isActive ? "bg-gray-200" : "bg-[#ff0]")
        }
        onClick={() => setIsActive(!isActive)}
      >
        <div
          className={
            "rotate-0 transform text-xs transition-all " +
            (isActive ? "rotate-45 transform" : "")
          }
        >
          ➕
        </div>
      </button>
      {isActive && children}
    </div>
  );
}
