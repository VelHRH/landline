import { ReservationsService } from "#modules/reservation/domain/service.js";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import { Api } from "@landline/domain/api";
import { CurrentUser } from "@landline/domain/user/http";
import * as Effect from "effect/Effect";

export const ReservationsGroupLive = HttpApiBuilder.group(Api, "reservations", (handlers) =>
  Effect.gen(function*() {
    const service = yield* ReservationsService;

    return handlers
      .handle("reserve", ({ path }) => Effect.flatMap(CurrentUser, (user) => service.reserve(path.eventId, user)))
      .handle("cancel", ({ path }) => Effect.flatMap(CurrentUser, (user) => service.cancel(path.eventId, user)))
      .handle("list", ({ path }) => Effect.flatMap(CurrentUser, (user) => service.list(path.eventId, user)));
  }));
