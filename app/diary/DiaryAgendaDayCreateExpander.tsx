"use client";
import { useState } from "react";

export function DiaryAgendaDayCreateExpander({
  children,
  inactiveButtonClassName,
}: {
  children: React.ReactNode;
  inactiveButtonClassName?: string;
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
          "flex h-5 w-5 cursor-pointer items-center justify-center rounded-lg leading-0 font-semibold shadow-sm " +
          (isActive ? "bg-gray-200" : inactiveButtonClassName || "bg-[#ff0]")
        }
        onClick={() => setIsActive(!isActive)}
      >
        <div
          className={
            "origin-center rotate-0 transform text-xs transition-all " +
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
