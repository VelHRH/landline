import { Effect } from "effect";
import type { ApiResult } from "@/lib/api-client";
import { err, ok, runApi } from "@/lib/api-client";

// Plain view for components: branded CityId collapsed to a string (ADR-0002).
export interface CityOption {
  readonly id: string;
  readonly name: string;
  readonly country: string;
  readonly label: string;
}

export const searchCities = (
  query: string,
  limit?: number,
): Promise<ApiResult<ReadonlyArray<CityOption>>> =>
  runApi((client) =>
    client.cities.search({ urlParams: { q: query, limit } }).pipe(
      Effect.map((cities) =>
        ok(
          cities.map((city) => ({
            id: city.id,
            name: city.name,
            country: city.country,
            label: `${city.name}, ${city.country}`,
          })),
        )
      ),
      Effect.catchAll(() => Effect.succeed(err("Couldn't search cities, try again"))),
    ),
  );
