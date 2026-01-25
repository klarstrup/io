"use client";
import { gql } from "@apollo/client";
import { useSuspenseQuery } from "@apollo/client/react";
import { FieldSetY } from "../../components/FieldSet";
import { ListPageUserDocument } from "../../graphql.generated";
import { DiaryAgendaDayTodo } from "../diary/DiaryAgendaDayTodo";

gql`
  query ListPageUser {
    user {
      id
      todos {
        id
        start
        due
        completed
        summary
      }
    }
  }
`;

export default function ListPage() {
  const { data } = useSuspenseQuery(ListPageUserDocument);

  const calendarTodos = data.user?.todos || [];
  const todos = calendarTodos.filter(
    (todo) => !todo.completed && (todo.start || todo.due),
  );
  const todones = calendarTodos
    .filter((todo) => todo.completed)
    .sort(
      (a, b) =>
        new Date(b.completed!).getTime() - new Date(a.completed!).getTime(),
    );
  const backlogTodos = calendarTodos.filter(
    (todo) => !todo.start && !todo.due && !todo.completed,
  );

  return (
    <div className="mx-auto max-w-2xl self-stretch border-black/25 px-2">
      <FieldSetY
        className="mb-2 flex flex-col gap-2 bg-white pl-0"
        legend="Todos"
      >
        {todos.map((todo) => (
          <DiaryAgendaDayTodo todo={todo} key={todo.id} />
        ))}
      </FieldSetY>
      <FieldSetY
        className="mb-2 flex flex-col gap-2 bg-white pl-0"
        legend="Backlog"
      >
        {backlogTodos.map((todo) => (
          <DiaryAgendaDayTodo todo={todo} key={todo.id} />
        ))}
      </FieldSetY>
      <FieldSetY
        className="mb-2 flex flex-col gap-2 bg-white pl-0"
        legend="Completed"
      >
        {todones.map((todo) => (
          <DiaryAgendaDayTodo todo={todo} key={todo.id} />
        ))}
      </FieldSetY>
    </div>
  );
}
