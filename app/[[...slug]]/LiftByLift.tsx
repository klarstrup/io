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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto auto",
        columnGap: "4px",
        fontSize: "0.75em",
        alignItems: "center",
      }}
    >
      {Array.from(liftByLift)
        .sort(([a], [b]) =>
          Intl.Collator("en-DK").compare(
            a.aliases[1] || a.name,
            b.aliases[1] || b.name
          )
        )
        .map(([exercise, set]) => (
          <Fragment key={exercise.id}>
            <div style={{ textAlign: "right" }}>
              <span
                style={{ color: set.is_personal_record ? "red" : undefined }}
              >
                {(exercise.aliases[1] || exercise.name).replace("Barbell", "")}
              </span>
              :
            </div>
            <div
              style={{
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
  );
}
