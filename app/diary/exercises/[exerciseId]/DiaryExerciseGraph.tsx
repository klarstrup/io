"use client";
import Grade, { frenchRounded } from "../../../../grades";
import { ResponsiveLine } from "@nivo/line";

export default function DiaryExerciseGraph({
  data,
}: {
  data: { id: string; data: { x: Date; y: number | null }[] }[];
}) {
  const min = data.reduce(
    (min, serie) =>
      Math.min(min, ...serie.data.map((d) => d.y).filter(Boolean)),
    Infinity,
  );
  const max = data.reduce(
    (max, serie) =>
      Math.max(max, ...serie.data.map((d) => d.y).filter(Boolean)),
    -Infinity,
  );
  const yValues = frenchRounded.data
    .map((v) => v.value)
    .filter((v) => v >= min && v <= max);

  return (
    <div className="aspect-video w-full">
      <ResponsiveLine
        data={data}
        margin={{ top: 50, right: 50, bottom: 50, left: 25 }}
        xScale={{ type: "time", max: new Date() }}
        yScale={{ type: "linear", min }}
        gridYValues={yValues}
        colors={{ scheme: "set1" }}
        axisBottom={{ format: "%b" }}
        axisLeft={null}
        axisRight={{
          legend: "Grade",
          legendOffset: 40,
          format: (v) => new Grade(Number(v)).name,
          tickValues: yValues,
        }}
        enableGridY
        animate
        enableArea
        areaBlendMode="multiply"
        areaBaselineValue={min}
        curve="catmullRom"
        legends={[
          {
            anchor: "top",
            direction: "row",
            translateY: -25,
            itemWidth: 140,
            itemHeight: 22,
          },
        ]}
        pointSize={4}
        defs={[
          linearGradientDef("gradientA", [
            { offset: 0, color: "inherit" },
            { offset: 100, color: "inherit", opacity: 0 },
          ]),
        ]}
        fill={[{ match: "*", id: "gradientA" }]}
      />
    </div>
  );
}

const linearGradientDef = (
  id: string,
  colors: { offset: number; color: string; opacity?: number }[],
  options: React.SVGProps<SVGLinearGradientElement> = {},
) => ({ id, type: "linearGradient", colors, ...options });
