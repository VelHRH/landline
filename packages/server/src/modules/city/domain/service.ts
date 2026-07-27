import type { CitySearchParams } from "@landline/domain/city/http";
import type { City } from "@landline/domain/city/schema";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export class CitiesService extends Context.Tag("CitiesService")<
  CitiesService,
  {
    readonly search: (
      params: CitySearchParams,
    ) => Effect.Effect<ReadonlyArray<City>>;
  }
>() {}
