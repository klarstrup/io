"use client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { useSortable } from "@dnd-kit/sortable";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { addDays } from "date-fns";
import gql from "graphql-tag";
import { useRef, useState } from "react";
import { TextAreaThatGrows } from "../../components/TextAreaThatGrows";
import {
  type DeleteTodoMutation,
  type DiaryAgendaDayTodoFragment,
  DiaryAgendaDayUserTodosDocument,
  ListPageUserDocument,
  type UpdateTodoMutation,
} from "../../graphql.generated";
import { useClickOutside, useEvent } from "../../hooks";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { DiaryAgendaDayTodoMarkdown } from "./DiaryAgendaDayTodoMarkdown";
import { getTodoPrincipalDate } from "./diaryUtils";

gql`
  fragment DiaryAgendaDayTodo on Todo {
    id
    start
    due
    completed
    summary
  }
`;

export const DiaryAgendaDayTodo =
  function DiaryAgendaDayTodoButItsNotDraggable({
    todo,
    cotemporalityOfSurroundingEvent,
  }: {
    todo: DiaryAgendaDayTodoFragment;
    cotemporalityOfSurroundingEvent?: "past" | "current" | "future" | null;
  }) {
    const client = useApolloClient();
    const {
      isDragging,
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({
      id: client.cache.identify(todo) || todo.id,
      data: { todo, date: getTodoPrincipalDate(todo)?.start },
    });

    const [updateTodo] = useMutation<UpdateTodoMutation>(
      gql`
        mutation UpdateTodo($input: UpdateTodoInput!) {
          updateTodo(input: $input) {
            todo {
              id
              created
              start
              due
              completed
              summary
            }
          }
        }
      `,
      {
        refetchQueries: [ListPageUserDocument, DiaryAgendaDayUserTodosDocument],
      },
    );
    const [deleteTodo] = useMutation<DeleteTodoMutation>(
      gql`
        mutation DeleteTodo($id: String!) {
          deleteTodo(id: $id)
        }
      `,
      {
        refetchQueries: [ListPageUserDocument, DiaryAgendaDayUserTodosDocument],
      },
    );

    const [isActive, setIsActive] = useState(false);
    const ref2 = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const handleFormSubmit = useEvent(async (formElement: HTMLFormElement) => {
      const formData = new FormData(formElement);
      const summary = formData.get("summary");
      setIsActive(false);
      if (
        typeof summary === "string" &&
        summary.trim().length > 0 &&
        summary.trim() !== todo.summary?.trim()
      ) {
        updateTodo({
          variables: {
            input: { id: todo.id, data: { summary: summary.trim() } },
          },
          optimisticResponse: {
            updateTodo: {
              __typename: "UpdateTodoPayload",
              todo: { ...todo, summary: summary.trim() },
            },
          },
          onError: (error) => {
            console.error("Failed to update todo summary:", error);
            setIsActive(true);
          },
        });
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
        icon={faCircleCheck}
        onIconClick={
          todo.completed
            ? () =>
                void updateTodo({
                  variables: {
                    input: { id: todo.id, data: { completed: null } },
                  },
                  optimisticResponse: {
                    updateTodo: {
                      __typename: "UpdateTodoPayload",
                      todo: { ...todo, completed: null },
                    },
                  },
                })
            : () =>
                void updateTodo({
                  variables: {
                    input: { id: todo.id, data: { completed: new Date() } },
                  },
                  optimisticResponse: {
                    updateTodo: {
                      __typename: "UpdateTodoPayload",
                      todo: { ...todo, completed: new Date() },
                    },
                  },
                })
        }
        // this should cope with todos with deadlines when that is implemented
        cotemporality={
          !todo.completed && !todo.start && !todo.due
            ? "backlog"
            : todo.completed
              ? "past"
              : "future"
        }
        cotemporalityOfSurroundingEvent={
          !isDragging ? cotemporalityOfSurroundingEvent : undefined
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
          <div
            className={
              "h-full self-stretch" +
              (isActive ? " px-1 pt-1 pb-1" : " px-1.5 py-0")
            }
          >
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
                  ref={(el) => {
                    if (!el) return;
                    const length = el.value.length;
                    el.setSelectionRange(length, length);
                  }}
                />
              ) : (
                <DiaryAgendaDayTodoMarkdown
                  todo={todo}
                  onUpdateTodo={(updatedTodo) =>
                    void updateTodo({
                      variables: {
                        input: {
                          id: todo.id,
                          data: {
                            summary: updatedTodo.summary,
                            completed: updatedTodo.completed,
                          },
                        },
                      },
                      optimisticResponse: {
                        updateTodo: {
                          __typename: "UpdateTodoPayload",
                          todo: {
                            ...todo,
                            summary: updatedTodo.summary,
                            completed: updatedTodo.completed,
                          },
                        },
                      },
                    })
                  }
                />
              )}
              <button type="submit" className="hidden" />
            </form>
          </div>
          {isActive && (
            <div className="absolute top-full right-0 left-0 z-10 -mx-px flex flex-wrap items-center justify-center gap-1 rounded-b-md border border-black/20 bg-white p-1">
              {todo.completed ? (
                <button
                  type="button"
                  onClick={() =>
                    void updateTodo({
                      variables: {
                        input: { id: todo.id, data: { completed: null } },
                      },
                      optimisticResponse: {
                        updateTodo: {
                          __typename: "UpdateTodoPayload",
                          todo: { ...todo, completed: null },
                        },
                      },
                    })
                  }
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
                    onClick={() =>
                      void updateTodo({
                        variables: {
                          input: {
                            id: todo.id,
                            data: { completed: new Date() },
                          },
                        },
                        optimisticResponse: {
                          updateTodo: {
                            __typename: "UpdateTodoPayload",
                            todo: { ...todo, completed: new Date() },
                          },
                        },
                      })
                    }
                    className={
                      "text-md cursor-pointer rounded-xl bg-green-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                    }
                  >
                    Do
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const snoozedStart = addDays(todo.start ?? new Date(), 1);

                      void updateTodo({
                        variables: {
                          input: {
                            id: todo.id,
                            data: { start: snoozedStart },
                          },
                        },
                        optimisticResponse: {
                          updateTodo: {
                            __typename: "UpdateTodoPayload",
                            todo: { ...todo, start: snoozedStart },
                          },
                        },
                      });
                    }}
                    className={
                      "text-md cursor-pointer rounded-xl bg-yellow-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                    }
                  >
                    Snooze
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void updateTodo({
                        variables: {
                          input: { id: todo.id, data: { start: null } },
                        },
                        optimisticResponse: {
                          updateTodo: {
                            __typename: "UpdateTodoPayload",
                            todo: { ...todo, start: null },
                          },
                        },
                      })
                    }
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
                  onClick={() =>
                    void updateTodo({
                      variables: {
                        input: { id: todo.id, data: { start: new Date() } },
                      },
                      optimisticResponse: {
                        updateTodo: {
                          __typename: "UpdateTodoPayload",
                          todo: { ...todo, start: new Date() },
                        },
                      },
                    })
                  }
                  className={
                    "text-md cursor-pointer rounded-xl bg-blue-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                  }
                >
                  Put on Agenda
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  void deleteTodo({
                    variables: { id: todo.id },
                    optimisticResponse: { deleteTodo: todo.id },
                    update(cache, { data }) {
                      if (!data?.deleteTodo) return;

                      cache.updateQuery(
                        { query: ListPageUserDocument },
                        (existing) => {
                          if (!existing?.user?.todos) return existing;
                          return {
                            ...existing,
                            user: {
                              ...existing.user,
                              todos: existing.user.todos.filter(
                                (t) => t.id !== data.deleteTodo,
                              ),
                            },
                          };
                        },
                      );
                    },
                  })
                }
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
  };
