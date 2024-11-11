"use client";
import { useRouter } from "next/navigation";
import { ButtonHTMLAttributes, DetailedHTMLProps } from "react";

export function BackButton(
  props: React.PropsWithChildren<
    DetailedHTMLProps<
      ButtonHTMLAttributes<HTMLButtonElement>,
      HTMLButtonElement
    >
  >,
) {
  const router = useRouter();

  return <button {...props} onClick={() => router.back()} />;
}
