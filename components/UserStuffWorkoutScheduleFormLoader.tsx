"use client";
import dynamic from "next/dynamic";

export const UserStuffWorkoutScheduleFormLoader = dynamic(
  () => import("./UserStuffWorkoutScheduleForm"),
  { ssr: false },
);
