"use client";
import { LineCustomSvgLayer, LineSeries, ResponsiveLine } from "@nivo/line";
import { differenceInMonths, getWeek, max, min } from "date-fns";
import Grade, { frenchRounded } from "../../../../grades";
import { getSchemeCategory10Color } from "../../../../utils";

const DashedSolidLine: LineCustomSvgLayer<LineSeries & { trend?: boolean }> = ({
  series,
  lineGenerator,
  xScale,
  yScale,
}) =>
  series.map(({ id, data, color, trend }) => (
    <path
      key={id}
      d={
        lineGenerator(
          data.map((d) => ({ x: xScale(d.data.x), y: yScale(d.data.y) })),
        )!
      }
      fill="none"
      stroke={color}
      style={
        trend ? { strokeDasharray: "3, 3", strokeWidth: 1 } : { strokeWidth: 1 }
      }
    />
  ));

export default function DiaryExerciseGraph({
  data,
}: {
  data: {
    id: string;
    data: { x: Date; y: number | null }[];
    color: string;
    trend?: boolean;
  }[];
}) {
  const minY = data.reduce(
    (min, serie) =>
      Math.min(min, ...serie.data.map((d) => d.y).filter(Boolean)),
    Infinity,
  );
  const maxY = data.reduce(
    (max, serie) =>
      Math.max(max, ...serie.data.map((d) => d.y).filter(Boolean)),
    -Infinity,
  );
  const yValues = frenchRounded.data
    .map((v) => v.value)
    .filter((v) => v >= minY && v <= maxY);

  const spanInMonths = differenceInMonths(
    max(data.flatMap((serie) => serie.data.map((d) => d.x))),
    min(data.flatMap((serie) => serie.data.map((d) => d.x))),
  );

  return (
    <div className="aspect-video w-full">
      <ResponsiveLine
        data={data}
        margin={{ top: 50, right: 50, bottom: 50, left: 25 }}
        xScale={{ type: "time", max: new Date() }}
        axisBottom={
          spanInMonths >= 6
            ? {
                format: (v: Date) =>
                  v.toLocaleDateString(undefined, {
                    month: "short",
                  }),
                tickValues: "every 1 month",
              }
            : {
                format: (v: Date) => "W" + getWeek(v).toString(),
                tickValues: "every 1 week",
              }
        }
        yScale={{ type: "linear", min: minY }}
        gridYValues={yValues}
        colors={data.map((d, i) => d.color || getSchemeCategory10Color(i))}
        axisLeft={null}
        axisRight={{
          legend: "Grade",
          legendOffset: 40,
          tickSize: 0,
          format: (v) => new Grade(Number(v)).name,
          tickValues: yValues,
        }}
        enableGridY
        animate
        enableArea
        areaBlendMode="normal"
        areaBaselineValue={minY}
        areaOpacity={0.6}
        curve="catmullRom"
        layers={[
          "grid",
          "markers",
          "areas",
          "slices",
          "points",
          "axes",
          "legends",
          DashedSolidLine,
        ]}
        legends={[
          {
            data: data
              .map((d) => ({ ...d, label: d.id }))
              .filter((d) => !d.trend),
            anchor: "top",
            direction: "row",
            itemWidth: 140,
            itemHeight: 22,
          },
        ]}
        pointSize={4}
      />
    </div>
  );
}
