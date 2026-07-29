import { HttpApiSchema } from "@effect/platform";
import * as Schema from "effect/Schema";

export class ReservationAlreadyExistsError extends Schema.TaggedError<ReservationAlreadyExistsError>(
  "ReservationAlreadyExistsError",
)(
  "ReservationAlreadyExistsError",
  {},
  HttpApiSchema.annotations({
    status: 409,
  }),
) {
  get message() {
    return "You already have a reservation for this event";
  }
}

export class ReservationNotFoundError extends Schema.TaggedError<ReservationNotFoundError>(
  "ReservationNotFoundError",
)(
  "ReservationNotFoundError",
  {},
  HttpApiSchema.annotations({
    status: 404,
  }),
) {
  get message() {
    return "You have no reservation for this event";
  }
}

export class EventNotScheduledError extends Schema.TaggedError<EventNotScheduledError>(
  "EventNotScheduledError",
)(
  "EventNotScheduledError",
  {},
  HttpApiSchema.annotations({
    status: 409,
  }),
) {
  get message() {
    return "This event is not open for reservations";
  }
}

export class EventNotInCityError extends Schema.TaggedError<EventNotInCityError>(
  "EventNotInCityError",
)(
  "EventNotInCityError",
  {},
  HttpApiSchema.annotations({
    status: 403,
  }),
) {
  get message() {
    return "You can only reserve events in your own city";
  }
}

export class ReservationsClosedError extends Schema.TaggedError<ReservationsClosedError>(
  "ReservationsClosedError",
)(
  "ReservationsClosedError",
  {},
  HttpApiSchema.annotations({
    status: 409,
  }),
) {
  get message() {
    return "The reservation deadline for this event has passed";
  }
}
