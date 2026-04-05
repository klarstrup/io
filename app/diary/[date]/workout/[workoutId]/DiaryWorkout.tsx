"use client";

import { useQuery } from "@apollo/client/react";
import { TZDate } from "@date-fns/tz";
import gql from "graphql-tag";
import { auth } from "../../../../../auth";
import {
  GetUserLocationsDocument,
  GetWorkoutDocument,
} from "../../../../../graphql.generated";
import { dateToString, DEFAULT_TIMEZONE } from "../../../../../utils";
import { WorkoutForm } from "../../../WorkoutForm";

export default function DiaryWorkout(props: {
  date: `${number}-${number}-${number}`;
  workoutId: string;
  user: NonNullable<Awaited<ReturnType<typeof auth>>>["user"];
}) {
  const { date, workoutId, user } = props;

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const isToday = date === dateToString(TZDate.tz(timeZone));

  const { data } = useQuery(
    gql`
      query GetWorkout($id: ID!) {
        user {
          id
          workout(id: $id) {
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
    ` as unknown as typeof GetWorkoutDocument,
    {
      variables: { id: workoutId },
    },
  );
  const workout = data?.user?.workout;

  const { data: data2 } = useQuery(
    gql`
      query GetUserLocations {
        user {
          id
          locations {
            id
            createdAt
            updatedAt
            name
            userId
            knownAddresses
            visitCount
            mostRecentVisit
            boulderCircuits {
              id
              holdColor
              gradeEstimate
              gradeRange
              name
              labelColor
              hasZones
              description
              createdAt
              updatedAt
            }
          }
          exerciseStats {
            id
            exerciseId
            workedOutAt
            exerciseCount
            monthlyCount
            quarterlyCount
          }
        }
      }
    ` as unknown as typeof GetUserLocationsDocument,
  );
  const locations = data2?.user?.locations;
  const exercisesStats = data2?.user?.exerciseStats;

  if (!workout || !locations) return null;

  const dismissTo = isToday ? "/diary" : (`/diary/${date}` as const);

  return (
    <WorkoutForm
      key={workout.id + workout.updatedAt.toString()}
      date={date}
      user={user}
      workout={workout}
      locations={locations}
      exercisesStats={exercisesStats ?? undefined}
      dismissTo={dismissTo}
    />
  );
}
