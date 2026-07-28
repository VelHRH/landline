import { CityId } from "#city/schema.js";
import { CityNotFoundError } from "#user/errors.js";
import { Authorization } from "#user/http.js";
import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import * as Schema from "effect/Schema";
import { CreateEventPayload } from "./create.js";
import { ForbiddenError } from "./errors.js";
import { Event } from "./schema.js";

export const UpcomingEventsParams = Schema.Struct({
  cityId: CityId,
});
export type UpcomingEventsParams = typeof UpcomingEventsParams.Type;

// Creating an Event is ADMIN-only (enforced in the handler via ForbiddenError);
// listing upcoming Events for a city is open to any authenticated user.
export class EventsGroup extends HttpApiGroup.make("events")
  .add(
    HttpApiEndpoint.post("create", "/")
      .setPayload(CreateEventPayload)
      .addSuccess(Event)
      .addError(ForbiddenError)
      .addError(CityNotFoundError),
  )
  .add(
    HttpApiEndpoint.get("upcoming", "/upcoming")
      .setUrlParams(UpcomingEventsParams)
      .addSuccess(Schema.Array(Event)),
  )
  .middleware(Authorization)
  .prefix("/event")
{}
