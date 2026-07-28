import { CitiesRepo } from "#modules/city/domain/repo.js";
import { CitiesRepoLive } from "#modules/city/infrastucture/repository.js";
import { EventsRepo } from "#modules/event/domain/repo.js";
import { EventsService } from "#modules/event/domain/service.js";
import type { CreateEventPayload } from "@landline/domain/event/create";
import { EventStatus } from "@landline/domain/event/enums";
import { ForbiddenError } from "@landline/domain/event/errors";
import { REGIME_DEFAULTS } from "@landline/domain/event/regime";
import { Role } from "@landline/domain/user/enums";
import { CityNotFoundError } from "@landline/domain/user/errors";
import type { Me } from "@landline/domain/user/schema";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { EventsRepoLive } from "./repository.js";

// The City's local 20:00 on the given date, as a UTC instant. Postgres and the
// domain agree on the wall-clock convention; `adjustForTimeZone` interprets the
// parts as local to the City's zone.
const startInstant = (date: string, timeZone: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return DateTime.toUtc(
    DateTime.unsafeMakeZoned(
      { year, month, day, hours: 20 },
      { timeZone, adjustForTimeZone: true },
    ),
  );
};

export const EventsServiceLive = Layer.effect(
  EventsService,
  Effect.gen(function*() {
    const events = yield* EventsRepo;
    const cities = yield* CitiesRepo;

    const create = (payload: CreateEventPayload, requester: Me) =>
      requester.role !== Role.ADMIN
        ? Effect.fail(new ForbiddenError())
        : Effect.gen(function*() {
          const city = yield* cities.findById(payload.cityId).pipe(
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.fail(new CityNotFoundError({ cityId: payload.cityId })),
                onSome: Effect.succeed,
              }),
            ),
          );

          const startsAt = startInstant(payload.date, city.timezone);
          const leadTime = REGIME_DEFAULTS[payload.regime].leadTimeMinutes;
          const reservationDeadline = payload.reservationDeadline ?? DateTime.subtract(startsAt, { minutes: leadTime });

          return yield* events.create({
            cityId: payload.cityId,
            date: payload.date,
            regime: payload.regime,
            status: EventStatus.SCHEDULED,
            startsAt,
            reservationDeadline,
          });
        });

    return {
      create,
      listUpcoming: (cityId) => events.listUpcoming(cityId),
    };
  }),
).pipe(Layer.provide([EventsRepoLive, CitiesRepoLive]));
