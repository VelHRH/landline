import { CitiesService } from "#modules/city/domain/service.js";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import { Api } from "@landline/domain/api";
import * as Effect from "effect/Effect";

export const CitiesGroupLive = HttpApiBuilder.group(Api, "cities", (handlers) =>
  Effect.gen(function*() {
    const service = yield* CitiesService;

    return handlers.handle("search", ({ urlParams }) => service.search(urlParams));
  }));
