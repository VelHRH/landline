import { PgLive } from "#db/pg-client.js";
import { CreateEventInput, EventsRepo } from "#modules/event/domain/repo.js";
import * as SqlClient from "@effect/sql/SqlClient";
import * as SqlSchema from "@effect/sql/SqlSchema";
import { CityId } from "@landline/domain/city/schema";
import { Event, EventId } from "@landline/domain/event/schema";
import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as Layer from "effect/Layer";

// The columns the domain Event surfaces; the nullable composition-param columns
// are omitted until the composition ticket consumes them.
const EVENT_COLUMNS = "id, city_id, date, regime, status, starts_at, reservation_deadline, created_at, updated_at";

export const EventsRepoLive = Layer.effect(
  EventsRepo,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient;

    const create = SqlSchema.single({
      Result: Event,
      Request: CreateEventInput,
      execute: (request) =>
        sql`
        INSERT INTO
          events ${sql.insert(request)}
        RETURNING
          ${sql.literal(EVENT_COLUMNS)}
      `,
    });

    const findById = SqlSchema.findOne({
      Result: Event,
      Request: EventId,
      execute: (id) =>
        sql`
        SELECT
          ${sql.literal(EVENT_COLUMNS)}
        FROM
          events
        WHERE
          id = ${id}
      `,
    });

    const listUpcoming = SqlSchema.findAll({
      Result: Event,
      Request: CityId,
      execute: (cityId) =>
        sql`
        SELECT
          ${sql.literal(EVENT_COLUMNS)}
        FROM
          events
        WHERE
          city_id = ${cityId}
          AND starts_at >= now()
        ORDER BY
          starts_at ASC
      `,
    });

    return {
      create: flow(create, Effect.orDie),
      findById: flow(findById, Effect.orDie),
      listUpcoming: flow(listUpcoming, Effect.orDie),
    };
  }),
).pipe(Layer.provide(PgLive));
