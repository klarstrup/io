import { getIoPercentileForClimbalongCompetition } from "../climbalong";
import dbConnect from "../dbConnect";
import { getIoPercentileForTopLoggerGroup } from "../toplogger";

export default async function Home() {
  const ioPercentiles = await getData();
  return <pre>{JSON.stringify(ioPercentiles, null, 2)}</pre>;
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
  return Promise.all([
    getIoPercentileForClimbalongCompetition(13, 844, sex),
    getIoPercentileForClimbalongCompetition(20, 1284, sex),
    getIoPercentileForTopLoggerGroup(3113, 176390, sex),
    getIoPercentileForClimbalongCompetition(26, 3381, sex),
    getIoPercentileForTopLoggerGroup(3188, 176390, sex),
    getIoPercentileForClimbalongCompetition(27, 8468, sex),
  ] as const);
};
