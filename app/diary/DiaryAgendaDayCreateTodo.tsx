"use client";
import { useMutation } from "@apollo/client/react";
import gql from "graphql-tag";
import { useRef, useState } from "react";
import { TextAreaThatGrows } from "../../components/TextAreaThatGrows";
import {
  CreateTodoMutation,
  DiaryAgendaDayUserTodosDocument,
  ListPageUserDocument,
} from "../../graphql.generated";
import { useClickOutside, useEvent } from "../../hooks";

export function DiaryAgendaDayCreateTodo({ date }: { date?: Date }) {
  const [isActive, setIsActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [createTodo, { loading }] = useMutation<CreateTodoMutation>(
    gql`
      mutation CreateTodo($input: CreateTodoInput!) {
        createTodo(input: $input) {
          todo {
            id
            created
            summary
            start
            due
            completed
          }
        }
      }
    `,
    { refetchQueries: [ListPageUserDocument, DiaryAgendaDayUserTodosDocument] },
  );

  const handleFormSubmit = useEvent(async (formElement: HTMLFormElement) => {
    const formData = new FormData(formElement);
    const summary = formData.get("summary");
    if (typeof summary === "string" && summary.trim().length > 0) {
      await createTodo({
        variables: {
          input: {
            data: {
              summary: summary
                .trim()
                .split("\n")
                .map((line) =>
                  line.startsWith("▢") ? line.replace(/^(▢)/, "- [ ]") : line,
                )
                .join("\n"),
              start: date,
            },
          },
        },
      });
      setIsActive(false);
    }
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
        type="button"
        className={
          "cursor-pointer rounded-md bg-[#ff0] px-1 py-0.5 pr-1.5 text-sm font-semibold shadow-md shadow-black/30"
        }
        onClick={() => {
          if (!isActive) {
            setIsActive(true);
          } else if (isActive && formRef.current) {
            formRef.current?.submit();
          }
        }}
      >
        <span className="text-xs">➕</span> Todo
      </button>
      {isActive && (
        <div className="absolute top-full right-0 left-0 z-10 flex flex-wrap items-center justify-center gap-1">
          <form
            ref={formRef}
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onSubmit={async (e) => {
              e.preventDefault();
              formRef.current && handleFormSubmit(formRef.current);
            }}
          >
            <div className="flex min-w-50 flex-col items-stretch rounded-b-md border border-t-0 border-black/5 bg-white p-1">
              <TextAreaThatGrows
                autoFocus
                required
                placeholder="Todo summary"
                name="summary"
                defaultValue=""
                className="-mt-px -mb-px w-full p-0.5 font-mono text-sm"
                disabled={loading}
                innerRef={(el) => {
                  if (!el) return;
                  const length = el.value.length;
                  el.setSelectionRange(length, length);
                }}
              />
              <button type="submit" className="hidden" />
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
