import { expect, layer } from "@effect/vitest";
import { Effect } from "effect";
import { makeApiClient, seedCity, signUpPayload, TestServerLive } from "./harness.js";

// A signed-up client (own cookie jar) plus the user it belongs to.
const signUp = (email: string) =>
  Effect.gen(function*() {
    const client = yield* makeApiClient;
    const cityId = yield* seedCity;
    const { user } = yield* client.users.signUp({ payload: signUpPayload(email, cityId), headers: {} });
    return { client, user };
  });

layer(TestServerLive, { excludeTestServices: true })("chat (REST)", (it) => {
  it.effect("open is idempotent, history starts empty, and my-chats lists the partner", () =>
    Effect.gen(function*() {
      const alice = yield* signUp("alice-chat@example.com");
      const bob = yield* signUp("bob-chat@example.com");

      const room = yield* alice.client.rooms.upsert({ payload: { name: "Chat Room" } });
      yield* alice.client.rooms.join({ payload: { id: room.id } });
      yield* bob.client.rooms.join({ payload: { id: room.id } });

      const chat = yield* alice.client.chats.open({
        payload: { roomId: room.id, partnerId: bob.user.id },
      });

      // Same pair → same dialog, regardless of who opens or how many times.
      const again = yield* alice.client.chats.open({
        payload: { roomId: room.id, partnerId: bob.user.id },
      });
      expect(again.id).toBe(chat.id);

      const fromBob = yield* bob.client.chats.open({
        payload: { roomId: room.id, partnerId: alice.user.id },
      });
      expect(fromBob.id).toBe(chat.id);

      // A brand-new chat has no history yet.
      const history = yield* alice.client.chats.messages({ path: { chatId: chat.id } });
      expect(history).toHaveLength(0);

      // Each side's my-chats shows the one dialog, pointing at the other user.
      const aliceChats = yield* alice.client.chats.myChats();
      expect(aliceChats).toHaveLength(1);
      expect(aliceChats[0]?.id).toBe(chat.id);
      expect(aliceChats[0]?.partner.email).toBe("bob-chat@example.com");

      const bobChats = yield* bob.client.chats.myChats();
      expect(bobChats).toHaveLength(1);
      expect(bobChats[0]?.partner.email).toBe("alice-chat@example.com");
    }));

  it.effect("opening a chat with a partner outside the room is rejected", () =>
    Effect.gen(function*() {
      const alice = yield* signUp("alice-outsider@example.com");
      const bob = yield* signUp("bob-outsider@example.com");

      const room = yield* alice.client.rooms.upsert({ payload: { name: "Solo Room" } });
      yield* alice.client.rooms.join({ payload: { id: room.id } });
      // bob never joins.

      const rejection = yield* alice.client.chats
        .open({ payload: { roomId: room.id, partnerId: bob.user.id } })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("NotRoomMemberError");
    }));

  it.effect("reading messages of a chat you are not in is not found (no leak)", () =>
    Effect.gen(function*() {
      const alice = yield* signUp("alice-leak@example.com");
      const bob = yield* signUp("bob-leak@example.com");
      const carol = yield* signUp("carol-leak@example.com");

      const room = yield* alice.client.rooms.upsert({ payload: { name: "Private Room" } });
      yield* alice.client.rooms.join({ payload: { id: room.id } });
      yield* bob.client.rooms.join({ payload: { id: room.id } });

      const chat = yield* alice.client.chats.open({
        payload: { roomId: room.id, partnerId: bob.user.id },
      });

      const rejection = yield* carol.client.chats
        .messages({ path: { chatId: chat.id } })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("ChatNotFoundError");
    }));

  it.effect("my-chats is empty for a user with no dialogs", () =>
    Effect.gen(function*() {
      const loner = yield* signUp("loner-chat@example.com");
      const chats = yield* loner.client.chats.myChats();
      expect(chats).toHaveLength(0);
    }));
});
