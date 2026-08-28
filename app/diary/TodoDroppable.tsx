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
import { addMinutes, isDate, isFuture, isPast, max, min } from "date-fns";
import gql from "graphql-tag";
import { type ReactNode, useId } from "react";
import {
  type GQNextSet,
  type GQTodo,
  type GQUpdateTodoInput,
  type GQWorkout,
  SnoozeExerciseScheduleDocument,
  UpdateTodoDocument,
  UpdateWorkoutWorkedOutAtDocument,
} from "../../graphql.generated/graphql";
import { useEvent } from "../../hooks";
import {
  dateMidpoint,
  endOfDayButItRespectsDayStartHour,
  haptic,
  isSameDayButItRespectsDayStartHour,
  omitUndefined,
  startOfDayButItRespectsDayStartHour,
} from "../../utils";
import {
  getJournalEntryPrincipalDate,
  type JournalEntry,
  type NowDividerEntry,
} from "./diaryUtils";

export function TodoDroppable(props: { children: ReactNode; date: Date }) {
  const { isOver, setNodeRef } = useDroppable({
    id: "droppable-day-" + new Date(props.date).toISOString().split("T")[0]!,
    data: { date: props.date },
  });

  return (
    <div
      ref={setNodeRef}
      className={
        "flex flex-col items-center lg:h-full lg:w-[40vw] lg:max-w-xl lg:items-stretch " +
        (isOver
          ? "rounded-lg outline-4 outline-offset-4 outline-purple-500"
          : "")
      }
    >
      {props.children}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation UpdateWorkoutWorkedOutAt($input: UpdateWorkoutWorkedOutAtInput!) {
    updateWorkoutWorkedOutAt(input: $input) {
      workout {
        id
        createdAt
        updatedAt
        workedOutAt
        materializedAt
        locationId
        source
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
  const [updateWorkoutWorkedOutAt] = useMutation(
    UpdateWorkoutWorkedOutAtDocument,
  );

  const handleDragEnd = useEvent((event: DragEndEvent) => {
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

    let nowItemDate = event.collisions?.find(
      (collision) => collision.id === "now-divider",
    )?.data?.droppableContainer?.data?.current?.date as Date | undefined;
    nowItemDate ||= new Date();

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
      ?.map((sortableId): [string, JournalEntry] | undefined => {
        const sortableIdWithoutEndOfPrefix = sortableId.startsWith("end-of-")
          ? sortableId.replace("end-of-", "")
          : sortableId;

        if (sortableId === "now-divider") {
          return [
            sortableId,
            {
              __typename: "NowDivider",
              id: "now-divider",
              start: nowItemDate,
              end: nowItemDate,
            } satisfies NowDividerEntry,
          ] satisfies [string, JournalEntry];
        }

        const entry = cacheObjectEntries?.find(
          ([key]) => key === sortableIdWithoutEndOfPrefix,
        ) as JournalEntry | undefined;

        return entry && ([sortableId, entry[1]] as const);
      })
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
      (precedingEntry[0].startsWith("end-of-")
        ? getJournalEntryPrincipalDate(precedingEntry[1])?.end
        : getJournalEntryPrincipalDate(precedingEntry[1])?.start);

    const followingDate =
      followingEntry &&
      (followingEntry[0].startsWith("end-of-")
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

    if (
      typeof activeCurrent.entry === "object" &&
      activeCurrent.entry &&
      "__typename" in activeCurrent.entry &&
      activeCurrent.entry.__typename === "NextSet"
    ) {
      const nextSet = activeCurrent.entry as GQNextSet;

      // Exercise schedules can only be snoozed into the future, so if the target date is in the past, we set it to now
      targetDate = max([targetDate, addMinutes(new Date(), 2)]);

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
              ...omitUndefined(nextSet.exerciseSchedule),
              snoozedUntil: targetDate,
              // @ts-expect-error -- I don't fucking care, deep required is a pain to type.
              nextSet: { ...omitUndefined(nextSet), dueOn: targetDate },
            },
          },
        },
      });
      return;
    } else if (
      typeof activeCurrent.entry === "object" &&
      activeCurrent.entry &&
      "__typename" in activeCurrent.entry &&
      activeCurrent.entry.__typename === "Todo"
    ) {
      const todo = activeCurrent.entry as GQTodo;

      if (isFuture(targetDate)) {
        const updatedTodo = {
          due: targetDate,
          completed: null,
        } satisfies GQUpdateTodoInput["data"];

        void updateTodo({
          variables: {
            input: { id: todo.id, data: updatedTodo },
          },
          optimisticResponse: {
            updateTodo: {
              __typename: "UpdateTodoPayload",
              todo: { ...omitUndefined(todo), ...updatedTodo },
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
              todo: { ...omitUndefined(todo), ...updatedTodo },
            },
          },
        });
      }
    } else if (
      typeof activeCurrent.entry === "object" &&
      activeCurrent.entry &&
      "__typename" in activeCurrent.entry &&
      activeCurrent.entry.__typename === "Workout"
    ) {
      const workout = activeCurrent.entry as GQWorkout;

      if (isPast(targetDate)) {
        void updateWorkoutWorkedOutAt({
          variables: {
            input: {
              id: workout.id,
              data: { workedOutAt: targetDate },
            },
          },
          optimisticResponse: {
            updateWorkoutWorkedOutAt: {
              __typename: "UpdateWorkoutPayload",
              workout: { ...omitUndefined(workout), workedOutAt: targetDate },
            },
          },
          refetchQueries: ["DiaryAgendaDayUserTodos"],
          update(cache, { data }) {
            if (!data?.updateWorkoutWorkedOutAt?.workout) return;

            cache.modify({
              id: cache.identify(data.updateWorkoutWorkedOutAt.workout),
              fields: {
                workedOutAt(d) {
                  return targetDate;
                },
              },
            });
          },
        });
      }
    }

    haptic();
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 10 },
    }),
  );

  const id = useId();

  return (
    <DndContext
      id={"TodoDragDropContainer-" + id}
      sensors={sensors}
      onDragStart={() => haptic()}
      onDragEnd={handleDragEnd}
      collisionDetection={customCollisionDetectionAlgorithm}
    >
      {props.children}
    </DndContext>
  );
}

export function TodoSortableContext({
  children,
  ...props
}: SortableContextProps) {
  return (
    <SortableContext strategy={verticalListSortingStrategy} {...props}>
      {children}
    </SortableContext>
  );
}
