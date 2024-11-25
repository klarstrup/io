import type { WithId } from "mongodb";
import type { Session } from "next-auth";
import {
  MaterializedWorkoutsView,
  Workouts,
} from "../../../models/workout.server";
import { workoutFromFitocracyWorkout } from "../../../sources/fitocracy";
import { FitocracyWorkouts } from "../../../sources/fitocracy.server";
import {
  type KilterBoard,
  KilterBoardAscents,
  workoutFromKilterBoardAscents,
} from "../../../sources/kilterboard";
import { workoutFromRunDouble } from "../../../sources/rundouble";
import { RunDoubleRuns } from "../../../sources/rundouble.server";
import { dateToString } from "../../../utils";
import {
  dereferenceDocument,
  TopLoggerGraphQL,
  workoutFromTopLoggerClimbUsers,
} from "../../../utils/graphql";
import type {
  TopLoggerClimbUser,
  TopLoggerClimbUserDereferenced,
} from "../toplogger_gql_scrape/route";

export async function* materializeAllToploggerWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  if (!user.topLoggerGraphQLId) return;

  const climbUsers = await TopLoggerGraphQL.find<WithId<TopLoggerClimbUser>>({
    __typename: "ClimbUser",
    userId: user.topLoggerGraphQLId,
  }).toArray();

  const dereferencedClimbUsers = await Promise.all(
    climbUsers.map((climbUser) =>
      dereferenceDocument<
        WithId<TopLoggerClimbUser>,
        WithId<TopLoggerClimbUserDereferenced>
      >(climbUser),
    ),
  );

  const climbUsersByDay = Object.values(
    dereferencedClimbUsers
      .sort((a, b) =>
        a.holdColor.nameLoc
          .toLowerCase()
          .localeCompare(b.holdColor.nameLoc.toLowerCase()),
      )
      .sort((a, b) => a.climb.grade - b.climb.grade)
      .reduce(
        (acc, climbUser) => {
          if (!climbUser.tickedFirstAtDate) return acc;
          const date = dateToString(climbUser.tickedFirstAtDate);

          if (!Array.isArray(acc[date])) {
            acc[date] = [climbUser];
          } else {
            acc[date].push(climbUser);
          }

          return acc;
        },
        {} as Record<
          `${number}-${number}-${number}`,
          WithId<TopLoggerClimbUserDereferenced>[]
        >,
      ),
  );

  for (const climbUsersOfDay of climbUsersByDay) {
    const workout = workoutFromTopLoggerClimbUsers(user, climbUsersOfDay);

    yield await MaterializedWorkoutsView.updateOne(
      { id: workout.id },
      { $set: workout },
      { upsert: true },
    );
  }
}

export async function* materializeAllIoWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  for await (const { _id, ...workout } of Workouts.find({
    userId: user.id,
    deletedAt: { $exists: false },
  })) {
    yield await MaterializedWorkoutsView.updateOne(
      { id: _id.toString() },
      { $set: { ...workout, id: _id.toString() } },
      { upsert: true },
    );
  }
}

export async function* materializeAllFitocracyWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  if (!user.fitocracyUserId) return;

  for await (const fitocracyWorkout of FitocracyWorkouts.find({
    user_id: user.fitocracyUserId,
  })) {
    const workout = workoutFromFitocracyWorkout(user, fitocracyWorkout);

    yield await MaterializedWorkoutsView.updateOne(
      { id: workout.id },
      { $set: workout },
      { upsert: true },
    );
  }
}

export async function* materializeAllRunDoubleWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  if (!user.runDoubleId) return;

  for await (const runDoubleRun of RunDoubleRuns.find({
    userId: user.runDoubleId,
  })) {
    const workout = workoutFromRunDouble(user, runDoubleRun);

    yield await MaterializedWorkoutsView.updateOne(
      { id: workout.id },
      { $set: workout },
      { upsert: true },
    );
  }
}

export async function* materializeAllKilterBoardWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  const ascents = await KilterBoardAscents.find({ user_id: 158721 }).toArray();

  const ascentsByDay = Object.values(
    ascents.reduce(
      (acc, ascent) => {
        if (!ascent.climbed_at) return acc;
        const date = dateToString(ascent.climbed_at);

        if (!Array.isArray(acc[date])) {
          acc[date] = [ascent];
        } else {
          acc[date].push(ascent);
        }

        return acc;
      },
      {} as Record<
        `${number}-${number}-${number}`,
        WithId<KilterBoard.Ascent>[]
      >,
    ),
  );

  for (const ascentsOfDay of ascentsByDay) {
    const workout = workoutFromKilterBoardAscents(user, ascentsOfDay);

    yield await MaterializedWorkoutsView.updateOne(
      { id: workout.id },
      { $set: workout },
      { upsert: true },
    );
  }
}
