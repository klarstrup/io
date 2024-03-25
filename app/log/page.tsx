import dbConnect from "../../dbConnect";
import { User } from "../../models/user";
import {
  Fitocracy,
  exercises,
  getExercises,
  getUserProfileBySessionId,
} from "../../sources/fitocracy";

let exercisesById = exercises;

export default async function Page() {
  // Io is the only user in the database,
  const user = (await User.findOne())!;

  const fitocracySessionId = user?.fitocracySessionId;
  if (!fitocracySessionId) return null;

  let fitocracyUserId = user.fitocracyUserId;
  if (!fitocracyUserId) {
    const fitocracySessionId = user?.fitocracySessionId;
    if (!fitocracySessionId) return null;
    let fitocracyProfile: Fitocracy.ProfileData;
    try {
      fitocracyProfile = await getUserProfileBySessionId(fitocracySessionId);
    } catch (e) {
      return null;
    }
    fitocracyUserId = fitocracyProfile.id;
    await user.updateOne({ fitocracyUserId });
  }

  if (!exercisesById) {
    exercisesById = await getExercises(fitocracySessionId);
  }

  const workoutsCollection = (
    await dbConnect()
  ).connection.db.collection<Fitocracy.MongoWorkout>("fitocracy_workouts");

  return (
    <div>
      <ul>
        {(
          await workoutsCollection
            .find(
              { user_id: fitocracyUserId },
              { sort: { workout_timestamp: -1 } }
            )
            .toArray()
        ).map((workout) => (
          <li key={workout.id}>
            <h3>{String(workout.workout_timestamp)}</h3>
            <ul style={{ display: "flex", gap: "4em" }}>
              {workout.root_group.children.map((exercise) => (
                <li key={exercise.id}>
                  <h4>
                    {
                      exercisesById?.find(
                        ({ id }) => exercise.exercise.exercise_id === id
                      )?.name
                    }
                  </h4>
                  <ul>
                    {exercise.exercise.sets.map((set) => (
                      <li key={set.id}>
                        {set.description_string} {set.points}pts
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
