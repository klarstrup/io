import { getRunningTrainingData } from "../../sources/rundouble";
import { seconds2time } from "../../utils";

function pad(i: number, width: number, z = "0") {
  const n = String(i);
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function decimalAsTime(dec: number) {
  const minutes = Math.floor(dec);
  const sec = Math.floor(60 * (dec - minutes));
  return String(minutes) + ":" + pad(sec, 2);
}
function formatPace(pace: number) {
  return decimalAsTime(0.6215 / pace);
}

export default function RunByRun({
  runByRun,
}: {
  runByRun: Awaited<ReturnType<typeof getRunningTrainingData>>["runByRun"];
}) {
  return (
    <table>
      <tbody>
        {runByRun.map((run) => (
          <tr
            key={String(run.date)}
            style={{ textAlign: "center", fontSize: "0.75em" }}
          >
            <td>
              <dl>
                <dt>km</dt>
                <dd style={{ fontSize: "1.5em", fontWeight: 600 }}>
                  {(run.distance / 1000).toLocaleString("en-US", {
                    unit: "kilometer",
                    maximumSignificantDigits: 2,
                  })}
                </dd>
              </dl>
            </td>
            <td>
              <dl>
                <dt>Duration</dt>
                <dd style={{ fontSize: "1.5em", fontWeight: 600 }}>
                  {seconds2time(Math.round(run.duration / 1000))}
                </dd>
              </dl>
            </td>
            <td>
              <dl>
                <dt>Pace</dt>
                <dd style={{ fontSize: "1.5em", fontWeight: 600 }}>
                  {run.pace ? (
                    <>
                      {formatPace(run.pace)}
                      <small>
                        <small>min/km</small>
                      </small>
                    </>
                  ) : null}
                </dd>
              </dl>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
