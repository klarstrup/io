"use client";
import { gql } from "@apollo/client";
import { useApolloClient, useSuspenseQuery } from "@apollo/client/react";
import usePartySocket from "partysocket/react";
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

function ListsPoller({ userId, loadedAt }: { userId: string; loadedAt: Date }) {
  const client = useApolloClient();

  usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
    room: userId,
    onMessage(event) {
      console.log(event);
      try {
        const data = JSON.parse(event.data as string) as unknown;
        console.log(data);

        const loadedAtDate = new Date(loadedAt);

        if (
          data &&
          typeof data === "object" &&
          "scrapedAt" in data &&
          typeof data.scrapedAt === "number" &&
          new Date(data.scrapedAt) > loadedAtDate
        ) {
          console.info(
            `Refreshing lists because scrapedAt ${new Date(data.scrapedAt).toLocaleString()} > loadedAt ${loadedAtDate.toLocaleString()}`,
          );

          client.refetchQueries({ include: [ListPageUserDocument] });
        }
      } catch (error) {
        console.error(error);
      }
    },
  });

  return null;
}

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

  const now = new Date();

  return (
    <div className="mx-auto max-w-2xl self-stretch border-black/25 px-2">
      {data.user ? <ListsPoller loadedAt={now} userId={data.user.id} /> : null}
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
