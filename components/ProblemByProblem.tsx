import type { SVGProps } from "react";
import Grade from "../grades";
import { type getIoClimbAlongCompetitionEvent } from "../sources/climbalong";
import { type getIoTopLoggerGroupEvent } from "../sources/toplogger";
import { countBy } from "../utils";

interface ProblemBadgeProps extends SVGProps<SVGSVGElement> {
  title?: string;
  grade?: string;
  angle?: number;
}

const GradeText = ({ grade }: { grade: string }) => (
  <text
    y="40"
    x="6"
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

const AngleText = ({ angle }: { angle: number }) => (
  <text
    y="14"
    x="6"
    dominantBaseline="central"
    textAnchor="start"
    fill="#fff"
    fontSize="20px"
    stroke="#000"
    paintOrder="stroke"
    strokeWidth="3px"
  >
    {angle}°
  </text>
);

const FlashBadge = ({ title, grade, angle, ...props }: ProblemBadgeProps) => (
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
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {grade ? <GradeText grade={grade} /> : null}
  </svg>
);
const TopBadge = ({ title, grade, angle, ...props }: ProblemBadgeProps) => (
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
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {grade ? <GradeText grade={grade} /> : null}
  </svg>
);
const ZoneBadge = ({ title, grade, angle, ...props }: ProblemBadgeProps) => (
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
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {grade ? <GradeText grade={grade} /> : null}
  </svg>
);
const AttemptBadge = ({ title, grade, angle, ...props }: ProblemBadgeProps) => (
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
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {grade ? <GradeText grade={grade} /> : null}
  </svg>
);
const RepeatBadge = ({ title, grade, angle, ...props }: ProblemBadgeProps) => (
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
      fill="#000"
      fontSize="24px"
      stroke="#fff"
    >
      🔁
    </text>
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {grade ? <GradeText grade={grade} /> : null}
  </svg>
);
const NoAttemptBadge = ({
  title,
  grade,
  angle,
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
    {angle !== undefined ? <AngleText angle={angle} /> : null}
    {grade ? <GradeText grade={grade} /> : null}
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
  color,
  angle,
}: {
  number?: string;
  flash: boolean;
  top: boolean;
  zone: boolean;
  attempt: boolean;
  repeat: boolean;
  grade?: number;
  color?: string;
  angle?: number;
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
      angle={angle}
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
                : repeat
                  ? "repeat"
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
>[number] & {
  angle?: number;
};

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
    .sort((a, b) => Number(b.repeat) - Number(a.repeat))
    .sort((a, b) => Number(b.top) - Number(a.top))
    .sort((a, b) => Number(b.flash) - Number(a.flash))
    .sort((a, b) =>
      a.color &&
      b.color &&
      colorsByGrade.includes(a.color) &&
      colorsByGrade.includes(b.color) &&
      !groupByGradeAndFlash
        ? colorsByGrade.indexOf(b.color) - colorsByGrade.indexOf(a.color)
        : 0,
    )
    .sort((a, b) => Number(b.grade) - Number(a.grade));

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
