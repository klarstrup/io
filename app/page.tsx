import { getIoPercentileForClimbalongCompetition } from "../climbalong";
import dbConnect from "../dbConnect";
import { getGroupsUsers, getIoPercentileForTopLoggerGroup } from "../toplogger";
import "./page.css";

export default async function Home() {
  const ioPercentiles = await getData();
  return (
    <div>
      <div className="timeline">
        {ioPercentiles
          .filter(({ climbers }) => climbers)
          .map(
            (
              {
                start,
                end,
                venue,
                event,
                officialScoring,
                topsAndZonesScoring,
                thousandDividedByScoring,
                pointsScoring,
                climbers,
                problems,
                category,
                ...e
              },
              i
            ) => (
              <div
                key={String(start)}
                className={i % 2 ? "container left" : "container right"}
              >
                <div className="content">
                  <small>
                    {venue},{" "}
                    {new Intl.DateTimeFormat("en-DK", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).formatRange(start, end)}
                  </small>
                  <h2 style={{ margin: 0 }}>{event}</h2>
                  <small>
                    {problems ? <b>{problems} problems</b> : null}
                    {problems && climbers ? <> between </> : null}
                    {climbers ? <b>{climbers} climbers</b> : null}
                    {climbers && category ? <> in the </> : null}
                    {category ? (
                      <b>{category === "male" ? "M" : category} bracket</b>
                    ) : null}
                  </small>
                  <hr />
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {officialScoring ? (
                      <fieldset
                        style={{
                          display: "inline-block",
                          flex: 1,
                          borderRadius: "5px",
                          maxWidth: "200px",
                        }}
                      >
                        <legend>Official Scoring</legend>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-around",
                            minWidth: "100px",
                            fontSize: "1.2em",
                          }}
                        >
                          <b>
                            <small>#</small>
                            {officialScoring.rank}
                          </b>
                          <b>{officialScoring.percentile}</b>
                        </div>
                        <hr style={{ margin: "4px 0" }} />
                        <table>
                          <thead>
                            <tr>
                              <th>Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{officialScoring.score}</td>
                            </tr>
                          </tbody>
                        </table>
                      </fieldset>
                    ) : null}
                    {topsAndZonesScoring && (
                      <fieldset
                        style={{
                          display: "inline-block",
                          flex: 1,
                          borderRadius: "5px",
                          maxWidth: "200px",
                        }}
                      >
                        <legend>Tops & Zones Scoring</legend>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-around",
                            minWidth: "100px",
                            fontSize: "1.2em",
                          }}
                        >
                          <b>
                            <small>#</small>
                            {topsAndZonesScoring.rank}
                          </b>
                          <b>{topsAndZonesScoring.percentile}</b>
                        </div>
                        <hr style={{ margin: "4px 0" }} />
                        <table>
                          <thead>
                            <tr>
                              <th>T</th>
                              <th>Z</th>
                              <th>aT</th>
                              <th>aZ</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{topsAndZonesScoring.tops}</td>
                              <td>{topsAndZonesScoring.zones}</td>
                              <td>{topsAndZonesScoring.topsAttempts}</td>
                              <td>{topsAndZonesScoring.zonesAttempts}</td>
                            </tr>
                          </tbody>
                        </table>
                      </fieldset>
                    )}
                    {thousandDividedByScoring && (
                      <fieldset
                        style={{
                          display: "inline-block",
                          flex: 1,
                          borderRadius: "5px",
                          maxWidth: "200px",
                        }}
                      >
                        <legend
                          title="Each top grants 1000 points divided by the number of climbers who have topped it. 10% flash bonus."
                          style={{ cursor: "help" }}
                        >
                          1000 / Tops Scoring
                        </legend>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-around",
                            minWidth: "100px",
                            fontSize: "1.2em",
                          }}
                        >
                          <b>
                            <small>#</small>
                            {thousandDividedByScoring.rank}
                          </b>
                          <b>{thousandDividedByScoring.percentile}</b>
                        </div>
                        <hr style={{ margin: "4px 0" }} />
                        <table>
                          <thead>
                            <tr>
                              {thousandDividedByScoring.zonesScore ? (
                                <>
                                  <th>Top Pts</th>
                                  <th>Zone Pts</th>
                                </>
                              ) : (
                                <th>Points</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{thousandDividedByScoring.topsScore}</td>
                              {thousandDividedByScoring.zonesScore && (
                                <td>{thousandDividedByScoring.zonesScore}</td>
                              )}
                            </tr>
                          </tbody>
                        </table>
                      </fieldset>
                    )}
                    {pointsScoring && (
                      <fieldset
                        style={{
                          display: "inline-block",
                          flex: 1,
                          borderRadius: "5px",
                          maxWidth: "200px",
                        }}
                      >
                        <legend
                          title="100 per top, 20 per zone"
                          style={{ cursor: "help" }}
                        >
                          Points Scoring
                        </legend>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-around",
                            minWidth: "100px",
                            fontSize: "1.2em",
                          }}
                        >
                          <b>
                            <small>#</small>
                            {pointsScoring.rank}
                          </b>
                          <b>{pointsScoring.percentile}</b>
                        </div>
                        <hr style={{ margin: "4px 0" }} />
                        <table>
                          <thead>
                            <tr>
                              <th>Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{pointsScoring.points}</td>
                            </tr>
                          </tbody>
                        </table>
                      </fieldset>
                    )}
                    {Object.keys(e).length ? (
                      <pre>{JSON.stringify(e, null, 2)}</pre>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          )}
      </div>
    </div>
  );
}

const getData = async () => {
  await dbConnect();
  /*
  const activities = await dbFetch<Fitocracy.UserActivity[]>(
    "https://www.fitocracy.com/get_user_activities/528455/",
    { headers: { cookie: "sessionid=blahblahblah;" } }
  );
  const activityHistories = await Promise.all(
    activities.map((activity) =>
      dbFetch(
        `https://www.fitocracy.com/_get_activity_history_json/?activity-id=${activity.id}`,
        { headers: { cookie: "sessionid=blahblahblah;" } }
      )
    )
  );
    */
  const sex = true;
  return (
    await Promise.all(
      [
        getIoPercentileForClimbalongCompetition(13, 844, sex),
        getIoPercentileForClimbalongCompetition(20, 1284, sex),
        getIoPercentileForClimbalongCompetition(26, 3381, sex),
        getIoPercentileForClimbalongCompetition(27, 8468, sex),
        getIoPercentileForClimbalongCompetition(28, undefined, sex),
        (
          await getGroupsUsers({ filters: { user_id: 176390 } })
        ).map(({ group_id, user_id }) =>
          getIoPercentileForTopLoggerGroup(group_id, user_id, sex)
        ),
      ].flat()
    )
  ).sort((a, b) => Number(b.start) - Number(a.start));
};
