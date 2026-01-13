"use client";
import { useSortable } from "@dnd-kit/sortable";
import { faCircleCheck } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { forwardRef, useRef, useState } from "react";
import { TextAreaThatGrows } from "../../components/TextAreaThatGrows";
import { useClickOutside, useEvent } from "../../hooks";
import type { MongoVTodo } from "../../lib";
import {
  deleteTodo,
  doTodo,
  snoozeTodo,
  undoTodo,
  upsertTodo,
} from "./actions";
import { DiaryAgendaDayTodoMarkdown } from "./DiaryAgendaDayTodoMarkdown";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

export function DiaryAgendaDayTodo({
  todo,
  sortableId,
}: {
  todo: MongoVTodo;
  sortableId?: string;
}) {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: sortableId ?? todo.uid,
    data: { todo, date: getJournalEntryPrincipalDate(todo) },
  });

  return (
    <DiaryAgendaDayTodoButItsNotDraggable
      ref={setNodeRef}
      style={{
        transition,
        ...(transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 100,
            }
          : undefined),
      }}
      {...listeners}
      {...attributes}
      todo={todo}
      isDragging={isDragging}
    />
  );
}

export const DiaryAgendaDayTodoButItsNotDraggable = forwardRef(
  function DiaryAgendaDayTodoButItsNotDraggable(
    {
      todo,
      isDragging,
      ...props
    }: {
      todo: MongoVTodo;
      isDragging: boolean;
    } & React.HTMLAttributes<HTMLDivElement>,
    ref: React.Ref<HTMLDivElement>,
  ) {
    const [isActive, setIsActive] = useState(false);
    const ref2 = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const handleFormSubmit = useEvent(async (formElement: HTMLFormElement) => {
      const formData = new FormData(formElement);
      const summary = formData.get("summary");
      if (
        typeof summary === "string" &&
        summary.trim().length > 0 &&
        summary.trim() !== todo.summary?.trim()
      ) {
        await upsertTodo({ ...todo, summary: summary.trim() });
      }
      setIsActive(false);
    });

    const onClickOutside = () => {
      const formData = formRef.current && new FormData(formRef.current);
      const summary = formData?.get("summary");
      if (summary && typeof summary === "string" && summary.trim().length > 0) {
        formRef.current && handleFormSubmit(formRef.current);
      } else {
        setIsActive(false);
      }
    };
    useClickOutside(ref2, onClickOutside);

    return (
      <div
        ref={ref}
        {...props}
        test-id={"diary-agenda-day-todo-" + todo.uid}
        className="flex"
      >
        <button
          className={
            "flex w-8 cursor-pointer items-center justify-center text-xl " +
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
        <div
          ref={ref2}
          style={
            isDragging ? { boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)" } : {}
          }
          className={
            (isActive ? "flex rounded-b-none" : "inline-flex cursor-pointer") +
            " group relative break-inside-avoid flex-col items-stretch justify-center rounded-md border border-black/20 bg-white transition-shadow " +
            (todo.completed ? " flex-col-reverse" : "")
          }
          onClick={() => setIsActive(true)}
        >
          <div className="h-full self-stretch px-1.5 py-0.5">
            <form
              ref={formRef}
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onSubmit={(e) => {
                e.preventDefault();
                formRef.current && handleFormSubmit(formRef.current);
              }}
            >
              {isActive ? (
                <TextAreaThatGrows
                  autoFocus
                  name="summary"
                  defaultValue={todo.summary}
                  className="-mt-px -mb-px w-full bg-transparent p-0.5 font-mono text-sm"
                  innerRef={(el) => {
                    if (!el) return;
                    const length = el.value.length;
                    el.setSelectionRange(length, length);
                  }}
                />
              ) : (
                <DiaryAgendaDayTodoMarkdown todo={todo} />
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
    );
  },
);
