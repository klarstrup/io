"use client";
import { useQuery } from "@apollo/client/react";
import { TZDate } from "@date-fns/tz";
import { gql } from "graphql-tag";
import { auth } from "../../../../auth";
import { GetUserLocationsDocument } from "../../../../graphql.generated";
import { dateToString, DEFAULT_TIMEZONE } from "../../../../utils";
import { WorkoutForm } from "../../WorkoutForm";

export default function DiaryNewWorkout(props: {
  date: `${number}-${number}-${number}`;
  user: NonNullable<Awaited<ReturnType<typeof auth>>>["user"];
}) {
  const { date, user } = props;

  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const isToday = date === dateToString(TZDate.tz(timeZone));

  const dismissTo = isToday ? "/diary" : (`/diary/${date}` as const);

  const { data, dataState } = useQuery(
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
  const locations = data?.user?.locations;
  const exercisesStats = data?.user?.exerciseStats;

  if (!locations || dataState !== "complete") return null;

  return (
    <WorkoutForm
      date={date}
      user={user}
      locations={locations}
      exercisesStats={exercisesStats ?? undefined}
      dismissTo={dismissTo}
    />
  );
}
