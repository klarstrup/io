"use client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  type SortableContextProps,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  addHours,
  addMilliseconds,
  isFuture,
  max,
  min,
  setHours,
} from "date-fns";
import type { ReactNode } from "react";
import {
  type NextSet,
  SnoozeExerciseScheduleDocument,
  type Todo,
  UpdateTodoDocument,
  type Workout,
} from "../../graphql.generated";
import { dateMidpoint, dayStartHour } from "../../utils";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

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

const NOW_SYMBOL = Symbol("now");

export function TodoDragDropContainer(props: {
  children: ReactNode;
  userId?: string;
}) {
  const client = useApolloClient();
  const [updateTodo] = useMutation(UpdateTodoDocument);
  const [snoozeExerciseSchedule] = useMutation(SnoozeExerciseScheduleDocument);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active.data.current || !over?.data.current) return;

    console.log("Drag ended", { active, over });

    const sortableItems = over.data.current.sortable?.items as
      | UniqueIdentifier[]
      | undefined;
    const cacheObjectEntries = Object.entries(
      client.cache.extract() as Record<string, Record<string, unknown>>,
    );

    const sortableItemsFromCache = sortableItems
      ?.map((sortableId) => {
        const a = cacheObjectEntries.find(([key]) =>
          sortableId === "now-divider"
            ? key === "now-divider"
            : String(sortableId).startsWith(key) || key === sortableId,
        );
        if (!a) return null;

        return [sortableId, a[1] as Workout] as const;
      })
      .filter(Boolean);

    const oldIndex = sortableItems?.indexOf(active.id);
    const newIndex = sortableItems?.indexOf(over.id);

    const newSortableItems =
      sortableItems &&
      oldIndex != null &&
      newIndex != null &&
      oldIndex > -1 &&
      newIndex > -1
        ? arrayMove(sortableItems, oldIndex, newIndex)
        : undefined;

    const newSortableCacheItems = newSortableItems
      ?.map((sortableId) => {
        if (sortableId === "now-divider") {
          return ["now-divider", NOW_SYMBOL] as const;
        }

        const entry = sortableItemsFromCache?.find(
          (pair) =>
            String(sortableId).startsWith(pair[0].toString()) ||
            pair[0] === sortableId,
        );

        if (!entry) return null;

        return String(sortableId).startsWith("Workout:") &&
          String(sortableId).split("-").length === 2
          ? ([
              sortableId,
              entry[1].exercises.find(
                (we) =>
                  String(we.exerciseId) === String(sortableId).split("-")[1],
              ),
            ] as const)
          : entry;
      })
      .filter(Boolean);

    const activeItem = newSortableCacheItems?.find(
      ([key]) => key === active.id,
    );
    const activeItemIndex =
      activeItem && newSortableCacheItems?.indexOf(activeItem);

    const precedingItem =
      activeItemIndex != null && activeItemIndex > -1
        ? newSortableCacheItems?.[activeItemIndex - 1]?.[1]
        : undefined;
    const followingItem =
      activeItemIndex != null && activeItemIndex > -1
        ? newSortableCacheItems?.[activeItemIndex + 1]?.[1]
        : undefined;

    const precedingDate =
      precedingItem &&
      (precedingItem === NOW_SYMBOL
        ? new Date()
        : getJournalEntryPrincipalDate(precedingItem)?.end);
    const followingDate =
      followingItem &&
      (followingItem === NOW_SYMBOL
        ? new Date()
        : getJournalEntryPrincipalDate(followingItem)?.start);

    const overStart =
      over.data.current.date && new Date(over.data.current.date);
    const dayStart = setHours(overStart, dayStartHour);
    const dayEnd = addMilliseconds(
      setHours(addHours(dayStart, 24), dayStartHour),
      -1,
    );
    let targetDate = dateMidpoint(
      precedingDate || dayStart,
      followingDate || dayEnd,
    );

    // Ensure targetDate is within the day boundaries
    targetDate = min([max([targetDate, dayStart]), dayEnd]);

    if (props.userId && active.data.current.nextSet) {
      const nextSet: NextSet = active.data.current.nextSet;

      void snoozeExerciseSchedule({
        variables: {
          input: {
            exerciseScheduleId: nextSet.scheduleEntry.id,
            snoozedUntil: targetDate,
          },
        },
        optimisticResponse: {
          snoozeExerciseSchedule: {
            __typename: "SnoozeExerciseSchedulePayload",
            exerciseSchedule: {
              ...nextSet.scheduleEntry,
              snoozedUntil: targetDate,
              nextSet: { ...nextSet, dueOn: targetDate },
            },
          },
        },
      });
      return;
    } else if (active.data.current.todo) {
      const todo: Todo = active.data.current.todo;

      if (isFuture(targetDate)) {
        const updatedTodo = {
          start: targetDate,
          completed: null,
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
