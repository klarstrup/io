"use client";
import { useApolloClient, useSuspenseFragment } from "@apollo/client/react";
import { useSortable } from "@dnd-kit/sortable";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import gql from "graphql-tag";
import { forwardRef, useRef, useState } from "react";
import { TextAreaThatGrows } from "../../components/TextAreaThatGrows";
import {
  type DiaryAgendaDayTodoFragment,
  DiaryAgendaDayTodoFragmentDoc,
} from "../../graphql.generated";
import { useClickOutside, useEvent } from "../../hooks";
import {
  agendaTodo,
  backlogTodo,
  deleteTodo,
  doTodo,
  snoozeTodo,
  undoTodo,
  upsertTodo,
} from "./actions";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { DiaryAgendaDayTodoMarkdown } from "./DiaryAgendaDayTodoMarkdown";
import { getVTodoPrincipalDate } from "./diaryUtils";

gql`
  fragment DiaryAgendaDayTodo on Todo {
    id
    start
    due
    completed
    summary
  }
`;

export function DiaryAgendaDayTodo({
  todo: todoo,
  sortableId,
}: {
  todo: DiaryAgendaDayTodoFragment;
  sortableId?: string;
}) {
  const client = useApolloClient();
  client.writeFragment({
    id: client.cache.identify(todoo),
    fragment: DiaryAgendaDayTodoFragmentDoc,
    data: todoo,
  });
  const { data: todo } = useSuspenseFragment({
    fragment: DiaryAgendaDayTodoFragmentDoc,
    from: todoo,
  });

  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: sortableId ?? todo.id,
    data: { todo, date: getVTodoPrincipalDate(todo) },
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
      todo: DiaryAgendaDayTodoFragment;
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
      <DiaryAgendaDayEntry
        ref={ref}
        {...props}
        icon={faCircleCheck}
        onIconClick={
          todo.completed
            ? () => void undoTodo(todo.id)
            : () => void doTodo(todo.id)
        }
        // this should cope with todos with deadlines when that is implemented
        cotemporality={
          !todo.completed && !todo.start && !todo.due
            ? "backlog"
            : todo.completed
              ? "past"
              : "future"
        }
      >
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
                  defaultValue={todo.summary ?? ""}
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
                  onClick={() => void undoTodo(todo.id)}
                  className={
                    "text-md cursor-pointer rounded-xl bg-teal-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                  }
                >
                  Undo
                </button>
              ) : todo.start ? (
                <>
                  <button
                    type="button"
                    onClick={() => void doTodo(todo.id)}
                    className={
                      "text-md cursor-pointer rounded-xl bg-green-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                    }
                  >
                    Do
                  </button>
                  <button
                    type="button"
                    onClick={() => void snoozeTodo(todo.id)}
                    className={
                      "text-md cursor-pointer rounded-xl bg-yellow-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                    }
                  >
                    Snooze
                  </button>
                  <button
                    type="button"
                    onClick={() => void backlogTodo(todo.id)}
                    className={
                      "text-md cursor-pointer rounded-xl bg-blue-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                    }
                  >
                    Put in Backlog
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void agendaTodo(todo.id)}
                  className={
                    "text-md cursor-pointer rounded-xl bg-blue-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                  }
                >
                  Put on Agenda
                </button>
              )}
              <button
                type="button"
                onClick={() => void deleteTodo(todo.id)}
                className={
                  "text-md cursor-pointer rounded-xl bg-red-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                }
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </DiaryAgendaDayEntry>
    );
  },
);
