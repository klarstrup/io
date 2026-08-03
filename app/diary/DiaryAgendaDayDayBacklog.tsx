"use client";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { getDate } from "date-fns";
import { useMemo, useState } from "react";
import { FieldSetY } from "../../components/FieldSet";
import { DiaryAgendaDayDayBacklogTodosDocument } from "../../graphql.generated/graphql";
import { useNow, useVisibilityAwarePollInterval } from "../../hooks";
import { shuffle } from "../../utils";
import { DiaryAgendaDayTodo } from "../diary/DiaryAgendaDayTodo";

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query DiaryAgendaDayDayBacklogTodos {
    user {
      id
      todos {
        id
        created
        due
        completed
        summary
      }
    }
  }
`;

export default function DiaryAgendaDayDayBacklog({
  dayRange,
}: {
  dayRange: { start: Date; end: Date };
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pollInterval = useVisibilityAwarePollInterval(300000);
  const { data } = useQuery(DiaryAgendaDayDayBacklogTodosDocument, {
    pollInterval,
  });
  const now = useNow(60 * 1000);
  const startDay = getDate(dayRange.start);

  const calendarTodos = data?.user?.todos;
  const backlogTodos = useMemo(
    () =>
      shuffle(
        (calendarTodos || [])
          .filter((todo) => !todo.due && !todo.completed)
          .sort(
            (a, b) =>
              new Date(b.created!).getTime() - new Date(a.created!).getTime(),
          ),
        startDay,
      ),
    [calendarTodos, startDay],
  );
  const todosToShow = useMemo(
    () => (isExpanded ? backlogTodos : backlogTodos.slice(0, 4)),
    [backlogTodos, isExpanded],
  );

  return (
    backlogTodos.length > 0 && (
      <FieldSetY
        className="mt-2 mb-4 flex w-full max-w-lg flex-wrap justify-evenly gap-1 bg-[#edab00]/10 p-0 pt-1 backdrop-blur-sm lg:max-w-none"
        legend={null}
      >
        {todosToShow.map((todo) => (
          <DiaryAgendaDayTodo
            todo={todo}
            key={todo.id}
            now={now}
            className={"inline-flex"}
            backlog
          />
        ))}
        {backlogTodos.length > 3 ? (
          <button
            className="flex w-full max-w-md cursor-pointer items-center justify-center rounded-t-md bg-amber-800/20 p-1 text-xs font-bold text-[#edab00] hover:bg-amber-800/30"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show fewer" : "Show more"}
          </button>
        ) : null}
      </FieldSetY>
    )
  );
}
