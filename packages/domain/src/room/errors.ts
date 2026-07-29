import { HttpApiSchema } from "@effect/platform";
import * as Schema from "effect/Schema";
import { RoomId } from "./schema.js";

// Raised when a user acts on a room they were not placed in (opening a chat,
// listing members). 403 rather than 404: the caller is authenticated and the
// room exists — only its roster is gated.
export class NotRoomMemberError extends Schema.TaggedError<NotRoomMemberError>(
  "NotRoomMemberError",
)(
  "NotRoomMemberError",
  { roomId: RoomId },
  HttpApiSchema.annotations({
    status: 403,
  }),
) {
  get message() {
    return `You must be a member of room ${this.roomId}`;
  }
}
