import { RoomsRepo } from "#modules/room/domain/repo.js";
import { RoomsService } from "#modules/room/domain/service.js";
import { NotRoomMemberError } from "@landline/domain/room/errors";
import type { RoomId } from "@landline/domain/room/schema";
import type { UserId } from "@landline/domain/user/schema";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { RoomsRepoLive } from "./repository.js";

export const RoomsServiceLive = Layer.effect(RoomsService)(
  Effect.gen(function*() {
    const repo = yield* RoomsRepo;

    const members = (roomId: RoomId, requesterId: UserId) =>
      Effect.gen(function*() {
        const membership = yield* repo.membersAmong(roomId, [requesterId]);
        if (membership.length === 0) {
          return yield* new NotRoomMemberError({ roomId });
        }
        return yield* repo.findMembers(roomId);
      });

    return { members };
  }),
).pipe(Layer.provide(RoomsRepoLive));
