"use client";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { FieldSetY } from "../../components/FieldSet";
import { ListPageUserDocument } from "../../graphql.generated";
import { DiaryAgendaDayCreateTodo } from "../diary/DiaryAgendaDayCreateTodo";
import { DiaryAgendaDayTodo } from "../diary/DiaryAgendaDayTodo";

gql`
  query ListPageUser {
    user {
      id
      todos {
        id
        created
        start
        due
        completed
        summary
      }
    }
  }
`;

export default function ListPage() {
  const { data } = useQuery(ListPageUserDocument);

  const calendarTodos = data?.user?.todos || [];
  const todos = calendarTodos
    .filter((todo) => !todo.completed && (todo.start || todo.due))
    .sort((a, b) => {
      const aDate = a.start
        ? new Date(a.start)
        : a.due
          ? new Date(a.due!)
          : null;
      const bDate = b.start
        ? new Date(b.start)
        : b.due
          ? new Date(b.due!)
          : null;

      if (aDate && bDate) {
        return bDate.getTime() - aDate.getTime();
      } else if (aDate) {
        return -1;
      } else if (bDate) {
        return 1;
      } else {
        return 0;
      }
    });
  const todones = calendarTodos
    .filter((todo) => todo.completed)
    .sort(
      (a, b) =>
        new Date(b.completed!).getTime() - new Date(a.completed!).getTime(),
    );
  const backlogTodos = calendarTodos
    .filter((todo) => !todo.start && !todo.due && !todo.completed)
    .sort(
      (a, b) => new Date(b.created!).getTime() - new Date(a.created!).getTime(),
    );

  return (
    <div className="mx-auto max-w-2xl self-stretch border-black/25 px-2">
      <FieldSetY
        className="mb-2 flex flex-col gap-2 bg-white pl-0"
        legend={
          <div className="flex items-center gap-2">
            <span className="font-bold text-shadow-md text-shadow-white">
              Todos
            </span>{" "}
            <DiaryAgendaDayCreateTodo date={new Date()} />
          </div>
        }
      >
        {todos.map((todo) => (
          <DiaryAgendaDayTodo todo={todo} key={todo.id} />
        ))}
      </FieldSetY>
      <FieldSetY
        className="mb-2 flex flex-col gap-2 bg-white pl-0"
        legend={
          <div className="flex items-center gap-2">
            <span className="font-bold text-shadow-md text-shadow-white">
              Backlog
            </span>{" "}
            <DiaryAgendaDayCreateTodo />
          </div>
        }
      >
        {backlogTodos.map((todo) => (
          <DiaryAgendaDayTodo todo={todo} key={todo.id} />
        ))}
      </FieldSetY>
      <FieldSetY
        className="mb-2 flex flex-col gap-2 bg-white pl-0"
        legend={
          <span className="font-bold text-shadow-md text-shadow-white">
            Done
          </span>
        }
      >
        {todones.map((todo) => (
          <DiaryAgendaDayTodo todo={todo} key={todo.id} />
        ))}
      </FieldSetY>
    </div>
  );
}
