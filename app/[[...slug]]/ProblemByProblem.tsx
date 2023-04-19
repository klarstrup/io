import { SVGProps } from "react";
import Grade from "../../grades";
import { getIoClimbAlongCompetitionEvent } from "../../sources/climbalong";
import { getIoTopLoggerGroupEvent } from "../../sources/toplogger";

const FlashBadge = ({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) => (
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
      y="50%"
      x="50%"
      dominantBaseline="central"
      textAnchor="middle"
      fill="#ffff00"
      fontSize="48px"
    >
      ⚡️
    </text>
  </svg>
);
const TopBadge = ({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) => (
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
  </svg>
);
const ZoneBadge = ({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) => (
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
      transform="translate(92,49) rotate(135)"
      width="60"
      height="60"
    ></rect>
  </svg>
);
const AttemptBadge = ({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) => (
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
  </svg>
);
const NoAttemptBadge = ({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) => (
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
  </svg>
);

export default function ProblemByProblem({
  problemByProblem,
}: {
  problemByProblem: Awaited<
    ReturnType<
      typeof getIoClimbAlongCompetitionEvent | typeof getIoTopLoggerGroupEvent
    >
  >["problemByProblem"];
}) {
  if (!problemByProblem?.length) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(15, 1fr)",
        gap: "2px",
        marginTop: "2px",
        minWidth: "280px",
      }}
    >
      {Array.from(problemByProblem)
        .sort((a, b) => Number(b.attempt) - Number(a.attempt))
        .sort((a, b) => Number(b.zone) - Number(a.zone))
        .sort((a, b) => Number(b.flash) - Number(a.flash))
        .sort((a, b) => Number(b.grade) - Number(a.grade))
        .sort((a, b) => Number(b.top) - Number(a.top))
        .map(({ number, flash, top, zone, attempt, color, grade }) => {
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
              style={{ flex: 1, maxWidth: "100%", color: color || "#c84821" }}
              key={number}
              title={`${number}${
                number && grade ? `(${new Grade(grade).name})` : ""
              }${!number && grade ? new Grade(grade).name : ""}: ${
                flash ? "flash" : top ? "top" : zone ? "zone" : "no send"
              }`}
            />
          );
        })}
    </div>
  );
}
