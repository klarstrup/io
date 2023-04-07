import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { Sex, getIoPercentileForClimbalongCompetition } from "../lib";

export default function Home({
  ioPercentiles,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <pre>{JSON.stringify(ioPercentiles, null, 2)}</pre>;
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=10, stale-while-revalidate=59"
  );
  return {
    props: {
      ioPercentiles: await Promise.all([
        getIoPercentileForClimbalongCompetition(13, 844, Sex["M"]),
        getIoPercentileForClimbalongCompetition(20, 1284, Sex["M"]),
        {
          event: `Beta Boulders Winter Pump Fest (Feb 4th) (M)`,
          ioPercentile: `62.4% (of 140)`,
        },
        getIoPercentileForClimbalongCompetition(26, 3381, Sex["M"]),
        {
          event: `Beta Boulders Gorilla Unleashed II (Apr 1st) (M)`,
          ioPercentile: `31.7% (of 115)`,
        },
        getIoPercentileForClimbalongCompetition(27, undefined, Sex["M"]),
      ]),
    },
  } as const;
};
