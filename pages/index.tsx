import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getIoPercentileForClimbalongCompetition } from "../climbalong";
import dbConnect from "../dbConnect";
import { dbFetch } from "../fetch";
import { Fitocracy } from "../fitocracy";

export default function Home({
  ioPercentiles,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <pre>{JSON.stringify(ioPercentiles, null, 2)}</pre>;
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  await dbConnect();

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=10, stale-while-revalidate=59"
  );

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

  return {
    props: {
      ioPercentiles: await Promise.all([
        getIoPercentileForClimbalongCompetition(13, 844, true),
        getIoPercentileForClimbalongCompetition(20, 1284, true),
        {
          event: `Beta Boulders Winter Pump Fest (Feb 4th) (M)`,
          ioPercentile: `62.4% (of 140)`,
        },
        getIoPercentileForClimbalongCompetition(26, 3381, true),
        {
          event: `Beta Boulders Gorilla Unleashed II (Apr 1st) (M)`,
          ioPercentile: `31.7% (of 115)`,
        },
        getIoPercentileForClimbalongCompetition(27, undefined, true),
      ]),
    },
  } as const;
};
