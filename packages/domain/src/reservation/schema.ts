import { EventId } from "#event/schema.js";
import { RoomId } from "#room/schema.js";
import { UserId } from "#user/schema.js";
import { Schema } from "effect";
import { ReservationOutcome } from "./enums.js";

export const ReservationId = Schema.UUID.pipe(Schema.brand("ReservationId"));
export type ReservationId = typeof ReservationId.Type;

// A user's explicit commitment to attend one specific Event — the will-come
// signal composition consumes at the Cutoff (CONTEXT.md > Reservation). Unique
// per (user, event); `reservedAt` breaks ties in placement priority (ADR-0008).
// `outcome`/`placedRoomId` stay null until composition resolves the Reservation.
export class Reservation extends Schema.Class<Reservation>("Reservation")({
  id: ReservationId,
  userId: UserId,
  eventId: EventId,
  reservedAt: Schema.DateTimeUtc,
  outcome: Schema.NullOr(Schema.Enums(ReservationOutcome)),
  placedRoomId: Schema.NullOr(RoomId),
}) {}
