import type { RoomId } from "@landline/domain/room/schema";
import type { User, UserId } from "@landline/domain/user/schema";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

// Rooms and their membership are written by composition (the event module owns
// that transaction, ADR-0008); this repo only reads the resulting roster.
export class RoomsRepo extends Context.Tag("RoomsRepo")<
  RoomsRepo,
  {
    readonly membersAmong: (
      roomId: RoomId,
      userIds: ReadonlyArray<UserId>,
    ) => Effect.Effect<ReadonlyArray<UserId>>;
    readonly findMembers: (roomId: RoomId) => Effect.Effect<ReadonlyArray<User>>;
  }
>() {}
