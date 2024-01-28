import Link from "next/link";
import { getLiftingTrainingData } from "../../sources/fitocracy";
import { getRunningTrainingData } from "../../sources/rundouble";
import { getBoulderingTrainingData } from "../../sources/toplogger";
import ProblemByProblem from "./ProblemByProblem";
import RunByRun from "./RunByRun";
import LiftByLift from "./LiftByLift";

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
    <div style={{ display: "flex", gap: "4px" }} data-via={training.source}>
      <Link
        title={`${discipline} ${type}`}
        href={urlDisciplines?.includes(discipline) ? "/" : `/${discipline}`}
        style={{
          textDecoration: "none",
          cursor: "pointer",
          fontSize: "24px",
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
          <div style={{ width: "100%" }}>
            <header>Top sends:</header>
            <ProblemByProblem problemByProblem={training.problemByProblem} />
          </div>
        ) : (
          `×${count}`
        )
      ) : discipline === "lifting" ? (
        <div style={{ width: "100%" }}>
          <header>Top lifts:</header>
          <LiftByLift liftByLift={training.liftByLift} />
        </div>
      ) : discipline === "running" ? (
        "runByRun" in training &&
        training.runByRun &&
        Array.isArray(training.runByRun) &&
        training.runByRun.length ? (
          <div style={{ width: "100%" }}>
            <header>Top runs:</header>
            <RunByRun runByRun={training.runByRun} />
          </div>
        ) : (
          ` ${count}km`
        )
      ) : null}
    </div>
  );
}
