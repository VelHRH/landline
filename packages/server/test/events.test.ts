import { SqlClient } from "@effect/sql";
import { expect, layer } from "@effect/vitest";
import type { CityId } from "@landline/domain/city/schema";
import { CreateEventPayload } from "@landline/domain/event/create";
import { EventStatus, Regime } from "@landline/domain/event/enums";
import { REGIME_DEFAULTS } from "@landline/domain/event/regime";
import { DateTime, Effect, Schema } from "effect";
import { makeApiClient, seedCity, signUpPayload, TestServerLive } from "./harness.js";

// Promotes an already-signed-up user to ADMIN. Role is read from the users row
// on every request, so no re-login is needed after the update.
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

const createPayload = (cityId: CityId, date: string) => Schema.decodeUnknownSync(CreateEventPayload)({ cityId, date });

layer(TestServerLive, { excludeTestServices: true })("events", (it) => {
  it.effect("an ADMIN creates a SCHEDULED Event with defaults applied", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const cityId = yield* seedCity;
      const email = "admin@example.com";

      yield* client.users.signUp({ payload: signUpPayload(email, cityId), headers: {} });
      yield* promoteToAdmin(email);

      const event = yield* client.events.create({ payload: createPayload(cityId, "2099-06-15") });

      expect(event.status).toBe(EventStatus.SCHEDULED);
      expect(event.regime).toBe(Regime.SPEED_BLIND_DATING);
      expect(event.cityId).toBe(cityId);
      // Testville is a UTC city, so its local 20:00 is 20:00 UTC.
      expect(DateTime.toEpochMillis(event.startsAt)).toBe(Date.UTC(2099, 5, 15, 20, 0, 0, 0));
      // reservationDeadline defaults to startsAt - regime leadTime.
      const leadMs = REGIME_DEFAULTS[Regime.SPEED_BLIND_DATING].leadTimeMinutes * 60_000;
      expect(DateTime.toEpochMillis(event.reservationDeadline)).toBe(
        DateTime.toEpochMillis(event.startsAt) - leadMs,
      );
    }));

  it.effect("a non-ADMIN is forbidden from creating an Event", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const cityId = yield* seedCity;

      yield* client.users.signUp({ payload: signUpPayload("regular@example.com", cityId), headers: {} });

      const rejection = yield* client.events
        .create({ payload: createPayload(cityId, "2099-06-15") })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("ForbiddenError");
    }));

  it.effect("upcoming Events for a city are listable", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const cityId = yield* seedCity;
      const email = "lister@example.com";

      yield* client.users.signUp({ payload: signUpPayload(email, cityId), headers: {} });
      yield* promoteToAdmin(email);

      const created = yield* client.events.create({ payload: createPayload(cityId, "2099-06-15") });

      const upcoming = yield* client.events.upcoming({ urlParams: { cityId } });

      expect(upcoming.map((event) => event.id)).toContain(created.id);
    }));
});
