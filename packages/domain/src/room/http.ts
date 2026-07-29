import { Authorization } from "#user/http.js";
import { User } from "#user/schema.js";
import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import * as Schema from "effect/Schema";
import { NotRoomMemberError } from "./errors.js";
import { RoomId } from "./schema.js";

// Rooms are created by composition at the Cutoff, never by a request: there is no
// create, join or delete endpoint. Only members may read a room's roster, so a
// non-member cannot enumerate who is inside a room they were not placed in.
export class RoomsGroup extends HttpApiGroup.make("rooms")
  .add(
    HttpApiEndpoint.get("members", "/:roomId/members")
      .setPath(Schema.Struct({ roomId: RoomId }))
      .addSuccess(Schema.Array(User))
      .addError(NotRoomMemberError),
  )
  .middleware(Authorization)
  .prefix("/room")
{}
