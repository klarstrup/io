import dbConnect from "../../../dbConnect";
import { User } from "../../../models/user";
import {
  TopLogger,
  getAscends,
  getGroup,
  getGroupClimbs,
  getGroupsUsers,
  getGymGymGroups,
  getGymHolds,
  getUser,
  gymLoader,
} from "../../../sources/toplogger";
import { HOUR_IN_SECONDS, chunk, shuffle } from "../../../utils";

export const dynamic = "force-dynamic";

interface ScrapedAt {
  _io_scrapedAt?: Date;
}

const randomSlice = <T>(array: T[], slices: number) =>
  shuffle(chunk(array, Math.ceil(array.length / slices)))[0] || [];

const shouldRevalidate = (document?: ScrapedAt | null) =>
  !document ||
  !document._io_scrapedAt ||
  Date.now() - document._io_scrapedAt.valueOf() > HOUR_IN_SECONDS * 1000;

export async function GET(/* request: NextRequest */) {
  /*
  if (process.env.VERCEL) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }
  }
  */

  const DB = (await dbConnect()).connection.db;
  const usersCollection = DB.collection<TopLogger.User & ScrapedAt>(
    "toplogger_users"
  );
  const gymsCollection = DB.collection<TopLogger.GymSingle & ScrapedAt>(
    "toplogger_gyms"
  );
  const groupsCollection = DB.collection<TopLogger.GroupSingle & ScrapedAt>(
    "toplogger_groups"
  );
  const groupUsersCollection = DB.collection<
    Omit<TopLogger.GroupUserMultiple, "user"> & ScrapedAt
  >("toplogger_group_users");
  const climbsCollection = DB.collection<TopLogger.ClimbMultiple & ScrapedAt>(
    "toplogger_climbs"
  );
  const ascendsCollection = DB.collection<TopLogger.AscendSingle & ScrapedAt>(
    "toplogger_ascends"
  );
  const gymGroupsCollection = DB.collection<TopLogger.GymGroup & ScrapedAt>(
    "toplogger_gym_groups"
  );
  const holdsCollection = DB.collection<TopLogger.Hold & ScrapedAt>(
    "toplogger_holds"
  );

  /*
   * Upserters
   */

  const upsertAscend = (ascend: TopLogger.AscendSingle) =>
    ascendsCollection.updateOne(
      { id: ascend.id },
      {
        $set: {
          ...ascend,
          date_logged: ascend.date_logged && new Date(ascend.date_logged),
          _io_scrapedAt: new Date(),
        },
      },
      { upsert: true }
    );
  const upsertClimb = (climb: TopLogger.ClimbMultiple) =>
    climbsCollection.updateOne(
      { id: climb.id },
      {
        $set: {
          ...climb,
          date_live_start:
            climb.date_live_start && new Date(climb.date_live_start),
          date_live_end: climb.date_live_end && new Date(climb.date_live_end),
          date_deleted: climb.date_deleted && new Date(climb.date_deleted),
          date_set: climb.date_set && new Date(climb.date_set),
          created_at: climb.created_at && new Date(climb.created_at),
          date_removed: climb.date_removed && new Date(climb.date_removed),
          _io_scrapedAt: new Date(),
        },
      },
      { upsert: true }
    );
  const upsertGym = (gym: TopLogger.GymMultiple) =>
    gymsCollection.updateOne(
      { id: gym.id },
      { $set: { ...gym, _io_scrapedAt: new Date() } },
      { upsert: true }
    );
  const upsertHold = (hold: TopLogger.Hold) =>
    holdsCollection.updateOne(
      { id: hold.id },
      { $set: { ...hold, _io_scrapedAt: new Date() } },
      { upsert: true }
    );
  const upsertGymGroup = (gymGroup: TopLogger.GymGroup) =>
    gymGroupsCollection.updateOne(
      { id: gymGroup.id },
      { $set: { ...gymGroup, _io_scrapedAt: new Date() } },
      { upsert: true }
    );
  const upsertGroup = async ({
    climb_groups,
    ...group
  }: TopLogger.GroupSingle) => {
    await groupsCollection.updateOne(
      { id: group.id },
      {
        $set: {
          ...group,
          date_live_start: new Date(group.date_live_start),
          date_loggable_start: new Date(group.date_loggable_start),
          date_loggable_end: new Date(group.date_loggable_end),
          _io_scrapedAt: new Date(),
        },
      },
      { upsert: true }
    );
    const dbGroup = (await groupsCollection.findOne({ id: group.id }))!;
    if (
      !dbGroup.climb_groups ||
      dbGroup.climb_groups.length < climb_groups.length
    ) {
      await groupsCollection.updateOne(
        { id: group.id },
        { $set: { climb_groups, _io_scrapedAt: new Date() } },
        { upsert: true }
      );
    }
  };
  const upsertUser = (user: TopLogger.User) =>
    usersCollection.updateOne(
      { id: user.id },
      { $set: { ...user, _io_scrapedAt: new Date() } },
      { upsert: true }
    );
  const upsertGroupUser = (
    groupUser: Omit<TopLogger.GroupUserMultiple, "user">
  ) =>
    groupUsersCollection.updateOne(
      { id: groupUser.id },
      { $set: { ...groupUser, _io_scrapedAt: new Date() } },
      { upsert: true }
    );

  // Io is the only user in the database,
  const { topLoggerId } = (await User.findOne())!;

  if (!topLoggerId) {
    return new Response("No topLoggerId", { status: 401 });
  }
  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    console.time("Preloading DB data");
    const dbUsers = await usersCollection.find().toArray();
    const dbGroups = await groupsCollection.find().toArray();
    const dbGroupUsers = await groupUsersCollection.find().toArray();
    console.timeEnd("Preloading DB data");

    await writer.write(encoder.encode("[\n"));

    let first = true;
    const flushJSON = async (data: string) => {
      first ? (first = false) : await writer.write(encoder.encode(",\n"));
      await writer.write(encoder.encode(JSON.stringify(data)));
    };

    /**
     * User
     */
    console.info(`Scraping Io ${topLoggerId}`);
    const dbUser = dbUsers.find(({ id }) => id === topLoggerId);
    if ("true" + "" || shouldRevalidate(dbUser)) {
      const user = await getUser(topLoggerId, { maxAge: HOUR_IN_SECONDS });
      await upsertUser(user).then(() => flushJSON("user:" + user.id));
    } else {
      console.info(`Skipping scraping Io ${topLoggerId}`);
    }

    /**
     * Io Ascends
     */
    console.info(`Scraping Io ascends ${topLoggerId}`);
    console.time("Io ascends");
    const ascends = (await getAscends(
      { filters: { user_id: topLoggerId }, includes: ["climb"] },
      { maxAge: HOUR_IN_SECONDS }
    )) as (TopLogger.AscendSingle & { climb: TopLogger.ClimbMultiple })[];

    const gymIds = new Set<number>();
    console.info(`Upserting ${ascends.length} Io ascends`);
    await Promise.all(
      randomSlice(ascends, 1).flatMap(({ climb, ...ascend }) => {
        gymIds.add(climb.gym_id);

        return [
          upsertAscend(ascend).then(() => flushJSON("ascend:" + ascend.id)),
          /**
           * User Climbs
           */
          upsertClimb(climb).then(() => flushJSON("climb:" + climb.id)),
        ];
      })
    );
    console.info(`Upserted ${ascends.length} Io ascends`);
    console.timeEnd("Io ascends");
    /**
     * User Gyms
     */
    console.info(
      `Scraping ${gymIds.size} Io gyms ${Array.from(gymIds).join(", ")}`
    );

    await Promise.all(
      Array.from(gymIds).map(async (gymId) => {
        const gym = await gymLoader.load(gymId);
        if (gym) {
          await upsertGym(gym).then(() => flushJSON("gym:" + gym.id));
        }

        /**
         * User Gym Holds
         */
        console.info(`Scraping Io holds for gym ${gymId}`);
        await Promise.all(
          (
            await getGymHolds(gymId, undefined, { maxAge: HOUR_IN_SECONDS })
          ).map((hold) =>
            upsertHold(hold).then(() => flushJSON("hold:" + hold.id))
          )
        );

        /**
         * Io Gym Groups
         */
        console.info(`Scraping Io Gym-Groups for gym ${gymId}`);
        await Promise.all(
          (
            await getGymGymGroups(gymId, void 0, { maxAge: HOUR_IN_SECONDS })
          ).map((gymGroup) =>
            upsertGymGroup(gymGroup).then(() =>
              flushJSON("gym_group:" + gymGroup.id)
            )
          )
        );
      })
    );

    /**
     * Io Group-Users
     */
    const userGroupUsers = dbGroupUsers.filter(
      ({ user_id }) => user_id === topLoggerId
    );
    console.info(`Scraping Group-Users for user ${topLoggerId}`);
    if (
      "true" + "" ||
      !userGroupUsers.length ||
      userGroupUsers.some((dbGroupUser) => shouldRevalidate(dbGroupUser))
    ) {
      const groupsUsers = await getGroupsUsers(
        { filters: { user_id: topLoggerId } },
        { maxAge: HOUR_IN_SECONDS }
      );
      console.info(`Upserting ${groupsUsers.length} Io Group-Users`);
      await Promise.all(
        groupsUsers.map(async (groupUser) => {
          await upsertGroupUser(groupUser).then(() =>
            flushJSON("group_user:" + groupUser.id)
          );

          /**
           * User Groups Group
           */
          const dbGroup = dbGroups.find(({ id }) => id === groupUser.group_id);
          console.info(
            `Scraping Io group ${groupUser.group_id} for user ${topLoggerId}`
          );
          if ("true" + "" || !dbGroup || shouldRevalidate(dbGroup)) {
            const group = await getGroup(groupUser.group_id, {
              maxAge: HOUR_IN_SECONDS,
            });
            await upsertGroup(group).then(() => flushJSON("group:" + group.id));

            /**
             * User Groups Group  Climbs
             */
            console.info(
              `Scraping group climbs for group ${groupUser.group_id} for user ${topLoggerId}`
            );
            const climbs = await getGroupClimbs(group, {
              maxAge: HOUR_IN_SECONDS,
            });
            console.info(
              `Upserting ${climbs.length} group climbs for group ${groupUser.group_id} for user ${topLoggerId}`
            );
            await Promise.all(
              climbs.map((climb) =>
                upsertClimb(climb).then(() => flushJSON("climb:" + climb.id))
              )
            );

            /**
             * User Gym Groups Group Users
             */
            console.info(
              `Scraping group users for group ${groupUser.group_id}`
            );
            const groupUsers = await getGroupsUsers<
              TopLogger.GroupUserMultiple & { user: TopLogger.User }
            >(
              { filters: { group_id: group.id }, includes: "user" },
              { maxAge: HOUR_IN_SECONDS }
            );
            console.info(
              `Upserting ${groupUsers.length} group users for group ${groupUser.group_id}`
            );
            await Promise.all(
              randomSlice(groupUsers, 1).map(({ user, ...groupUser }) =>
                Promise.all([
                  upsertGroupUser(groupUser).then(() =>
                    flushJSON("group_user:" + groupUser.id)
                  ),

                  /**
                   * Group User
                   */
                  upsertUser(user).then(() => flushJSON("user:" + user.id)),

                  /**
                   * Group User Ascends
                   */
                  (climbs.length
                    ? getAscends(
                        {
                          filters: {
                            user_id: user.id,
                            climb_id: climbs.map(({ id }) => id),
                          },
                        },
                        { maxAge: HOUR_IN_SECONDS }
                      )
                    : Promise.resolve([])
                  ).then((ascends) =>
                    Promise.all(
                      ascends.map((ascend) =>
                        upsertAscend(ascend).then(() =>
                          flushJSON("ascend:" + ascend.id)
                        )
                      )
                    )
                  ),
                ])
              )
            );
          } else {
            console.info(
              `User Groups Group: Skipping scraping group ${groupUser.group_id}`
            );
          }
        })
      );
    } else {
      console.info(`Skipping scraping Io groups`);
    }

    await writer.write(encoder.encode("]"));
    await writer.close();
  })().catch(async (error) => {
    console.error(error);

    await writer.write(encoder.encode("]"));
    await writer.close();
  });

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
