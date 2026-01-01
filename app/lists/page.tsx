import { auth } from "../../auth";
import { getUserIcalTodosBetween } from "../../sources/ical";
import { DiaryAgendaDayTodo } from "../diary/DiaryAgendaDayTodo";

export default async function ListPage() {
  const user = (await auth())?.user;

  const calendarTodos = user ? await getUserIcalTodosBetween(user.id) : [];
  const todos = calendarTodos.filter((todo) => !todo.completed);
  const todones = calendarTodos.filter((todo) => todo.completed);

  return (
    <div className="max-h-screen min-h-screen">
      <div className="mx-auto max-h-screen max-w-2xl self-stretch border-black/25 px-2">
        <div
          className="grid gap-1.5 pb-1.5"
          style={{ gridTemplateColumns: "1.25rem minmax(0, 1fr)" }}
        >
          {todos.map((todo) => (
            <DiaryAgendaDayTodo todo={todo} key={todo.uid} />
          ))}
          {todos.length && todones.length ? (
            <>
              <span></span>
              <span>
                <hr className="border-gray-200" />
              </span>
            </>
          ) : null}
          {todones.map((todo) => (
            <DiaryAgendaDayTodo todo={todo} key={todo.uid} />
          ))}
        </div>
      </div>
    </div>
  );
}
