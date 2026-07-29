import { EventNotFoundError, ForbiddenError } from "#event/errors.js";
import { EventId } from "#event/schema.js";
import { Authorization } from "#user/http.js";
import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import * as Schema from "effect/Schema";
import {
  EventNotInCityError,
  EventNotScheduledError,
  ReservationAlreadyExistsError,
  ReservationNotFoundError,
  ReservationsClosedError,
} from "./errors.js";
import { Reservation } from "./schema.js";

const EventPath = Schema.Struct({ eventId: EventId });

// Reservations hang off an Event: a user reserves or cancels their own spot for
// one Event; listing an Event's reservations (the composition input set) is
// ADMIN-only.
export class ReservationsGroup extends HttpApiGroup.make("reservations")
  .add(
    HttpApiEndpoint.post("reserve", "/:eventId/reservation")
      .setPath(EventPath)
      .addSuccess(Reservation)
      .addError(EventNotFoundError)
      .addError(EventNotScheduledError)
      .addError(EventNotInCityError)
      .addError(ReservationsClosedError)
      .addError(ReservationAlreadyExistsError),
  )
  .add(
    HttpApiEndpoint.del("cancel", "/:eventId/reservation")
      .setPath(EventPath)
      .addSuccess(Schema.Void)
      .addError(EventNotFoundError)
      .addError(ReservationNotFoundError)
      .addError(ReservationsClosedError),
  )
  .add(
    HttpApiEndpoint.get("list", "/:eventId/reservations")
      .setPath(EventPath)
      .addSuccess(Schema.Array(Reservation))
      .addError(ForbiddenError),
  )
  .middleware(Authorization)
  .prefix("/event")
{}
