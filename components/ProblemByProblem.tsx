import type { SVGProps } from "react";
import Grade from "../grades";
import { type getIoClimbAlongCompetitionEvent } from "../sources/climbalong";
import { type getIoTopLoggerGroupEvent } from "../sources/toplogger";

interface ProblemBadgeProps extends SVGProps<SVGSVGElement> {
  title?: string;
  grade?: string;
}

const GradeText = ({ grade }: { grade: string }) => (
  <text
    y="38"
    x="8"
    dominantBaseline="central"
    textAnchor="start"
    fill="#fff"
    fontSize="28px"
    stroke="#000"
    paintOrder="stroke"
    strokeWidth="3px"
  >
    {grade}
  </text>
);

const FlashBadge = ({ title, grade, ...props }: ProblemBadgeProps) => (
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
      y="30%"
      x="70%"
      dominantBaseline="central"
      textAnchor="middle"
      fill="#ffff00"
      fontSize="26px"
    >
      ⚡️
    </text>
    {grade ? <GradeText grade={grade} /> : null}
  </svg>
);
const TopBadge = ({ title, grade, ...props }: ProblemBadgeProps) => (
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
    {grade ? <GradeText grade={grade} /> : null}
  </svg>
);
const ZoneBadge = ({ title, grade, ...props }: ProblemBadgeProps) => (
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
    {grade ? <GradeText grade={grade} /> : null}
  </svg>
);
const AttemptBadge = ({ title, grade, ...props }: ProblemBadgeProps) => (
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
    {grade ? <GradeText grade={grade} /> : null}
  </svg>
);
const NoAttemptBadge = ({ title, grade, ...props }: ProblemBadgeProps) => (
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
    {grade ? <GradeText grade={grade} /> : null}
  </svg>
);

function ProblemBadge({
  number,
  flash,
  top,
  zone,
  attempt,
  grade,
  color,
}: {
  number?: string;
  flash: boolean;
  top: boolean;
  zone: boolean;
  attempt: boolean;
  grade?: number;
  color?: string;
}) {
  const Badge = flash
    ? FlashBadge
    : top
      ? TopBadge
      : zone
        ? ZoneBadge
        : attempt
          ? AttemptBadge
          : NoAttemptBadge;

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
      title={`${number}${
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
                : "no attempt"
      }`}
    />
  );
}

type PP = NonNullable<
  Awaited<
    ReturnType<
      typeof getIoClimbAlongCompetitionEvent | typeof getIoTopLoggerGroupEvent
    >
  >["problemByProblem"]
>[number];

// TODO: different gym color order per gym
const colorsByGrade = [
  "mint",
  "green",
  "yellow",
  "orange",
  "blue",
  "purple",
  "red",
  "black",
  "pink",
  "white",
];

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

  const sortedProblems = Array.from(problemByProblem)
    .sort((a, b) => Number(b.attempt) - Number(a.attempt))
    .sort((a, b) => Number(b.zone) - Number(a.zone))
    .sort((a, b) => Number(b.flash) - Number(a.flash))
    .sort((a, b) =>
      a.color &&
      b.color &&
      colorsByGrade.includes(a.color) &&
      colorsByGrade.includes(b.color)
        ? colorsByGrade.indexOf(b.color) - colorsByGrade.indexOf(a.color)
        : 0,
    )
    .sort((a, b) => Number(b.grade) - Number(a.grade))
    .sort((a, b) => Number(b.top) - Number(a.top));

  if (groupByGradeAndFlash || groupByColorAndFlash) {
    const grouped = new Map<string, [PP, ...PP[]]>();
    for (const problem of sortedProblems) {
      const gradeOrColor = groupByGradeAndFlash
        ? problem.grade
        : groupByColorAndFlash
          ? problem.color
          : "";
      const flash = problem.flash;
      const key = `${gradeOrColor}-${flash}`;
      if (!grouped.has(key)) {
        grouped.set(key, [problem]);
      } else {
        grouped.get(key)!.push(problem);
      }
    }

    return (
      <div
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))" }}
        className={
          "mt-0.5 grid content-between justify-between gap-0.5 " +
          (className ? className : "")
        }
      >
        {Array.from(grouped)
          .sort((a, b) => Number(b[1][0].grade) - Number(a[1][0].grade))
          .map(([, problems], i) => (
            <div key={i} className="flex items-center">
              <span>{problems.length}</span>
              <span className="px-0.5 py-0">×</span>
              <ProblemBadge {...problems[0]} />
            </div>
          ))}
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
