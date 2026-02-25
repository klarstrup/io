import { Children } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DiaryAgendaDayTodoFragment } from "../../graphql.generated";

export function DiaryAgendaDayTodoMarkdown({
  todo,
  onUpdateTodo,
}: {
  todo: DiaryAgendaDayTodoFragment;
  onUpdateTodo?: (
    updatedTodo: Omit<DiaryAgendaDayTodoFragment, "id" | "__typename">,
  ) => Promise<void> | void;
}) {
  return (
    <div
      data-markdown-wrapper
      className="prose prose-sm prose-ul:m-0 prose-p:m-0 prose-li:m-0 prose-headings:mb-0 max-w-full wrap-break-word text-black select-none [&_.contains-task-list]:flex [&_.contains-task-list]:list-none [&_.contains-task-list]:flex-col [&_.contains-task-list]:gap-2 [&_.contains-task-list]:p-0 [&_.task-list-item]:flex [&_.task-list-item]:items-center [&_.task-list-item]:gap-1.5 [&_.task-list-item]:pl-0 [&_.task-list-item]:leading-tight [&_.task-list-item-contents]:border-b [&_.task-list-item-contents]:border-dashed [&_.task-list-item-contents]:border-amber-600/75"
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          li({ node: _node, ...props }) {
            const isTaskItem = props.className?.includes("task-list-item");
            if (isTaskItem) {
              const [checkbox, ...restChildren] = Children.toArray(
                props.children,
              );
              return (
                <li {...props}>
                  {checkbox}
                  <span className="task-list-item-contents">
                    {restChildren}
                  </span>
                </li>
              );
            }
            return <li {...props} />;
          },
          input({ node: _node, ...props }) {
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

                    void onUpdateTodo?.({
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
