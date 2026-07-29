import { EventId } from "#event/schema.js";
import { Schema } from "effect";

export const RoomId = Schema.UUID.pipe(Schema.brand("RoomId"));
export type RoomId = typeof RoomId.Type;

// A group composed from an Event's Reservations at the Cutoff (ADR-0008). A Room
// belongs to exactly one Event, inherits its City, and carries the age bracket it
// was composed within (`18-29`, `30+`). Membership is composition's output, not
// something a user joins, and it locks at composition.
export class Room extends Schema.Class<Room>("Room")({
  id: RoomId,
  eventId: EventId,
  ageBracket: Schema.String,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}
