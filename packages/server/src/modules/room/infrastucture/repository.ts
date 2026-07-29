import { PgLive } from "#db/pg-client.js";
import { RoomsRepo } from "#modules/room/domain/repo.js";
import * as SqlClient from "@effect/sql/SqlClient";
import * as SqlSchema from "@effect/sql/SqlSchema";
import { RoomId } from "@landline/domain/room/schema";
import { User, UserId } from "@landline/domain/user/schema";
import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

export const RoomsRepoLive = Layer.effect(
  RoomsRepo,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient;

    const membersAmong = SqlSchema.findAll({
      Result: Schema.Struct({ userId: UserId }),
      Request: Schema.Struct({
        roomId: RoomId,
        userIds: Schema.Array(UserId),
      }),
      execute: (request) =>
        sql`
        SELECT
          user_id
        FROM
          room_members
        WHERE
          room_id = ${request.roomId}
          AND ${sql.in("user_id", request.userIds)}
      `,
    });

    const findMembers = SqlSchema.findAll({
      Result: User,
      Request: RoomId,
      // Explicit columns (not u.*) keep password_hash out of the result set.
      execute: (roomId) =>
        sql`
        SELECT
          u.id,
          u.email,
          u.created_at,
          u.updated_at
        FROM
          room_members rm
          JOIN users u ON u.id = rm.user_id
        WHERE
          rm.room_id = ${roomId}
        ORDER BY
          rm.created_at
      `,
    });

    return {
      membersAmong: (roomId: RoomId, userIds: ReadonlyArray<UserId>) =>
        membersAmong({ roomId, userIds }).pipe(
          Effect.map((rows) => rows.map((row) => row.userId)),
          Effect.orDie,
        ),
      findMembers: flow(findMembers, Effect.orDie),
    };
  }),
).pipe(Layer.provide(PgLive));
