"use client";
import { faCircleCheck } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Fragment, useRef, useState } from "react";
import { useClickOutside } from "../../hooks";
import type { MongoVTodo } from "../../lib";
import {
  deleteTodo,
  doTodo,
  snoozeTodo,
  undoTodo,
  upsertTodo,
} from "./actions";

export function DiaryAgendaDayTodo({ todo }: { todo: MongoVTodo }) {
  const [isActive, setIsActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const onClickOutside = () => setIsActive(false);
  useClickOutside(ref, onClickOutside);

  return (
    <Fragment>
      <button
        className={
          "flex cursor-pointer justify-center pt-1 text-xl " +
          (todo.completed ? "text-green-400" : "text-gray-400/50")
        }
        onClick={
          todo.completed
            ? () => void undoTodo(todo.uid)
            : () => void doTodo(todo.uid)
        }
      >
        <FontAwesomeIcon icon={faCircleCheck} />
      </button>
      <div>
        <div
          ref={ref}
          className={
            "group relative inline-flex break-inside-avoid flex-col items-stretch justify-center rounded-md border border-black/5 bg-white " +
            (isActive ? "rounded-b-none" : "cursor-pointer") +
            (todo.completed ? " flex-col-reverse" : "")
          }
          onClick={() => setIsActive(true)}
        >
          <div className="h-full self-stretch px-1.5 py-0.5">
            <form
              ref={formRef}
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const summary = formData.get("summary");
                if (typeof summary === "string" && summary.trim().length > 0) {
                  await upsertTodo({ ...todo, summary: summary.trim() });
                }
                setIsActive(false);
              }}
            >
              {isActive ? (
                <input
                  autoFocus
                  type="text"
                  name="summary"
                  defaultValue={todo.summary}
                  className="-mt-px -mb-px w-full bg-transparent text-center"
                />
              ) : (
                todo.summary
              )}
              <button type="submit" className="hidden" />
            </form>
          </div>
          {isActive && (
            <div className="absolute top-full right-0 left-0 z-10 flex flex-wrap items-center justify-center gap-1 rounded-b-md border border-t-0 border-black/5 bg-white p-1">
              {todo.completed ? (
                <button
                  type="button"
                  onClick={() => void undoTodo(todo.uid)}
                  className={
                    "text-md cursor-pointer rounded-xl bg-teal-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                  }
                >
                  Undo
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void doTodo(todo.uid)}
                    className={
                      "text-md cursor-pointer rounded-xl bg-green-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                    }
                  >
                    Do
                  </button>
                  <button
                    type="button"
                    onClick={() => void snoozeTodo(todo.uid)}
                    className={
                      "text-md cursor-pointer rounded-xl bg-yellow-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                    }
                  >
                    Snooze
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => void deleteTodo(todo.uid)}
                className={
                  "text-md cursor-pointer rounded-xl bg-red-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                }
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
}
