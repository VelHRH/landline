import type { CityId } from "@landline/domain/city/schema";
import { City } from "@landline/domain/city/schema";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as Option from "effect/Option";
import * as Schema from "effect/Schema";

// A city row without its DB-assigned id — what the seed importer emits.
export const CityInsert = City.pipe(Schema.omit("id"));
export type CityInsert = typeof CityInsert.Type;

export class CitiesRepo extends Context.Tag("CitiesRepo")<
  CitiesRepo,
  {
    readonly searchByPrefix: (
      prefix: string,
      limit: number,
    ) => Effect.Effect<ReadonlyArray<City>>;
    readonly findById: (id: CityId) => Effect.Effect<Option.Option<City>>;
    readonly upsertMany: (
      cities: ReadonlyArray<CityInsert>,
    ) => Effect.Effect<void>;
  }
>() {}
