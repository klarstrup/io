"use client";
import { addDays, subDays } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useEvent } from "../../../hooks";
import { dateToString } from "../../../utils";

export function KeyHandler({ date }: { date: string }) {
  const router = useRouter();
  const handleKeydown = useEvent((e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      router.push(`/diary/${dateToString(subDays(new Date(date), 1))}`);
    }

    if (e.key === "ArrowRight") {
      router.push(`/diary/${dateToString(addDays(new Date(date), 1))}`);
    }
  });
  useEffect(() => {
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [handleKeydown]);

  return null;
}
