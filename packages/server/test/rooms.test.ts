import { expect, layer } from "@effect/vitest";
import { Effect } from "effect";
import { makeApiClient, seedCity, signUpPayload, TestServerLive } from "./harness.js";

// A signed-up client (own cookie jar) standing in for one user's browser.
const signedUpClient = (email: string) =>
  Effect.gen(function*() {
    const client = yield* makeApiClient;
    const cityId = yield* seedCity;
    yield* client.users.signUp({ payload: signUpPayload(email, cityId), headers: {} });
    return client;
  });

layer(TestServerLive, { excludeTestServices: true })("rooms", (it) => {
  it.effect("create → list → join → members exposes the roster to members", () =>
    Effect.gen(function*() {
      const alice = yield* signedUpClient("alice-members@example.com");
      const bob = yield* signedUpClient("bob-members@example.com");

      const room = yield* alice.rooms.upsert({ payload: { name: "Neon Room" } });
      expect(room.name).toBe("Neon Room");

      // Before joining, the list reports the room as not joined for alice.
      const listed = yield* alice.rooms.list();
      expect(listed.find((r) => r.id === room.id)?.joined).toBe(false);

      yield* alice.rooms.join({ payload: { id: room.id } });
      yield* bob.rooms.join({ payload: { id: room.id } });

      // After joining, the same list now reports it as joined — this is what
      // hides the Join button on the client.
      const afterJoin = yield* alice.rooms.list();
      expect(afterJoin.find((r) => r.id === room.id)?.joined).toBe(true);

      // Both members see each other — the two-users-in-a-room requirement.
      const members = yield* alice.rooms.members({ path: { roomId: room.id } });
      const emails = members.map((m) => m.email).sort();
      expect(emails).toEqual(["alice-members@example.com", "bob-members@example.com"]);

      const asSeenByBob = yield* bob.rooms.members({ path: { roomId: room.id } });
      expect(asSeenByBob.map((m) => m.email).sort()).toEqual(emails);
    }));

  it.effect("a non-member cannot read the roster", () =>
    Effect.gen(function*() {
      const owner = yield* signedUpClient("owner-leak@example.com");
      const outsider = yield* signedUpClient("outsider-leak@example.com");

      const room = yield* owner.rooms.upsert({ payload: { name: "Members Only" } });
      yield* owner.rooms.join({ payload: { id: room.id } });

      const rejection = yield* outsider.rooms
        .members({ path: { roomId: room.id } })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("NotRoomMemberError");
    }));

  it.effect("members requires a session", () =>
    Effect.gen(function*() {
      const anon = yield* makeApiClient;
      const owner = yield* signedUpClient("owner-guard@example.com");

      const room = yield* owner.rooms.upsert({ payload: { name: "Guarded" } });

      const rejection = yield* anon.rooms
        .members({ path: { roomId: room.id } })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("UnauthorizedError");
    }));

  it.effect("joining the same room twice is idempotent", () =>
    Effect.gen(function*() {
      const user = yield* signedUpClient("idempotent-join@example.com");

      const room = yield* user.rooms.upsert({ payload: { name: "Join Twice" } });
      yield* user.rooms.join({ payload: { id: room.id } });
      yield* user.rooms.join({ payload: { id: room.id } });

      const members = yield* user.rooms.members({ path: { roomId: room.id } });
      expect(members).toHaveLength(1);
    }));
});
