"use client";
import { useRef, useState } from "react";
import { useClickOutside } from "../hooks";

export default function Popover({
  children,
  control,
  className,
}: {
  children: React.ReactNode | React.ReactNode[];
  control: React.ReactNode | React.ReactNode[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  useClickOutside(ref, () => setIsOpen(false));

  return (
    <div className={className} ref={ref}>
      <button
        className="z-40 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {control}
      </button>
      {isOpen ? children : null}
    </div>
  );
}
