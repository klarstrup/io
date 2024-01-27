import Link from "next/link";
import { getLiftingTrainingData } from "../../sources/fitocracy";
import { getRunningTrainingData } from "../../sources/rundouble";
import { getBoulderingTrainingData } from "../../sources/toplogger";
import ProblemByProblem from "./ProblemByProblem";
import RunByRun from "./RunByRun";

export default function TimelineTrainingContent({
  training,
  urlDisciplines,
}: {
  training: NonNullable<
    | Awaited<ReturnType<typeof getLiftingTrainingData>>
    | Awaited<ReturnType<typeof getRunningTrainingData>>
    | Awaited<ReturnType<typeof getBoulderingTrainingData>>
  >;
  urlDisciplines?: string[];
}) {
  const { type, discipline, count } = training;

  return (
    <div style={{ display: "flex" }} data-via={training.source}>
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
        ` ${count.toLocaleString("en-US", { minimumFractionDigits: 2 })}kg`
      ) : discipline === "running" ? (
        "runByRun" in training &&
        training.runByRun &&
        Array.isArray(training.runByRun) ? (
          <RunByRun runByRun={training.runByRun} />
        ) : (
          ` ${count}km`
        )
      ) : null}
    </div>
  );
}
