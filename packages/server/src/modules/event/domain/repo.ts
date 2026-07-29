import type { CityId } from "@landline/domain/city/schema";
import type { EventId } from "@landline/domain/event/schema";
import { Event } from "@landline/domain/event/schema";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as Option from "effect/Option";
import * as Schema from "effect/Schema";

// The resolved row an Event insert writes: `startsAt` and `reservationDeadline`
// are already computed. The composition-param columns are left unset (they
// default NULL = inherit the regime default).
export const CreateEventInput = Schema.Struct({
  cityId: Event.fields.cityId,
  date: Event.fields.date,
  regime: Event.fields.regime,
  status: Event.fields.status,
  startsAt: Event.fields.startsAt,
  reservationDeadline: Event.fields.reservationDeadline,
});
export type CreateEventInput = typeof CreateEventInput.Type;

export class EventsRepo extends Context.Tag("EventsRepo")<
  EventsRepo,
  {
    readonly create: (input: CreateEventInput) => Effect.Effect<Event>;
    readonly findById: (id: EventId) => Effect.Effect<Option.Option<Event>>;
    readonly listUpcoming: (
      cityId: CityId,
    ) => Effect.Effect<ReadonlyArray<Event>>;
  }
>() {}
