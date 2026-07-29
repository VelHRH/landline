import { EventsRepo } from "#modules/event/domain/repo.js";
import { EventsRepoLive } from "#modules/event/infrastucture/repository.js";
import { ReservationsRepo } from "#modules/reservation/domain/repo.js";
import { ReservationsService } from "#modules/reservation/domain/service.js";
import { EventStatus } from "@landline/domain/event/enums";
import { EventNotFoundError, ForbiddenError } from "@landline/domain/event/errors";
import type { Event, EventId } from "@landline/domain/event/schema";
import {
  EventNotInCityError,
  EventNotScheduledError,
  ReservationNotFoundError,
  ReservationsClosedError,
} from "@landline/domain/reservation/errors";
import { Role } from "@landline/domain/user/enums";
import type { Me } from "@landline/domain/user/schema";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { ReservationsRepoLive } from "./repository.js";

export const ReservationsServiceLive = Layer.effect(
  ReservationsService,
  Effect.gen(function*() {
    const reservations = yield* ReservationsRepo;
    const events = yield* EventsRepo;

    const requireEvent = (eventId: EventId) =>
      events.findById(eventId).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(new EventNotFoundError({ eventId })),
            onSome: Effect.succeed,
          }),
        ),
      );

    const requireBeforeCutoff = (event: Event) =>
      Effect.flatMap(
        DateTime.isPast(event.reservationDeadline),
        (past) => past ? Effect.fail(new ReservationsClosedError()) : Effect.void,
      );

    const reserve = (eventId: EventId, requester: Me) =>
      Effect.gen(function*() {
        const event = yield* requireEvent(eventId);

        if (event.status !== EventStatus.SCHEDULED) {
          return yield* Effect.fail(new EventNotScheduledError());
        }
        if (event.cityId !== requester.cityId) {
          return yield* Effect.fail(new EventNotInCityError());
        }
        yield* requireBeforeCutoff(event);

        return yield* reservations.create({ userId: requester.id, eventId });
      });

    const cancel = (eventId: EventId, requester: Me) =>
      Effect.gen(function*() {
        const event = yield* requireEvent(eventId);
        yield* requireBeforeCutoff(event);

        const deleted = yield* reservations.delete(requester.id, eventId);
        if (!deleted) {
          return yield* Effect.fail(new ReservationNotFoundError());
        }
      });

    const list = (eventId: EventId, requester: Me) =>
      requester.role !== Role.ADMIN
        ? Effect.fail(new ForbiddenError())
        : reservations.findByEventId(eventId);

    return { reserve, cancel, list };
  }),
).pipe(Layer.provide([ReservationsRepoLive, EventsRepoLive]));
