"use client";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { getDate } from "date-fns";
import { useMemo } from "react";
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
      ).slice(0, 4),
    [calendarTodos, startDay],
  );

  return (
    backlogTodos.length > 0 && (
      <FieldSetY
        className="mb-4 mt-2 flex w-full max-w-lg flex-wrap justify-evenly gap-1 bg-[#edab00]/10 p-0 backdrop-blur-sm lg:max-w-none"
        legend={null}
      >
        {backlogTodos.map((todo) => (
          <DiaryAgendaDayTodo
            todo={todo}
            key={todo.id}
            now={now}
            className={"inline-flex"}
            backlog
          />
        ))}
      </FieldSetY>
    )
  );
}
