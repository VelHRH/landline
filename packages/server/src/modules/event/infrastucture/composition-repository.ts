import { PgLive } from "#db/pg-client.js";
import { CompositionRepo, DueEvent } from "#modules/event/domain/composition-repo.js";
import type { Candidate, CompositionPlan } from "#modules/event/domain/composition.js";
import { ageAt } from "#modules/event/domain/composition.js";
import * as SqlClient from "@effect/sql/SqlClient";
import * as SqlSchema from "@effect/sql/SqlSchema";
import { EventStatus } from "@landline/domain/event/enums";
import { EventId } from "@landline/domain/event/schema";
import { ReservationOutcome } from "@landline/domain/reservation/enums";
import { ReservationId } from "@landline/domain/reservation/schema";
import type { RoomId } from "@landline/domain/room/schema";
import { Gender } from "@landline/domain/user/enums";
import { DateOfBirth, UserId } from "@landline/domain/user/schema";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

const DUE_EVENT_COLUMNS = "id, regime, starts_at, min_size, max_size, rounds, floor, lead_time_minutes, brackets";

// One reserver joined to the profile facts composition needs. `interested_in` is
// a native enum array and only decodes through the ::text[] cast.
const CandidateRow = Schema.Struct({
  reservationId: ReservationId,
  userId: UserId,
  dateOfBirth: DateOfBirth,
  gender: Schema.Enums(Gender),
  interestedIn: Schema.Array(Schema.Enums(Gender)),
  dropStreak: Schema.Int,
  reservedAt: Schema.DateTimeUtc,
});

export const CompositionRepoLive = Layer.effect(
  CompositionRepo,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient;

    const findDue = SqlSchema.findAll({
      Result: DueEvent,
      Request: Schema.Void,
      execute: () =>
        sql`
        SELECT
          ${sql.literal(DUE_EVENT_COLUMNS)}
        FROM
          events
        WHERE
          status = ${EventStatus.SCHEDULED}
          AND reservation_deadline <= now()
        ORDER BY
          reservation_deadline ASC
      `,
    });

    const findCandidates = SqlSchema.findAll({
      Result: CandidateRow,
      Request: EventId,
      execute: (eventId) =>
        sql`
        SELECT
          r.id AS reservation_id,
          r.user_id,
          r.reserved_at,
          u.date_of_birth,
          u.gender::text AS gender,
          u.interested_in::text[] AS interested_in,
          u.drop_streak
        FROM
          reservations r
          JOIN users u ON u.id = r.user_id
        WHERE
          r.event_id = ${eventId}
        ORDER BY
          r.reserved_at ASC
      `,
    });

    // The serialization point: only the transaction that flips SCHEDULED away
    // composes the Event. A re-run after the flip claims nothing and does
    // nothing, which is what makes the worker idempotent.
    const claim = (eventId: EventId) =>
      sql`
        UPDATE events
        SET
          status = ${EventStatus.COMPOSED}
        WHERE
          id = ${eventId}
          AND status = ${EventStatus.SCHEDULED}
        RETURNING
          id
      `.pipe(Effect.map((rows) => rows.length > 0));

    const insertRoom = (eventId: EventId, ageBracket: string) =>
      sql`
        INSERT INTO
          rooms (event_id, age_bracket)
        VALUES
          (${eventId}, ${ageBracket})
        RETURNING
          id
      `.pipe(Effect.map((rows) => (rows[0] as { id: string }).id as RoomId));

    const place = (roomId: RoomId, members: ReadonlyArray<Candidate>) =>
      Effect.gen(function*() {
        yield* sql`
          INSERT INTO
            room_members ${sql.insert(members.map((member) => ({ roomId, userId: member.userId })))}
        `;
        yield* sql`
          UPDATE reservations
          SET
            outcome = ${ReservationOutcome.PLACED},
            placed_room_id = ${roomId}
          WHERE
            ${sql.in("id", members.map((member) => member.reservationId))}
        `;
        yield* sql`
          UPDATE users
          SET
            drop_streak = 0
          WHERE
            ${sql.in("id", members.map((member) => member.userId))}
        `;
      });

    const drop = (dropped: ReadonlyArray<Candidate>) =>
      Effect.gen(function*() {
        yield* sql`
          UPDATE reservations
          SET
            outcome = ${ReservationOutcome.DROPPED}
          WHERE
            ${sql.in("id", dropped.map((candidate) => candidate.reservationId))}
        `;
        yield* sql`
          UPDATE users
          SET
            drop_streak = drop_streak + 1
          WHERE
            ${sql.in("id", dropped.map((candidate) => candidate.userId))}
        `;
      });

    const cancel = (eventId: EventId) =>
      sql`
        UPDATE events
        SET
          status = ${EventStatus.CANCELLED}
        WHERE
          id = ${eventId}
      `;

    const composeEvent = (
      event: DueEvent,
      plan: (candidates: ReadonlyArray<Candidate>) => CompositionPlan,
    ) =>
      sql.withTransaction(Effect.gen(function*() {
        const claimed = yield* claim(event.id);
        if (!claimed) {
          return {
            eventId: event.id,
            claimed: false,
            rooms: 0,
            placed: 0,
            dropped: 0,
            cancelled: false,
          };
        }

        const startsAt = DateTime.toDate(event.startsAt);
        const rows = yield* findCandidates(event.id);
        const result = plan(
          rows.map((row) => ({
            reservationId: row.reservationId,
            userId: row.userId,
            age: ageAt(row.dateOfBirth, startsAt),
            gender: row.gender,
            interestedIn: row.interestedIn,
            dropStreak: row.dropStreak,
            reservedAt: DateTime.toEpochMillis(row.reservedAt),
          })),
        );

        for (const room of result.rooms) {
          const roomId = yield* insertRoom(event.id, room.ageBracket);
          yield* place(roomId, room.members);
        }
        if (result.dropped.length > 0) {
          yield* drop(result.dropped);
        }
        // No viable Room formed anywhere in the pool: there is no night to run.
        if (result.rooms.length === 0) {
          yield* cancel(event.id);
        }

        return {
          eventId: event.id,
          claimed: true,
          rooms: result.rooms.length,
          placed: result.rooms.reduce((total, room) => total + room.members.length, 0),
          dropped: result.dropped.length,
          cancelled: result.rooms.length === 0,
        };
      }));

    return {
      findDue: () => findDue().pipe(Effect.orDie),
      composeEvent: (event, plan) => composeEvent(event, plan).pipe(Effect.orDie),
    };
  }),
).pipe(Layer.provide(PgLive));
