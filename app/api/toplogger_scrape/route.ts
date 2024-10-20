import { auth } from "../../../auth";
import {
  type TopLogger,
  fetchAscends,
  fetchGroup,
  fetchGroupClimbs,
  fetchGroupsUsers,
  fetchGymGymGroups,
  fetchGymHolds,
  gymLoader,
} from "../../../sources/toplogger";
import {
  TopLoggerAscends,
  TopLoggerClimbs,
  TopLoggerGroupUsers,
  TopLoggerGroups,
  TopLoggerGymGroups,
  TopLoggerGyms,
  TopLoggerHolds,
  TopLoggerUsers,
} from "../../../sources/toplogger.server";
import { HOUR_IN_SECONDS, chunk, shuffle } from "../../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const randomSlice = <T>(array: T[], slices: number) =>
  shuffle(chunk(array, Math.ceil(array.length / slices)))[0] || [];

export async function GET() {
  const user = (await auth())?.user;
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { topLoggerId } = user;
  if (!topLoggerId) return new Response("No topLoggerId", { status: 401 });

  await TopLoggerUsers.createIndexes([{ key: { id: 1 } }]);

  await TopLoggerGyms.createIndexes([{ key: { id: 1 } }]);

  await TopLoggerGroups.createIndexes([{ key: { id: 1 } }]);

  await TopLoggerHolds.createIndexes([{ key: { gym_id: 1 } }]);

  await TopLoggerClimbs.createIndexes([
    { key: { id: 1 } },
    { key: { gym_id: 1 } },
    { key: { date_live_start: 1 } },
  ]);

  await TopLoggerAscends.createIndexes([
    { key: { user_id: 1 } },
    { key: { climb_id: 1 } },
    { key: { date_logged: 1 } },
  ]);

  await TopLoggerGymGroups.createIndexes([{ key: { gym_id: 1 } }]);

  await TopLoggerGroupUsers.createIndexes([
    { key: { user_id: 1 } },
    { key: { group_id: 1 } },
  ]);

  /*
   * Upserters
   */

  const upsertAscend = (ascend: TopLogger.AscendSingle) =>
    TopLoggerAscends.updateOne(
      { id: ascend.id },
      {
        $set: {
          ...ascend,
          date_logged: ascend.date_logged && new Date(ascend.date_logged),
          _io_scrapedAt: new Date(),
        },
      },
      { upsert: true },
    );
  const upsertClimb = (climb: TopLogger.ClimbMultiple) =>
    TopLoggerClimbs.updateOne(
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
      { upsert: true },
    );
  const upsertGym = (gym: TopLogger.GymMultiple) =>
    TopLoggerGyms.updateOne(
      { id: gym.id },
      { $set: { ...gym, _io_scrapedAt: new Date() } },
      { upsert: true },
    );
  const upsertHold = (hold: TopLogger.Hold) =>
    TopLoggerHolds.updateOne(
      { id: hold.id },
      { $set: { ...hold, _io_scrapedAt: new Date() } },
      { upsert: true },
    );
  const upsertGymGroup = (gymGroup: TopLogger.GymGroup) =>
    TopLoggerGymGroups.updateOne(
      { id: gymGroup.id },
      { $set: { ...gymGroup, _io_scrapedAt: new Date() } },
      { upsert: true },
    );
  const upsertGroup = async ({
    climb_groups,
    ...group
  }: TopLogger.GroupSingle) => {
    await TopLoggerGroups.updateOne(
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
      { upsert: true },
    );
    const dbGroup = (await TopLoggerGroups.findOne({ id: group.id }))!;
    if (
      !dbGroup.climb_groups ||
      dbGroup.climb_groups.length < climb_groups.length
    ) {
      await TopLoggerGroups.updateOne(
        { id: group.id },
        { $set: { climb_groups, _io_scrapedAt: new Date() } },
        { upsert: true },
      );
    }
  };
  const upsertUser = (user: TopLogger.User) =>
    TopLoggerUsers.updateOne(
      { id: user.id },
      { $set: { ...user, _io_scrapedAt: new Date() } },
      { upsert: true },
    );
  const upsertGroupUser = (
    groupUser: Omit<TopLogger.GroupUserMultiple, "user">,
  ) =>
    TopLoggerGroupUsers.updateOne(
      { id: groupUser.id },
      { $set: { ...groupUser, _io_scrapedAt: new Date() } },
      { upsert: true },
    );

  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    await writer.write(encoder.encode("[\n"));

    let first = true;
    const flushJSON = async (data: string) => {
      if (first) {
        first = false;
      } else {
        await writer.write(encoder.encode(",\n"));
      }
      await writer.write(encoder.encode(JSON.stringify(data)));
    };

    /**
     * Io Ascends
     */
    console.info(`Scraping Io ascends ${topLoggerId}`);
    await Promise.all([
      (
        fetchAscends(
          {
            filters: { user_id: topLoggerId, climb: { deleted: false } },
            includes: ["climb"],
          },
          { maxAge: HOUR_IN_SECONDS },
        ) as Promise<
          (TopLogger.AscendSingle & { climb: TopLogger.ClimbMultiple })[]
        >
      ).then((ascends) =>
        Promise.all(
          ascends.flatMap(({ climb, ...ascend }) => [
            upsertAscend(ascend).then(() => flushJSON("ascend:" + ascend.id)),
            upsertClimb(climb).then(() => flushJSON("climb:" + climb.id)),
          ]),
        ),
      ),
      (
        fetchAscends(
          {
            filters: { user_id: topLoggerId, climb: { deleted: true } },
            includes: ["climb"],
          },
          { maxAge: HOUR_IN_SECONDS },
        ) as Promise<
          (TopLogger.AscendSingle & { climb: TopLogger.ClimbMultiple })[]
        >
      ).then((ascends) =>
        Promise.all(
          ascends.flatMap(({ climb, ...ascend }) => [
            upsertAscend(ascend).then(() => flushJSON("ascend:" + ascend.id)),
            upsertClimb(climb).then(() => flushJSON("climb:" + climb.id)),
          ]),
        ),
      ),
      TopLoggerClimbs.distinct("gym_id").then((gymIds) =>
        Promise.all(
          gymIds.map((gymId) =>
            Promise.all([
              gymLoader
                .load(gymId)
                .then(
                  (gym) =>
                    gym &&
                    upsertGym(gym).then(() => flushJSON("gym:" + gym.id)),
                ),
              fetchGymHolds(gymId, undefined, { maxAge: HOUR_IN_SECONDS }).then(
                (holds) =>
                  Promise.all(
                    holds.map((hold) =>
                      upsertHold(hold).then(() => flushJSON("hold:" + hold.id)),
                    ),
                  ),
              ),
              fetchGymGymGroups(gymId, void 0, {
                maxAge: HOUR_IN_SECONDS,
              }).then((gymGroups) =>
                Promise.all(
                  gymGroups.map((gymGroup) =>
                    upsertGymGroup(gymGroup).then(() =>
                      flushJSON("gym_group:" + gymGroup.id),
                    ),
                  ),
                ),
              ),
            ]),
          ),
        ),
      ),
      fetchGroupsUsers(
        { filters: { user_id: topLoggerId } },
        { maxAge: HOUR_IN_SECONDS },
      ).then((groupUsers) =>
        Promise.all(
          groupUsers.map(async (groupUser) => {
            await upsertGroupUser(groupUser).then(() =>
              flushJSON("group_user:" + groupUser.id),
            );

            const group = await fetchGroup(groupUser.group_id, {
              maxAge: HOUR_IN_SECONDS,
            });
            await upsertGroup(group).then(() => flushJSON("group:" + group.id));

            const climbs = await fetchGroupClimbs(group, {
              maxAge: HOUR_IN_SECONDS,
            });
            await Promise.all([
              ...climbs.map((climb) =>
                upsertClimb(climb).then(() => flushJSON("climb:" + climb.id)),
              ),
              fetchGroupsUsers<
                TopLogger.GroupUserMultiple & { user: TopLogger.User }
              >(
                {
                  filters: { group_id: groupUser.group_id },
                  includes: "user",
                },
                { maxAge: HOUR_IN_SECONDS },
              ).then((groupUsers) =>
                Promise.all(
                  randomSlice(groupUsers, 8).map(({ user, ...groupUser }) =>
                    Promise.all([
                      upsertGroupUser(groupUser).then(() =>
                        flushJSON("group_user:" + groupUser.id),
                      ),

                      /**
                       * Group User
                       */
                      upsertUser(user).then(() => flushJSON("user:" + user.id)),

                      /**
                       * Group User Ascends
                       */
                      (climbs.length
                        ? fetchAscends(
                            {
                              filters: {
                                user_id: user.id,
                                climb_id: climbs.map(({ id }) => id),
                              },
                            },
                            { maxAge: HOUR_IN_SECONDS },
                          )
                        : Promise.resolve([])
                      ).then((ascends) =>
                        Array.isArray(ascends)
                          ? Promise.all(
                              ascends.map((ascend) =>
                                upsertAscend(ascend).then(() =>
                                  flushJSON("ascend:" + ascend.id),
                                ),
                              ),
                            ) // Some toplogger users have privacy enabled for their ascends
                          : [],
                      ),
                    ]),
                  ),
                ),
              ),
            ]);
          }),
        ),
      ),
    ]);

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
