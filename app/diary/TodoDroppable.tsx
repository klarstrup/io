"use client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  type SortableContextProps,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  addHours,
  isBefore,
  isSameHour,
  max,
  setHours,
  startOfDay,
  subMinutes,
} from "date-fns";
import type { ReactNode } from "react";
import { Todo, UpdateTodoDocument } from "../../graphql.generated";
import type { getNextSets } from "../../models/workout.server";
import { dayStartHour } from "../../utils";
import { snoozeUserExerciseSchedule } from "./actions";

export function TodoDroppable(props: { children: ReactNode; date: Date }) {
  const { isOver, setNodeRef } = useDroppable({
    id: "droppable-day-" + new Date(props.date).toISOString(),
    data: { date: props.date },
  });

  return (
    <div
      ref={setNodeRef}
      className={
        isOver ? "rounded-lg outline-4 outline-offset-4 outline-purple-500" : ""
      }
    >
      {props.children}
    </div>
  );
}

export function TodoDragDropContainer(props: {
  children: ReactNode;
  userId?: string;
}) {
  const [updateTodo] = useMutation(UpdateTodoDocument);
  const client = useApolloClient();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active.data.current || !over?.data.current) return;

    console.log("Drag ended", { active, over });

    const activeOrder =
      active.data.current.nextSet?.scheduleEntry?.order ??
      active.data.current.todo?.order ??
      0;
    const overOrder =
      over.data.current.nextSet?.scheduleEntry?.order ??
      over.data.current.todo?.order ??
      0;
    const newOrder = overOrder > activeOrder ? overOrder + 1 : overOrder - 1;

    if (props.userId && active.data.current.nextSet) {
      const nextSet: Awaited<ReturnType<typeof getNextSets>>[number] =
        active.data.current.nextSet;

      const overStart = new Date(over.data.current.date);
      const startOfDay = setHours(overStart, dayStartHour);
      const justBeforeTheThing = subMinutes(overStart, 1);

      const targetDate = max([startOfDay, justBeforeTheThing]);

      console.log("Snoozing next set to", targetDate, "with order", newOrder);
      snoozeUserExerciseSchedule(
        props.userId,
        nextSet.scheduleEntry.id,
        targetDate,
        newOrder,
      ).then(() => {
        client.refetchObservableQueries();
      });
      return;
    } else if (active.data.current.todo) {
      const todo: Todo = active.data.current.todo;
      const targetDate = setHours(
        new Date(over.data.current.date),
        dayStartHour,
      );

      console.log(
        "Updating todo due date to",
        targetDate,
        "with order",
        newOrder,
      );

      if (
        isBefore(addHours(startOfDay(new Date()), dayStartHour), targetDate) ||
        isSameHour(addHours(startOfDay(new Date()), dayStartHour), targetDate)
      ) {
        const updatedTodo = {
          start: targetDate,
          completed: null,
          // Reimplement ordering later
          // order: newOrder,
        } as const;

        void updateTodo({
          variables: {
            input: { id: todo.id, data: updatedTodo },
          },
          optimisticResponse: {
            updateTodo: {
              __typename: "UpdateTodoPayload",
              todo: { ...todo, ...updatedTodo },
            },
          },
        });
      } else {
        const updatedTodo = {
          completed: targetDate,
          // Reimplement ordering later
          // order: newOrder,
        } as const;

        void updateTodo({
          variables: {
            input: { id: todo.id, data: updatedTodo },
          },
          optimisticResponse: {
            updateTodo: {
              __typename: "UpdateTodoPayload",
              todo: { ...todo, ...updatedTodo },
            },
          },
        });
      }
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 10 },
    }),
  );

  return (
    <DndContext
      id="TodoDragDropContainer"
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      {props.children}
    </DndContext>
  );
}

export function TodoSortableContext(props: SortableContextProps) {
  return (
    <SortableContext strategy={verticalListSortingStrategy} {...props}>
      {props.children}
    </SortableContext>
  );
}
