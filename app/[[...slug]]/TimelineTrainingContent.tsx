import Link from "next/link";
import { getLiftingTrainingData } from "../../sources/fitocracy";
import { getRunningTrainingData } from "../../sources/rundouble";
import { getBoulderingTrainingData } from "../../sources/toplogger";
import ProblemByProblem from "./ProblemByProblem";

export default function TimelineTrainingContent({
  training,
  urlDisciplines,
}: {
  training:
    | Awaited<ReturnType<typeof getLiftingTrainingData>>
    | Awaited<ReturnType<typeof getRunningTrainingData>>
    | Awaited<ReturnType<typeof getBoulderingTrainingData>>;
  urlDisciplines?: string[];
}) {
  const { type, discipline, count } = training;

  return (
    <div key={discipline} style={{ display: "flex" }}>
      <Link
        title={`${discipline} ${type}`}
        href={urlDisciplines?.includes(discipline) ? "/" : `/${discipline}`}
        style={{
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        {discipline === "bouldering"
          ? `🧗‍♀️`
          : discipline === "lifting"
          ? `🏋️‍♀️`
          : discipline === "running"
          ? `🏃‍♀️`
          : null}
      </Link>
      {discipline === "bouldering" ? (
        "problemByProblem" in training ? (
          <ProblemByProblem problemByProblem={training.problemByProblem} />
        ) : (
          `×${count}`
        )
      ) : discipline === "lifting" ? (
        ` ${count}kg`
      ) : discipline === "running" ? (
        ` ${count}km`
      ) : null}
    </div>
  );
}
