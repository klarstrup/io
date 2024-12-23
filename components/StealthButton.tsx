import type { ButtonHTMLAttributes, ReactNode } from "react";

export function StealthButton({
  children,
  ...props
}: {
  children?: ReactNode;
  onClick: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      style={{
        fontSize: "inherit",
        appearance: "none",
        backgroundColor: "transparent",
        border: "none",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.5 : props.style?.opacity,
        padding: 0,
        color: "inherit",
        lineHeight: "inherit",
        fontWeight: "inherit",
        display: "inline",
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}
