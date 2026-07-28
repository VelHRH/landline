import { runMigrations } from "#db/migrate.js";
import { PgLive } from "#db/pg-client.js";
import { AllRoutes } from "#http.js";
import { Cookies, FetchHttpClient, HttpApiClient, HttpClient, HttpLayerRouter, HttpServer } from "@effect/platform";
import { NodeContext, NodeHttpServer } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { Api } from "@landline/domain/api";
import type { CityId } from "@landline/domain/city/schema";
import { SignUpPayload } from "@landline/domain/user/credentials";
import { Gender } from "@landline/domain/user/enums";
import { Effect, Layer, Ref, Schema } from "effect";
import { createServer } from "node:http";

// The api-seam test server: the exact route layer production serves, bound to
// an ephemeral port against the test database (DATABASE_URL is pointed at it
// by vitest.config.ts). Migrations run before the first request is accepted.
export const TestServerLive = Layer.unwrapEffect(
  runMigrations().pipe(
    Effect.as(
      HttpLayerRouter.serve(AllRoutes, { disableLogger: true }).pipe(
        Layer.provideMerge(NodeHttpServer.layer(createServer, { port: 0 })),
      ),
    ),
    Effect.provide([PgLive, NodeContext.layer]),
  ),
).pipe(
  // PgLive is merged in so tests can seed reference data (e.g. cities) that
  // the API has no write endpoint for.
  Layer.merge(Layer.mergeAll(FetchHttpClient.layer, PgLive)),
  Layer.provide(NodeContext.layer),
);

// Inserts a city (idempotent on geonames_id) and returns its id, so tests can
// build a Profile with a cityId the users.city_id foreign key will accept.
export const seedCity = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql`
    INSERT INTO
      cities (geonames_id, name, country, timezone, latitude, longitude, population)
    VALUES
      (1, 'Testville', 'Testland', 'UTC', 0, 0, 1000)
    ON CONFLICT (geonames_id) DO UPDATE SET
      name = EXCLUDED.name
    RETURNING
      id
  `;
  return (rows[0] as { id: string }).id as CityId;
});

// A complete, valid sign-up payload for the given city; tests vary only what
// they assert on via `overrides`.
export const signUpPayload = (
  email: string,
  cityId: CityId,
  overrides?: Partial<{ interestedIn: ReadonlyArray<Gender> }>,
) =>
  Schema.decodeUnknownSync(SignUpPayload)({
    email,
    password: "correct-horse-battery",
    dateOfBirth: "1995-06-15",
    gender: Gender.FEMALE,
    interestedIn: overrides?.interestedIn ?? [Gender.MALE],
    cityId,
  });

// A fresh typed client with its own cookie jar — the same derived client the
// Vue app uses, plus browser-like session-cookie persistence across requests.
export const makeApiClient = Effect.gen(function*() {
  const cookies = yield* Ref.make(Cookies.empty);
  const baseUrl = yield* HttpServer.addressFormattedWith(Effect.succeed);
  return yield* HttpApiClient.make(Api, {
    baseUrl,
    transformClient: HttpClient.withCookiesRef(cookies),
  });
});
