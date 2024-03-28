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
import { HOUR_IN_SECONDS } from "../../../utils";
// import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

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

  await dbConnect();

  // Io is the only user in the database,
  const { topLoggerId } = (await User.findOne())!;

  if (!topLoggerId) {
    return new Response("No topLoggerId", { status: 401 });
  }
  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();

  const DB = (await dbConnect()).connection.db;

  (async () => {
    const encoder = new TextEncoder();

    await writer.write(encoder.encode("["));

    /**
     * User
     */
    const user = await getUser(topLoggerId, { maxAge: HOUR_IN_SECONDS });
    await DB.collection<TopLogger.UserSingle>("toplogger_users").updateOne(
      { id: user.id },
      { $set: { ...user } },
      { upsert: true }
    );
    await writer.write(encoder.encode(JSON.stringify(user)));

    /**
     * User Ascends
     */
    const ascends = (await getAscends(
      { filters: { user_id: user.id }, includes: ["climb"] },
      { maxAge: HOUR_IN_SECONDS }
    )) as (TopLogger.AscendSingle & { climb: TopLogger.ClimbMultiple })[];

    const gymIds = new Set<number>();
    const wallIds = new Set<number>();
    for (const { climb, ...ascend } of ascends) {
      await DB.collection<TopLogger.AscendSingle>(
        "toplogger_ascends"
      ).updateOne(
        { id: ascend.id },
        {
          $set: {
            ...ascend,
            date_logged: ascend.date_logged && new Date(ascend.date_logged),
          },
        },
        { upsert: true }
      );
      await writer.write(encoder.encode(",\n"));
      await writer.write(encoder.encode(JSON.stringify(ascend)));

      /**
       * User Climbs
       */
      await DB.collection<TopLogger.ClimbMultiple>(
        "toplogger_climbs"
      ).updateOne(
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
          },
        },
        { upsert: true }
      );
      gymIds.add(climb.gym_id);
      if (climb.wall_id) wallIds.add(climb.wall_id);
      await writer.write(encoder.encode(",\n"));
      await writer.write(encoder.encode(JSON.stringify(climb)));
    }
    /**
     * User Gyms
     */
    for (const gym of (await gymLoader.loadMany(Array.from(gymIds))).filter(
      (gym): gym is TopLogger.GymMultiple => Boolean(gym && "id" in gym)
    )) {
      await DB.collection<TopLogger.GymSingle>("toplogger_gyms").updateOne(
        { id: gym.id },
        { $set: gym },
        { upsert: true }
      );
      await writer.write(encoder.encode(",\n"));
      await writer.write(encoder.encode(JSON.stringify(gym)));

      /**
       * User Gym Holds
       */
      for (const hold of await getGymHolds(gym.id, undefined, {
        maxAge: HOUR_IN_SECONDS,
      })) {
        await DB.collection<TopLogger.Hold>("toplogger_holds").updateOne(
          { id: hold.id },
          { $set: hold },
          { upsert: true }
        );
        await writer.write(encoder.encode(",\n"));
        await writer.write(encoder.encode(JSON.stringify(hold)));
      }

      /**
       * User Gym Groups
       */
      for (const gymGroup of await getGymGymGroups(gym.id, undefined, {
        maxAge: HOUR_IN_SECONDS,
      })) {
        await DB.collection<TopLogger.GymGroup>(
          "toplogger_gym_groups"
        ).updateOne({ id: gymGroup.id }, { $set: gymGroup }, { upsert: true });
        await writer.write(encoder.encode(",\n"));
        await writer.write(encoder.encode(JSON.stringify(gymGroup)));

        /**
         * User Gym Groups Group
         */
        const { climb_groups, ...group } = await getGroup(gymGroup.group_id, {
          maxAge: HOUR_IN_SECONDS,
        });
        await DB.collection<TopLogger.GroupSingle>(
          "toplogger_groups"
        ).updateOne(
          { id: group.id },
          {
            $set: {
              ...group,
              date_live_start: new Date(group.date_live_start),
              date_loggable_start: new Date(group.date_loggable_start),
              date_loggable_end: new Date(group.date_loggable_end),
            },
          },
          { upsert: true }
        );
        const dbGroup = (await DB.collection<TopLogger.GroupSingle>(
          "toplogger_groups"
        ).findOne({ id: group.id }))!;
        if (!dbGroup.climb_groups || !dbGroup.climb_groups.length) {
          await DB.collection<TopLogger.GroupSingle>(
            "toplogger_groups"
          ).updateOne(
            { id: group.id },
            { $set: { climb_groups } },
            { upsert: true }
          );

          /**
           * User Gym Groups Group Climbs
           */
          const climbs = await getGroupClimbs(
            { climb_groups, ...group },
            { maxAge: HOUR_IN_SECONDS }
          );
          for (const climb of climbs) {
            await DB.collection<TopLogger.ClimbMultiple>(
              "toplogger_climbs"
            ).updateOne(
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
                },
              },
              { upsert: true }
            );
            await writer.write(encoder.encode(",\n"));
            await writer.write(encoder.encode(JSON.stringify(climb)));
          }

          /**
           * User Gym Groups Group Users
           */
          for (const { user, ...groupUser } of await getGroupsUsers(
            {
              filters: { group_id: group.id },
              includes: "user",
            },
            { maxAge: HOUR_IN_SECONDS }
          )) {
            await DB.collection<Omit<TopLogger.GroupUserMultiple, "user">>(
              "toplogger_group_users"
            ).updateOne(
              { id: groupUser.id },
              { $set: groupUser },
              { upsert: true }
            );
            await writer.write(encoder.encode(",\n"));
            await writer.write(encoder.encode(JSON.stringify(groupUser)));

            /**
             * User Groups Group
             */
            const { climb_groups, ...group } = await getGroup(
              groupUser.group_id,
              { maxAge: HOUR_IN_SECONDS }
            );
            await DB.collection<TopLogger.GroupSingle>(
              "toplogger_groups"
            ).updateOne(
              { id: group.id },
              {
                $set: {
                  ...group,
                  date_live_start: new Date(group.date_live_start),
                  date_loggable_start: new Date(group.date_loggable_start),
                  date_loggable_end: new Date(group.date_loggable_end),
                },
              },
              { upsert: true }
            );
            const dbGroup = (await DB.collection<TopLogger.GroupSingle>(
              "toplogger_groups"
            ).findOne({ id: group.id }))!;
            if (!dbGroup.climb_groups || !dbGroup.climb_groups.length) {
              await DB.collection<TopLogger.GroupSingle>(
                "toplogger_groups"
              ).updateOne(
                { id: group.id },
                { $set: { climb_groups } },
                { upsert: true }
              );
            }

            /**
             * Group User
             */
            await DB.collection<TopLogger.UserSingle>(
              "toplogger_users"
            ).updateOne({ id: user.id }, { $set: user }, { upsert: true });
            await writer.write(encoder.encode(",\n"));
            await writer.write(encoder.encode(JSON.stringify(user)));

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
              await writer.write(encoder.encode(",\n"));
              await writer.write(encoder.encode(JSON.stringify(ascend)));
            }
            */
          }
        }
      }
    }

    /**
     * User Groups
     */
    for (const { user, ...groupUser } of await getGroupsUsers(
      {
        filters: { user_id: topLoggerId },
        includes: "user",
      },
      { maxAge: HOUR_IN_SECONDS }
    )) {
      await DB.collection<Omit<TopLogger.GroupUserMultiple, "user">>(
        "toplogger_group_users"
      ).updateOne({ id: groupUser.id }, { $set: groupUser }, { upsert: true });
      await writer.write(encoder.encode(",\n"));
      await writer.write(encoder.encode(JSON.stringify(groupUser)));

      /**
       * User Groups Group
       */
      const { climb_groups, ...group } = await getGroup(groupUser.group_id, {
        maxAge: HOUR_IN_SECONDS,
      });
      await DB.collection<TopLogger.GroupSingle>("toplogger_groups").updateOne(
        { id: group.id },
        {
          $set: {
            ...group,
            date_live_start: new Date(group.date_live_start),
            date_loggable_start: new Date(group.date_loggable_start),
            date_loggable_end: new Date(group.date_loggable_end),
          },
        },
        { upsert: true }
      );
      const dbGroup = (await DB.collection<TopLogger.GroupSingle>(
        "toplogger_groups"
      ).findOne({ id: group.id }))!;
      if (!dbGroup.climb_groups || !dbGroup.climb_groups.length) {
        await DB.collection<TopLogger.GroupSingle>(
          "toplogger_groups"
        ).updateOne(
          { id: group.id },
          { $set: { climb_groups } },
          { upsert: true }
        );
      }

      /**
       * Group User
       */
      await DB.collection<TopLogger.UserSingle>("toplogger_users").updateOne(
        { id: user.id },
        { $set: user },
        { upsert: true }
      );
      await writer.write(encoder.encode(",\n"));
      await writer.write(encoder.encode(JSON.stringify(user)));

      /**
       * Group User Ascends
       */
      const ascends = (await getAscends(
        { filters: { user_id: user.id }, includes: ["climb"] },
        { maxAge: HOUR_IN_SECONDS }
      )) as (TopLogger.AscendSingle & { climb: TopLogger.ClimbMultiple })[];

      for (const { climb, ...ascend } of ascends) {
        await DB.collection<TopLogger.AscendSingle>(
          "toplogger_ascends"
        ).updateOne(
          { id: ascend.id },
          {
            $set: {
              ...ascend,
              date_logged: ascend.date_logged && new Date(ascend.date_logged),
            },
          },
          { upsert: true }
        );
        await writer.write(encoder.encode(",\n"));
        await writer.write(encoder.encode(JSON.stringify(ascend)));

        /**
         * Group User Ascend Climb
         */
        await DB.collection<TopLogger.ClimbMultiple>(
          "toplogger_climbs"
        ).updateOne(
          { id: climb.id },
          {
            $set: {
              ...climb,
              date_live_start:
                climb.date_live_start && new Date(climb.date_live_start),
              date_live_end:
                climb.date_live_end && new Date(climb.date_live_end),
              date_deleted: climb.date_deleted && new Date(climb.date_deleted),
              date_set: climb.date_set && new Date(climb.date_set),
              created_at: climb.created_at && new Date(climb.created_at),
              date_removed: climb.date_removed && new Date(climb.date_removed),
            },
          },
          { upsert: true }
        );
        gymIds.add(climb.gym_id);
        if (climb.wall_id) wallIds.add(climb.wall_id);
        await writer.write(encoder.encode(",\n"));
        await writer.write(encoder.encode(JSON.stringify(climb)));
      }
    }

    await writer.write(encoder.encode("]"));
    await writer.close();
  })().catch(() => {});

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
