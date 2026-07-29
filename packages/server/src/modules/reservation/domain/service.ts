import type { EventNotFoundError, ForbiddenError } from "@landline/domain/event/errors";
import type { EventId } from "@landline/domain/event/schema";
import type {
  EventNotInCityError,
  EventNotScheduledError,
  ReservationAlreadyExistsError,
  ReservationNotFoundError,
  ReservationsClosedError,
} from "@landline/domain/reservation/errors";
import type { Reservation } from "@landline/domain/reservation/schema";
import type { Me } from "@landline/domain/user/schema";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export class ReservationsService extends Context.Tag("ReservationsService")<
  ReservationsService,
  {
    // Reserves the requester's spot for an own-city SCHEDULED Event before its
    // Cutoff; rejects a duplicate reservation.
    readonly reserve: (
      eventId: EventId,
      requester: Me,
    ) => Effect.Effect<
      Reservation,
      | EventNotFoundError
      | EventNotScheduledError
      | EventNotInCityError
      | ReservationsClosedError
      | ReservationAlreadyExistsError
    >;
    // Cancels the requester's reservation while the Event is before its Cutoff.
    readonly cancel: (
      eventId: EventId,
      requester: Me,
    ) => Effect.Effect<
      void,
      EventNotFoundError | ReservationNotFoundError | ReservationsClosedError
    >;
    // The Event's reservations (the composition input set); ADMIN-only.
    readonly list: (
      eventId: EventId,
      requester: Me,
    ) => Effect.Effect<ReadonlyArray<Reservation>, ForbiddenError>;
  }
>() {}
