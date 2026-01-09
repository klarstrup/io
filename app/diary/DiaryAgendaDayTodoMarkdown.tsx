"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MongoVTodo } from "../../lib";
import { upsertTodo } from "./actions";

export function DiaryAgendaDayTodoMarkdown({ todo }: { todo: MongoVTodo }) {
  return (
    <div
      data-markdown-wrapper
      className="prose prose-sm prose-ul:m-0 text-black prose-p:m-0 prose-li:m-0 max-w-full wrap-break-word [&_.contains-task-list]:list-none [&_.contains-task-list]:p-0"
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          input({ node, ...props }) {
            if (props.type === "checkbox") {
              return (
                <input
                  {...props}
                  disabled={false}
                  onChange={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const checked = e.currentTarget.checked;
                    const markdownContainer = e.currentTarget.closest(
                      "div[data-markdown-wrapper]",
                    );
                    const checkboxes =
                      markdownContainer?.querySelectorAll<HTMLInputElement>(
                        'input[type="checkbox"]',
                      );
                    const thisCheckboxIndex = Array.from(
                      checkboxes || [],
                    ).indexOf(e.currentTarget);

                    // find the nth checkbox in the todo summary and toggle it
                    let checkBoxInSummaryIterator = -1;
                    const newSummary = todo.summary
                      ?.split("\n")
                      .map((line) => {
                        if (line.match(/^\s*[-*+]\s+\[.\]/)) {
                          checkBoxInSummaryIterator += 1;
                          if (checkBoxInSummaryIterator === thisCheckboxIndex) {
                            // toggle this line
                            if (checked) {
                              return line.replace(
                                /^\s*([-*+]\s+)\[ \]/,
                                "$1[x]",
                              );
                            } else {
                              return line.replace(
                                /^\s*([-*+]\s+)\[x\]/,
                                "$1[ ]",
                              );
                            }
                          }
                        }

                        return line;
                      })
                      .join("\n");

                    const allChecked =
                      checkboxes &&
                      Array.from(checkboxes).every(
                        (cb, idx) =>
                          (idx === thisCheckboxIndex && checked) ||
                          (idx !== thisCheckboxIndex && cb.checked),
                      );

                    upsertTodo({
                      ...todo,
                      completed: allChecked ? new Date() : null,
                      summary: newSummary,
                    });
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
              );
            }
            return <input {...props} />;
          },
        }}
      >
        {todo.summary}
      </Markdown>
    </div>
  );
}
