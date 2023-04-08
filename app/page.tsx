import { getIoPercentileForClimbalongCompetition } from "../climbalong";
import dbConnect from "../dbConnect";
import { dbFetch } from "../fetch";
import { Fitocracy } from "../fitocracy";

export default async function Home() {
  const ioPercentiles = await getData();
  return <pre>{JSON.stringify(ioPercentiles, null, 2)}</pre>;
}

const getData = async () => {
  await dbConnect();

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
  const sex = true;
  return Promise.all([
    getIoPercentileForClimbalongCompetition(13, 844, sex),
    getIoPercentileForClimbalongCompetition(20, 1284, sex),
    {
      event: `Beta Boulders Winter Pump Fest (Feb 4th) (M)`,
      ioPercentile: `62.4% (of 140)`,
    },
    getIoPercentileForClimbalongCompetition(26, 3381, sex),
    {
      event: `Beta Boulders Gorilla Unleashed II (Apr 1st) (M)`,
      ioPercentile: `31.7% (of 115)`,
    },
    getIoPercentileForClimbalongCompetition(27, 8468, sex),
  ]);
};
