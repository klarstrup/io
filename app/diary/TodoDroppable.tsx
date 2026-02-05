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
import { getJournalEntryPrincipalDate, type JournalEntry } from "./diaryUtils";

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

    const sortableItems = (
      over.data.current.sortable?.items as UniqueIdentifier[] | undefined
    )?.map(String);
    const cacheObjectEntries = Object.entries(
      client.cache.extract() as Record<string, Record<string, unknown>>,
    );

    const sortableItemsFromCache = sortableItems
      ?.map((sortableId) => {
        const a = cacheObjectEntries.find(([key]) =>
          sortableId === "now-divider"
            ? key === "now-divider"
            : sortableId.startsWith(key) ||
              key === sortableId ||
              (sortableId.startsWith("end-of-") &&
                key === sortableId.replace("end-of-", "")),
        ) as [string, JournalEntry] | undefined;
        if (!a) return null;

        return [sortableId, a[1] as Workout] as const;
      })
      .filter(Boolean);

    const oldIndex = sortableItems?.indexOf(active.id.toString());
    const newIndex = sortableItems?.indexOf(over.id.toString());

    const newSortableItems =
      sortableItems &&
      oldIndex != null &&
      newIndex != null &&
      oldIndex > -1 &&
      newIndex > -1
        ? arrayMove(sortableItems, oldIndex, newIndex)
        : undefined;

    const newSortableCacheEntries = newSortableItems
      ?.map(
        (
          sortableId,
        ): readonly [string, JournalEntry | typeof NOW_SYMBOL] | null => {
          let item: JournalEntry | typeof NOW_SYMBOL | undefined;
          if (sortableId === "now-divider") item = NOW_SYMBOL;

          if (sortableId.startsWith("end-of-Event:")) {
            item = sortableItemsFromCache?.find(
              ([key]) => key === sortableId.replace("end-of-", ""),
            )?.[1];
          }

          item = sortableItemsFromCache?.find(
            ([key]) => sortableId.startsWith(key) || key === sortableId,
          )?.[1];

          if (
            sortableId.startsWith("Workout:") &&
            sortableId.split("-").length === 2
          ) {
            const workoutExercise = item?.exercises.find(
              (we) => String(we.exerciseId) === sortableId.split("-")[1],
            );

            item = workoutExercise;
          }

          if (!item) return null;

          return [sortableId, item] as const;
        },
      )
      .filter(Boolean);

    console.log(newSortableCacheEntries);

    const activeEntry = newSortableCacheEntries?.find(
      ([key]) => key === active.id.toString(),
    );
    const activeEntryIndex =
      activeEntry && newSortableCacheEntries?.indexOf(activeEntry);

    const precedingEntry =
      activeEntryIndex != null && activeEntryIndex > -1
        ? newSortableCacheEntries?.[activeEntryIndex - 1]
        : undefined;
    const followingEntry =
      activeEntryIndex != null && activeEntryIndex > -1
        ? newSortableCacheEntries?.[activeEntryIndex + 1]
        : undefined;

    let precedingDate =
      precedingEntry &&
      (precedingEntry[1] === NOW_SYMBOL
        ? new Date()
        : precedingEntry[0].startsWith("end-of-")
          ? getJournalEntryPrincipalDate(precedingEntry[1])?.end
          : getJournalEntryPrincipalDate(precedingEntry[1])?.start);

    let followingDate =
      followingEntry &&
      (followingEntry[1] === NOW_SYMBOL
        ? new Date()
        : followingEntry[0].startsWith("end-of-")
          ? getJournalEntryPrincipalDate(followingEntry[1])?.end
          : getJournalEntryPrincipalDate(followingEntry[1])?.start);

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
    console.log({ targetDate });

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
