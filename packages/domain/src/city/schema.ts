import { Schema } from "effect";

export const CityId = Schema.UUID.pipe(Schema.brand("CityId"));
export type CityId = typeof CityId.Type;

export class CitySummary extends Schema.Class<CitySummary>("CitySummary")({
  name: Schema.String,
  country: Schema.String,
}) {}

// Reference data seeded from GeoNames; `geonamesId` is the upstream source id,
// uniquely constrained so re-seeding upserts rather than duplicates.
export class City extends Schema.Class<City>("City")({
  id: CityId,
  geonamesId: Schema.Int,
  name: Schema.String,
  country: Schema.String,
  timezone: Schema.String,
  latitude: Schema.Number,
  longitude: Schema.Number,
  population: Schema.Int,
}) {}
