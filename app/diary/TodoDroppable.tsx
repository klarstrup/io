"use client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import {
  closestCenter,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  MouseSensor,
  rectIntersection,
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
import { isDate, isFuture, isPast, max, min } from "date-fns";
import gql from "graphql-tag";
import type { ReactNode } from "react";
import {
  type NextSet,
  SnoozeExerciseScheduleDocument,
  type Todo,
  UpdateTodoDocument,
  UpdateWorkoutDocument,
  type Workout,
} from "../../graphql.generated";
import {
  dateMidpoint,
  endOfDayButItRespectsDayStartHour,
  isSameDayButItRespectsDayStartHour,
  startOfDayButItRespectsDayStartHour,
} from "../../utils";
import { getJournalEntryPrincipalDate, type JournalEntry } from "./diaryUtils";

export function TodoDroppable(props: { children: ReactNode; date: Date }) {
  const { isOver, setNodeRef } = useDroppable({
    id: "droppable-day-" + new Date(props.date).toISOString().split("T")[0]!,
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

gql`
  mutation UpdateWorkout($input: UpdateWorkoutInput!) {
    updateWorkout(input: $input) {
      workout {
        id
        createdAt
        updatedAt
        workedOutAt
        materializedAt
        locationId
        source
        exercises {
          exerciseId
          displayName
          comment
          exerciseInfo {
            id
            aliases
            name
            isHidden
            inputs {
              type
            }
            instructions {
              value
            }
            tags {
              name
              type
            }
          }
          sets {
            comment
            createdAt
            updatedAt
            inputs {
              unit
              value
              assistType
            }
            meta {
              key
              value
            }
          }
        }
      }
    }
  }
`;

const customCollisionDetectionAlgorithm: CollisionDetection = ({
  droppableContainers,
  ...args
}) => {
  const dateBeingDragged = args.active.data.current?.date as Date;

  const rectIntersectionCollisions = rectIntersection({
    ...args,
    droppableContainers: droppableContainers.filter(
      ({ id, data }) =>
        String(id).startsWith("droppable-day-") &&
        data.current &&
        "date" in data.current &&
        (typeof data.current.date === "string" ||
          typeof data.current.date === "number" ||
          isDate(data.current.date)) &&
        !isSameDayButItRespectsDayStartHour(
          data.current.date,
          dateBeingDragged,
        ),
    ),
  });

  // Collision detection algorithms return an array of collisions
  if (rectIntersectionCollisions.length > 0) {
    // The trash is intersecting, return early
    return rectIntersectionCollisions;
  }

  // Compute other collisions
  return closestCenter({
    ...args,
    droppableContainers: droppableContainers.filter(
      ({ id, data }) =>
        !String(id).startsWith("droppable-day-") &&
        data.current &&
        "date" in data.current &&
        (typeof data.current.date === "string" ||
          typeof data.current.date === "number" ||
          isDate(data.current.date)) &&
        isSameDayButItRespectsDayStartHour(data.current.date, dateBeingDragged),
    ),
  });
};

export function TodoDragDropContainer(props: { children: ReactNode }) {
  const client = useApolloClient();
  const [updateTodo] = useMutation(UpdateTodoDocument);
  const [snoozeExerciseSchedule] = useMutation(SnoozeExerciseScheduleDocument);
  const [updateWorkout] = useMutation(UpdateWorkoutDocument);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active.data.current || !over?.data.current) return;

    const overCurrent = over.data.current as Record<string, unknown>;
    const activeCurrent = active.data.current as Record<string, unknown>;

    console.log("Drag ended", { active, over });

    const items: UniqueIdentifier[] | undefined =
      typeof overCurrent === "object" &&
      overCurrent &&
      "sortable" in overCurrent &&
      typeof overCurrent.sortable === "object" &&
      overCurrent.sortable &&
      "items" in overCurrent.sortable &&
      Array.isArray(overCurrent.sortable.items)
        ? overCurrent.sortable.items
        : undefined;

    const sortableItems = items?.map((id) => String(id));
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

    const precedingDate =
      precedingEntry &&
      (precedingEntry[1] === NOW_SYMBOL
        ? new Date()
        : precedingEntry[0].startsWith("end-of-") ||
            precedingEntry[0].startsWith("Sleep:")
          ? getJournalEntryPrincipalDate(precedingEntry[1])?.end
          : getJournalEntryPrincipalDate(precedingEntry[1])?.start);

    const followingDate =
      followingEntry &&
      (followingEntry[1] === NOW_SYMBOL
        ? new Date()
        : followingEntry[0].startsWith("end-of-")
          ? getJournalEntryPrincipalDate(followingEntry[1])?.end
          : getJournalEntryPrincipalDate(followingEntry[1])?.start);

    const overStart =
      overCurrent.date &&
      (typeof overCurrent.date === "string" ||
        typeof overCurrent.date === "number" ||
        isDate(overCurrent.date))
        ? new Date(overCurrent.date)
        : undefined;
    const dayStart = startOfDayButItRespectsDayStartHour(overStart!);
    const dayEnd = endOfDayButItRespectsDayStartHour(overStart!);

    let targetDate = dateMidpoint(
      precedingDate || dayStart,
      followingDate || dayEnd,
    );

    // Ensure targetDate is within the day boundaries
    targetDate = min([max([targetDate, dayStart]), dayEnd]);
    console.log({ targetDate, precedingDate, followingDate, dayStart, dayEnd });

    if (activeCurrent.nextSet) {
      const nextSet = activeCurrent.nextSet as NextSet;

      void snoozeExerciseSchedule({
        variables: {
          input: {
            exerciseScheduleId: nextSet.exerciseSchedule.id,
            snoozedUntil: targetDate,
          },
        },
        optimisticResponse: {
          snoozeExerciseSchedule: {
            __typename: "SnoozeExerciseSchedulePayload",
            exerciseSchedule: {
              ...nextSet.exerciseSchedule,
              snoozedUntil: targetDate,
              nextSet: { ...nextSet, dueOn: targetDate },
            },
          },
        },
      });
      return;
    } else if (activeCurrent.todo) {
      const todo = activeCurrent.todo as Todo;

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
    } else if (activeCurrent.workout) {
      const workout = activeCurrent.workout as Workout;

      if (isPast(targetDate)) {
        void updateWorkout({
          variables: {
            input: {
              id: workout.id,
              data: { workedOutAt: targetDate },
            },
          },
          optimisticResponse: {
            updateWorkout: {
              __typename: "UpdateWorkoutPayload",
              workout: { ...workout, workedOutAt: targetDate },
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
      collisionDetection={customCollisionDetectionAlgorithm}
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
