import { EventsService } from "#modules/event/domain/service.js";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import { Api } from "@landline/domain/api";
import { CurrentUser } from "@landline/domain/user/http";
import * as Effect from "effect/Effect";

export const EventsGroupLive = HttpApiBuilder.group(Api, "events", (handlers) =>
  Effect.gen(function*() {
    const service = yield* EventsService;

    return handlers
      .handle("create", ({ payload }) => Effect.flatMap(CurrentUser, (user) => service.create(payload, user)))
      .handle("upcoming", ({ urlParams }) => service.listUpcoming(urlParams.cityId));
  }));
