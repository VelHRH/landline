import { PgLive } from "#db/pg-client.js";
import { CitiesRepo, CityInsert } from "#modules/city/domain/repo.js";
import * as SqlClient from "@effect/sql/SqlClient";
import * as SqlSchema from "@effect/sql/SqlSchema";
import { City, CityId } from "@landline/domain/city/schema";
import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

// Neutralise LIKE wildcards so a typed "%" matches a literal percent.
const escapeLike = (input: string) => input.replace(/[\\%_]/g, "\\$&");

export const CitiesRepoLive = Layer.effect(
  CitiesRepo,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient;

    const findById = SqlSchema.findOne({
      Result: City,
      Request: CityId,
      execute: (id) =>
        sql`
        SELECT
          id,
          geonames_id,
          name,
          country,
          timezone,
          latitude,
          longitude,
          population
        FROM
          cities
        WHERE
          id = ${id}
      `,
    });

    const searchByPrefix = SqlSchema.findAll({
      Result: City,
      Request: Schema.Struct({ pattern: Schema.String, limit: Schema.Int }),
      execute: ({ limit, pattern }) =>
        sql`
        SELECT
          id,
          geonames_id,
          name,
          country,
          timezone,
          latitude,
          longitude,
          population
        FROM
          cities
        WHERE
          lower(name) LIKE ${pattern} ESCAPE '\'
        ORDER BY
          population DESC
        LIMIT
          ${limit}
      `,
    });

    // The IS DISTINCT FROM guard keeps a re-seed idempotent: unchanged rows are
    // not updated, so updated_at (and its trigger) stays untouched.
    const upsertMany = SqlSchema.void({
      Request: Schema.Array(CityInsert),
      execute: (cities) =>
        sql`
        INSERT INTO
          cities ${sql.insert(cities)}
        ON CONFLICT (geonames_id) DO UPDATE SET
          name = EXCLUDED.name,
          country = EXCLUDED.country,
          timezone = EXCLUDED.timezone,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          population = EXCLUDED.population
        WHERE
          (
            cities.name,
            cities.country,
            cities.timezone,
            cities.latitude,
            cities.longitude,
            cities.population
          ) IS DISTINCT FROM (
            EXCLUDED.name,
            EXCLUDED.country,
            EXCLUDED.timezone,
            EXCLUDED.latitude,
            EXCLUDED.longitude,
            EXCLUDED.population
          )
      `,
    });

    return {
      findById: flow(findById, Effect.orDie),
      searchByPrefix: (prefix: string, limit: number) =>
        searchByPrefix({
          pattern: `${escapeLike(prefix.toLowerCase())}%`,
          limit,
        }).pipe(Effect.orDie),
      upsertMany: (cities: ReadonlyArray<CityInsert>) =>
        cities.length === 0
          ? Effect.void
          : upsertMany(cities).pipe(Effect.orDie),
    };
  }),
).pipe(Layer.provide(PgLive));
