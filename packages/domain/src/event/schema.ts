import { CityId } from "#city/schema.js";
import { Schema } from "effect";
import { EventStatus, Regime } from "./enums.js";

export const EventId = Schema.UUID.pipe(Schema.brand("EventId"));
export type EventId = typeof EventId.Type;

// The calendar date the Event runs on, in the City's local time (YYYY-MM-DD).
export const EventDate = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}$/, {
    message: () => "Event date must be a calendar date (YYYY-MM-DD)",
  }),
  Schema.brand("EventDate"),
);
export type EventDate = typeof EventDate.Type;

// A scheduled night in one City on one date under one Regime. `startsAt` is the
// City-timezone 20:00 as a UTC instant; `reservationDeadline` (the Cutoff) is
// when reservations close and rooms compose. The per-event composition-param
// overrides live on the row but are surfaced by the composition ticket.
export class Event extends Schema.Class<Event>("Event")({
  id: EventId,
  cityId: CityId,
  date: EventDate,
  regime: Schema.Enums(Regime),
  status: Schema.Enums(EventStatus),
  startsAt: Schema.DateTimeUtc,
  reservationDeadline: Schema.DateTimeUtc,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}
