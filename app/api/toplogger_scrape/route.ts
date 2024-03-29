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
import { HOUR_IN_SECONDS, shuffle } from "../../../utils";

export const dynamic = "force-dynamic";

interface ScrapedAt {
  _io_scrapedAt?: Date;
}

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
  const usersCollection = DB.collection<TopLogger.UserSingle & ScrapedAt>(
    "toplogger_users"
  );
  const gymsCollection = DB.collection<TopLogger.GymSingle & ScrapedAt>(
    "toplogger_gyms"
  );
  const groupsCollection = DB.collection<TopLogger.GroupSingle & ScrapedAt>(
    "toplogger_groups"
  );
  const groupUsersCollection = DB.collection<
    TopLogger.GroupUserMultiple & ScrapedAt
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

  // Io is the only user in the database,
  const { topLoggerId } = (await User.findOne())!;

  if (!topLoggerId) {
    return new Response("No topLoggerId", { status: 401 });
  }
  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();

  (async () => {
    console.time("Preloading DB data");
    const dbUsers = await usersCollection.find().toArray();
    const dbGyms = await gymsCollection.find().toArray();
    const dbGroups = await groupsCollection.find().toArray();
    const dbGroupUsers = await groupUsersCollection.find().toArray();
    /*
    const dbClimbs = await climbsCollection.find().toArray();
    const dbAscends = await ascendsCollection.find().toArray();
    */
    const dbGymGroups = await gymGroupsCollection.find().toArray();
    const dbHolds = await holdsCollection.find().toArray();
    console.timeEnd("Preloading DB data");

    const encoder = new TextEncoder();

    await writer.write(encoder.encode("[\n"));

    let first = true;
    const flushJSON = async (data: unknown) => {
      first ? (first = false) : await writer.write(encoder.encode(",\n"));
      await writer.write(encoder.encode(JSON.stringify(data)));
    };

    /**
     * User
     */
    console.info(`Scraping Io ${topLoggerId}`);
    const dbUser = dbUsers.find(({ id }) => id === topLoggerId);
    if (shouldRevalidate(dbUser)) {
      const user = await getUser(topLoggerId, { maxAge: HOUR_IN_SECONDS });
      await usersCollection.updateOne(
        { id: user.id },
        {
          $set: {
            ...user,
            _io_scrapedAt: new Date(),
          },
        },
        { upsert: true }
      );

      await flushJSON(user);
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
    const wallIds = new Set<number>();
    console.info(`Upserting ${ascends.length} Io ascends`);
    await Promise.all(
      shuffle(ascends)
        .slice(0, Math.ceil(ascends.length / 2))
        .flatMap(({ climb, ...ascend }) => [
          ascendsCollection
            .updateOne(
              { id: ascend.id },
              {
                $set: {
                  ...ascend,
                  date_logged:
                    ascend.date_logged && new Date(ascend.date_logged),
                  _io_scrapedAt: new Date(),
                },
              },
              { upsert: true }
            )
            .then(() => flushJSON(ascend)),
          /**
           * User Climbs
           */
          climbsCollection
            .updateOne(
              { id: climb.id },
              {
                $set: {
                  ...climb,
                  date_live_start:
                    climb.date_live_start && new Date(climb.date_live_start),
                  date_live_end:
                    climb.date_live_end && new Date(climb.date_live_end),
                  date_deleted:
                    climb.date_deleted && new Date(climb.date_deleted),
                  date_set: climb.date_set && new Date(climb.date_set),
                  created_at: climb.created_at && new Date(climb.created_at),
                  date_removed:
                    climb.date_removed && new Date(climb.date_removed),
                  _io_scrapedAt: new Date(),
                },
              },
              { upsert: true }
            )
            .then(() => flushJSON(climb)),
        ])
    );
    console.info(`Upserted ${ascends.length} Io ascends`);
    console.timeEnd("Io ascends");
    /**
     * User Gyms
     */
    console.info(`Scraping Io gyms ${Array.from(gymIds).join(", ")}`);
    await Promise.all(
      shuffle(Array.from(gymIds)).map(async (gymId) => {
        const dbGym = dbGyms.find(({ id }) => id === gymId);
        if (shouldRevalidate(dbGym)) {
          const gym = await gymLoader.load(gymId);
          if (gym) {
            await gymsCollection.updateOne(
              { id: gymId },
              { $set: { ...gym, _io_scrapedAt: new Date() } },
              { upsert: true }
            );

            await flushJSON(gym);
          }
        } else {
          console.info(`Skipping scraping gym ${gymId}`);
        }

        /**
         * User Gym Holds
         */
        console.info(`Scraping Io holds for gym ${gymId}`);
        const dbGymHolds = dbHolds.filter(({ gym_id }) => gym_id === gymId);

        if (
          !dbGymHolds.length ||
          dbGymHolds.some((dbHold) => shouldRevalidate(dbHold))
        ) {
          const holds = await getGymHolds(gymId, undefined, {
            maxAge: HOUR_IN_SECONDS,
          });
          await Promise.all(
            shuffle(holds).map(async (hold) => {
              await holdsCollection.updateOne(
                { id: hold.id },
                { $set: { ...hold, _io_scrapedAt: new Date() } },
                { upsert: true }
              );

              await flushJSON(hold);
            })
          );
        } else {
          console.info(`Skipping scraping holds for gym ${gymId}`);
        }

        /**
         * Io Gym Groups
         */
        console.info(`Scraping Io gym groups for gym ${gymId}`);
        const gymGymGroups = dbGymGroups.filter(
          ({ gym_id }) => gym_id === gymId
        );
        if (
          !gymGymGroups.length ||
          gymGymGroups.some((dbGymGroup) => shouldRevalidate(dbGymGroup))
        ) {
          await Promise.all(
            shuffle(
              await getGymGymGroups(gymId, undefined, {
                maxAge: HOUR_IN_SECONDS,
              })
            ).map(async (gymGroup) => {
              await gymGroupsCollection.updateOne(
                { id: gymGroup.id },
                { $set: { ...gymGroup, _io_scrapedAt: new Date() } },
                { upsert: true }
              );

              await flushJSON(gymGroup);

              /**
               * Io Gym Groups Group
               */
              console.info(
                `Io Gym Groups Group: Scraping group ${gymGroup.group_id}`
              );
              const dbGroup = dbGroups.find(
                ({ id }) => id === gymGroup.group_id
              );
              if (!dbGroup || shouldRevalidate(dbGroup)) {
                const { climb_groups, ...group } = await getGroup(
                  gymGroup.group_id,
                  { maxAge: HOUR_IN_SECONDS }
                );

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

                const dbGroup = await groupsCollection.findOne({
                  id: gymGroup.group_id,
                });
                if (
                  !dbGroup ||
                  !dbGroup.climb_groups ||
                  dbGroup.climb_groups.length <= climb_groups.length
                ) {
                  const group = (await groupsCollection.findOne({
                    id: gymGroup.group_id,
                  }))!;
                  await groupsCollection.updateOne(
                    { id: group.id },
                    { $set: { climb_groups, _io_scrapedAt: new Date() } },
                    { upsert: true }
                  );
                }
              } else {
                console.info(
                  `User Gym Groups Group: Skipping scraping group ${gymGroup.group_id}`
                );
              }

              /**
               * User Gym Groups Group Climbs
               */
              const group = (await groupsCollection.findOne({
                id: gymGroup.group_id,
              }))!;
              const climbs = await getGroupClimbs(group, {
                maxAge: HOUR_IN_SECONDS,
              });
              await Promise.all(
                shuffle(climbs).map(async (climb) => {
                  await climbsCollection.updateOne(
                    { id: climb.id },
                    {
                      $set: {
                        ...climb,
                        date_live_start:
                          climb.date_live_start &&
                          new Date(climb.date_live_start),
                        date_live_end:
                          climb.date_live_end && new Date(climb.date_live_end),
                        date_deleted:
                          climb.date_deleted && new Date(climb.date_deleted),
                        date_set: climb.date_set && new Date(climb.date_set),
                        created_at:
                          climb.created_at && new Date(climb.created_at),
                        date_removed:
                          climb.date_removed && new Date(climb.date_removed),
                        _io_scrapedAt: new Date(),
                      },
                    },
                    { upsert: true }
                  );

                  await flushJSON(climb);
                })
              );

              /**
               * User Gym Groups Group Users
               */
              await Promise.all(
                shuffle(
                  await getGroupsUsers(
                    { filters: { group_id: group.id }, includes: "user" },
                    { maxAge: HOUR_IN_SECONDS }
                  )
                ).map(async ({ user, ...groupUser }) => {
                  await groupUsersCollection.updateOne(
                    { id: groupUser.id },
                    { $set: { ...groupUser, _io_scrapedAt: new Date() } },
                    { upsert: true }
                  );

                  await flushJSON(groupUser);

                  /**
                   * Group User
                   */
                  await usersCollection.updateOne(
                    { id: user.id },
                    { $set: { ...user, _io_scrapedAt: new Date() } },
                    { upsert: true }
                  );

                  await flushJSON(user);

                  /**
                   * Group User Ascends
                   */
                  /*
            const ascends = climbs.length
              ? await getAscends(
                  {
                    filters: {
                      user_id: user.id,
                      climb_id: climbs.map(({ id }) => id),
                    },
                  },
                  { maxAge: HOUR_IN_SECONDS }
                )
              : [];

            for (const ascend of ascends) {
              await DB.collection<TopLogger.AscendSingle>(
                "toplogger_ascends"
              ).updateOne(
                { id: ascend.id },
                {
                  $set: {
                    ...ascend,
                    date_logged:
                      ascend.date_logged && new Date(ascend.date_logged),
                  },
                },
                { upsert: true }
              );

              await flushJSON(ascend);
            }
            */
                })
              );
            })
          );
        }
      })
    );

    /**
     * User Groups
     */
    const userGroupUsers = dbGroupUsers.filter(
      ({ user_id }) => user_id === topLoggerId
    );

    if (
      !userGroupUsers.length ||
      userGroupUsers.some((dbGroupUser) => shouldRevalidate(dbGroupUser))
    ) {
      const groupsUsers = await getGroupsUsers(
        {
          filters: { user_id: topLoggerId },
          includes: "user",
        },
        { maxAge: HOUR_IN_SECONDS }
      );
      await Promise.all(
        shuffle(groupsUsers).map(async ({ user, ...groupUser }) => {
          await groupUsersCollection.updateOne(
            { id: groupUser.id },
            { $set: { ...groupUser, _io_scrapedAt: new Date() } },
            { upsert: true }
          );

          await flushJSON(groupUser);

          /**
           * User Groups Group
           */
          const dbGroup = dbGroups.find(({ id }) => id === groupUser.group_id);

          if (!dbGroup || shouldRevalidate(dbGroup)) {
            const { climb_groups, ...group } = await getGroup(
              groupUser.group_id,
              {
                maxAge: HOUR_IN_SECONDS,
              }
            );
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
          } else {
            console.info(
              `User Groups Group: Skipping scraping group ${groupUser.group_id}`
            );
          }

          /**
           * Group User
           */
          await usersCollection.updateOne(
            { id: user.id },
            { $set: { ...user, _io_scrapedAt: new Date() } },
            { upsert: true }
          );

          await flushJSON(user);

          /**
           * Group User Ascends
           */
          const ascends = (await getAscends(
            { filters: { user_id: user.id }, includes: ["climb"] },
            { maxAge: HOUR_IN_SECONDS }
          )) as (TopLogger.AscendSingle & { climb: TopLogger.ClimbMultiple })[];
          await Promise.all(
            shuffle(ascends).map(async ({ climb, ...ascend }) => {
              await ascendsCollection.updateOne(
                { id: ascend.id },
                {
                  $set: {
                    ...ascend,
                    date_logged:
                      ascend.date_logged && new Date(ascend.date_logged),
                    _io_scrapedAt: new Date(),
                  },
                },
                { upsert: true }
              );

              await flushJSON(ascend);

              /**
               * Group User Ascend Climb
               */
              await climbsCollection.updateOne(
                { id: climb.id },
                {
                  $set: {
                    ...climb,
                    date_live_start:
                      climb.date_live_start && new Date(climb.date_live_start),
                    date_live_end:
                      climb.date_live_end && new Date(climb.date_live_end),
                    date_deleted:
                      climb.date_deleted && new Date(climb.date_deleted),
                    date_set: climb.date_set && new Date(climb.date_set),
                    created_at: climb.created_at && new Date(climb.created_at),
                    date_removed:
                      climb.date_removed && new Date(climb.date_removed),
                    _io_scrapedAt: new Date(),
                  },
                },
                { upsert: true }
              );
              gymIds.add(climb.gym_id);
              if (climb.wall_id) wallIds.add(climb.wall_id);

              await flushJSON(climb);
            })
          );
        })
      );
    }

    await writer.write(encoder.encode("]"));
    await writer.close();
  })().catch(() => {});

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
