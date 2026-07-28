import type { CityId } from "@landline/domain/city/schema";
import type { CreateEventPayload } from "@landline/domain/event/create";
import type { ForbiddenError } from "@landline/domain/event/errors";
import type { Event } from "@landline/domain/event/schema";
import type { CityNotFoundError } from "@landline/domain/user/errors";
import type { Me } from "@landline/domain/user/schema";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export class EventsService extends Context.Tag("EventsService")<
  EventsService,
  {
    // Creates a SCHEDULED Event; ADMIN-only (non-admins get ForbiddenError).
    readonly create: (
      payload: CreateEventPayload,
      requester: Me,
    ) => Effect.Effect<Event, ForbiddenError | CityNotFoundError>;
    readonly listUpcoming: (
      cityId: CityId,
    ) => Effect.Effect<ReadonlyArray<Event>>;
  }
>() {}
