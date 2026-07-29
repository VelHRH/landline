import type { EventId } from "@landline/domain/event/schema";
import type { ReservationAlreadyExistsError } from "@landline/domain/reservation/errors";
import { Reservation } from "@landline/domain/reservation/schema";
import type { UserId } from "@landline/domain/user/schema";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

// The identifying pair a reserve writes; `reserved_at` defaults to now() in the
// database.
export const CreateReservationInput = Schema.Struct({
  userId: Reservation.fields.userId,
  eventId: Reservation.fields.eventId,
});
export type CreateReservationInput = typeof CreateReservationInput.Type;

export class ReservationsRepo extends Context.Tag("ReservationsRepo")<
  ReservationsRepo,
  {
    readonly create: (
      input: CreateReservationInput,
    ) => Effect.Effect<Reservation, ReservationAlreadyExistsError>;
    // Deletes the user's reservation for the event; false when none existed.
    readonly delete: (
      userId: UserId,
      eventId: EventId,
    ) => Effect.Effect<boolean>;
    // Every reservation for an Event — the composition input set (ADR-0007).
    readonly findByEventId: (
      eventId: EventId,
    ) => Effect.Effect<ReadonlyArray<Reservation>>;
  }
>() {}
