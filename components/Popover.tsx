"use client";
import { useState } from "react";

export default function Popover({
  children,
  control,
  className,
}: {
  children: React.ReactNode | React.ReactNode[];
  control: React.ReactNode | React.ReactNode[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className || "relative"}>
      <button className="z-40" onClick={() => setIsOpen(!isOpen)}>
        {control}
      </button>
      {isOpen ? (
        <>
          {children}
          <button
            className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}
