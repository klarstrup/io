import { auth } from "../../auth";
import { FieldSetY } from "../../components/FieldSet";
import { getUserIcalTodosBetween } from "../../sources/ical";
import { DiaryAgendaDayTodo } from "../diary/DiaryAgendaDayTodo";

export default async function ListPage() {
  const user = (await auth())?.user;

  const calendarTodos = user ? await getUserIcalTodosBetween(user.id) : [];
  const todos = calendarTodos.filter(
    (todo) => !todo.completed && (todo.start || todo.due),
  );
  const todones = calendarTodos.filter((todo) => todo.completed);
  const backlogTodos = calendarTodos.filter(
    (todo) => !todo.start && !todo.due && !todo.completed,
  );

  return (
    <div className="max-h-screen min-h-screen">
      <div className="mx-auto max-h-screen max-w-2xl self-stretch border-black/25 px-2">
        <FieldSetY
          className="mb-2 flex flex-col gap-2 bg-white pl-0"
          legend="Todos"
        >
          {todos.map((todo) => (
            <DiaryAgendaDayTodo todo={todo} key={todo.uid} />
          ))}
        </FieldSetY>
        <FieldSetY
          className="mb-2 flex flex-col gap-2 bg-white pl-0"
          legend="Backlog"
        >
          {backlogTodos.map((todo) => (
            <DiaryAgendaDayTodo todo={todo} key={todo.uid} />
          ))}
        </FieldSetY>
        <FieldSetY
          className="mb-2 flex flex-col gap-2 bg-white pl-0"
          legend="Completed"
        >
          {todones.map((todo) => (
            <DiaryAgendaDayTodo todo={todo} key={todo.uid} />
          ))}
        </FieldSetY>
      </div>
    </div>
  );
}
