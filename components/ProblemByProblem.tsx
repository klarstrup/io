import type { SVGProps } from "react";
import Grade from "../grades";
import type { LocationData } from "../models/location";
import { type getIoClimbAlongCompetitionEvent } from "../sources/climbalong";
import { getIoOnsightCompetitionEvent } from "../sources/onsight";
import { type getIoTopLoggerCompEvent } from "../sources/toplogger";
import { countBy } from "../utils";

interface ProblemBadgeProps extends SVGProps<SVGSVGElement> {
  title?: string;
  grade?: string;
  angle?: number;
  circuitName?: string;
  attemptCount?: number;
}

const attemptRows = 5;
const columnWidth = 10;
const rowHeight = 10;
const AttemptBlibs = ({ attemptCount }: { attemptCount?: number }) =>
  attemptCount !== undefined
    ? Array.from({ length: attemptCount - 1 }, (_, i) => (
        <rect
          key={i}
          width={rowHeight}
          height={rowHeight}
          x={2 + ((i * (columnWidth + 1)) % (attemptRows * (columnWidth + 1)))}
          y={2 + ~~(i / attemptRows) * (rowHeight + 1)}
          fill="white"
          stroke={"currentColor"}
          strokeWidth={4}
        ></rect>
      ))
    : null;

const GradeText = ({ grade }: { grade: string }) => (
  <text
    y="40"
    x="4"
    dominantBaseline="central"
    textAnchor="start"
    fill="#fff"
    fontSize="30px"
    stroke="#000"
    paintOrder="stroke"
    strokeWidth="4px"
  >
    {grade}
  </text>
);

const AngleText = ({ angle }: { angle: number }) => (
  <text
    y="25"
    x="24"
    dominantBaseline="central"
    textAnchor="start"
    fill="#fff"
    fontSize="18px"
    stroke="#000"
    paintOrder="stroke"
    strokeWidth="3px"
  >
    {angle}°
  </text>
);

const FlashBadge = ({
  title,
  grade,
  angle,
  circuitName,
  attemptCount,
  ...props
}: ProblemBadgeProps) => (
  <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 58" {...props}>
    <title>{title}</title>
    <rect
      width="50"
      stroke="currentColor"
      y="4"
      x="4"
      fill="currentColor"
      height="50"
      strokeWidth="8"
    ></rect>
    <text
      y="25%"
      x="25%"
      dominantBaseline="central"
      textAnchor="middle"
      fill="#ffff00"
      fontSize="20px"
    >
      ⚡️
    </text>
    <AttemptBlibs attemptCount={attemptCount} />
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {circuitName ? (
      <GradeText grade={circuitName} />
    ) : grade ? (
      <GradeText grade={grade} />
    ) : null}
  </svg>
);
const TopBadge = ({
  title,
  grade,
  angle,
  circuitName,
  attemptCount,
  ...props
}: ProblemBadgeProps) => (
  <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 58" {...props}>
    <title>{title}</title>
    <rect
      width="50"
      stroke="currentColor"
      y="4"
      x="4"
      fill="currentColor"
      height="50"
      strokeWidth="8"
    ></rect>
    <AttemptBlibs attemptCount={attemptCount} />
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {circuitName ? (
      <GradeText grade={circuitName} />
    ) : grade ? (
      <GradeText grade={grade} />
    ) : null}
  </svg>
);
const ZoneBadge = ({
  title,
  grade,
  angle,
  circuitName,
  attemptCount,
  ...props
}: ProblemBadgeProps) => (
  <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 58" {...props}>
    <title>{title}</title>
    <rect
      width="50"
      stroke="currentColor"
      y="4"
      x="4"
      fill="none"
      height="50"
      strokeWidth="8"
    ></rect>
    <rect
      fill="currentColor"
      transform="translate(8,9) rotate(45)"
      width="60"
      height="60"
    ></rect>
    <AttemptBlibs attemptCount={attemptCount} />
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {circuitName ? (
      <GradeText grade={circuitName} />
    ) : grade ? (
      <GradeText grade={grade} />
    ) : null}
  </svg>
);
const AttemptBadge = ({
  title,
  grade,
  angle,
  circuitName,
  attemptCount,
  ...props
}: ProblemBadgeProps) => (
  <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 58" {...props}>
    <title>{title}</title>
    <rect
      width="50"
      stroke="currentColor"
      y="4"
      x="4"
      fill="none"
      height="50"
      strokeWidth="8"
    ></rect>
    <AttemptBlibs attemptCount={attemptCount} />
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {circuitName ? (
      <GradeText grade={circuitName} />
    ) : grade ? (
      <GradeText grade={grade} />
    ) : null}
  </svg>
);
const RepeatBadge = ({
  title,
  grade,
  angle,
  circuitName,
  attemptCount,
  ...props
}: ProblemBadgeProps) => (
  <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 58" {...props}>
    <title>{title}</title>
    <rect
      width="50"
      stroke="currentColor"
      y="4"
      x="4"
      fill="currentColor"
      height="50"
      strokeWidth="8"
    ></rect>
    <AttemptBlibs attemptCount={attemptCount} />
    <text
      y="20%"
      x="20%"
      dominantBaseline="central"
      textAnchor="middle"
      fill="#000"
      fontSize="18px"
      stroke="#fff"
    >
      🔁
    </text>
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {circuitName ? (
      <GradeText grade={circuitName} />
    ) : grade ? (
      <GradeText grade={grade} />
    ) : null}
  </svg>
);
const NoAttemptBadge = ({
  title,
  grade,
  angle,
  circuitName,
  attemptCount,
  ...props
}: ProblemBadgeProps) => (
  <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 58" {...props}>
    <title>{title}</title>
    <rect
      width="50"
      stroke="currentColor"
      opacity={0.5}
      y="4"
      x="4"
      fill="none"
      height="50"
      strokeWidth="8"
    ></rect>
    <AttemptBlibs attemptCount={attemptCount} />
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {circuitName ? (
      <GradeText grade={circuitName} />
    ) : grade ? (
      <GradeText grade={grade} />
    ) : null}
  </svg>
);

function ProblemBadge({
  number,
  flash,
  top,
  zone,
  attempt,
  repeat,
  grade,
  color: inColor,
  angle,
  circuit,
  attemptCount,
  name,
}: {
  number?: string | number;
  flash: boolean;
  top: boolean;
  zone: boolean;
  attempt: boolean;
  repeat: boolean;
  grade?: number;
  color?: string;
  angle?: number;
  circuit?: NonNullable<LocationData["boulderCircuits"]>[number];
  attemptCount?: number;
  name?: string;
}) {
  const Badge = flash
    ? FlashBadge
    : top
      ? TopBadge
      : zone
        ? ZoneBadge
        : attempt
          ? AttemptBadge
          : repeat
            ? RepeatBadge
            : NoAttemptBadge;

  let color = inColor;
  if (circuit?.labelColor) {
    color = circuit.labelColor;
  }
  if (!color && circuit?.holdColor) {
    color = circuit.holdColor;
  }

  return (
    <Badge
      style={{
        maxWidth: "100%",
        color:
          color === "mint"
            ? "#00E0E6"
            : color === "yellow"
              ? "#FFDE00"
              : color === "green"
                ? "#0CE600"
                : color === "red"
                  ? "#E60000"
                  : color === "purple"
                    ? "#800080"
                    : color === "orange"
                      ? "#FF9B2F"
                      : color === "white"
                        ? "#FFEFC1"
                        : color || "#c84821",
      }}
      key={number}
      grade={grade ? new Grade(grade).name : undefined}
      circuitName={
        circuit?.name
          ? (circuit.holdColor &&
              circuit?.name.toLowerCase().trim() === circuit.holdColor) ||
            (circuit.labelColor &&
              circuit?.name.toLowerCase().trim() === circuit.labelColor)
            ? " "
            : circuit?.name
          : undefined
      }
      angle={angle}
      attemptCount={attemptCount}
      title={
        (name ? name + ": " : "") +
        `${number}${
          number && grade ? `(${new Grade(grade).name})` : ""
        }${!number && grade ? new Grade(grade).name : ""}: ${
          flash
            ? "flash"
            : top
              ? "top"
              : zone
                ? "zone"
                : attempt
                  ? "no send"
                  : repeat
                    ? "repeat"
                    : "no attempt"
        }`
      }
    />
  );
}

type PP = NonNullable<
  Awaited<
    ReturnType<
      | typeof getIoClimbAlongCompetitionEvent
      | typeof getIoTopLoggerCompEvent
      | typeof getIoOnsightCompetitionEvent
    >
  >["problemByProblem"]
>[number] & {
  name?: string;
  angle?: number;
  circuit?: NonNullable<LocationData["boulderCircuits"]>[number];
  attemptCount?: number;
  estGrade?: number | null;
};

export default function ProblemByProblem({
  problemByProblem,
  className,
  groupByGradeAndFlash,
  groupByColorAndFlash,
}: {
  problemByProblem: PP[];
  className?: string;
  groupByGradeAndFlash?: boolean;
  groupByColorAndFlash?: boolean;
}) {
  if (!problemByProblem?.length) return null;

  const numericalCircuitNames = problemByProblem.every((p) =>
    Number(p.circuit?.name),
  );

  const sortedProblems = Array.from(problemByProblem)
    .sort((a, b) => Number(b.attempt) - Number(a.attempt))
    .sort((a, b) => Number(b.zone) - Number(a.zone))
    .sort((a, b) => Number(b.repeat) - Number(a.repeat))
    .sort((a, b) => Number(b.top) - Number(a.top))
    .sort((a, b) => Number(b.flash) - Number(a.flash))
    .sort(
      (a, b) => Number(b.grade || b.estGrade) - Number(a.grade || a.estGrade),
    )
    .sort((a, b) =>
      numericalCircuitNames
        ? (Number(b.circuit?.name) || 0) - (Number(a.circuit?.name) || 0)
        : 0,
    );

  // @ts-expect-error - disabled for now
  if ((groupByGradeAndFlash || groupByColorAndFlash) && !"nope") {
    const grouped = new Map<string, [PP, ...PP[]]>();
    for (const problem of sortedProblems) {
      const gradeOrColor = groupByGradeAndFlash
        ? problem.grade
        : groupByColorAndFlash
          ? problem.color
          : "";
      const flash = problem.flash;
      const top = problem.top;
      const zone = problem.zone;
      const attempt = problem.attempt;
      const repeat = problem.repeat;
      const key = [
        groupByGradeAndFlash && problem.grade
          ? new Grade(problem.grade).name
          : gradeOrColor,
        flash,
        top,
        zone,
        attempt,
        repeat,
        problem.angle,
      ].join("-");
      if (!grouped.has(key)) {
        grouped.set(key, [problem]);
      } else {
        grouped.get(key)!.push(problem);
      }
    }

    return (
      <div
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))" }}
        className={
          "mt-0.5 grid content-between justify-between gap-0.5 " +
          (className ? className : "")
        }
      >
        {Array.from(grouped)
          .sort((a, b) => Number(b[1][0].grade) - Number(a[1][0].grade))
          .sort((a, b) => Number(b[1][0].angle) - Number(a[1][0].angle))
          .map(([, problems], i) => {
            const mostCommonColor = Object.entries(
              countBy(problems, "color"),
            ).sort((a, b) => Number(b[1]) - Number(a[1]))[0]![0];

            return (
              <div key={i} className="flex items-center">
                <span>{problems.length}</span>
                <span className="px-0.5 py-0">×</span>
                <ProblemBadge
                  {...problems.find(({ color }) => color === mostCommonColor)!}
                />
              </div>
            );
          })}
      </div>
    );
  }

  return (
    <div
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(30px, 1fr))" }}
      className={"mt-0.5 grid gap-0.5 " + (className ? className : "")}
    >
      {sortedProblems.map((problem, i) => (
        <ProblemBadge key={i} {...problem} />
      ))}
    </div>
  );
}
