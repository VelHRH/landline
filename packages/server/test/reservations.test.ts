import { SqlClient } from "@effect/sql";
import { expect, layer } from "@effect/vitest";
import type { CityId } from "@landline/domain/city/schema";
import { CreateEventPayload } from "@landline/domain/event/create";
import type { EventId } from "@landline/domain/event/schema";
import { Effect, Schema } from "effect";
import { makeApiClient, seedCity, signUpPayload, TestServerLive } from "./harness.js";

const promoteToAdmin = (email: string) =>
  Effect.flatMap(
    SqlClient.SqlClient,
    (sql) =>
      sql`
        UPDATE users
        SET
          role = 'ADMIN'
        WHERE
          email = ${email}
      `,
  );

// A second city, distinct from the seeded Testville, so we can build an Event a
// user cannot reserve (it is not in their City).
const seedOtherCity = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql`
    INSERT INTO
      cities (geonames_id, name, country, timezone, latitude, longitude, population)
    VALUES
      (2, 'Otherville', 'Testland', 'UTC', 1, 1, 1000)
    ON CONFLICT (geonames_id) DO UPDATE SET
      name = EXCLUDED.name
    RETURNING
      id
  `;
  return (rows[0] as { id: string }).id as CityId;
});

const createPayload = (cityId: CityId, date: string) => Schema.decodeUnknownSync(CreateEventPayload)({ cityId, date });

layer(TestServerLive, { excludeTestServices: true })("reservations", (it) => {
  it.effect("a user reserves a SCHEDULED Event in their own city", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const cityId = yield* seedCity;
      const admin = "res-admin@example.com";

      yield* client.users.signUp({ payload: signUpPayload(admin, cityId), headers: {} });
      yield* promoteToAdmin(admin);
      const event = yield* client.events.create({ payload: createPayload(cityId, "2099-09-01") });

      const reservation = yield* client.reservations.reserve({ path: { eventId: event.id } });

      expect(reservation.eventId).toBe(event.id);
      // A fresh reservation is unresolved until composition sets its outcome.
      expect(reservation.outcome).toBeNull();

      // The reservation is queryable as the Event's composition input set.
      const listed = yield* client.reservations.list({ path: { eventId: event.id } });
      expect(listed.map((r) => r.id)).toContain(reservation.id);
    }));

  it.effect("reserving the same Event twice is rejected", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const cityId = yield* seedCity;
      const admin = "res-dup@example.com";

      yield* client.users.signUp({ payload: signUpPayload(admin, cityId), headers: {} });
      yield* promoteToAdmin(admin);
      const event = yield* client.events.create({ payload: createPayload(cityId, "2099-09-02") });

      yield* client.reservations.reserve({ path: { eventId: event.id } });
      const rejection = yield* client.reservations
        .reserve({ path: { eventId: event.id } })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("ReservationAlreadyExistsError");
    }));

  it.effect("reserving an Event in another city is rejected", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const homeCity = yield* seedCity;
      const otherCity = yield* seedOtherCity;
      const admin = "res-city@example.com";

      // The user belongs to homeCity; the Event runs in otherCity.
      yield* client.users.signUp({ payload: signUpPayload(admin, homeCity), headers: {} });
      yield* promoteToAdmin(admin);
      const event = yield* client.events.create({ payload: createPayload(otherCity, "2099-09-03") });

      const rejection = yield* client.reservations
        .reserve({ path: { eventId: event.id } })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("EventNotInCityError");
    }));

  it.effect("a non-existent Event is reported as not found", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const cityId = yield* seedCity;

      yield* client.users.signUp({ payload: signUpPayload("res-missing@example.com", cityId), headers: {} });

      const rejection = yield* client.reservations
        .reserve({ path: { eventId: "00000000-0000-0000-0000-000000000000" as EventId } })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("EventNotFoundError");
    }));

  it.effect("a user cancels their reservation before the Cutoff", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const cityId = yield* seedCity;
      const admin = "res-cancel@example.com";

      yield* client.users.signUp({ payload: signUpPayload(admin, cityId), headers: {} });
      yield* promoteToAdmin(admin);
      const event = yield* client.events.create({ payload: createPayload(cityId, "2099-09-04") });

      yield* client.reservations.reserve({ path: { eventId: event.id } });
      yield* client.reservations.cancel({ path: { eventId: event.id } });

      const rejection = yield* client.reservations
        .cancel({ path: { eventId: event.id } })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("ReservationNotFoundError");
    }));
});
