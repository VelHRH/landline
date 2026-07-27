import { CitiesRepo } from "#modules/city/domain/repo.js";
import { CitiesService } from "#modules/city/domain/service.js";
import type { CitySearchParams } from "@landline/domain/city/http";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { CitiesRepoLive } from "./repository.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

const clampLimit = (limit: number | undefined) =>
  limit === undefined
    ? DEFAULT_LIMIT
    : Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));

export const CitiesServiceLive = Layer.effect(CitiesService)(
  Effect.gen(function*() {
    const repo = yield* CitiesRepo;

    const search = (params: CitySearchParams) => {
      const prefix = params.q.trim();
      // An empty prefix would match every city — answer with nothing.
      if (prefix.length === 0) {
        return Effect.succeed([]);
      }
      return repo.searchByPrefix(prefix, clampLimit(params.limit));
    };

    return { search };
  }),
).pipe(Layer.provide(CitiesRepoLive));
