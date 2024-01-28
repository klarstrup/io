import { Fragment } from "react";
import { getLiftingTrainingData } from "../../sources/fitocracy";

export default function LiftByLift({
  liftByLift,
}: {
  liftByLift: NonNullable<
    Awaited<ReturnType<typeof getLiftingTrainingData>>
  >["liftByLift"];
}) {
  return (
    <div>
      <header>Top lifts:</header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: "4px",
        }}
      >
        {liftByLift.map(([exercise, set]) => (
          <Fragment key={exercise.id}>
            <div
              style={{
                flex: 1,
                textAlign: "right",
              }}
            >
              <small>
                <span
                  style={{
                    color: set.is_personal_record ? "red" : undefined,
                  }}
                >
                  {(exercise.aliases[1] || exercise.name).replace(
                    "Barbell",
                    ""
                  )}
                </span>
                :
              </small>
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>
              {set.description_string}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
