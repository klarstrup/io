"use client";
import { useRef, useState } from "react";
import { useClickOutside } from "../../hooks";
import { upsertTodo } from "./actions";

export function DiaryAgendaDayCreateTodo({ date }: { date?: Date }) {
  const [isActive, setIsActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const onClickOutside = () => setIsActive(false);
  useClickOutside(ref, onClickOutside);

  return (
    <div
      ref={ref}
      className={
        "relative flex flex-col items-center " +
        (isActive ? "rounded-b-none" : "cursor-pointer")
      }
    >
      <button
        className={
          "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-xs font-semibold shadow-sm"
        }
        onClick={() => {
          if (!isActive) {
            setIsActive(true);
          } else if (isActive && formRef.current) {
            formRef.current?.requestSubmit();
          }
        }}
      >
        <span className="text-xs">➕</span> Todo
      </button>
      {isActive && (
        <div className="absolute top-full right-0 left-0 z-10 flex flex-wrap items-center justify-center gap-1 rounded-b-md border border-t-0 border-black/5 bg-white p-1">
          <form
            ref={formRef}
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const summary = formData.get("summary");
              if (typeof summary === "string" && summary.trim().length > 0) {
                await upsertTodo({ summary: summary.trim(), start: date });
                setIsActive(false);
              }
            }}
          >
            <textarea
              autoFocus
              required
              placeholder="Todo summary"
              name="summary"
              defaultValue=""
              className="-mt-px -mb-px w-full min-w-50"
            />
            <button type="submit" className="hidden" />
          </form>
        </div>
      )}
    </div>
  );
}
