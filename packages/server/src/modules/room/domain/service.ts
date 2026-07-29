import type { NotRoomMemberError } from "@landline/domain/room/errors";
import type { RoomId } from "@landline/domain/room/schema";
import type { User, UserId } from "@landline/domain/user/schema";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export class RoomsService extends Context.Tag("RoomsService")<
  RoomsService,
  {
    /** Lists a room's members; only members may read the roster. */
    readonly members: (
      roomId: RoomId,
      requesterId: UserId,
    ) => Effect.Effect<ReadonlyArray<User>, NotRoomMemberError>;
  }
>() {}
