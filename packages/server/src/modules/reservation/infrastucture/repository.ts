import { PgLive } from "#db/pg-client.js";
import { isUniqueViolation } from "#db/sql-errors.js";
import { CreateReservationInput, ReservationsRepo } from "#modules/reservation/domain/repo.js";
import * as SqlClient from "@effect/sql/SqlClient";
import * as SqlSchema from "@effect/sql/SqlSchema";
import { EventId } from "@landline/domain/event/schema";
import { ReservationAlreadyExistsError } from "@landline/domain/reservation/errors";
import { Reservation } from "@landline/domain/reservation/schema";
import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as Layer from "effect/Layer";

const RESERVATION_COLUMNS = "id, user_id, event_id, reserved_at, outcome, placed_room_id";

export const ReservationsRepoLive = Layer.effect(
  ReservationsRepo,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient;

    const create = SqlSchema.single({
      Result: Reservation,
      Request: CreateReservationInput,
      execute: (request) =>
        sql`
        INSERT INTO
          reservations ${sql.insert(request)}
        RETURNING
          ${sql.literal(RESERVATION_COLUMNS)}
      `,
    });

    const findByEventId = SqlSchema.findAll({
      Result: Reservation,
      Request: EventId,
      execute: (eventId) =>
        sql`
        SELECT
          ${sql.literal(RESERVATION_COLUMNS)}
        FROM
          reservations
        WHERE
          event_id = ${eventId}
        ORDER BY
          reserved_at ASC
      `,
    });

    return {
      create: (request: CreateReservationInput) =>
        create(request).pipe(
          Effect.catchTags({
            SqlError: (error) =>
              isUniqueViolation(error)
                ? new ReservationAlreadyExistsError()
                : Effect.die(error),
            NoSuchElementException: Effect.die,
            ParseError: Effect.die,
          }),
        ),
      delete: (userId, eventId) =>
        sql`
          DELETE FROM reservations
          WHERE
            user_id = ${userId}
            AND event_id = ${eventId}
          RETURNING
            id
        `.pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.orDie,
        ),
      findByEventId: flow(findByEventId, Effect.orDie),
    };
  }),
).pipe(Layer.provide(PgLive));
