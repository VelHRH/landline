import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import * as Schema from "effect/Schema";
import { City } from "./schema.js";

// Public typeahead (used before sign-up): no Authorization middleware. `limit`
// is NumberFromString because URL params must encode to strings.
export const CitySearchParams = Schema.Struct({
  q: Schema.String,
  limit: Schema.optional(Schema.NumberFromString),
});
export type CitySearchParams = typeof CitySearchParams.Type;

export class CitiesGroup extends HttpApiGroup.make("cities")
  .add(
    HttpApiEndpoint.get("search", "/search")
      .setUrlParams(CitySearchParams)
      .addSuccess(Schema.Array(City)),
  )
  .prefix("/city")
{}
