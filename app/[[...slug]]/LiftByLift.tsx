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
          fontSize: "0.75em",
          alignItems: "center",
        }}
      >
        {liftByLift.map(([exercise, set]) => (
          <Fragment key={exercise.id}>
            <div style={{ flex: 1, textAlign: "right" }}>
              <span
                style={{ color: set.is_personal_record ? "red" : undefined }}
              >
                {(exercise.aliases[1] || exercise.name).replace("Barbell", "")}
              </span>
              :
            </div>
            <div
              style={{
                flex: 1,
                textAlign: "right",
                fontSize: "1.5em",
                fontWeight: 600,
              }}
            >
              {set.description_string}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
