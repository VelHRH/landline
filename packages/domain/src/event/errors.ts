import { HttpApiSchema } from "@effect/platform";
import * as Schema from "effect/Schema";

// Raised when an authenticated user lacks the role for an action (e.g. a
// non-ADMIN trying to create an Event). 403 rather than 401: they are
// authenticated, just not permitted.
export class ForbiddenError extends Schema.TaggedError<ForbiddenError>(
  "ForbiddenError",
)(
  "ForbiddenError",
  {},
  HttpApiSchema.annotations({
    status: 403,
  }),
) {
  get message() {
    return "You are not allowed to perform this action";
  }
}

// Raised when an action references an Event id that does not exist.
export class EventNotFoundError extends Schema.TaggedError<EventNotFoundError>(
  "EventNotFoundError",
)(
  "EventNotFoundError",
  { eventId: Schema.String },
  HttpApiSchema.annotations({
    status: 404,
  }),
) {
  get message() {
    return `No event with id ${this.eventId}`;
  }
}
