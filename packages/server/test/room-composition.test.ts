import { CompositionService } from "#modules/event/domain/composition-service.js";
import { CompositionServiceLive } from "#modules/event/infrastucture/composition-service.js";
import { SqlClient } from "@effect/sql";
import { expect, layer } from "@effect/vitest";
import type { CityId } from "@landline/domain/city/schema";
import { CreateEventPayload } from "@landline/domain/event/create";
import { EventStatus } from "@landline/domain/event/enums";
import type { EventId } from "@landline/domain/event/schema";
import { ReservationOutcome } from "@landline/domain/reservation/enums";
import type { RoomId } from "@landline/domain/room/schema";
import { Gender } from "@landline/domain/user/enums";
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

// Pushes the Cutoff into the past and shrinks the composition params, so a
// handful of sign-ups is enough to form a viable Room. Reservations are made
// before this runs — the endpoint refuses them after the Cutoff.
const makeDue = (eventId: EventId, params: { rounds: number; floor: number; size: number }) =>
  Effect.flatMap(
    SqlClient.SqlClient,
    (sql) =>
      sql`
        UPDATE events
        SET
          reservation_deadline = now() - interval '1 minute',
          rounds = ${params.rounds},
          floor = ${params.floor},
          min_size = ${params.floor},
          max_size = ${params.size}
        WHERE
          id = ${eventId}
      `,
  );

const dropStreakOf = (email: string) =>
  Effect.flatMap(
    SqlClient.SqlClient,
    (sql) =>
      sql`
        SELECT
          drop_streak
        FROM
          users
        WHERE
          email = ${email}
      `,
  ).pipe(Effect.map((rows) => (rows[0] as { dropStreak: number }).dropStreak));

const roomCountOf = (eventId: EventId) =>
  Effect.flatMap(
    SqlClient.SqlClient,
    (sql) =>
      sql`
        SELECT
          id
        FROM
          rooms
        WHERE
          event_id = ${eventId}
      `,
  ).pipe(Effect.map((rows) => rows.length));

// One reconciliation cycle — exactly what the worker fiber runs on every tick.
const runWorkerCycle = Effect.flatMap(CompositionService, (service) => service.composeDue()).pipe(
  Effect.provide(CompositionServiceLive),
);

const createPayload = (cityId: CityId, date: string) => Schema.decodeUnknownSync(CreateEventPayload)({ cityId, date });

// A signed-up participant with their own cookie jar, already reserved.
const reserver = (eventId: EventId, email: string, cityId: CityId, gender: Gender) =>
  Effect.gen(function*() {
    const client = yield* makeApiClient;
    const interestedIn = gender === Gender.MALE ? [Gender.FEMALE] : [Gender.MALE];
    yield* client.users.signUp({
      payload: signUpPayload(email, cityId, { gender, interestedIn }),
      headers: {},
    });
    yield* client.reservations.reserve({ path: { eventId } });
    return client;
  });

const adminFor = (email: string, cityId: CityId) =>
  Effect.gen(function*() {
    const client = yield* makeApiClient;
    yield* client.users.signUp({ payload: signUpPayload(email, cityId), headers: {} });
    yield* promoteToAdmin(email);
    return client;
  });

layer(TestServerLive, { excludeTestServices: true })("room composition", (it) => {
  it.effect("the worker composes a due Event into a Room and resolves every Reservation", () =>
    Effect.gen(function*() {
      const cityId = yield* seedCity;
      const adminClient = yield* adminFor("compose-admin@example.com", cityId);
      const event = yield* adminClient.events.create({ payload: createPayload(cityId, "2099-10-01") });

      const alice = yield* reserver(event.id, "compose-alice@example.com", cityId, Gender.FEMALE);
      yield* reserver(event.id, "compose-bob@example.com", cityId, Gender.MALE);
      yield* reserver(event.id, "compose-carol@example.com", cityId, Gender.FEMALE);
      yield* reserver(event.id, "compose-dave@example.com", cityId, Gender.MALE);

      const outsider = yield* makeApiClient;
      yield* outsider.users.signUp({
        payload: signUpPayload("compose-outsider@example.com", cityId),
        headers: {},
      });

      yield* makeDue(event.id, { rounds: 1, floor: 4, size: 4 });

      const summaries = yield* runWorkerCycle;
      const summary = summaries.find((s) => s.eventId === event.id);
      expect(summary?.claimed).toBe(true);
      expect(summary?.rooms).toBe(1);
      expect(summary?.placed).toBe(4);
      expect(summary?.cancelled).toBe(false);

      // The Event has advanced out of SCHEDULED.
      const upcoming = yield* adminClient.events.upcoming({ urlParams: { cityId } });
      expect(upcoming.find((e) => e.id === event.id)?.status).toBe(EventStatus.COMPOSED);

      // Every Reservation is resolved, all into the same Room.
      const reservations = yield* adminClient.reservations.list({ path: { eventId: event.id } });
      expect(reservations).toHaveLength(4);
      expect(reservations.every((r) => r.outcome === ReservationOutcome.PLACED)).toBe(true);
      const roomIds = new Set(reservations.map((r) => r.placedRoomId));
      expect(roomIds.size).toBe(1);
      const roomId = [...roomIds][0] as RoomId;

      // A placed member sees the roster composition built.
      const members = yield* alice.rooms.members({ path: { roomId } });
      expect(members.map((m) => m.email).sort()).toEqual([
        "compose-alice@example.com",
        "compose-bob@example.com",
        "compose-carol@example.com",
        "compose-dave@example.com",
      ]);

      // Someone who was never placed cannot read it.
      const rejection = yield* outsider.rooms.members({ path: { roomId } }).pipe(Effect.flip);
      expect(rejection._tag).toBe("NotRoomMemberError");

      // Placement resets the fairness counter.
      expect(yield* dropStreakOf("compose-alice@example.com")).toBe(0);

      // A second cycle claims nothing: the transition happens once.
      const again = yield* runWorkerCycle;
      expect(again.find((s) => s.eventId === event.id)).toBeUndefined();
      expect(yield* roomCountOf(event.id)).toBe(1);
    }));

  it.effect("an Event that forms no viable Room is cancelled and its reservers deferred", () =>
    Effect.gen(function*() {
      const cityId = yield* seedCity;
      const adminClient = yield* adminFor("cancel-admin@example.com", cityId);
      const event = yield* adminClient.events.create({ payload: createPayload(cityId, "2099-10-02") });

      // Two men interested in women: no compatible pair exists, so no Room can
      // be viable at any size.
      yield* reserver(event.id, "cancel-one@example.com", cityId, Gender.MALE);
      yield* reserver(event.id, "cancel-two@example.com", cityId, Gender.MALE);

      yield* makeDue(event.id, { rounds: 1, floor: 2, size: 4 });

      const summaries = yield* runWorkerCycle;
      const summary = summaries.find((s) => s.eventId === event.id);
      expect(summary?.rooms).toBe(0);
      expect(summary?.dropped).toBe(2);
      expect(summary?.cancelled).toBe(true);

      const upcoming = yield* adminClient.events.upcoming({ urlParams: { cityId } });
      expect(upcoming.find((e) => e.id === event.id)?.status).toBe(EventStatus.CANCELLED);

      const reservations = yield* adminClient.reservations.list({ path: { eventId: event.id } });
      expect(reservations.every((r) => r.outcome === ReservationOutcome.DROPPED)).toBe(true);
      expect(reservations.every((r) => r.placedRoomId === null)).toBe(true);

      // A deferral increments the fairness counter, so they go first next time.
      expect(yield* dropStreakOf("cancel-one@example.com")).toBe(1);
      expect(yield* roomCountOf(event.id)).toBe(0);
    }));

  it.effect("an Event whose Cutoff has not passed is left alone", () =>
    Effect.gen(function*() {
      const cityId = yield* seedCity;
      const adminClient = yield* adminFor("future-admin@example.com", cityId);
      const event = yield* adminClient.events.create({ payload: createPayload(cityId, "2099-10-03") });

      const summaries = yield* runWorkerCycle;

      expect(summaries.find((s) => s.eventId === event.id)).toBeUndefined();
      expect(yield* roomCountOf(event.id)).toBe(0);
    }));
});
