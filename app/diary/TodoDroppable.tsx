"use client";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { addHours, isBefore, isSameHour, setHours, startOfDay } from "date-fns";
import { cloneElement, type ReactNode } from "react";
import type { MongoVTodo } from "../../lib";
import type { getNextSets } from "../../models/workout.server";
import { dayStartHour } from "../../utils";
import mergeRefs from "../../utils/merge-refs";
import { snoozeUserExerciseSchedule, upsertTodo } from "./actions";

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

export function TodoDraggable(props: {
  children: ReactNode;
  todo: MongoVTodo;
  ref?: React.Ref<HTMLElement>;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "draggable-todo-" + props.todo.uid,
    data: { todo: props.todo },
  });

  return cloneElement(props.children as any, {
    ref: props.ref ? mergeRefs(props.ref, setNodeRef) : setNodeRef,
    style: {
      boxShadow: "none",
      transition: "box-shadow 0.2s ease",
      ...(transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
            zIndex: 100,
          }
        : undefined),
    },
    ...listeners,
    ...attributes,
  });
}
export function NextSetDraggable(props: {
  children: ReactNode;
  nextSet: Awaited<ReturnType<typeof getNextSets>>[number];
  ref?: React.Ref<HTMLElement>;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "draggable-next-set-" + props.nextSet.scheduleEntry.id,
    data: { nextSet: props.nextSet },
  });

  return cloneElement(props.children as any, {
    ref: props.ref ? mergeRefs(props.ref, setNodeRef) : setNodeRef,
    style: {
      boxShadow: "none",
      transition: "box-shadow 0.2s ease",
      ...(transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
            zIndex: 100,
          }
        : undefined),
    },
    ...listeners,
    ...attributes,
  });
}

export function TodoDragDropContainer(props: {
  children: ReactNode;
  userId?: string;
}) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active.data.current || !over?.data.current) return;

    console.log("Drag ended", { active, over });

    if (props.userId && active.data.current.nextSet) {
      const nextSet: Awaited<ReturnType<typeof getNextSets>>[number] =
        active.data.current.nextSet;

      const targetDate = setHours(
        new Date(over.data.current.date),
        dayStartHour,
      );
      console.log("Snoozing next set to", targetDate);
      snoozeUserExerciseSchedule(
        props.userId,
        nextSet.scheduleEntry.exerciseId,
        targetDate,
      );
      return;
    } else if (
      active.data.current.todo &&
      active.data.current.todo.dueDate !==
        new Date(over.data.current.date).toISOString()
    ) {
      const todo: MongoVTodo = active.data.current.todo;
      const targetDate = setHours(
        new Date(over.data.current.date),
        dayStartHour,
      );
      if (
        isBefore(addHours(startOfDay(new Date()), dayStartHour), targetDate) ||
        isSameHour(addHours(startOfDay(new Date()), dayStartHour), targetDate)
      ) {
        const updatedTodo = {
          uid: todo.uid,
          start: targetDate,
          completed: null,
        };

        upsertTodo(updatedTodo);
      } else {
        const updatedTodo = {
          uid: todo.uid,
          completed: targetDate,
        };

        upsertTodo(updatedTodo);
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
