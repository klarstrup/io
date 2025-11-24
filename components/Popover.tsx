"use client";
import { useState } from "react";

export default function Popover({
  children,
  control,
  className,
  showBackdrop = true,
}: {
  children: React.ReactNode | React.ReactNode[];
  control: React.ReactNode | React.ReactNode[];
  className?: string;
  showBackdrop?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className || "relative"}>
      <button
        className="z-40 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {control}
      </button>
      {isOpen ? (
        <>
          {children}
          <button
            className={
              "fixed inset-0 z-10 backdrop-blur-xs " +
              (showBackdrop ? "bg-black/50" : "")
            }
            onClick={() => setIsOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}
